// Ascii85 (btoa スタイル) の自前実装
// アルファベット: '!' (0x21) ～ 'u' (0x75)
// 全 0 の 4 バイトは 'z' に短縮する。
//
// この実装ではフレーミング識別子 (例: '<~' '~>') は付加しない。

const FIRST = 0x21; // '!'
const POWERS_85 = [85 * 85 * 85 * 85, 85 * 85 * 85, 85 * 85, 85, 1];

export function encodeAscii85(bytes: Uint8Array): string {
    let out = '';
    const len = bytes.length;
    let i = 0;
    while (i + 4 <= len) {
        const value = (bytes[i] * 0x1000000 + bytes[i + 1] * 0x10000 + bytes[i + 2] * 0x100 + bytes[i + 3]) >>> 0;
        if (value === 0) {
            out += 'z';
        } else {
            for (let j = 0; j < 5; j += 1) {
                out += String.fromCharCode(FIRST + (Math.floor(value / POWERS_85[j]) % 85));
            }
        }
        i += 4;
    }
    const remain = len - i;
    if (remain > 0) {
        const padded = new Uint8Array(4);
        for (let j = 0; j < remain; j += 1) padded[j] = bytes[i + j];
        const value = (padded[0] * 0x1000000 + padded[1] * 0x10000 + padded[2] * 0x100 + padded[3]) >>> 0;
        let chunk = '';
        for (let j = 0; j < 5; j += 1) {
            chunk += String.fromCharCode(FIRST + (Math.floor(value / POWERS_85[j]) % 85));
        }
        // 余剰文字を取り除く: remain バイト → remain+1 文字を残す
        out += chunk.slice(0, remain + 1);
    }
    return out;
}

export function decodeAscii85(input: string): Uint8Array {
    // 空白を除去
    let cleaned = input.replace(/\s+/g, '');
    // 'z' を 4 つの '!' に展開
    cleaned = cleaned.replace(/z/g, '!!!!!');
    if (cleaned.length === 0) return new Uint8Array(0);

    const bytes: number[] = [];
    let i = 0;
    while (i < cleaned.length) {
        const remain = Math.min(5, cleaned.length - i);
        // 末尾 1 文字だけ残るケースは Ascii85 として不正
        if (remain === 1) throw new Error('Ascii85 trailing single character is invalid');
        const group = cleaned.substring(i, i + remain);
        // 5 文字未満は 'u' (= 84) でパディング
        const padded = group + 'u'.repeat(5 - remain);

        let value = 0;
        for (let j = 0; j < 5; j += 1) {
            const code = padded.charCodeAt(j) - FIRST;
            if (code < 0 || code >= 85) throw new Error('Invalid Ascii85 character');
            value = value * 85 + code;
        }
        // value は 32 bit に収まるはずだが、Number の精度内 (< 2^53) なので問題ない
        if (value > 0xffffffff) throw new Error('Ascii85 group overflow');

        const out = [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
        // group が 5 文字未満なら、対応するバイト数だけ取る
        const take = remain === 5 ? 4 : remain - 1;
        for (let j = 0; j < take; j += 1) bytes.push(out[j]);

        i += remain;
    }
    return Uint8Array.from(bytes);
}
