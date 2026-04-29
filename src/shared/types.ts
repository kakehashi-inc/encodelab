// プラットフォーム識別子
export type PlatformId = 'win32' | 'darwin' | 'linux';

// アプリのテーマ設定
export type AppTheme = 'light' | 'dark' | 'system';

// アプリの言語設定
export type AppLanguage = 'ja' | 'en';

// アプリ情報
export type AppInfo = {
    name: string;
    version: string;
    language: AppLanguage;
    theme: AppTheme;
    os: PlatformId;
};

// 自動アップデートの状態
export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

// 自動アップデートの状態ペイロード
export type UpdateState = {
    status: UpdateStatus;
    // リモート上で公開されている最新バージョン (取得済みの場合)
    version?: string;
    // ダウンロード進捗 (0-100)
    progress?: number;
    // 直近のエラーメッセージ (status='error' 時のみ)
    error?: string;
};

// ファイル選択ダイアログの結果
export type FileOpenResult =
    | {
          ok: true;
          path: string;
          name: string;
          // バイト列 (転送のため Uint8Array)
          bytes: Uint8Array;
      }
    | { ok: false; canceled: true }
    | { ok: false; canceled: false; error: string };

// ファイル保存ダイアログの結果
export type FileSaveResult =
    | { ok: true; path: string }
    | { ok: false; canceled: true }
    | { ok: false; canceled: false; error: string };

// MIME 自動判定結果
export type MimeDetectResult = {
    // 判定不能の場合は undefined (RAW 扱い)
    mime?: string;
    ext?: string;
};

// ハッシュアルゴリズム
export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

// ハッシュ出力エンコーディング
export type HashEncoding = 'hex' | 'base64';
