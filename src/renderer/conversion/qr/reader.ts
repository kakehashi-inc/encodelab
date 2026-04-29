// QR コード読取 (jsqr ライブラリを使用)
// 入力画像 (PNG / JPEG / GIF / WebP / SVG) を Canvas でラスタライズして ImageData を取得し、
// jsqr に渡してテキストを取り出す。
import jsQR from 'jsqr';

export type QrReadResult = {
    text: string;
};

export async function readQrCode(mime: string, bytes: Uint8Array): Promise<QrReadResult> {
    const imageData = await rasterize(mime, bytes);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
    });
    if (!result) {
        throw new Error('QR code not detected');
    }
    return { text: result.data };
}

async function rasterize(mime: string, bytes: Uint8Array): Promise<ImageData> {
    // Blob は ArrayBuffer 互換のビューを期待するため、新規 Uint8Array でラップする
    const blob = new Blob([new Uint8Array(bytes)], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    try {
        const img = await loadImage(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
    });
}
