// HTML エンティティのエスケープ / アンエスケープ自前実装
// "通常" モードと "10 進数値文字参照のみ" モードを併せて提供する。
//
// 名前付きエンティティの最低限のセットを内蔵。
// Decimal モードは ASCII を除く全文字を &#NNN; に置換する。

const NAMED_ENCODE: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
    ' ': '&nbsp;',
};

// 名前付きエンティティの一部 (デコード用)。網羅性は限定的。
const NAMED_DECODE: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    copy: '©',
    reg: '®',
    trade: '™',
    hellip: '…',
    mdash: '—',
    ndash: '–',
    laquo: '«',
    raquo: '»',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
    yen: '¥',
    euro: '€',
    pound: '£',
    cent: '¢',
    sect: '§',
    para: '¶',
    middot: '·',
    deg: '°',
    plusmn: '±',
    times: '×',
    divide: '÷',
};

// 通常モード: 名前付きを優先、未知の非 ASCII は &#NNN; に変換
export function encodeHtmlEntities(text: string): string {
    let out = '';
    for (const ch of text) {
        if (NAMED_ENCODE[ch]) {
            out += NAMED_ENCODE[ch];
            continue;
        }
        const code = ch.codePointAt(0)!;
        if (code < 0x20 || code > 0x7e) {
            out += '&#' + code.toString(10) + ';';
        } else {
            out += ch;
        }
    }
    return out;
}

// Decimal モード: <, >, &, ", ' などの構造文字も全て &#NNN; に変換
export function encodeHtmlEntitiesDecimal(text: string): string {
    let out = '';
    for (const ch of text) {
        const code = ch.codePointAt(0)!;
        // ASCII 印字可能文字でかつ "&" "<" ">" "'" '"' を除いたものはそのまま
        const isSafeAscii = code >= 0x20 && code <= 0x7e && '&<>"\''.indexOf(ch) === -1;
        if (isSafeAscii) {
            out += ch;
        } else {
            out += '&#' + code.toString(10) + ';';
        }
    }
    return out;
}

export function decodeHtmlEntities(text: string): string {
    return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, body: string) => {
        if (body.startsWith('#x') || body.startsWith('#X')) {
            const code = parseInt(body.slice(2), 16);
            if (Number.isFinite(code)) return safeFromCodePoint(code);
        } else if (body.startsWith('#')) {
            const code = parseInt(body.slice(1), 10);
            if (Number.isFinite(code)) return safeFromCodePoint(code);
        } else {
            const value = NAMED_DECODE[body];
            if (value !== undefined) return value;
        }
        return match;
    });
}

function safeFromCodePoint(code: number): string {
    if (code < 0 || code > 0x10ffff) return '';
    try {
        return String.fromCodePoint(code);
    } catch {
        return '';
    }
}
