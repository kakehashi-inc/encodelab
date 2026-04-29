// Base58 (Bitcoin / IPFS 互換アルファベット) の自前実装
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const DECODE_TABLE: Int8Array = (() => {
    const table = new Int8Array(256).fill(-1);
    for (let i = 0; i < ALPHABET.length; i += 1) {
        table[ALPHABET.charCodeAt(i)] = i;
    }
    return table;
})();

export function encodeBase58(bytes: Uint8Array): string {
    if (bytes.length === 0) return '';

    // 先頭ゼロを '1' に変換するために数えておく
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;

    // 入力バイトを 256 進整数とみなし 58 進に変換
    const input = Array.from(bytes);
    const out: number[] = [];
    let startAt = zeros;
    while (startAt < input.length) {
        let remainder = 0;
        for (let i = startAt; i < input.length; i += 1) {
            const acc = remainder * 256 + input[i];
            input[i] = Math.floor(acc / 58);
            remainder = acc % 58;
        }
        out.push(remainder);
        if (input[startAt] === 0) startAt += 1;
    }

    let result = '';
    for (let i = 0; i < zeros; i += 1) result += ALPHABET[0];
    for (let i = out.length - 1; i >= 0; i -= 1) result += ALPHABET[out[i]];
    return result;
}

export function decodeBase58(input: string): Uint8Array {
    if (input.length === 0) return new Uint8Array(0);

    let zeros = 0;
    while (zeros < input.length && input[zeros] === ALPHABET[0]) zeros += 1;

    // 各文字を数値に変換
    const digits: number[] = [];
    for (let i = zeros; i < input.length; i += 1) {
        const value = DECODE_TABLE[input.charCodeAt(i)];
        if (value < 0) throw new Error('Invalid Base58 character');
        digits.push(value);
    }

    // 58 進から 256 進へ
    const out: number[] = [];
    let startAt = 0;
    while (startAt < digits.length) {
        let remainder = 0;
        for (let i = startAt; i < digits.length; i += 1) {
            const acc = remainder * 58 + digits[i];
            digits[i] = Math.floor(acc / 256);
            remainder = acc % 256;
        }
        out.push(remainder);
        if (digits[startAt] === 0) startAt += 1;
    }

    const result = new Uint8Array(zeros + out.length);
    // 先頭ゼロ
    // (Uint8Array の初期値は 0 なので明示的なコピーは不要)
    for (let i = 0; i < out.length; i += 1) {
        result[zeros + i] = out[out.length - 1 - i];
    }
    return result;
}
