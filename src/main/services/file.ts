import path from 'path';
import { promises as fs } from 'fs';
import { dialog, BrowserWindow } from 'electron';
import type { FileOpenResult, FileSaveResult } from '../../shared/types';

export async function openFile(parent?: BrowserWindow | null): Promise<FileOpenResult> {
    try {
        const options = { properties: ['openFile' as const] };
        const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options);
        if (result.canceled || result.filePaths.length === 0) {
            return { ok: false, canceled: true };
        }
        const filePath = result.filePaths[0];
        const buffer = await fs.readFile(filePath);
        return {
            ok: true,
            path: filePath,
            name: path.basename(filePath),
            bytes: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
        };
    } catch (err) {
        return {
            ok: false,
            canceled: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

export async function saveFile(args: {
    suggestedName?: string;
    bytes: Uint8Array;
    parent?: BrowserWindow | null;
}): Promise<FileSaveResult> {
    try {
        const options = args.suggestedName ? { defaultPath: args.suggestedName } : {};
        const result = args.parent
            ? await dialog.showSaveDialog(args.parent, options)
            : await dialog.showSaveDialog(options);
        if (result.canceled || !result.filePath) {
            return { ok: false, canceled: true };
        }
        await fs.writeFile(
            result.filePath,
            Buffer.from(args.bytes.buffer, args.bytes.byteOffset, args.bytes.byteLength)
        );
        return { ok: true, path: result.filePath };
    } catch (err) {
        return {
            ok: false,
            canceled: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
