// data: URL (RFC 2397) の自前実装。base64 形式のみを生成し、両形式を解釈する。
import { encodeBase64, decodeBase64 } from '../encoders/base64';

export type DataUrl = {
    mime: string;
    bytes: Uint8Array;
};

export function encodeDataUrl(data: DataUrl): string {
    const mime = data.mime || 'application/octet-stream';
    return `data:${mime};base64,${encodeBase64(data.bytes)}`;
}

export function decodeDataUrl(text: string): DataUrl {
    const trimmed = text.trim();
    const m = trimmed.match(/^data:([^,;]*)?(;[^,]*)?,(.*)$/s);
    if (!m) throw new Error('Invalid data URL');
    const mime = (m[1] || '').trim() || 'application/octet-stream';
    const params = (m[2] || '').toLowerCase();
    const payload = m[3] || '';
    const isBase64 = params.split(';').some(p => p.trim() === 'base64');
    if (isBase64) {
        return { mime, bytes: decodeBase64(payload) };
    }
    // パーセントエンコーディング
    const decoded = decodeURIComponent(payload);
    const enc = new TextEncoder();
    return { mime, bytes: enc.encode(decoded) };
}
