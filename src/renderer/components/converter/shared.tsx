// 変換ペイン群で共有するユーティリティと小さなコンポーネント。

import type { SxProps, Theme } from '@mui/material';
import { Box, Typography } from '@mui/material';

// Web 表示可能な画像 MIME (PNG / JPEG / GIF / WebP / SVG)
export const PREVIEWABLE_MIMES: ReadonlySet<string> = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
]);

// MIME 自動判定不能時のフォールバック (RAW)
export const RAW_MIME = 'application/octet-stream';

// MUI TextField (multiline) を残り高さいっぱいに伸ばすための共通 sx。
// コードエディタ寄りの padding (8px / 12px) を採用。
export const FILL_HEIGHT_TEXTAREA_SX: SxProps<Theme> = {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    '& .MuiOutlinedInput-root': {
        flex: 1,
        alignItems: 'stretch',
        padding: '8px 12px',
    },
    '& .MuiOutlinedInput-input': {
        flex: 1,
        overflow: 'auto !important',
        padding: 0,
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        lineHeight: 1.5,
    },
};

// 空の状態を表示する共通 Box (バイナリ未選択 / 出力前 など)
export function EmptyStateBox({ message, minHeight = 120 }: { message: string; minHeight?: number | string }) {
    return (
        <Box
            sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'action.hover',
                minHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Typography variant='body2' color='text.secondary'>
                {message}
            </Typography>
        </Box>
    );
}

// MIME に対応する代表的な拡張子 (保存ファイル名用)
const MIME_EXT_MAP: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'application/json': 'json',
    'application/xml': 'xml',
    'text/plain': 'txt',
    [RAW_MIME]: 'bin',
};

export function guessExtension(mime: string): string | null {
    return MIME_EXT_MAP[mime] ?? null;
}

export function stripExt(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
}

// MIME ドロップダウンの選択肢
export const COMMON_MIMES: readonly string[] = [
    RAW_MIME,
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/zip',
    'application/json',
    'application/xml',
    'text/plain',
];
