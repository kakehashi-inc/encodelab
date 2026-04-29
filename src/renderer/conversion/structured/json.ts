// JSON シリアライズ / パース。
// シリアライズはインデント 2 スペースで整形。
export function serializeJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

export function parseJson(text: string): unknown {
    return JSON.parse(text);
}
