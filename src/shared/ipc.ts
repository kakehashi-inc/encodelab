import type {
    AppInfo,
    AppLanguage,
    AppTheme,
    UpdateState,
    FileOpenResult,
    FileSaveResult,
    MimeDetectResult,
    HashAlgorithm,
    HashEncoding,
} from './types';

// IPC APIの型定義
export type IpcApi = {
    // アプリ情報・設定
    getAppInfo(): Promise<AppInfo>;
    setTheme(theme: AppTheme): Promise<{ theme: AppTheme }>;
    setLanguage(language: AppLanguage): Promise<{ language: AppLanguage }>;
    // ウィンドウ制御
    minimize(): Promise<void>;
    maximizeOrRestore(): Promise<boolean>;
    isMaximized(): Promise<boolean>;
    close(): Promise<void>;
    // 自動アップデート (electron-updater)
    updater: {
        // 起動時の状態を取得 (UI 初期化に利用)
        getState(): Promise<UpdateState>;
        // GitHub Releases に新しいバージョンがあるかチェック (ダウンロードはしない)
        check(): Promise<UpdateState>;
        // 利用可能なアップデートのダウンロードを開始
        download(): Promise<UpdateState>;
        // ダウンロード済みのアップデートを適用してアプリを再起動
        quitAndInstall(): Promise<void>;
        // アップデート状態の変化を購読 (戻り値は購読解除関数)
        onStateChanged(listener: (state: UpdateState) => void): () => void;
    };
    // ファイル入出力
    file: {
        // ファイル選択ダイアログを開き、選択ファイルのバイト列を返す
        open(): Promise<FileOpenResult>;
        // ファイル保存ダイアログを開き、指定バイト列を保存する
        save(args: { suggestedName?: string; bytes: Uint8Array }): Promise<FileSaveResult>;
    };
    // MIME 自動判定 (file-type 利用)
    mime: {
        detect(bytes: Uint8Array): Promise<MimeDetectResult>;
    };
    // ハッシュ計算 (Node.js crypto)
    hash: {
        compute(args: { algorithm: HashAlgorithm; encoding: HashEncoding; bytes: Uint8Array }): Promise<string>;
    };
};

declare global {
    interface Window {
        encodelab: IpcApi;
    }
}
