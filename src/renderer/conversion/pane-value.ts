// 各ペインが保持する値。Display Kind と直接対応する。
//
// - text:   テキストエリアの内容
// - binary: ファイル選択 UI の状態 (バイト列 + 元ファイル名 + MIME)
// - image:  画像表示領域 (バイト列 + MIME)
// - empty:  値なし
export type PaneValue =
    | { kind: 'text'; text: string }
    | { kind: 'binary'; name: string; mime: string; bytes: Uint8Array }
    | { kind: 'image'; mime: string; bytes: Uint8Array }
    | { kind: 'empty' };

export const EMPTY_PANE_VALUE: PaneValue = { kind: 'empty' };

export function paneIsEmpty(value: PaneValue): boolean {
    if (value.kind === 'empty') return true;
    if (value.kind === 'text') return value.text.length === 0;
    if (value.kind === 'binary') return value.bytes.byteLength === 0;
    if (value.kind === 'image') return value.bytes.byteLength === 0;
    return true;
}
