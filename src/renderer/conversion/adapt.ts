// CanonicalValue 間のドメイン変換。
// 各タイプが要求するドメインに合わせて変換する。
import type { CanonicalKind, CanonicalValue } from '@shared/conversion/domain';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: false });

export function adapt(canonical: CanonicalValue, target: CanonicalKind): CanonicalValue {
    if (canonical.kind === target) return canonical;

    switch (target) {
        case 'text':
            return { kind: 'text', text: toText(canonical) };
        case 'bytes':
            return { kind: 'bytes', bytes: toBytes(canonical) };
        case 'structured':
            return { kind: 'structured', value: toStructured(canonical) };
        case 'integer':
            return { kind: 'integer', value: toInteger(canonical) };
        case 'image':
            return toImage(canonical);
        default:
            return canonical;
    }
}

function toText(c: CanonicalValue): string {
    switch (c.kind) {
        case 'text':
            return c.text;
        case 'bytes':
            return textDecoder.decode(c.bytes);
        case 'structured':
            return JSON.stringify(c.value);
        case 'integer':
            return c.value.toString();
        case 'image':
            // 画像バイト列を UTF-8 として解釈する。意味的には QR テキストなどに限定される。
            return textDecoder.decode(c.bytes);
    }
}

function toBytes(c: CanonicalValue): Uint8Array {
    switch (c.kind) {
        case 'bytes':
            return c.bytes;
        case 'text':
            return textEncoder.encode(c.text);
        case 'structured':
            return textEncoder.encode(JSON.stringify(c.value));
        case 'integer':
            return textEncoder.encode(c.value.toString());
        case 'image':
            return c.bytes;
    }
}

function toStructured(c: CanonicalValue): unknown {
    switch (c.kind) {
        case 'structured':
            return c.value;
        case 'text':
            return tryJsonParse(c.text);
        case 'bytes':
            return tryJsonParse(textDecoder.decode(c.bytes));
        case 'integer':
            // BigInt は JSON 互換ではないため、安全範囲なら number、それ以外は文字列として表す
            if (c.value <= BigInt(Number.MAX_SAFE_INTEGER) && c.value >= BigInt(Number.MIN_SAFE_INTEGER)) {
                return Number(c.value);
            }
            return c.value.toString();
        case 'image':
            return tryJsonParse(textDecoder.decode(c.bytes));
    }
}

function toInteger(c: CanonicalValue): bigint {
    switch (c.kind) {
        case 'integer':
            return c.value;
        case 'text':
            return parseIntegerText(c.text);
        case 'bytes':
            return parseIntegerText(textDecoder.decode(c.bytes));
        case 'structured':
            if (typeof c.value === 'number') return BigInt(Math.trunc(c.value));
            if (typeof c.value === 'bigint') return c.value;
            if (typeof c.value === 'string') return parseIntegerText(c.value);
            throw new Error('Cannot convert structured value to integer');
        case 'image':
            return parseIntegerText(textDecoder.decode(c.bytes));
    }
}

function toImage(c: CanonicalValue): CanonicalValue {
    if (c.kind === 'image') return c;
    if (c.kind === 'bytes') return { kind: 'image', mime: 'application/octet-stream', bytes: c.bytes };
    if (c.kind === 'text') return { kind: 'image', mime: 'text/plain', bytes: textEncoder.encode(c.text) };
    if (c.kind === 'structured')
        return { kind: 'image', mime: 'application/json', bytes: textEncoder.encode(JSON.stringify(c.value)) };
    if (c.kind === 'integer')
        return { kind: 'image', mime: 'text/plain', bytes: textEncoder.encode(c.value.toString()) };
    throw new Error('Cannot adapt to image');
}

function tryJsonParse(text: string): unknown {
    const trimmed = text.trim();
    if (trimmed.length === 0) return null;
    try {
        return JSON.parse(trimmed);
    } catch {
        // JSON ではない場合は単なる文字列とみなす
        return text;
    }
}

function parseIntegerText(text: string): bigint {
    const t = text.trim();
    if (t.length === 0) throw new Error('Empty integer text');
    // 16/8/2 進接頭辞も受け付ける
    if (/^-?0x[0-9a-fA-F]+$/.test(t)) return BigInt(t);
    if (/^-?0o[0-7]+$/.test(t)) return BigInt(t);
    if (/^-?0b[01]+$/.test(t)) return BigInt(t);
    if (/^-?\d+$/.test(t)) return BigInt(t);
    throw new Error(`Not an integer: ${t}`);
}
