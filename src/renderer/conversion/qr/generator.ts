// QR コード生成 (qrcode ライブラリを使用)
import QRCode from 'qrcode';

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';
export type QrFormat = 'svg' | 'png';

export type QrOptions = {
    format: QrFormat;
    errorCorrection: QrErrorCorrection;
    // PNG のみ有効: 1 モジュールあたりのピクセルサイズ
    cellSize: number;
    // モジュール単位のマージン
    margin: number;
    foregroundColor: string;
    backgroundColor: string;
};

export const DEFAULT_QR_OPTIONS: QrOptions = {
    format: 'svg',
    errorCorrection: 'M',
    cellSize: 8,
    margin: 4,
    foregroundColor: '#000000',
    backgroundColor: '#ffffff',
};

export type QrResult = {
    mime: string;
    bytes: Uint8Array;
};

export async function generateQrCode(text: string, options: QrOptions): Promise<QrResult> {
    const common = {
        errorCorrectionLevel: options.errorCorrection,
        margin: options.margin,
        color: {
            dark: options.foregroundColor,
            light: options.backgroundColor,
        },
    };

    if (options.format === 'svg') {
        const svg = await QRCode.toString(text, { ...common, type: 'svg' });
        return {
            mime: 'image/svg+xml',
            bytes: new TextEncoder().encode(svg),
        };
    }

    // PNG: data URL を取得し base64 部分をデコードする
    const dataUrl = await QRCode.toDataURL(text, {
        ...common,
        type: 'image/png',
        scale: options.cellSize,
    });
    const commaAt = dataUrl.indexOf(',');
    if (commaAt < 0) throw new Error('Failed to generate QR code');
    const base64 = dataUrl.slice(commaAt + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { mime: 'image/png', bytes };
}
