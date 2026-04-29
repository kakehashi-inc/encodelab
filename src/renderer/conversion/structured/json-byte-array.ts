// JSON Byte Array: バイト列を [12, 34, 255] のような JSON 配列で表現する。
export function encodeJsonByteArray(bytes: Uint8Array): string {
    const parts: string[] = [];
    for (let i = 0; i < bytes.length; i += 1) parts.push(String(bytes[i]));
    return '[' + parts.join(', ') + ']';
}

export function decodeJsonByteArray(text: string): Uint8Array {
    const value = JSON.parse(text);
    if (!Array.isArray(value)) {
        throw new Error('Input is not a JSON array');
    }
    const out = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
        const v = value[i];
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 255) {
            throw new Error(`Element at index ${i} is not a byte (0-255 integer)`);
        }
        out[i] = v;
    }
    return out;
}
