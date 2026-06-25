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
        // file-type はテキストベースの SVG を検出できない。さらに XML 宣言
        // (<?xml ...?>) 付きの SVG は application/xml と誤判定する。いずれの場合も
        // 内容を見て SVG を補正する (プレビュー / QR 読取が image として扱えるように)。
        if (!result || result.mime === 'application/xml' || result.mime === 'text/xml') {
            if (looksLikeSvg(bytes)) {
                return { mime: 'image/svg+xml', ext: 'svg' };
            }
        }
        if (!result) return {};
        return { mime: result.mime, ext: result.ext };
    } catch (err) {
        console.error('[mime] detection failed:', err instanceof Error ? err.message : err);
        return {};
    }
}

// 先頭付近に <svg ...> ルート要素があるかで SVG を判定する。
// XML 宣言・コメント・DOCTYPE が先行しても拾えるよう、十分な範囲を走査する。
function looksLikeSvg(bytes: Uint8Array): boolean {
    const head = bytes.subarray(0, Math.min(bytes.byteLength, 4096));
    let text: string;
    try {
        text = new TextDecoder('utf-8', { fatal: false }).decode(head);
    } catch {
        return false;
    }
    return /<svg[\s/>]/i.test(text);
}
