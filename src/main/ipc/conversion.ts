import { BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { HashAlgorithm, HashEncoding } from '../../shared/types';
import { openFile, saveFile } from '../services/file';
import { detectMime } from '../services/mime';
import { computeHash } from '../services/hash';

function focusedWindow(): BrowserWindow | null {
    return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

export function registerConversionIpcHandlers() {
    ipcMain.handle(IPC_CHANNELS.FILE_OPEN, async () => {
        return openFile(focusedWindow());
    });

    ipcMain.handle(IPC_CHANNELS.FILE_SAVE, async (_e, args: { suggestedName?: string; bytes: Uint8Array }) => {
        return saveFile({ suggestedName: args.suggestedName, bytes: args.bytes, parent: focusedWindow() });
    });

    ipcMain.handle(IPC_CHANNELS.MIME_DETECT, async (_e, bytes: Uint8Array) => {
        return detectMime(bytes);
    });

    ipcMain.handle(
        IPC_CHANNELS.HASH_COMPUTE,
        async (_e, args: { algorithm: HashAlgorithm; encoding: HashEncoding; bytes: Uint8Array }) => {
            return computeHash(args.algorithm, args.encoding, args.bytes);
        }
    );
}
