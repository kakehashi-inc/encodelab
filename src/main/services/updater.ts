import { app, BrowserWindow } from 'electron';
import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater';
import { IPC_CHANNELS } from '../../shared/constants';
import type { UpdateState } from '../../shared/types';

// electron-updater は dev 実行ではアップデート情報を取得しないので、本番ビルドのみで動作させる
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
// portable 実行時は electron-builder が PORTABLE_EXECUTABLE_FILE を自動設定する。
// portable 版は自動更新を一切行わない (NSIS 版インストーラを意図せず展開してしまうため)
const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE;
// 自動更新を完全にスキップすべき実行コンテキストか
const shouldSkipUpdater = isDev || isPortable;

let currentState: UpdateState = { status: 'idle' };
let initialized = false;
// ユーザーが「アップデートする」を承諾した場合に true。downloaded 後に自動でインストールする
let autoInstallOnDownloaded = false;
// ユーザー操作でダウンロードを開始している間だけ true。
// autoUpdater.on('error') はグローバルで、起動時/バックグラウンドのチェック失敗 (オフライン等) も
// ユーザー操作によるダウンロード失敗も同じハンドラに来る。
// このフラグが true のとき (= ユーザーがダウンロード中) のみ error 状態を UI へ配信し、
// それ以外のチェック失敗は UI に出さず静かに idle へ戻すために使う。
let downloadRequested = false;
// 起動時の自動チェックは 1 度だけ
let startupCheckScheduled = false;

function broadcastState(next: UpdateState) {
    currentState = next;
    for (const win of BrowserWindow.getAllWindows()) {
        if (win.isDestroyed()) continue;
        win.webContents.send(IPC_CHANNELS.UPDATER_STATE_CHANGED, currentState);
    }
}

export function getUpdateState(): UpdateState {
    return currentState;
}

export function initializeUpdater() {
    if (initialized) return;
    initialized = true;

    if (shouldSkipUpdater) {
        // 開発時 / portable 実行時は何もしない (state は idle のまま)
        return;
    }

    // ダウンロードはユーザーが明示的に承認したタイミングで開始する
    autoUpdater.autoDownload = false;
    // インストールは quitAndInstall() を明示的に呼んだタイミングのみ
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = console;

    autoUpdater.on('checking-for-update', () => {
        // 内部状態のみ更新 (UI 通知不要)
        currentState = { status: 'checking' };
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
        // ユーザーへ確認を出す状態 (UI に通知)
        broadcastState({ status: 'available', version: info.version });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
        // 要件: アップデートが不要な場合は何もしない (UI に通知しない)
        currentState = { status: 'not-available', version: info.version };
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
        broadcastState({
            status: 'downloading',
            version: currentState.version,
            progress: Math.round(progress.percent),
        });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
        // ダウンロード成功で完了。以降のエラーは「ダウンロード中の失敗」ではない
        downloadRequested = false;
        broadcastState({ status: 'downloaded', version: info.version, progress: 100 });
        if (autoInstallOnDownloaded) {
            // 既にユーザーが「アップデートする」と承諾済み — 短い余白後にインストールを実行
            setTimeout(() => {
                quitAndInstall();
            }, 1500);
        }
    });

    autoUpdater.on('error', (err: Error) => {
        const message = err?.message ?? String(err);
        console.error('[updater] error:', message);
        autoInstallOnDownloaded = false;
        if (downloadRequested) {
            // ユーザーが「アップデート」を押してダウンロード中に失敗したケースのみ UI へエラー表示する。
            // (無反応に見えないよう、必ずフィードバックを返す)
            downloadRequested = false;
            broadcastState({ status: 'error', version: currentState.version, error: message });
        } else {
            // 起動時/バックグラウンドのチェック失敗 (オフライン等) は UI に出さず静かに idle へ戻す
            broadcastState({ status: 'idle' });
        }
    });
}

export async function checkForUpdates(): Promise<UpdateState> {
    if (shouldSkipUpdater) {
        return currentState;
    }
    try {
        await autoUpdater.checkForUpdates();
    } catch (err) {
        // ここでも UI には出さずコンソールにのみ
        console.error('[updater] checkForUpdates failed:', err instanceof Error ? err.message : err);
    }
    return currentState;
}

export async function downloadUpdate(): Promise<UpdateState> {
    if (shouldSkipUpdater) return currentState;
    // ユーザーが承諾したのでダウンロード完了後に自動でインストールする
    autoInstallOnDownloaded = true;
    // ここから先のエラーは「ユーザー操作によるダウンロード失敗」として UI へ表示する
    downloadRequested = true;
    // 進行中であることを即座にフィードバック (download-progress が来る前でも無反応に見えない)
    broadcastState({ status: 'downloading', version: currentState.version, progress: 0 });
    try {
        await autoUpdater.downloadUpdate();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[updater] downloadUpdate failed:', message);
        autoInstallOnDownloaded = false;
        // autoUpdater.on('error') が発火しない経路 (Promise reject のみ) でも必ずエラーを配信する。
        // error ハンドラ側で既に配信済みなら downloadRequested は false になっているため二重配信しない
        if (downloadRequested) {
            downloadRequested = false;
            broadcastState({ status: 'error', version: currentState.version, error: message });
        }
    }
    return currentState;
}

export function quitAndInstall(): void {
    if (shouldSkipUpdater) return;
    setImmediate(() => {
        app.removeAllListeners('window-all-closed');
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) win.close();
        }
        // isSilent=false, isForceRunAfter=true: インストール後にアプリを起動する
        autoUpdater.quitAndInstall(false, true);
    });
}

/**
 * メインウィンドウの読み込み完了 + 指定遅延後にバックグラウンドで 1 度だけ更新確認を行う。
 * 起動が遅くてもウィンドウ表示後に走るよう did-finish-load にフックする。
 */
export function scheduleStartupCheck(window: BrowserWindow, delayMs = 3000): void {
    if (startupCheckScheduled) return;
    startupCheckScheduled = true;
    if (shouldSkipUpdater) return;

    const trigger = () => {
        setTimeout(() => {
            void checkForUpdates();
        }, delayMs);
    };

    if (window.webContents.isLoading()) {
        window.webContents.once('did-finish-load', trigger);
    } else {
        // 既に読み込み済みなら遅延だけ挟んで起動
        trigger();
    }
}
