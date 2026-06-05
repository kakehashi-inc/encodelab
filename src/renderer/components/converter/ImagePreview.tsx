// 共通の画像プレビュー領域。
// PNG / JPEG / GIF / WebP / SVG のみ表示し、それ以外は非対応メッセージを返す。
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { BORDERED_BOX_SX, PREVIEWABLE_MIMES } from './shared';

type Props = {
    mime: string;
    bytes: Uint8Array;
    minHeight?: number | string;
    // true のとき、親 flex の残り高さを占有し、画像が枠を超えたら枠内でスクロールする。
    fill?: boolean;
};

export default function ImagePreview({ mime, bytes, minHeight = 220, fill = false }: Props) {
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
                    ...BORDERED_BOX_SX,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight,
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
                ...BORDERED_BOX_SX,
                display: 'flex',
                // スクロール時に画像の上端から見えるよう、fill のときは上寄せにする。
                alignItems: fill ? 'flex-start' : 'center',
                justifyContent: 'center',
                p: 1,
                bgcolor: 'background.default',
                // fill: 残り高さを占有し、枠を超えた画像は枠内でスクロールする。
                // 非 fill: 中身に応じた高さ (minHeight 下限) で、枠は縮ませない。
                ...(fill
                    ? { flexGrow: 1, minHeight: 0, overflow: 'auto' }
                    : { minHeight, flexShrink: 0, overflow: 'hidden' }),
            }}
        >
            <Box
                component='img'
                src={url}
                alt='preview'
                sx={
                    fill
                        ? // 横幅は枠に収め、縦は原寸 (はみ出したら枠スクロール)。flexShrink:0 で潰れ防止。
                          { maxWidth: '100%', height: 'auto', flexShrink: 0 }
                        : { maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }
                }
            />
        </Box>
    );
}
