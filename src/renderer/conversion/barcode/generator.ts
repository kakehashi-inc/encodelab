// バーコード生成 (bwip-js を使用)。
// 1 次元バーコードの主要規格を SVG / PNG で生成する。
// QR コードは別モジュール (../qr/generator.ts) が担当する。
//
// レンダラー (ブラウザ環境) で動かすため bwip-js/browser を使う。
// ブラウザ版は toSVG / toCanvas を提供する (Node 版の toBuffer は無い)。
// PNG は toCanvas で描画してから canvas を PNG バイト列に変換する。
import bwipjs from 'bwip-js/browser';

// 対応する 1 次元バーコード規格。値は bwip-js の bcid に対応する。
export type BarcodeSymbology =
    | 'ean13'
    | 'ean8'
    | 'upca'
    | 'upce'
    | 'code128'
    | 'gs1-128'
    | 'code39'
    | 'interleaved2of5'
    | 'rationalizedCodabar';

export type BarcodeFormat = 'svg' | 'png';

export type BarcodeOptions = {
    symbology: BarcodeSymbology;
    format: BarcodeFormat;
    // バー1モジュールあたりの倍率 (bwip-js の scale。PNG のラスタ解像度に影響)
    scale: number;
    // バーの高さ (bwip-js の height。mm 単位の相対値)
    height: number;
    // 人が読める文字列をバーコード下に表示するか
    includeText: boolean;
    foregroundColor: string;
    backgroundColor: string;
};

export const DEFAULT_BARCODE_OPTIONS: BarcodeOptions = {
    symbology: 'code128',
    format: 'svg',
    scale: 3,
    height: 12,
    includeText: true,
    foregroundColor: '#000000',
    backgroundColor: '#ffffff',
};

export type BarcodeResult = {
    mime: string;
    bytes: Uint8Array;
};

// 入力が規格の要件を満たさず生成に失敗したことを表すエラー。
// メッセージ文言は持たず、規格 ID のみを保持する (i18n は表示側で解決する)。
// 入力検証ではない内部エラー (描画失敗など) は通常の Error を投げる。
export class BarcodeInputError extends Error {
    readonly symbology: BarcodeSymbology;
    // bwip-js が返した元のメッセージ (デバッグ用に保持)
    readonly detail: string;
    constructor(symbology: BarcodeSymbology, detail: string) {
        super(`Invalid input for ${symbology}: ${detail}`);
        this.name = 'BarcodeInputError';
        this.symbology = symbology;
        this.detail = detail;
    }
}

// bwip-js は色を '#' なしの 6/8 桁 hex で受け取る。
function toBwipColor(color: string): string {
    return color.replace(/^#/, '');
}

// bwip-js は入力が規格の要件を満たさないとき "bwipp.xxx#NNNN: message" 形式の
// エラーを投げる。これを規格 ID 付きの BarcodeInputError に正規化する。
function isBwippInputError(message: string): boolean {
    return /^bwipp\./.test(message);
}

export async function generateBarcode(text: string, options: BarcodeOptions): Promise<BarcodeResult> {
    if (text.length === 0) {
        throw new BarcodeInputError(options.symbology, 'empty input');
    }

    const renderOpts = {
        bcid: options.symbology,
        text,
        scale: options.scale,
        height: options.height,
        includetext: options.includeText,
        textxalign: 'center' as const,
        barcolor: toBwipColor(options.foregroundColor),
        backgroundcolor: toBwipColor(options.backgroundColor),
        // バー周囲の余白 (quiet zone)。EAN / UPC は左右だけでなく上下にも
        // 余白が無いと ZXing が中央ラインを走査できず検出に失敗する。ITF は
        // 左右の quiet zone に特に厳格なため広めに確保する。全規格で付けて問題ない。
        paddingwidth: 14,
        paddingheight: 4,
    };

    try {
        if (options.format === 'svg') {
            const svg = bwipjs.toSVG(renderOpts);
            return { mime: 'image/svg+xml', bytes: new TextEncoder().encode(svg) };
        }
        // PNG: オフスクリーン canvas に描画して PNG バイト列を取り出す。
        const canvas = document.createElement('canvas');
        bwipjs.toCanvas(canvas, renderOpts);
        const bytes = await canvasToPngBytes(canvas);
        return { mime: 'image/png', bytes };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (isBwippInputError(message)) {
            throw new BarcodeInputError(options.symbology, message);
        }
        throw err;
    }
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Failed to render barcode PNG'));
                return;
            }
            blob.arrayBuffer()
                .then(buf => resolve(new Uint8Array(buf)))
                .catch(reject);
        }, 'image/png');
    });
}
