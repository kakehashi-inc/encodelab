// YAML 1.2 互換のサブセット (JSON 相当のデータ構造) の自前実装
//
// シリアライズ:
//   - object/array を YAML ブロックスタイルで出力
//   - プリミティブ (null / bool / number / string) はインライン
//   - 文字列は必要に応じてダブルクォートで囲む
//   - 空 object は {}, 空 array は [] (フロースタイル) で出力
//
// パース:
//   - インデントベースの block-mapping / block-sequence を解釈
//   - フロースタイル ([..], {..}) は内部で JSON 的に解釈
//   - シングル/ダブルクォート、プレーンスカラー (null / bool / int / float / string)
//   - '#' コメント、'---' '...' ドキュメント区切りはスキップ
//   - リテラルブロック '|' / フォールドブロック '>' (基本対応)
//
// 注意: 本実装は完全な YAML 1.2 仕様の実装ではない。
// 代表的な構造は扱えるが、アンカー/エイリアス、タグ、複数ドキュメント、複雑な
// マルチライン解釈などは省略している。

// ==================== Serialize ====================

const PLAIN_SAFE = /^[A-Za-z_][A-Za-z0-9_\-./]*$/;

function needsQuoting(text: string): boolean {
    if (text.length === 0) return true;
    if (!PLAIN_SAFE.test(text)) return true;
    // YAML で特別な意味を持つ単語
    const lower = text.toLowerCase();
    if (
        lower === 'null' ||
        lower === '~' ||
        lower === 'true' ||
        lower === 'false' ||
        lower === 'yes' ||
        lower === 'no' ||
        lower === 'on' ||
        lower === 'off'
    ) {
        return true;
    }
    // 数字のように見えるとパースが曖昧になる
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text)) return true;
    return false;
}

function quoteString(text: string): string {
    // ダブルクォート文字列としてエスケープ
    let out = '"';
    for (const ch of text) {
        const code = ch.codePointAt(0)!;
        switch (ch) {
            case '"':
                out += '\\"';
                break;
            case '\\':
                out += '\\\\';
                break;
            case '\n':
                out += '\\n';
                break;
            case '\r':
                out += '\\r';
                break;
            case '\t':
                out += '\\t';
                break;
            default:
                if (code < 0x20) {
                    out += '\\x' + code.toString(16).padStart(2, '0');
                } else {
                    out += ch;
                }
        }
    }
    out += '"';
    return out;
}

function serializeScalar(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') {
        if (Number.isNaN(value)) return '.nan';
        if (!Number.isFinite(value)) return value > 0 ? '.inf' : '-.inf';
        return String(value);
    }
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'string') {
        return needsQuoting(value) ? quoteString(value) : value;
    }
    return quoteString(String(value));
}

function serializeNode(value: unknown, indent: number): string {
    const pad = ' '.repeat(indent);
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        let out = '';
        for (const item of value) {
            if (isContainer(item)) {
                if (Array.isArray(item) && item.length === 0) {
                    out += pad + '- []\n';
                } else if (!Array.isArray(item) && Object.keys(item as object).length === 0) {
                    out += pad + '- {}\n';
                } else {
                    out += pad + '-\n' + serializeNode(item, indent + 2);
                }
            } else {
                out += pad + '- ' + serializeScalar(item) + '\n';
            }
        }
        return out;
    }
    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        let out = '';
        for (const key of keys) {
            const v = obj[key];
            const k = needsQuoting(key) ? quoteString(key) : key;
            if (isContainer(v)) {
                if (Array.isArray(v) && v.length === 0) {
                    out += pad + k + ': []\n';
                } else if (!Array.isArray(v) && Object.keys(v as object).length === 0) {
                    out += pad + k + ': {}\n';
                } else {
                    out += pad + k + ':\n' + serializeNode(v, indent + 2);
                }
            } else {
                out += pad + k + ': ' + serializeScalar(v) + '\n';
            }
        }
        return out;
    }
    // スカラー単独
    return pad + serializeScalar(value) + '\n';
}

function isContainer(v: unknown): v is object {
    return v !== null && typeof v === 'object';
}

export function serializeYaml(value: unknown): string {
    if (!isContainer(value)) {
        return serializeScalar(value) + '\n';
    }
    return serializeNode(value, 0);
}

// ==================== Parse ====================

type Line = { indent: number; text: string; raw: string };

function tokenizeLines(input: string): Line[] {
    const lines: Line[] = [];
    const rawLines = input.replace(/\r\n?/g, '\n').split('\n');
    for (const raw of rawLines) {
        // コメント除去 ('#' は文字列内かどうか厳密に判定する必要があるが、簡略化のためインライン処理時に行う)
        if (/^\s*$/.test(raw)) continue;
        if (/^\s*#/.test(raw)) continue;
        if (/^\s*---/.test(raw)) continue;
        if (/^\s*\.\.\./.test(raw)) continue;
        const m = raw.match(/^(\s*)(.*)$/);
        if (!m) continue;
        lines.push({ indent: m[1].length, text: m[2], raw });
    }
    return lines;
}

function stripInlineComment(text: string): string {
    // インラインコメント '#' の判定。シングル/ダブルクォート内は無視。
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (ch === '"' && !inSingle) inDouble = !inDouble;
        else if (ch === "'" && !inDouble) inSingle = !inSingle;
        else if (ch === '#' && !inSingle && !inDouble) {
            if (i === 0 || /\s/.test(text[i - 1])) {
                return text.slice(0, i).replace(/\s+$/, '');
            }
        }
    }
    return text;
}

function parseScalar(text: string): unknown {
    const t = text.trim();
    if (t.length === 0) return null;

    if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
        return parseDoubleQuoted(t.slice(1, -1));
    }
    if (t.startsWith("'") && t.endsWith("'") && t.length >= 2) {
        return parseSingleQuoted(t.slice(1, -1));
    }
    if (t.startsWith('[') || t.startsWith('{')) {
        // フロースタイルは JSON ライクとして処理する (簡易)
        return parseFlow(t);
    }

    // null / bool
    if (t === '~' || t === 'null' || t === 'Null' || t === 'NULL') return null;
    if (t === 'true' || t === 'True' || t === 'TRUE') return true;
    if (t === 'false' || t === 'False' || t === 'FALSE') return false;

    // 数値
    if (/^-?\d+$/.test(t)) {
        const n = Number(t);
        if (Number.isSafeInteger(n)) return n;
        // 大きい整数は文字列として扱う
        return t;
    }
    if (/^-?\d+\.\d+([eE][+-]?\d+)?$/.test(t)) return Number(t);
    if (/^-?\.\d+([eE][+-]?\d+)?$/.test(t)) return Number(t);
    if (t === '.inf' || t === '.Inf' || t === '.INF') return Infinity;
    if (t === '-.inf' || t === '-.Inf' || t === '-.INF') return -Infinity;
    if (t === '.nan' || t === '.NaN' || t === '.NAN') return NaN;

    return t;
}

function parseDoubleQuoted(body: string): string {
    let out = '';
    let i = 0;
    while (i < body.length) {
        const ch = body[i];
        if (ch === '\\' && i + 1 < body.length) {
            const next = body[i + 1];
            switch (next) {
                case 'n':
                    out += '\n';
                    i += 2;
                    continue;
                case 't':
                    out += '\t';
                    i += 2;
                    continue;
                case 'r':
                    out += '\r';
                    i += 2;
                    continue;
                case '\\':
                    out += '\\';
                    i += 2;
                    continue;
                case '"':
                    out += '"';
                    i += 2;
                    continue;
                case '0':
                    out += '\0';
                    i += 2;
                    continue;
                case 'x': {
                    const hex = body.slice(i + 2, i + 4);
                    if (/^[0-9a-fA-F]{2}$/.test(hex)) {
                        out += String.fromCharCode(parseInt(hex, 16));
                        i += 4;
                        continue;
                    }
                    break;
                }
                case 'u': {
                    const hex = body.slice(i + 2, i + 6);
                    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                        out += String.fromCharCode(parseInt(hex, 16));
                        i += 6;
                        continue;
                    }
                    break;
                }
                default:
                    break;
            }
            out += next;
            i += 2;
        } else {
            out += ch;
            i += 1;
        }
    }
    return out;
}

function parseSingleQuoted(body: string): string {
    // YAML シングルクォートは '' で ' を表現する
    return body.replace(/''/g, "'");
}

// 簡易フロー (JSON 互換) パーサ
function parseFlow(text: string): unknown {
    // YAML フローは JSON とほぼ互換だが、キーがクォート無しの場合がある
    // 最小限の対応として、まず JSON.parse を試し、失敗時はキーをクォートで補完して再試行
    try {
        return JSON.parse(text);
    } catch {
        const transformed = text.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_\-.]*)(\s*:)/g, '$1"$2"$3');
        try {
            return JSON.parse(transformed);
        } catch {
            // それでも失敗した場合は文字列として返す
            return text;
        }
    }
}

type Cursor = { i: number };

function parseBlock(lines: Line[], cur: Cursor, parentIndent: number): unknown {
    if (cur.i >= lines.length) return null;
    const first = lines[cur.i];
    if (first.indent <= parentIndent) return null;
    const indent = first.indent;
    const text = stripInlineComment(first.text);

    if (text.startsWith('- ') || text === '-') {
        return parseSequence(lines, cur, indent);
    }
    return parseMapping(lines, cur, indent);
}

function parseSequence(lines: Line[], cur: Cursor, indent: number): unknown[] {
    const result: unknown[] = [];
    while (cur.i < lines.length) {
        const line = lines[cur.i];
        if (line.indent < indent) break;
        if (line.indent > indent) break;
        const text = stripInlineComment(line.text);
        if (!text.startsWith('-')) break;
        const after = text === '-' ? '' : text.slice(2);
        cur.i += 1;
        if (after.trim().length === 0) {
            // ネストしたブロック値
            result.push(parseBlock(lines, cur, indent) ?? null);
        } else if (/^[A-Za-z_"][^:]*:(\s|$)/.test(after) || /^"[^"]*":(\s|$)/.test(after)) {
            // インラインで開始する mapping (例: "- key: value")
            // 仮想的にインデントを進めた行として扱う
            const virtualIndent = indent + 2;
            const synthetic: Line = { indent: virtualIndent, text: after, raw: line.raw };
            const stash = cur.i;
            const merged: Line[] = [...lines.slice(0, cur.i), synthetic, ...lines.slice(cur.i)];
            const c2: Cursor = { i: stash };
            const value = parseMapping(merged, c2, virtualIndent);
            cur.i = c2.i - 1; // 仮想行を消費した分を戻す
            result.push(value);
        } else {
            result.push(parseScalar(after));
        }
    }
    return result;
}

function parseMapping(lines: Line[], cur: Cursor, indent: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    while (cur.i < lines.length) {
        const line = lines[cur.i];
        if (line.indent < indent) break;
        if (line.indent > indent) break;
        const text = stripInlineComment(line.text);
        const m = matchMappingKey(text);
        if (!m) break;
        const { key, rest, isBlockScalar, blockScalarType } = m;
        cur.i += 1;
        if (isBlockScalar && blockScalarType) {
            const value = consumeBlockScalar(lines, cur, indent, blockScalarType);
            result[key] = value;
        } else if (rest.length === 0) {
            result[key] = parseBlock(lines, cur, indent) ?? null;
        } else {
            result[key] = parseScalar(rest);
        }
    }
    return result;
}

function consumeBlockScalar(lines: Line[], cur: Cursor, indent: number, mode: '|' | '>'): string {
    // 簡易 block scalar 実装
    // mode '|' : 改行を保持 / '>' : 改行を空白に折り畳む
    const collected: string[] = [];
    let blockIndent: number | null = null;
    while (cur.i < lines.length) {
        const line = lines[cur.i];
        if (line.indent <= indent && line.text.length > 0) break;
        if (blockIndent === null && line.text.length > 0) blockIndent = line.indent;
        const slice = blockIndent !== null ? line.raw.slice(blockIndent) : '';
        collected.push(slice);
        cur.i += 1;
    }
    if (mode === '|') return collected.join('\n');
    return collected.join(' ').replace(/\s+/g, ' ').trim();
}

function matchMappingKey(text: string): {
    key: string;
    rest: string;
    isBlockScalar: boolean;
    blockScalarType?: '|' | '>';
} | null {
    // クォート付きキー
    if (text.startsWith('"')) {
        const end = findClosingQuote(text, 0, '"');
        if (end < 0) return null;
        if (text[end + 1] !== ':') return null;
        const key = parseDoubleQuoted(text.slice(1, end));
        const rest = text.slice(end + 2).trim();
        return resolveBlockScalar(key, rest);
    }
    if (text.startsWith("'")) {
        const end = findClosingQuote(text, 0, "'");
        if (end < 0) return null;
        if (text[end + 1] !== ':') return null;
        const key = parseSingleQuoted(text.slice(1, end));
        const rest = text.slice(end + 2).trim();
        return resolveBlockScalar(key, rest);
    }
    const colon = findKeyColon(text);
    if (colon < 0) return null;
    const key = text.slice(0, colon).trim();
    const rest = text.slice(colon + 1).trim();
    return resolveBlockScalar(key, rest);
}

function resolveBlockScalar(
    key: string,
    rest: string
): { key: string; rest: string; isBlockScalar: boolean; blockScalarType?: '|' | '>' } {
    if (rest === '|') return { key, rest: '', isBlockScalar: true, blockScalarType: '|' };
    if (rest === '>') return { key, rest: '', isBlockScalar: true, blockScalarType: '>' };
    return { key, rest, isBlockScalar: false };
}

function findClosingQuote(text: string, from: number, quote: '"' | "'"): number {
    let i = from + 1;
    while (i < text.length) {
        if (quote === '"' && text[i] === '\\') {
            i += 2;
            continue;
        }
        if (text[i] === quote) {
            if (quote === "'" && text[i + 1] === "'") {
                i += 2;
                continue;
            }
            return i;
        }
        i += 1;
    }
    return -1;
}

function findKeyColon(text: string): number {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (ch === '"' && !inSingle) inDouble = !inDouble;
        else if (ch === "'" && !inDouble) inSingle = !inSingle;
        else if (ch === ':' && !inSingle && !inDouble) {
            // 後続が空白か行末でなければマッピング区切りではない
            if (i === text.length - 1) return i;
            if (text[i + 1] === ' ' || text[i + 1] === '\t') return i;
        }
    }
    return -1;
}

export function parseYaml(input: string): unknown {
    const trimmed = input.trim();
    if (trimmed.length === 0) return null;

    // 完全フロー (1 行で [..] か {..}) は JSON 経由で処理
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        return parseFlow(trimmed);
    }

    const lines = tokenizeLines(input);
    if (lines.length === 0) return null;

    // 最浅インデントを基準に
    const baseIndent = Math.min(...lines.map(l => l.indent));
    const cur: Cursor = { i: 0 };
    const text = stripInlineComment(lines[0].text);
    if (text.startsWith('- ') || text === '-') {
        return parseSequence(lines, cur, baseIndent);
    }
    if (matchMappingKey(text)) {
        return parseMapping(lines, cur, baseIndent);
    }
    // 単一スカラー
    return parseScalar(text);
}
