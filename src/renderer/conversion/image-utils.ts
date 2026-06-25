// 画像読取系 (QR / バーコード) で共通利用するラスタライズ補助。
//
// - バイト列 + MIME から HTMLImageElement を生成する (PNG / JPEG / GIF / WebP / SVG)。
// - SVG のように `<img>` 単体では intrinsic サイズが確定しない画像のために、
//   バイト列から width/height/viewBox を解析して描画サイズを決定する。

// SVG で width/height/viewBox いずれも取れなかった場合のフォールバック描画サイズ (正方形)。
const FALLBACK_RASTER_SIZE = 512;

export function isSvgMime(mime: string): boolean {
    return mime.toLowerCase().includes('svg');
}

// バイト列と MIME から画像要素を生成する。読込完了/失敗で ObjectURL を解放する。
export function loadImageFromBytes(mime: string, bytes: Uint8Array): Promise<HTMLImageElement> {
    // Blob は ArrayBuffer 互換ビューを期待するため、新規 Uint8Array でラップする。
    const blob = new Blob([new Uint8Array(bytes)], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}

// 描画に用いる基準サイズを決定する。
// SVG は intrinsic サイズが取れないことがあるため、バイト列の解析結果を優先する。
export function resolveImageSize(
    mime: string,
    bytes: Uint8Array,
    img: HTMLImageElement
): { width: number; height: number } {
    if (isSvgMime(mime)) {
        const svg = parseSvgSize(bytes);
        if (svg) return svg;
    }
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (width > 0 && height > 0) return { width, height };
    return { width: FALLBACK_RASTER_SIZE, height: FALLBACK_RASTER_SIZE };
}

// SVG ルート要素の width/height、無ければ viewBox から描画サイズを推定する。
export function parseSvgSize(bytes: Uint8Array): { width: number; height: number } | null {
    let text: string;
    try {
        text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
        return null;
    }
    const tagMatch = text.match(/<svg\b[^>]*>/i);
    if (!tagMatch) return null;
    const tag = tagMatch[0];

    const width = parseSvgLength(getAttr(tag, 'width'));
    const height = parseSvgLength(getAttr(tag, 'height'));
    if (width && height) return { width, height };

    const viewBox = getAttr(tag, 'viewBox');
    if (viewBox) {
        const nums = viewBox
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        if (nums.length === 4 && nums[2] > 0 && nums[3] > 0) {
            return { width: nums[2], height: nums[3] };
        }
    }

    // width/height の片方だけ取れた場合は正方形とみなす。
    if (width || height) {
        const side = (width || height) as number;
        return { width: side, height: side };
    }
    return null;
}

function getAttr(tag: string, name: string): string | undefined {
    const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
    return m?.[1];
}

// "450", "450px", "12cm" などの長さ表記から数値 (px 換算なしの素の値) を取り出す。
// 単位付きでも先頭の数値を採用する。% は基準が無いため無視する。
function parseSvgLength(value: string | undefined): number | null {
    if (!value || value.includes('%')) return null;
    const m = value.match(/^\s*([\d.]+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
}
