// バーコード / QR 読取 (@zxing/library を使用)。
// 入力画像を Canvas でラスタライズして輝度配列を取得し、ZXing の MultiFormatReader で読み取る。
//
// QR 専用の読取は ../qr/reader.ts (jsQR) が担当する。こちらは 1 次元規格を主対象とし、
// QR / DataMatrix なども ZXing がまとめて読める。
//
// 実世界の写真は「傾き」「低コントラスト」「画像の一部に小さく写っている」「透視ゆがみ」
// などで素直に読めない。本アプリはデスクトップ用途で、応答速度より読取精度を優先するため、
// 認識できなければ次の手法へ、という多段カスケードで段階的に走査する。
//
//   前処理: 走査用にスケール調整し、グレースケール化したうえでコントラストを正規化する
//           (照明ムラ・退色で淡くなったバーをはっきりさせ、ZXing の 2 値化を助ける)。
//   段階 1: 画像全体を複数角度で走査。正規化の強さを変えながら 3 通り試す
//           (強め / 弱め / 無加工)。無加工は従来挙動で読めていた画像を確実に拾うため。
//   段階 2: それでも失敗したら、画像をタイルに分割し各タイルを拡大して同様に走査する
//           (小さく写ったバーコードや、透視ゆがみで全体走査が通らないバーコード対策)。
//
// 1 次元バーコードはバーが走査線と平行に近くないと読めないため、各走査は -90〜90 度を
// 5 度刻みで回転して試す (この 180 度幅で全ての向きをカバーする)。
import {
    BarcodeFormat,
    BinaryBitmap,
    DecodeHintType,
    HybridBinarizer,
    MultiFormatReader,
    RGBLuminanceSource,
} from '@zxing/library';
import { loadImageFromBytes, resolveImageSize } from '../image-utils';

export type BarcodeReadResult = {
    text: string;
    // 読み取れた規格 (ZXing の BarcodeFormat 名)
    format: string;
};

// 読取対象の規格 (生成側でサポートする 1 次元規格 + QR)。
const ENABLED_FORMATS: BarcodeFormat[] = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.QR_CODE,
];

// 走査する回転角度 (度)。-90〜90 度を 5 度刻みで密に試し、この 180 度幅で全ての向き
// (1 次元コードは 180 度周期) をカバーする。傾きの無い画像が多い小角度を先頭にして
// 早期確定させる。
const ROTATION_ANGLES_DEG = buildRotationAngles();
function buildRotationAngles(): number[] {
    const angles = [0];
    for (let d = 5; d <= 85; d += 5) {
        angles.push(-d, d);
    }
    // 90 度 (垂直) は -90 度と同じ向き。片方だけ追加する。
    angles.push(90);
    return angles;
}

// 基準グレースケール画像の最大長辺。巨大写真はここまで縮小して保持する (メモリ・処理量の上限)。
// タイル分割時の細部解像度を残すため、全体走査用の上限より大きめに取る。
const BASE_MAX_LONG_EDGE = 2400;

// 画像全体走査に使う長辺ピクセル数の範囲。大きすぎる画像は縮小、小さすぎる画像は拡大して
// バー解像度を適切な範囲に収める。
const FULL_SCAN_MAX_LONG_EDGE = 1600;
const FULL_SCAN_MIN_LONG_EDGE = 800;

// コントラスト正規化でクリップする端の割合。null は無加工 (正規化なし) を表す。
// 段階を変えて順に試す。前段で読めなかった画像のみ次段に進む。
const NORMALIZE_STAGES: (number | null)[] = [0.01, 0.004, null];

// タイル分割の格子数・重なり率・各タイルの拡大後の長辺。
const TILE_GRID = 3;
const TILE_OVERLAP = 0.5;
const TILE_ZOOM_LONG_EDGE = 1400;

export async function readBarcode(mime: string, bytes: Uint8Array): Promise<BarcodeReadResult> {
    const img = await loadImageFromBytes(mime, bytes);
    // SVG など intrinsic サイズが取れない画像のため、基準サイズはバイト列からも解決する。
    const base = resolveImageSize(mime, bytes, img);

    // 元画像を一度だけ基準グレースケール (巨大写真は縮小) に変換する。
    const baseGray = drawBaseGrayscale(img, base.width, base.height);

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, ENABLED_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new MultiFormatReader();
    reader.setHints(hints);

    // 正規化強度ごとの基準 Canvas を作る (全体走査・タイル走査で使い回す)。
    const sources = NORMALIZE_STAGES.map(clip => normalizedCanvas(baseGray, clip));

    // 段階 1: 画像全体走査 (正規化強め -> 弱め -> 無加工)。
    for (const source of sources) {
        const scale = fullScanScale(source.width, source.height);
        const result = sweepAngles(reader, source, scale);
        if (result) return result;
    }

    // 段階 2: タイル分割走査 (正規化強め -> 弱め -> 無加工)。
    const rects = tileRects(baseGray.width, baseGray.height, TILE_GRID, TILE_OVERLAP);
    for (const source of sources) {
        for (const rect of rects) {
            const tile = cropCanvas(source, rect);
            const longEdge = Math.max(tile.width, tile.height);
            const scale = longEdge < TILE_ZOOM_LONG_EDGE ? TILE_ZOOM_LONG_EDGE / longEdge : 1;
            const result = sweepAngles(reader, tile, scale);
            if (result) return result;
        }
    }

    throw new Error('Barcode not detected');
}

// 1 つの Canvas を全角度で走査し、最初に読めた結果を返す。
function sweepAngles(
    reader: MultiFormatReader,
    source: HTMLCanvasElement,
    scale: number
): BarcodeReadResult | null {
    for (const angle of ROTATION_ANGLES_DEG) {
        const imageData = rasterizeRotated(source, scale, angle);
        const result = tryDecode(reader, imageData);
        if (result) return result;
    }
    return null;
}

function tryDecode(reader: MultiFormatReader, imageData: ImageData): BarcodeReadResult | null {
    const luminances = toLuminances(imageData.data);
    const source = new RGBLuminanceSource(luminances, imageData.width, imageData.height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    try {
        const result = reader.decodeWithState(bitmap);
        return { text: result.getText(), format: BarcodeFormat[result.getBarcodeFormat()] };
    } catch {
        return null;
    } finally {
        reader.reset();
    }
}

// RGBA バイト列を ZXing が要求する 8bit グレースケール輝度配列へ変換する。
// 基準 Canvas は既にグレースケール化済みのため R チャンネルがそのまま輝度になる。
function toLuminances(data: Uint8ClampedArray): Uint8ClampedArray {
    const out = new Uint8ClampedArray(data.length / 4);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
        const a = data[i + 3];
        // 透過部分は白とみなす (背景が透明な SVG/PNG 対策)。
        if (a < 128) {
            out[j] = 0xff;
        } else {
            // 既にグレースケールだが、念のため BT.601 相当で輝度を取る。
            out[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) & 0xff;
        }
    }
    return out;
}

// 画像全体走査に使うスケール (長辺を [MIN, MAX] に収める)。
function fullScanScale(width: number, height: number): number {
    const longEdge = Math.max(width, height);
    if (longEdge > FULL_SCAN_MAX_LONG_EDGE) return FULL_SCAN_MAX_LONG_EDGE / longEdge;
    if (longEdge < FULL_SCAN_MIN_LONG_EDGE) return Math.ceil(FULL_SCAN_MIN_LONG_EDGE / longEdge);
    return 1;
}

// 元画像を基準サイズで描画し、グレースケール化した輝度配列を返す。
// 巨大写真は BASE_MAX_LONG_EDGE まで縮小する。透過部分は白とみなす。
function drawBaseGrayscale(
    img: HTMLImageElement,
    baseW: number,
    baseH: number
): { gray: Uint8ClampedArray; width: number; height: number } {
    const longEdge = Math.max(baseW, baseH);
    const scale = longEdge > BASE_MAX_LONG_EDGE ? BASE_MAX_LONG_EDGE / longEdge : 1;
    const width = Math.max(1, Math.round(baseW * scale));
    const height = Math.max(1, Math.round(baseH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0, width, height);

    const data = ctx.getImageData(0, 0, width, height).data;
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
        const a = data[i + 3];
        gray[j] =
            a < 128 ? 0xff : (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) & 0xff;
    }
    return { gray, width, height };
}

// グレースケール輝度をコントラスト正規化して基準 Canvas を返す。
// clipFraction が null のときは無加工 (グレースケールのまま)。それ以外は上下端の一定割合を
// クリップした範囲を [0,255] へ線形伸張する (ImageMagick の -normalize 相当)。
function normalizedCanvas(
    src: { gray: Uint8ClampedArray; width: number; height: number },
    clipFraction: number | null
): HTMLCanvasElement {
    const { gray, width, height } = src;
    const lut = clipFraction == null ? null : buildNormalizeLut(gray, clipFraction);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    const out = ctx.createImageData(width, height);
    for (let j = 0, i = 0; j < gray.length; j += 1, i += 4) {
        const n = lut ? lut[gray[j]] : gray[j];
        out.data[i] = n;
        out.data[i + 1] = n;
        out.data[i + 2] = n;
        out.data[i + 3] = 0xff;
    }
    ctx.putImageData(out, 0, 0);
    return canvas;
}

// 輝度ヒストグラムの上下端 clipFraction をクリップし [0,255] へ線形伸張する LUT を作る。
function buildNormalizeLut(gray: Uint8ClampedArray, clipFraction: number): Uint8ClampedArray {
    const hist = new Uint32Array(256);
    for (let i = 0; i < gray.length; i += 1) hist[gray[i]] += 1;

    const clip = Math.floor(gray.length * clipFraction);
    let lo = 0;
    for (let acc = 0; lo < 256; lo += 1) {
        acc += hist[lo];
        if (acc > clip) break;
    }
    let hi = 255;
    for (let acc = 0; hi > 0; hi -= 1) {
        acc += hist[hi];
        if (acc > clip) break;
    }
    if (hi <= lo) hi = Math.min(255, lo + 1);
    const range = hi - lo;

    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v += 1) {
        if (v <= lo) lut[v] = 0;
        else if (v >= hi) lut[v] = 0xff;
        else lut[v] = ((v - lo) * 255) / range;
    }
    return lut;
}

// グリッド分割した重なりタイルの矩形リストを返す。
// 透視ゆがみや小さなバーコードを、より狭い領域として切り出して走査するために使う。
function tileRects(
    width: number,
    height: number,
    grid: number,
    overlap: number
): { x: number; y: number; w: number; h: number }[] {
    const stepX = Math.max(1, Math.floor((width / grid) * (1 - overlap)));
    const stepY = Math.max(1, Math.floor((height / grid) * (1 - overlap)));
    const tileW = Math.ceil(width / grid + stepX);
    const tileH = Math.ceil(height / grid + stepY);

    const rects: { x: number; y: number; w: number; h: number }[] = [];
    for (let y = 0; y < height; y += stepY) {
        const h = Math.min(tileH, height - y);
        for (let x = 0; x < width; x += stepX) {
            const w = Math.min(tileW, width - x);
            rects.push({ x, y, w, h });
            if (x + w >= width) break;
        }
        if (y + h >= height) break;
    }
    return rects;
}

// 基準 Canvas から矩形を切り出した Canvas を返す (等倍コピー)。
function cropCanvas(
    source: HTMLCanvasElement,
    rect: { x: number; y: number; w: number; h: number }
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = rect.w;
    canvas.height = rect.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    return canvas;
}

// 基準 Canvas を scale 倍に拡縮しつつ angle 度回転して描画し、ImageData を返す。
// 拡縮と回転を 1 回の drawImage で行う (再標本化を 1 回に抑え、細いバーのにじみを最小化する)。
function rasterizeRotated(source: HTMLCanvasElement, scale: number, angleDeg: number): ImageData {
    const w = Math.round(source.width * scale);
    const h = Math.round(source.height * scale);

    if (angleDeg === 0 && scale === 1) {
        const ctx = source.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        return ctx.getImageData(0, 0, w, h);
    }

    const rad = (angleDeg * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    // 回転後に画像全体が収まる canvas サイズ。
    const canvasW = Math.ceil(w * cos + h * sin);
    const canvasH = Math.ceil(w * sin + h * cos);

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    // 回転で生じる余白を白で埋める (バーコードの背景に合わせる)。
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate(rad);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    return ctx.getImageData(0, 0, canvasW, canvasH);
}
