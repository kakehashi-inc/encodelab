// Hex String (バイト列の 16 進数表現)
// エンコード時はスペースなしの小文字 16 進。
// デコード時は空白・コロン・カンマ等の区切り、'0x' 接頭辞、大小文字を許容する。
export function encodeHexString(bytes: Uint8Array): string {
    let out = '';
    for (let i = 0; i < bytes.length; i += 1) {
        out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
}

export function decodeHexString(text: string): Uint8Array {
    const cleaned = text
        .replace(/0x/gi, '')
        .replace(/[\s,;:_-]+/g, '')
        .toLowerCase();
    if (cleaned.length === 0) return new Uint8Array(0);
    if (cleaned.length % 2 !== 0) {
        throw new Error('Hex string length must be even');
    }
    if (!/^[0-9a-f]+$/.test(cleaned)) {
        throw new Error('Hex string contains invalid characters');
    }
    const out = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < out.length; i += 1) {
        out[i] = parseInt(cleaned.substring(i * 2, i * 2 + 2), 16);
    }
    return out;
}
