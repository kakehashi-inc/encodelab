// バイト列がテキスト (UTF-8) として表示可能かを推定する。
//
// 判定条件:
//   1. UTF-8 として厳密にデコードできる (不正バイトを含まない)
//   2. NUL (0x00) を含まない
//   3. 制御文字 (タブ・改行・キャリッジリターン以外の C0 / C1) の比率が低い
//
// 大きなバイナリでもパフォーマンスが落ちないよう、先頭の一定バイトのみサンプル評価する。

const SAMPLE_BYTES = 8192;
const CONTROL_RATIO_THRESHOLD = 0.05;

export function looksLikeText(bytes: Uint8Array): boolean {
    if (bytes.byteLength === 0) return false;

    const sample = bytes.subarray(0, Math.min(bytes.byteLength, SAMPLE_BYTES));

    let text: string;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(sample);
    } catch {
        return false;
    }

    if (text.length === 0) return false;

    let controlCount = 0;
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i);
        if (code === 0x00) return false;
        // 印字可能制御文字 (\t \n \r) は除外し、それ以外の C0 / C1 をカウント
        if ((code >= 0x01 && code <= 0x08) || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f)) {
            controlCount += 1;
        } else if (code >= 0x7f && code <= 0x9f) {
            controlCount += 1;
        }
    }

    return controlCount / text.length < CONTROL_RATIO_THRESHOLD;
}

export function decodeAsText(bytes: Uint8Array): string {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}
