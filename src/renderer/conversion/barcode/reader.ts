// バーコード / QR 読取 (@zxing/library を使用)。
// 入力画像を Canvas でラスタライズして輝度配列を取得し、ZXing の MultiFormatReader で読み取る。
//
// QR 専用の読取は ../qr/reader.ts (jsQR) が担当する。こちらは 1 次元規格を主対象とし、
// QR / DataMatrix なども ZXing がまとめて読める。
//
// 実世界の写真は「傾き」「画像の一部にしか写っていない」「高解像度」などで素直に読めない。
// このため、複数の回転角度で走査を試み、最初に成功したものを返す。
import {
    BarcodeFormat,
    BinaryBitmap,
    DecodeHintType,
    HybridBinarizer,
    MultiFormatReader,
    RGBLuminanceSource,
} from '@zxing/library';

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

// 走査する回転角度 (度)。1 次元バーコードはバーが縦方向に近いと読めないため、
// 傾いた写真でも水平に近づくよう複数角度を試す。1 次元コードは 180 度周期なので
// 0〜90 度を中心に密に試し、綺麗な画像が多い小角度を先頭にして即決させる。
const ROTATION_ANGLES_DEG = [0, -10, 10, -20, 20, -35, 35, -50, 50, -65, 65, -80, 80, 90];

// 走査に使う最大の長辺ピクセル数。高解像度写真はこのサイズに縮小してから走査する
// (大きすぎると遅く、細部ノイズも増えるため)。バー解像度を保てる十分な大きさにする。
const MAX_RASTER_LONG_EDGE = 1600;
// 低解像度画像 (生成された小さなバーコード等) はこの長辺まで拡大して走査する。
const MIN_RASTER_LONG_EDGE = 800;

export async function readBarcode(mime: string, bytes: Uint8Array): Promise<BarcodeReadResult> {
    const img = await loadImageFromBytes(mime, bytes);

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, ENABLED_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new MultiFormatReader();
    reader.setHints(hints);

    for (const angle of ROTATION_ANGLES_DEG) {
        const imageData = rasterizeRotated(img, angle);
        const result = tryDecode(reader, imageData);
        if (result) {
            return { text: result.text, format: result.format };
        }
    }
    throw new Error('Barcode not detected');
}

function tryDecode(
    reader: MultiFormatReader,
    imageData: ImageData
): { text: string; format: string } | null {
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
function toLuminances(data: Uint8ClampedArray): Uint8ClampedArray {
    const out = new Uint8ClampedArray(data.length / 4);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
        const a = data[i + 3];
        // 透過部分は白とみなす (背景が透明な SVG/PNG 対策)。
        if (a < 128) {
            out[j] = 0xff;
        } else {
            // ITU-R BT.601 相当の輝度。
            out[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) & 0xff;
        }
    }
    return out;
}

// 画像を指定角度だけ回転して Canvas に描画し、ImageData を返す。
// 同時に、走査に適した解像度へスケール調整する。
function rasterizeRotated(img: HTMLImageElement, angleDeg: number): ImageData {
    const baseW = img.naturalWidth || img.width;
    const baseH = img.naturalHeight || img.height;
    const longEdge = Math.max(baseW, baseH);

    let scale = 1;
    if (longEdge > MAX_RASTER_LONG_EDGE) {
        scale = MAX_RASTER_LONG_EDGE / longEdge;
    } else if (longEdge < MIN_RASTER_LONG_EDGE) {
        scale = Math.ceil(MIN_RASTER_LONG_EDGE / longEdge);
    }
    const w = Math.round(baseW * scale);
    const h = Math.round(baseH * scale);

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
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return ctx.getImageData(0, 0, canvasW, canvasH);
}

function loadImageFromBytes(mime: string, bytes: Uint8Array): Promise<HTMLImageElement> {
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
