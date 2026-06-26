// QR コード読取 (jsqr ライブラリを使用)
// 入力画像 (PNG / JPEG / GIF / WebP / SVG) を Canvas でラスタライズして ImageData を取得し、
// jsqr に渡してテキストを取り出す。
//
// スキャンの基本方針は「読み取れそうな手段を順に試し、最初に成功したものを採用する」。
// バーコード読取が複数の回転角度を試すのと同じ思想で、QR では以下を組み合わせて試行する。
//
// 拡大 (モジュールグリッドを保つため原寸を優先):
//   リサイズはモジュールグリッドを歪めるため、まず原寸で読む。原寸が小さく読めない場合のみ、
//   整数倍に拡大して再試行する (整数倍ならモジュール境界とアスペクト比が保たれる。非整数倍の
//   リサイズはグリッドを歪め、かえって読取を妨げる)。
//
// 前処理 (背景透過への対応):
//   jsqr はグレースケール変換でアルファを無視するため、透明 = (0,0,0,0) が黒モジュールと
//   区別できず読取に失敗する。これを「白で塗りつぶす」と、白/明色のモジュールや黒背景 QR が
//   消えてしまう。そこで透過がある画像は「アルファ自体を明暗として二値化した版」(不透明 =
//   モジュール / 透明 = 背景。色に依存しない) と「元の輝度のままの版」の両方を試す。
//   さらに jsqr の inversionAttempts: 'attemptBoth' で明暗どちらの並びにも対応する。
import jsQR from 'jsqr';
import { loadImageFromBytes, resolveImageSize } from '../image-utils';
import { RecognitionTracker, type RecognizeOptions } from '../recognition';

export type QrReadResult = {
    text: string;
};

// 原寸で読めない極小 QR 向けフォールバック拡大の目標短辺 (px)。
const FALLBACK_MIN_SHORT_EDGE = 480;
// 透過とみなすアルファ閾値 (これ未満を背景、以上をモジュールとして扱う)。
const ALPHA_THRESHOLD = 128;

export async function readQrCode(
    mime: string,
    bytes: Uint8Array,
    options: RecognizeOptions = {}
): Promise<QrReadResult> {
    const img = await loadImageFromBytes(mime, bytes);
    const { width: baseW, height: baseH } = resolveImageSize(mime, bytes, img);

    // 試行サイズ: まず原寸、次に (必要なら) 整数倍拡大。
    const sizes: Array<{ width: number; height: number }> = [{ width: baseW, height: baseH }];
    const shortEdge = Math.min(baseW, baseH);
    if (shortEdge > 0 && shortEdge < FALLBACK_MIN_SHORT_EDGE) {
        const factor = Math.ceil(FALLBACK_MIN_SHORT_EDGE / shortEdge);
        sizes.push({ width: baseW * factor, height: baseH * factor });
    }

    // 進捗・キャンセル管理。総ステップ = サイズ数 × 前処理候補の最大数 (2: 通常版 + 透過二値化版)。
    // 段階はサイズ試行 (原寸 / 拡大) に対応させる。QR は高速なため大半は即時に確定する。
    const tracker = new RecognitionTracker(sizes.length * 2, sizes.length, options);

    for (let s = 0; s < sizes.length; s += 1) {
        const raster = rasterize(img, sizes[s].width, sizes[s].height);
        // 各サイズについて、複数の前処理候補を順に試す。
        for (const candidate of buildCandidates(raster)) {
            const result = jsQR(candidate.data, candidate.width, candidate.height, {
                inversionAttempts: 'attemptBoth',
            });
            await tracker.tick(s + 1);
            if (result) {
                return { text: result.data };
            }
        }
    }
    throw new Error('QR code not detected');
}

function rasterize(img: HTMLImageElement, width: number, height: number): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    // 整数倍拡大でモジュール境界を保つため補間を無効化する。
    ctx.imageSmoothingEnabled = false;
    // 背景は塗らない (透過情報を保持したまま getImageData する)。
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// 1 つのラスタ画像から、読取を試す ImageData 候補を作る。
// - まず「元画像 (無加工・輝度) 版」を試す。元のまま読めるものを加工で壊さないため、常に最優先。
// - それで読めず、かつ透過がある場合のみ「アルファ二値化版」をフォールバックで試す
//   (背景透過 QR 向け。輝度版では透明背景が黒に潰れて読めないケースを救う。モジュール色に依存しない)。
function buildCandidates(raster: ImageData): ImageData[] {
    const alphaBinarized = binarizeByAlpha(raster);
    return alphaBinarized ? [raster, alphaBinarized] : [raster];
}

// 透過がある場合のみ、アルファを明暗に変換した ImageData を返す。
// 不透明部分 = モジュール (黒) / 透明部分 = 背景 (白)。色は無視する。
// 透過が無ければ null を返す (アルファ二値化は不要)。
function binarizeByAlpha(imageData: ImageData): ImageData | null {
    const { data, width, height } = imageData;

    let hasTransparency = false;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
            hasTransparency = true;
            break;
        }
    }
    if (!hasTransparency) return null;

    const out = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const opaque = data[i + 3] >= ALPHA_THRESHOLD;
        const v = opaque ? 0 : 255;
        out[i] = v;
        out[i + 1] = v;
        out[i + 2] = v;
        out[i + 3] = 255;
    }
    return new ImageData(out, width, height);
}
