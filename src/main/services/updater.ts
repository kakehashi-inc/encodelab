import { app, BrowserWindow } from 'electron';
import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater';
import { IPC_CHANNELS } from '../../shared/constants';
import type { UpdateState } from '../../shared/types';

// electron-updater は dev 実行ではアップデート情報を取得しないので、本番ビルドのみで動作させる
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

let currentState: UpdateState = { status: 'idle' };
let initialized = false;
// ユーザーが「アップデートする」を承諾した場合に true。downloaded 後に自動でインストールする
let autoInstallOnDownloaded = false;
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

    if (isDev) {
        // 開発時は何もしない (state は idle のまま)
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
        broadcastState({ status: 'downloaded', version: info.version, progress: 100 });
        if (autoInstallOnDownloaded) {
            // 既にユーザーが「アップデートする」と承諾済み — 短い余白後にインストールを実行
            setTimeout(() => {
                quitAndInstall();
            }, 1500);
        }
    });

    autoUpdater.on('error', (err: Error) => {
        // 要件: アップデートチェック/ダウンロードのエラーはコンソール出力のみ。UI 通知はしない
        console.error('[updater] error:', err?.message ?? String(err));
        // 進行中状態のまま停滞しないように idle に戻す
        autoInstallOnDownloaded = false;
        broadcastState({ status: 'idle' });
    });
}

export async function checkForUpdates(): Promise<UpdateState> {
    if (isDev) {
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
    if (isDev) return currentState;
    // ユーザーが承諾したのでダウンロード完了後に自動でインストールする
    autoInstallOnDownloaded = true;
    try {
        await autoUpdater.downloadUpdate();
    } catch (err) {
        console.error('[updater] downloadUpdate failed:', err instanceof Error ? err.message : err);
        autoInstallOnDownloaded = false;
    }
    return currentState;
}

export function quitAndInstall(): void {
    if (isDev) return;
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
    if (isDev) return;

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
