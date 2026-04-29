// 変換ツールのメインビュー。
//
// レイアウト:
//   ┌─────────────────────┬─────┬─────────────────────┐
//   │  Pane (side='left') │  ⇄  │  Pane (side='right')│
//   │                     │     │                     │
//   │  (header + content) │     │  (header + content) │
//   ├─────────────────────┴─────┴─────────────────────┤
//   │            メッセージ              [変換]        │
//   └─────────────────────────────────────────────────┘
//
// Pane は左右で同じコンポーネント。direction から自身の role (入力/出力) を導出する。
import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useConverterStore, inputSide, outputSide } from '../../store/converter-store';
import { checkCompatibility } from '@shared/conversion/compatibility';
import { runConversion } from '../../conversion/engine';
import type { ConvertContext } from '../../conversion/handlers';
import Pane from './Pane';
import DirectionToggle from './DirectionToggle';
import BottomBar from './BottomBar';

export default function ConverterApp() {
    const { t } = useTranslation();
    const direction = useConverterStore(s => s.direction);
    const left = useConverterStore(s => s.left);
    const right = useConverterStore(s => s.right);
    const qrOptions = useConverterStore(s => s.qrOptions);
    const errorMessage = useConverterStore(s => s.errorMessage);
    const setValue = useConverterStore(s => s.setValue);
    const flipDirection = useConverterStore(s => s.flipDirection);
    const setError = useConverterStore(s => s.setError);

    const inSide = inputSide(direction);
    const outSide = outputSide(direction);
    const inputPane = inSide === 'left' ? left : right;
    const outputPane = outSide === 'left' ? left : right;

    const compatibility = React.useMemo(
        () => checkCompatibility(inputPane.type, outputPane.type),
        [inputPane.type, outputPane.type]
    );

    const [busy, setBusy] = React.useState(false);

    const ctx: ConvertContext = React.useMemo(
        () => ({
            qrOptions,
            computeHash: (algorithm, encoding, bytes) =>
                window.encodelab.hash.compute({ algorithm, encoding, bytes }),
            detectMime: bytes => window.encodelab.mime.detect(bytes),
        }),
        [qrOptions]
    );

    const reasonText = React.useMemo(() => {
        if (compatibility.convertible) {
            return errorMessage;
        }
        if (compatibility.reasonKey) {
            return t(compatibility.reasonKey, compatibility.reasonParams ?? {});
        }
        return t('reason.notConvertible');
    }, [compatibility, errorMessage, t]);

    const handleConvert = async () => {
        setError(undefined);
        setBusy(true);
        try {
            const result = await runConversion(inputPane.type, inputPane.value, outputPane.type, ctx);
            if (result.ok) {
                setValue(outSide, result.value);
            } else {
                setError(t('error.conversionFailed', { message: result.error }));
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                p: 2,
                height: '100%',
                minHeight: 0,
                boxSizing: 'border-box',
            }}
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                    columnGap: 2,
                    flexGrow: 1,
                    minHeight: 0,
                }}
            >
                <Pane side='left' />
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        // ペイン上部の "入力 / 出力" overline + cat/type 行の中心に揃える
                        pt: 5.5,
                    }}
                >
                    <DirectionToggle direction={direction} onFlip={flipDirection} />
                </Box>
                <Pane side='right' />
            </Box>
            <BottomBar
                canConvert={compatibility.convertible}
                reason={reasonText}
                busy={busy}
                onConvert={handleConvert}
            />
        </Box>
    );
}
