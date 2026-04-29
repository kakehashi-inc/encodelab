// 共通の画像プレビュー領域。
// PNG / JPEG / GIF / WebP / SVG のみ表示し、それ以外は非対応メッセージを返す。
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PREVIEWABLE_MIMES } from './shared';

type Props = {
    mime: string;
    bytes: Uint8Array;
    minHeight?: number | string;
};

export default function ImagePreview({ mime, bytes, minHeight = 220 }: Props) {
    const { t } = useTranslation();
    const url = React.useMemo(() => {
        if (!PREVIEWABLE_MIMES.has(mime) || bytes.byteLength === 0) return null;
        // Blob は ArrayBuffer 互換のビューを期待するため、新規 Uint8Array でラップする
        const blob = new Blob([new Uint8Array(bytes)], { type: mime });
        return URL.createObjectURL(blob);
    }, [mime, bytes]);

    React.useEffect(() => {
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [url]);

    if (!url) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                }}
            >
                <Typography variant='body2' color='text.secondary'>
                    {t('pane.unsupportedPreview')}
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight,
                p: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default',
                overflow: 'hidden',
            }}
        >
            <Box
                component='img'
                src={url}
                alt='preview'
                sx={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
            />
        </Box>
    );
}
