// 各タイプの parse / serialize ハンドラ。
// parse: PaneValue → CanonicalValue (入力側)
// serialize: CanonicalValue → PaneValue (出力側)
//
// CanonicalValue が要求するドメインと一致しない場合は engine 側で adapt() してから渡す。
import type { CanonicalValue } from '@shared/conversion/domain';
import type { TypeId } from '@shared/conversion/catalog';
import { findType } from '@shared/conversion/catalog';
import type { PaneValue } from './pane-value';

import { encodeBase64, decodeBase64 } from './encoders/base64';
import { encodeBase32, decodeBase32 } from './encoders/base32';
import { encodeBase58, decodeBase58 } from './encoders/base58';
import { encodeAscii85, decodeAscii85 } from './encoders/ascii85';
import { encodeZ85, decodeZ85 } from './encoders/z85';
import { encodeCrockford32, decodeCrockford32 } from './encoders/crockford32';
import { encodeUrl, decodeUrl } from './escape/url';
import { encodeUnicodeEscape, decodeUnicodeEscape } from './escape/unicode';
import { encodeHtmlEntities, encodeHtmlEntitiesDecimal, decodeHtmlEntities } from './escape/html-entities';
import { encodeXmlEntities, decodeXmlEntities } from './escape/xml-entities';
import { serializeJson, parseJson } from './structured/json';
import { serializeYaml, parseYaml } from './structured/yaml';
import { encodeJsonString, decodeJsonString } from './structured/json-string';
import { encodeJsonByteArray, decodeJsonByteArray } from './structured/json-byte-array';
import { encodeHexString, decodeHexString } from './structured/hex-string';
import { encodeDataUrl, decodeDataUrl } from './binary/data-url';
import { generateQrCode, type QrOptions, DEFAULT_QR_OPTIONS } from './qr/generator';
import { readQrCode } from './qr/reader';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: false });

export type ConvertContext = {
    qrOptions?: QrOptions;
    // ハッシュ計算 / MIME 自動判定は main プロセスへ委譲する
    computeHash: (
        algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512',
        encoding: 'hex' | 'base64',
        bytes: Uint8Array
    ) => Promise<string>;
    detectMime: (bytes: Uint8Array) => Promise<{ mime?: string; ext?: string }>;
};

// 入力ペイン値 → CanonicalValue
export async function parsePane(typeId: TypeId, value: PaneValue): Promise<CanonicalValue> {
    const def = findType(typeId);
    if (def.outputOnly) {
        throw new Error(`Type ${typeId} is output-only`);
    }

    // 表示形式ごとの取り扱い
    switch (def.display) {
        case 'binary': {
            // 現状 binary 表示のタイプは binaryRaw のみ
            const bytes = value.kind === 'binary' ? value.bytes : new Uint8Array(0);
            return { kind: 'bytes', bytes };
        }
        case 'image': {
            // 現状 image 表示の入力タイプは QR コードのみ
            if (value.kind !== 'image') {
                throw new Error('Image input expects an image');
            }
            const result = await readQrCode(value.mime, value.bytes);
            return { kind: 'text', text: result.text };
        }
        case 'text': {
            const text = value.kind === 'text' ? value.text : '';
            return parseTextType(def.id, text);
        }
    }
}

function parseTextType(typeId: TypeId, text: string): CanonicalValue {
    switch (typeId) {
        case 'plain':
            return { kind: 'text', text };
        case 'base64':
            return { kind: 'bytes', bytes: decodeBase64(text) };
        case 'base32':
            return { kind: 'bytes', bytes: decodeBase32(text) };
        case 'base58':
            return { kind: 'bytes', bytes: decodeBase58(text) };
        case 'ascii85':
            return { kind: 'bytes', bytes: decodeAscii85(text) };
        case 'z85':
            return { kind: 'bytes', bytes: decodeZ85(text) };
        case 'urlEncoded':
            return { kind: 'text', text: decodeUrl(text) };
        case 'unicode':
            return { kind: 'text', text: decodeUnicodeEscape(text) };
        case 'htmlEntities':
        case 'htmlEntitiesDecimal':
            return { kind: 'text', text: decodeHtmlEntities(text) };
        case 'xmlEntities':
            return { kind: 'text', text: decodeXmlEntities(text) };
        case 'json':
            return { kind: 'structured', value: parseJson(text) };
        case 'yaml':
            return { kind: 'structured', value: parseYaml(text) };
        case 'jsonString':
            return { kind: 'text', text: decodeJsonString(text) };
        case 'jsonByteArray':
            return { kind: 'bytes', bytes: decodeJsonByteArray(text) };
        case 'hexString':
            return { kind: 'bytes', bytes: decodeHexString(text) };
        case 'integerDecimal': {
            const t = text.trim();
            if (t.length === 0) throw new Error('Empty integer input');
            if (!/^-?\d+$/.test(t)) throw new Error('Not a decimal integer');
            return { kind: 'integer', value: BigInt(t) };
        }
        case 'crockfordBase32':
            return { kind: 'integer', value: decodeCrockford32(text) };
        case 'dataUrl': {
            // dataUrl のドメインは bytes。MIME 情報は出力側で再判定するため落とす。
            const result = decodeDataUrl(text);
            return { kind: 'bytes', bytes: result.bytes };
        }
        default:
            throw new Error(`Unsupported input type: ${typeId}`);
    }
}

// CanonicalValue → 出力ペイン値
export async function serializePane(
    typeId: TypeId,
    canonical: CanonicalValue,
    ctx: ConvertContext
): Promise<PaneValue> {
    const def = findType(typeId);
    // ハッシュ系は engine.runConversion 側で先に処理されるためここには来ない
    switch (def.display) {
        case 'binary': {
            const bytes = ensureBytes(canonical);
            const detected = await ctx.detectMime(bytes);
            return {
                kind: 'binary',
                bytes,
                mime: detected.mime ?? 'application/octet-stream',
                name: detected.ext ? `output.${detected.ext}` : 'output.bin',
            };
        }
        case 'image': {
            // 現状 image 表示の出力タイプは QR コードのみ
            const text = canonical.kind === 'text' ? canonical.text : decodeUtf8(ensureBytes(canonical));
            const opts = ctx.qrOptions ?? DEFAULT_QR_OPTIONS;
            const result = await generateQrCode(text, opts);
            return { kind: 'image', mime: result.mime, bytes: result.bytes };
        }
        case 'text': {
            // dataUrl は MIME 自動判定が必要なため非同期で別途処理
            if (def.id === 'dataUrl') {
                const bytes = ensureBytes(canonical);
                const detected = await ctx.detectMime(bytes);
                const mime = detected.mime ?? 'application/octet-stream';
                return { kind: 'text', text: encodeDataUrl({ mime, bytes }) };
            }
            const text = serializeTextType(def.id, canonical);
            return { kind: 'text', text };
        }
    }
}

function serializeTextType(typeId: TypeId, canonical: CanonicalValue): string {
    switch (typeId) {
        case 'plain':
            return canonical.kind === 'text' ? canonical.text : decodeUtf8(ensureBytes(canonical));
        case 'base64':
            return encodeBase64(ensureBytes(canonical));
        case 'base32':
            return encodeBase32(ensureBytes(canonical));
        case 'base58':
            return encodeBase58(ensureBytes(canonical));
        case 'ascii85':
            return encodeAscii85(ensureBytes(canonical));
        case 'z85':
            return encodeZ85(ensureBytes(canonical));
        case 'urlEncoded':
            return encodeUrl(ensureText(canonical));
        case 'unicode':
            return encodeUnicodeEscape(ensureText(canonical));
        case 'htmlEntities':
            return encodeHtmlEntities(ensureText(canonical));
        case 'htmlEntitiesDecimal':
            return encodeHtmlEntitiesDecimal(ensureText(canonical));
        case 'xmlEntities':
            return encodeXmlEntities(ensureText(canonical));
        case 'json':
            return serializeJson(ensureStructured(canonical));
        case 'yaml':
            return serializeYaml(ensureStructured(canonical));
        case 'jsonString':
            return encodeJsonString(ensureText(canonical));
        case 'jsonByteArray':
            return encodeJsonByteArray(ensureBytes(canonical));
        case 'hexString':
            return encodeHexString(ensureBytes(canonical));
        case 'integerDecimal':
            return ensureInteger(canonical).toString();
        case 'crockfordBase32':
            return encodeCrockford32(ensureInteger(canonical));
        // dataUrl は serializePane 側で非同期処理 (MIME 自動判定が必要なため)
        default:
            throw new Error(`Unsupported output type: ${typeId}`);
    }
}

function ensureBytes(c: CanonicalValue): Uint8Array {
    if (c.kind === 'bytes') return c.bytes;
    if (c.kind === 'image') return c.bytes;
    if (c.kind === 'text') return textEncoder.encode(c.text);
    if (c.kind === 'structured') return textEncoder.encode(JSON.stringify(c.value));
    return textEncoder.encode(c.value.toString());
}

function ensureText(c: CanonicalValue): string {
    if (c.kind === 'text') return c.text;
    if (c.kind === 'bytes') return decodeUtf8(c.bytes);
    if (c.kind === 'image') return decodeUtf8(c.bytes);
    if (c.kind === 'structured') return JSON.stringify(c.value);
    return c.value.toString();
}

function ensureStructured(c: CanonicalValue): unknown {
    if (c.kind === 'structured') return c.value;
    if (c.kind === 'text') {
        const t = c.text.trim();
        try {
            return JSON.parse(t);
        } catch {
            return c.text;
        }
    }
    if (c.kind === 'integer') {
        if (c.value <= BigInt(Number.MAX_SAFE_INTEGER) && c.value >= BigInt(Number.MIN_SAFE_INTEGER)) {
            return Number(c.value);
        }
        return c.value.toString();
    }
    if (c.kind === 'bytes' || c.kind === 'image') {
        const t = decodeUtf8(c.bytes).trim();
        try {
            return JSON.parse(t);
        } catch {
            return decodeUtf8(c.bytes);
        }
    }
    return null;
}

function ensureInteger(c: CanonicalValue): bigint {
    if (c.kind === 'integer') return c.value;
    if (c.kind === 'text') {
        const t = c.text.trim();
        if (/^-?\d+$/.test(t)) return BigInt(t);
        throw new Error('Cannot convert to integer');
    }
    if (c.kind === 'bytes' || c.kind === 'image') {
        const t = decodeUtf8(c.bytes).trim();
        if (/^-?\d+$/.test(t)) return BigInt(t);
        throw new Error('Cannot convert to integer');
    }
    if (c.kind === 'structured') {
        if (typeof c.value === 'number') return BigInt(Math.trunc(c.value));
        if (typeof c.value === 'bigint') return c.value;
        if (typeof c.value === 'string' && /^-?\d+$/.test(c.value.trim())) return BigInt(c.value.trim());
    }
    throw new Error('Cannot convert to integer');
}

function decodeUtf8(bytes: Uint8Array): string {
    return textDecoder.decode(bytes);
}

export async function computeHashOf(typeId: TypeId, bytes: Uint8Array, ctx: ConvertContext): Promise<string> {
    switch (typeId) {
        case 'md5Hex':
            return ctx.computeHash('md5', 'hex', bytes);
        case 'md5Base64':
            return ctx.computeHash('md5', 'base64', bytes);
        case 'sha1Hex':
            return ctx.computeHash('sha1', 'hex', bytes);
        case 'sha1Base64':
            return ctx.computeHash('sha1', 'base64', bytes);
        case 'sha256Hex':
            return ctx.computeHash('sha256', 'hex', bytes);
        case 'sha256Base64':
            return ctx.computeHash('sha256', 'base64', bytes);
        case 'sha512Hex':
            return ctx.computeHash('sha512', 'hex', bytes);
        case 'sha512Base64':
            return ctx.computeHash('sha512', 'base64', bytes);
        default:
            throw new Error(`Unknown hash type: ${typeId}`);
    }
}
