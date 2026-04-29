// URL エンコード / デコード
// 標準的な URI コンポーネント仕様 (RFC 3986) に従う。
// 注: '+' は空白に変換しない (それはフォームエンコーディング =
// application/x-www-form-urlencoded の仕様であり、汎用 URL コンポーネントの仕様ではない)。
export function encodeUrl(text: string): string {
    return encodeURIComponent(text);
}

export function decodeUrl(text: string): string {
    return decodeURIComponent(text);
}
