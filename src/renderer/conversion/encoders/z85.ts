// Z85 (ZeroMQ Base-85) の自前実装
// 仕様: https://rfc.zeromq.org/spec/32/
// バイト列の長さは 4 の倍数でなければならない。
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';

const DECODE_TABLE: Int8Array = (() => {
    const table = new Int8Array(256).fill(-1);
    for (let i = 0; i < ALPHABET.length; i += 1) {
        table[ALPHABET.charCodeAt(i)] = i;
    }
    return table;
})();

const POWERS_85 = [85 * 85 * 85 * 85, 85 * 85 * 85, 85 * 85, 85, 1];

export function encodeZ85(bytes: Uint8Array): string {
    if (bytes.length % 4 !== 0) {
        throw new Error('Z85 requires input length to be a multiple of 4');
    }
    let out = '';
    for (let i = 0; i < bytes.length; i += 4) {
        const value = (bytes[i] * 0x1000000 + bytes[i + 1] * 0x10000 + bytes[i + 2] * 0x100 + bytes[i + 3]) >>> 0;
        for (let j = 0; j < 5; j += 1) {
            out += ALPHABET[Math.floor(value / POWERS_85[j]) % 85];
        }
    }
    return out;
}

export function decodeZ85(input: string): Uint8Array {
    const cleaned = input.replace(/\s+/g, '');
    if (cleaned.length % 5 !== 0) {
        throw new Error('Z85 requires input length to be a multiple of 5');
    }
    const out = new Uint8Array((cleaned.length / 5) * 4);
    let oi = 0;
    for (let i = 0; i < cleaned.length; i += 5) {
        let value = 0;
        for (let j = 0; j < 5; j += 1) {
            const code = DECODE_TABLE[cleaned.charCodeAt(i + j)];
            if (code < 0) throw new Error('Invalid Z85 character');
            value = value * 85 + code;
        }
        if (value > 0xffffffff) throw new Error('Z85 group overflow');
        out[oi++] = (value >>> 24) & 0xff;
        out[oi++] = (value >>> 16) & 0xff;
        out[oi++] = (value >>> 8) & 0xff;
        out[oi++] = value & 0xff;
    }
    return out;
}
