import { registerUpdaterIpcHandlers } from './updater';
import { registerConversionIpcHandlers } from './conversion';

/**
 * IPCハンドラを登録
 * アプリケーション固有のIPC通信はここに追加
 */
export function registerIpcHandlers() {
    // 自動アップデート関連の IPC ハンドラ
    registerUpdaterIpcHandlers();

    // ファイル / MIME / ハッシュなど変換系の IPC ハンドラ
    registerConversionIpcHandlers();
}
