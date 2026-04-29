// 変換エンジンが扱う正規形 (Canonical Value)
// 各タイプは parse/serialize でこの正規形と相互変換する。
//
// kind:
//   - 'bytes':      Uint8Array (任意のバイト列)
//   - 'text':       string (UTF-8 文字列)
//   - 'structured': JS の値 (object / array / primitive)。JSON 互換を想定
//   - 'integer':    bigint (任意精度整数)
//   - 'image':      画像バイト列 + MIME (バイナリ系/QR で利用)
export type CanonicalValue =
    | { kind: 'bytes'; bytes: Uint8Array }
    | { kind: 'text'; text: string }
    | { kind: 'structured'; value: unknown }
    | { kind: 'integer'; value: bigint }
    | { kind: 'image'; mime: string; bytes: Uint8Array };

export type CanonicalKind = CanonicalValue['kind'];
