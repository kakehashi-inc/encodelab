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

// flex 親の残り高さを占有し、子をスクロール可能にするための定型 sx。
// (column 方向の flex コンテナ内で「残りを埋める / はみ出させない」用途)
export const FILL_REMAINING_SX: SxProps<Theme> = { flexGrow: 1, minHeight: 0 };

// 枠付きパネルの共通スタイル (情報枠 / オプションパネル / 空状態)。
// 背景色は用途ごとに異なるため含めず、利用側で bgcolor を合成する。
export const BORDERED_BOX_SX = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
} as const;

// QR / バーコードの「出力形式 (SVG/PNG)」セレクトの共通幅。
// 隣接要素の flex 比に依存させると両パネルで幅がズレるため、固定幅で揃える。
// 内容 (SVG/PNG) に合わせた狭い幅にする。
export const FORMAT_SELECT_SX = { flex: 'none', width: 110 } as const;

// MUI TextField (multiline) を残り高さいっぱいに伸ばすための共通 sx。
// コードエディタ寄りの padding (8px / 12px) を採用。
//
// 親 (Pane / grid 行) の高さが確定している前提で、root を flex 子 (flex:1 / minHeight:0)
// として残り高さに固定し、内側の textarea を root いっぱい (height:100%) に張って
// 超過分を textarea 内でスクロールさせる。
export const FILL_HEIGHT_TEXTAREA_SX: SxProps<Theme> = {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    '& .MuiOutlinedInput-root': {
        flex: 1,
        minHeight: 0,
        alignItems: 'stretch',
        padding: '8px 12px',
        // textarea が万一はみ出しても root で抑える保険。
        overflow: 'hidden',
    },
    // multiline の textarea (MUI v9 では .MuiOutlinedInput-input)。
    // これを指定しないと内容に応じて height が際限なく伸び (例: 27600px)、枠を貫通する。
    // root の高さに固定し、超過分は textarea 内でスクロールさせる。
    // textarea[aria-hidden] は高さ計測用の影要素なので除外する。
    '& textarea.MuiOutlinedInput-input:not([aria-hidden])': {
        height: '100% !important',
        boxSizing: 'border-box',
        overflow: 'auto !important',
        padding: 0,
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        resize: 'none',
    },
};

// 空の状態を表示する共通 Box (バイナリ未選択 / 出力前 など)
export function EmptyStateBox({ message, minHeight = 120 }: { message: string; minHeight?: number | string }) {
    return (
        <Box
            sx={{
                ...BORDERED_BOX_SX,
                p: 2,
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
