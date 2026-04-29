// Base32 (RFC 4648 §6) の自前実装
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const DECODE_TABLE: Int8Array = (() => {
    const table = new Int8Array(256).fill(-1);
    for (let i = 0; i < ALPHABET.length; i += 1) {
        table[ALPHABET.charCodeAt(i)] = i;
    }
    return table;
})();

export function encodeBase32(bytes: Uint8Array): string {
    let out = '';
    const len = bytes.length;
    let bitBuffer = 0;
    let bitCount = 0;
    for (let i = 0; i < len; i += 1) {
        bitBuffer = (bitBuffer << 8) | bytes[i];
        bitCount += 8;
        while (bitCount >= 5) {
            bitCount -= 5;
            out += ALPHABET[(bitBuffer >> bitCount) & 0x1f];
        }
    }
    if (bitCount > 0) {
        out += ALPHABET[(bitBuffer << (5 - bitCount)) & 0x1f];
    }
    // パディング (全長を 8 の倍数に揃える)
    while (out.length % 8 !== 0) {
        out += '=';
    }
    return out;
}

export function decodeBase32(input: string): Uint8Array {
    // 空白を除去し、大文字化
    const cleanedWithPad = input.replace(/\s+/g, '').toUpperCase();
    if (cleanedWithPad.length === 0) return new Uint8Array(0);
    // RFC 4648 §6: パディング込みの長さは 8 の倍数でなければならない
    if (cleanedWithPad.length % 8 !== 0) {
        throw new Error('Base32 input length must be a multiple of 8 (including padding)');
    }
    const cleaned = cleanedWithPad.replace(/=+$/g, '');

    let bitBuffer = 0;
    let bitCount = 0;
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i += 1) {
        const code = DECODE_TABLE[cleaned.charCodeAt(i)];
        if (code < 0) throw new Error('Invalid Base32 character');
        bitBuffer = (bitBuffer << 5) | code;
        bitCount += 5;
        if (bitCount >= 8) {
            bitCount -= 8;
            bytes.push((bitBuffer >> bitCount) & 0xff);
        }
    }
    // RFC 4648: 末尾の残ビットはゼロでなければならない
    if (bitCount > 0) {
        const residue = bitBuffer & ((1 << bitCount) - 1);
        if (residue !== 0) {
            throw new Error('Base32 trailing bits must be zero');
        }
    }
    return Uint8Array.from(bytes);
}
