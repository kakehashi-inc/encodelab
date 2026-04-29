// Base64 (標準アルファベット, パディングあり) の自前実装
// RFC 4648 §4 を参照。
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const DECODE_TABLE: Int8Array = (() => {
    const table = new Int8Array(256).fill(-1);
    for (let i = 0; i < ALPHABET.length; i += 1) {
        table[ALPHABET.charCodeAt(i)] = i;
    }
    return table;
})();

export function encodeBase64(bytes: Uint8Array): string {
    let out = '';
    const len = bytes.length;
    let i = 0;
    while (i + 3 <= len) {
        const b0 = bytes[i];
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        out +=
            ALPHABET[b0 >> 2] +
            ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)] +
            ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] +
            ALPHABET[b2 & 0x3f];
        i += 3;
    }
    const remain = len - i;
    if (remain === 1) {
        const b0 = bytes[i];
        out += ALPHABET[b0 >> 2] + ALPHABET[(b0 & 0x03) << 4] + '==';
    } else if (remain === 2) {
        const b0 = bytes[i];
        const b1 = bytes[i + 1];
        out += ALPHABET[b0 >> 2] + ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)] + ALPHABET[(b1 & 0x0f) << 2] + '=';
    }
    return out;
}

export function decodeBase64(input: string): Uint8Array {
    // 空白・改行は無視
    const cleaned = input.replace(/\s+/g, '');
    if (cleaned.length === 0) return new Uint8Array(0);
    if (cleaned.length % 4 !== 0) {
        throw new Error('Base64 input length must be a multiple of 4');
    }
    let padding = 0;
    if (cleaned.endsWith('==')) padding = 2;
    else if (cleaned.endsWith('=')) padding = 1;

    const outLen = (cleaned.length / 4) * 3 - padding;
    const out = new Uint8Array(outLen);
    let oi = 0;
    for (let i = 0; i < cleaned.length; i += 4) {
        const c0 = DECODE_TABLE[cleaned.charCodeAt(i)];
        const c1 = DECODE_TABLE[cleaned.charCodeAt(i + 1)];
        const c2Char = cleaned.charCodeAt(i + 2);
        const c3Char = cleaned.charCodeAt(i + 3);
        const c2 = c2Char === 0x3d ? 0 : DECODE_TABLE[c2Char];
        const c3 = c3Char === 0x3d ? 0 : DECODE_TABLE[c3Char];
        if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) {
            throw new Error('Invalid Base64 character');
        }
        out[oi++] = (c0 << 2) | (c1 >> 4);
        if (oi < outLen) out[oi++] = ((c1 & 0x0f) << 4) | (c2 >> 2);
        if (oi < outLen) out[oi++] = ((c2 & 0x03) << 6) | c3;
    }
    return out;
}
