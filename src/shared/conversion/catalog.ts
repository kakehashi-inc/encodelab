// カテゴリ ID
export type CategoryId = 'text' | 'encoded' | 'escape' | 'structured' | 'integer' | 'binary' | 'hash' | 'image';

// タイプ ID
export type TypeId =
    // text
    | 'plain'
    // encoded
    | 'base64'
    | 'base32'
    | 'base58'
    | 'ascii85'
    | 'z85'
    // escape
    | 'urlEncoded'
    | 'unicode'
    | 'htmlEntities'
    | 'htmlEntitiesDecimal'
    | 'xmlEntities'
    // structured
    | 'json'
    | 'yaml'
    | 'jsonString'
    | 'jsonByteArray'
    | 'hexString'
    // integer
    | 'integerDecimal'
    | 'crockfordBase32'
    // binary
    | 'binaryRaw'
    | 'dataUrl'
    // hash (output only)
    | 'md5Hex'
    | 'md5Base64'
    | 'sha1Hex'
    | 'sha1Base64'
    | 'sha256Hex'
    | 'sha256Base64'
    | 'sha512Hex'
    | 'sha512Base64'
    // image
    | 'qrCode';

// データ表示領域の種別 (UI が切り替わる単位)
export type DisplayKind = 'text' | 'binary' | 'image';

// 内部正規形ドメイン
// - bytes: Uint8Array が一義的な表現
// - text:  文字列が一義的な表現
// - structured: JS の値 (object / array / primitive)
// - integer: bigint
// - image: { mime, bytes } 形式
export type Domain = 'bytes' | 'text' | 'structured' | 'integer' | 'image';

export type TypeDefinition = {
    id: TypeId;
    category: CategoryId;
    // i18n キーのサフィックス。実テキストは renderer 側 i18n で解決する
    labelKey: string;
    // データ表示領域の種別
    display: DisplayKind;
    // 内部正規形ドメイン
    domain: Domain;
    // 出力専用かどうか (hash 系)
    outputOnly?: boolean;
};

export type CategoryDefinition = {
    id: CategoryId;
    labelKey: string;
    types: TypeDefinition[];
};

export const CATEGORIES: CategoryDefinition[] = [
    {
        id: 'text',
        labelKey: 'category.text',
        types: [{ id: 'plain', category: 'text', labelKey: 'type.plain', display: 'text', domain: 'text' }],
    },
    {
        id: 'encoded',
        labelKey: 'category.encoded',
        types: [
            { id: 'base64', category: 'encoded', labelKey: 'type.base64', display: 'text', domain: 'bytes' },
            { id: 'base32', category: 'encoded', labelKey: 'type.base32', display: 'text', domain: 'bytes' },
            { id: 'base58', category: 'encoded', labelKey: 'type.base58', display: 'text', domain: 'bytes' },
            { id: 'ascii85', category: 'encoded', labelKey: 'type.ascii85', display: 'text', domain: 'bytes' },
            { id: 'z85', category: 'encoded', labelKey: 'type.z85', display: 'text', domain: 'bytes' },
        ],
    },
    {
        id: 'escape',
        labelKey: 'category.escape',
        types: [
            {
                id: 'urlEncoded',
                category: 'escape',
                labelKey: 'type.urlEncoded',
                display: 'text',
                domain: 'text',
            },
            { id: 'unicode', category: 'escape', labelKey: 'type.unicode', display: 'text', domain: 'text' },
            {
                id: 'htmlEntities',
                category: 'escape',
                labelKey: 'type.htmlEntities',
                display: 'text',
                domain: 'text',
            },
            {
                id: 'htmlEntitiesDecimal',
                category: 'escape',
                labelKey: 'type.htmlEntitiesDecimal',
                display: 'text',
                domain: 'text',
            },
            {
                id: 'xmlEntities',
                category: 'escape',
                labelKey: 'type.xmlEntities',
                display: 'text',
                domain: 'text',
            },
        ],
    },
    {
        id: 'structured',
        labelKey: 'category.structured',
        types: [
            { id: 'json', category: 'structured', labelKey: 'type.json', display: 'text', domain: 'structured' },
            { id: 'yaml', category: 'structured', labelKey: 'type.yaml', display: 'text', domain: 'structured' },
            {
                id: 'jsonString',
                category: 'structured',
                labelKey: 'type.jsonString',
                display: 'text',
                domain: 'text',
            },
            {
                id: 'jsonByteArray',
                category: 'structured',
                labelKey: 'type.jsonByteArray',
                display: 'text',
                domain: 'bytes',
            },
            {
                id: 'hexString',
                category: 'structured',
                labelKey: 'type.hexString',
                display: 'text',
                domain: 'bytes',
            },
        ],
    },
    {
        id: 'integer',
        labelKey: 'category.integer',
        types: [
            {
                id: 'integerDecimal',
                category: 'integer',
                labelKey: 'type.integerDecimal',
                display: 'text',
                domain: 'integer',
            },
            {
                id: 'crockfordBase32',
                category: 'integer',
                labelKey: 'type.crockfordBase32',
                display: 'text',
                domain: 'integer',
            },
        ],
    },
    {
        id: 'binary',
        labelKey: 'category.binary',
        types: [
            { id: 'binaryRaw', category: 'binary', labelKey: 'type.binaryRaw', display: 'binary', domain: 'bytes' },
            { id: 'dataUrl', category: 'binary', labelKey: 'type.dataUrl', display: 'text', domain: 'bytes' },
        ],
    },
    {
        id: 'hash',
        labelKey: 'category.hash',
        types: [
            {
                id: 'md5Hex',
                category: 'hash',
                labelKey: 'type.md5Hex',
                display: 'text',
                domain: 'text',
                outputOnly: true,
            },
            {
                id: 'md5Base64',
                category: 'hash',
                labelKey: 'type.md5Base64',
                display: 'text',
                domain: 'text',
                outputOnly: true,
            },
            {
                id: 'sha1Hex',
                category: 'hash',
                labelKey: 'type.sha1Hex',
                display: 'text',
                domain: 'text',
                outputOnly: true,
            },
            {
                id: 'sha1Base64',
                category: 'hash',
                labelKey: 'type.sha1Base64',
                display: 'text',
                domain: 'text',
                outputOnly: true,
            },
            {
                id: 'sha256Hex',
                category: 'hash',
                labelKey: 'type.sha256Hex',
                display: 'text',
                domain: 'text',
                outputOnly: true,
            },
            {
                id: 'sha256Base64',
                category: 'hash',
                labelKey: 'type.sha256Base64',
                display: 'text',
                domain: 'text',
                outputOnly: true,
            },
            {
                id: 'sha512Hex',
                category: 'hash',
                labelKey: 'type.sha512Hex',
                display: 'text',
                domain: 'text',
                outputOnly: true,
            },
            {
                id: 'sha512Base64',
                category: 'hash',
                labelKey: 'type.sha512Base64',
                display: 'text',
                domain: 'text',
                outputOnly: true,
            },
        ],
    },
    {
        id: 'image',
        labelKey: 'category.image',
        types: [{ id: 'qrCode', category: 'image', labelKey: 'type.qrCode', display: 'image', domain: 'text' }],
    },
];

const TYPES_BY_ID: Record<string, TypeDefinition> = (() => {
    const map: Record<string, TypeDefinition> = {};
    for (const c of CATEGORIES) {
        for (const t of c.types) {
            map[t.id] = t;
        }
    }
    return map;
})();

export function findType(id: TypeId): TypeDefinition {
    const t = TYPES_BY_ID[id];
    if (!t) throw new Error(`Unknown type id: ${id}`);
    return t;
}

export function findCategory(id: CategoryId): CategoryDefinition {
    const c = CATEGORIES.find(x => x.id === id);
    if (!c) throw new Error(`Unknown category id: ${id}`);
    return c;
}

export function defaultTypeOfCategory(category: CategoryId): TypeId {
    return findCategory(category).types[0].id;
}
