import type { CategoryId, TypeId } from './conversion/catalog';

// プラットフォーム識別子
export type PlatformId = 'win32' | 'darwin' | 'linux';

// 変換のお気に入り (変換元/変換先のカテゴリ・タイプの組合せ)。
// データ自体は保存せず、入力/出力のカテゴリ・タイプのみを記録する。
export type Favorite = {
    // 安定した識別子。input/output のタイプから決定的に生成する (重複登録の判定に使う)。
    id: string;
    inputCategory: CategoryId;
    inputType: TypeId;
    outputCategory: CategoryId;
    outputType: TypeId;
};

// 起動時に復元する左右ペインの選択状態 (カテゴリ・タイプと矢印の向き)。
// 入力データ (value) は保存しない。タイプ選択のみを永続化する。
export type PersistedPaneSide = {
    category: CategoryId;
    type: TypeId;
};
export type PersistedPanes = {
    // 矢印の向き ('rtl' = 左が入力 / 'ltr' = 右が入力)。
    direction: 'rtl' | 'ltr';
    left: PersistedPaneSide;
    right: PersistedPaneSide;
};

// アプリのテーマ設定
export type AppTheme = 'light' | 'dark' | 'system';

// アプリの言語設定 ('system' は OS の言語に追従)
export type AppLanguage = 'ja' | 'en' | 'system';

// 実際に解決された (UI に適用すべき) テーマ
export type ResolvedTheme = 'light' | 'dark';

// 実際に解決された (UI に適用すべき) 言語
export type ResolvedLanguage = 'ja' | 'en';

// アプリ情報
export type AppInfo = {
    name: string;
    version: string;
    // ユーザーが選択した値 (system 含む)
    theme: AppTheme;
    language: AppLanguage;
    // OS から導出した既定値 (theme/language が 'system' のときに使用)
    osTheme: ResolvedTheme;
    osLanguage: ResolvedLanguage;
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

// ファイル選択ダイアログの拡張子フィルタ (Electron の FileFilter と同形)。
// 例: { name: '画像ファイル', extensions: ['png', 'jpg', 'svg'] }
// 表示名はローカライズしたいため、renderer 側で文言を解決して渡す。
export type FileFilter = {
    name: string;
    // 拡張子はドットなし (例: 'png')。すべて許可する場合は ['*']。
    extensions: string[];
};

// ファイル選択ダイアログのオプション
export type FileOpenOptions = {
    // 指定時はこのフィルタで表示を絞り込む。未指定なら全ファイル。
    filters?: FileFilter[];
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
