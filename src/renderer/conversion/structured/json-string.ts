// JSON String: 文字列を JSON のダブルクォート文字列リテラルとして表現する。
// 例: text "hello" → "hello" の前後にダブルクォートが付き、必要に応じてエスケープされる。
export function encodeJsonString(text: string): string {
    return JSON.stringify(text);
}

export function decodeJsonString(literal: string): string {
    const trimmed = literal.trim();
    const value = JSON.parse(trimmed);
    if (typeof value !== 'string') {
        throw new Error('Input is not a JSON string literal');
    }
    return value;
}
