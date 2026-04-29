import type { MimeDetectResult } from '../../shared/types';

// file-type は ESM 専用パッケージのため、CommonJS ビルドの main プロセスからは
// 動的 import で読み込む。`Function('return import(...)')` を介すことで TSC が
// require() に降格するのを避ける。
type FileTypeApi = {
    fileTypeFromBuffer(buffer: Buffer): Promise<{ mime: string; ext: string } | undefined>;
};
let fileTypePromise: Promise<FileTypeApi> | null = null;

function loadFileType(): Promise<FileTypeApi> {
    if (!fileTypePromise) {
        fileTypePromise = (Function('return import("file-type")') as () => Promise<FileTypeApi>)();
    }
    return fileTypePromise;
}

export async function detectMime(bytes: Uint8Array): Promise<MimeDetectResult> {
    if (bytes.byteLength === 0) {
        return {};
    }
    try {
        const { fileTypeFromBuffer } = await loadFileType();
        const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const result = await fileTypeFromBuffer(buffer);
        if (!result) return {};
        return { mime: result.mime, ext: result.ext };
    } catch (err) {
        console.error('[mime] detection failed:', err instanceof Error ? err.message : err);
        return {};
    }
}
