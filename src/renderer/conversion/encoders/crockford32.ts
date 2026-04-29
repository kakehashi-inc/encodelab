// Crockford Base32 (整数表現用) の自前実装
// 仕様: https://www.crockford.com/base32.html
// アルファベット (大文字): 0-9, A-Z (I, L, O, U を除く)
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const DECODE_TABLE: Int8Array = (() => {
    const table = new Int8Array(256).fill(-1);
    for (let i = 0; i < ALPHABET.length; i += 1) {
        table[ALPHABET.charCodeAt(i)] = i;
        // 小文字も受け付ける
        table[ALPHABET.toLowerCase().charCodeAt(i)] = i;
    }
    // 紛らわしい文字の互換マッピング
    table['O'.charCodeAt(0)] = 0;
    table['o'.charCodeAt(0)] = 0;
    table['I'.charCodeAt(0)] = 1;
    table['i'.charCodeAt(0)] = 1;
    table['L'.charCodeAt(0)] = 1;
    table['l'.charCodeAt(0)] = 1;
    return table;
})();

// 整数 ↔ Crockford Base32 文字列。負の整数は先頭に '-' を付与する。
export function encodeCrockford32(value: bigint): string {
    if (value === 0n) return '0';
    const negative = value < 0n;
    let n = negative ? -value : value;
    let out = '';
    while (n > 0n) {
        const digit = Number(n % 32n);
        out = ALPHABET[digit] + out;
        n /= 32n;
    }
    return negative ? '-' + out : out;
}

export function decodeCrockford32(text: string): bigint {
    // チェックシンボル '*' '~' '$' '=' '!' は本実装ではサポートしない
    // 区切り '-' は除去 (Crockford 仕様の可読性ハイフン) するが、先頭マイナス符号は残す
    let trimmed = text.trim();
    if (trimmed.length === 0) throw new Error('Empty Crockford Base32 input');
    let negative = false;
    if (trimmed.startsWith('-') && trimmed.length > 1) {
        negative = true;
        trimmed = trimmed.slice(1);
    }
    // 中間のハイフンを除去
    trimmed = trimmed.replace(/-/g, '');
    if (trimmed.length === 0) throw new Error('Empty Crockford Base32 input');

    let value = 0n;
    for (let i = 0; i < trimmed.length; i += 1) {
        const code = DECODE_TABLE[trimmed.charCodeAt(i)];
        if (code < 0) throw new Error(`Invalid Crockford Base32 character: ${trimmed[i]}`);
        value = value * 32n + BigInt(code);
    }
    return negative ? -value : value;
}
