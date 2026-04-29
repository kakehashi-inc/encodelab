// XML エンティティ (5 種固定) のエスケープ / アンエスケープ自前実装
// & < > " ' のみ。それ以外の文字は変換しない。
const XML_ENCODE: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
};

const XML_DECODE: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
};

export function encodeXmlEntities(text: string): string {
    let out = '';
    for (const ch of text) {
        out += XML_ENCODE[ch] ?? ch;
    }
    return out;
}

export function decodeXmlEntities(text: string): string {
    return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, body: string) => {
        if (body.startsWith('#x') || body.startsWith('#X')) {
            const code = parseInt(body.slice(2), 16);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
        }
        if (body.startsWith('#')) {
            const code = parseInt(body.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
        }
        return XML_DECODE[body] ?? match;
    });
}
