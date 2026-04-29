// Unicode エスケープ (\uXXXX 形式) 自前実装
// - 入力文字列を UTF-16 コード単位ごとにエスケープ
// - ASCII 範囲 (0x20-0x7E) はそのまま (制御文字 \\t \\n \\r 等もエスケープ対象に含める)

export function encodeUnicodeEscape(text: string): string {
    let out = '';
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i);
        if (code >= 0x20 && code <= 0x7e && code !== 0x5c) {
            // バックスラッシュ自体はエスケープして識別性を確保する
            out += text[i];
        } else if (code === 0x5c) {
            out += '\\\\';
        } else {
            out += '\\u' + code.toString(16).padStart(4, '0');
        }
    }
    return out;
}

// \\uXXXX / \\\\ / \\n 等のエスケープを解除する。
// 想定外のエスケープは元の文字列を維持する (寛容デコード)。
export function decodeUnicodeEscape(text: string): string {
    let out = '';
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (ch === '\\' && i + 1 < text.length) {
            const next = text[i + 1];
            if (next === 'u') {
                // \\uXXXX または \\u{XXXXX...}
                if (text[i + 2] === '{') {
                    const end = text.indexOf('}', i + 3);
                    if (end > i + 3) {
                        const hex = text.slice(i + 3, end);
                        if (/^[0-9a-fA-F]+$/.test(hex)) {
                            const code = parseInt(hex, 16);
                            try {
                                out += String.fromCodePoint(code);
                                i = end + 1;
                                continue;
                            } catch {
                                // フォールスルーして literal 扱い
                            }
                        }
                    }
                } else if (i + 6 <= text.length) {
                    const hex = text.slice(i + 2, i + 6);
                    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                        const code = parseInt(hex, 16);
                        out += String.fromCharCode(code);
                        i += 6;
                        continue;
                    }
                }
            } else if (next === 'x' && i + 4 <= text.length) {
                const hex = text.slice(i + 2, i + 4);
                if (/^[0-9a-fA-F]{2}$/.test(hex)) {
                    out += String.fromCharCode(parseInt(hex, 16));
                    i += 4;
                    continue;
                }
            } else if (next === 'n') {
                out += '\n';
                i += 2;
                continue;
            } else if (next === 'r') {
                out += '\r';
                i += 2;
                continue;
            } else if (next === 't') {
                out += '\t';
                i += 2;
                continue;
            } else if (next === '\\') {
                out += '\\';
                i += 2;
                continue;
            } else if (next === '"') {
                out += '"';
                i += 2;
                continue;
            } else if (next === "'") {
                out += "'";
                i += 2;
                continue;
            } else if (next === '0') {
                out += '\0';
                i += 2;
                continue;
            }
        }
        out += ch;
        i += 1;
    }
    return out;
}
