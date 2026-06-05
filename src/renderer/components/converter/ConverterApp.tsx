// 変換ツールのメインビュー。
//
// レイアウト:
//   ┌─────────────────────┬─────┬─────────────────────┐
//   │  Pane (side='left') │ ⇄→  │  Pane (side='right')│
//   │                     │     │                     │
//   │  (header + content) │     │  (header + content) │
//   ├─────────────────────┴─────┴─────────────────────┤
//   │   メッセージバー (アラート風 / メッセージ時のみ) │
//   └─────────────────────────────────────────────────┘
//
// 中央列は入れ替えボタン (⇄) と変換ボタン (→) を縦に並べる。
// 下段バーは変換結果メッセージがあるときのみ表示し、× で閉じられる。
// Pane は左右で同じコンポーネント。direction から自身の role (入力/出力) を導出する。
import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useConverterStore, inputSide, outputSide } from '../../store/converter-store';
import { checkCompatibility } from '@shared/conversion/compatibility';
import { runConversion } from '../../conversion/engine';
import type { ConvertContext } from '../../conversion/handlers';
import Pane from './Pane';
import CenterControls from './CenterControls';
import BottomBar from './BottomBar';
import ConvertingOverlay from './ConvertingOverlay';
import { FILL_REMAINING_SX } from './shared';

export default function ConverterApp() {
    const { t } = useTranslation();
    const direction = useConverterStore(s => s.direction);
    const left = useConverterStore(s => s.left);
    const right = useConverterStore(s => s.right);
    const qrOptions = useConverterStore(s => s.qrOptions);
    const message = useConverterStore(s => s.message);
    const setValue = useConverterStore(s => s.setValue);
    const swapPanes = useConverterStore(s => s.swapPanes);
    const setMessage = useConverterStore(s => s.setMessage);
    const clearMessage = useConverterStore(s => s.clearMessage);

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

    // 変換不可の理由 (変換ボタンのツールチップ向け)。変換可能なら undefined。
    const reasonText = React.useMemo(() => {
        if (compatibility.convertible) {
            return undefined;
        }
        if (compatibility.reasonKey) {
            return t(compatibility.reasonKey, compatibility.reasonParams ?? {});
        }
        return t('reason.notConvertible');
    }, [compatibility, t]);

    const handleConvert = async () => {
        clearMessage();
        setBusy(true);
        // runConversion は Base58 など同期 CPU 処理を含み UI スレッドをブロックする。
        // オーバーレイ (busy=true) が画面に描画されてから重い処理に入るよう、
        // 描画コミットを待つ (rAF を 2 回 ≒ 次フレーム以降に実行)。
        await waitForPaint();
        try {
            const result = await runConversion(inputPane.type, inputPane.value, outputPane.type, ctx);
            if (result.ok) {
                setValue(outSide, result.value);
                setMessage({ severity: 'success', text: t('message.conversionSucceeded') });
            } else {
                setMessage({
                    severity: 'error',
                    text: t('error.conversionFailed', { message: result.error }),
                });
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
                // 変換中オーバーレイ (Backdrop) の配置基準。
                position: 'relative',
            }}
        >
            <Box
                sx={{
                    ...FILL_REMAINING_SX,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                    // 行を 1fr に固定。これがないと暗黙の行 (auto) が内容で伸び、
                    // Pane (height:100%) ごとウィンドウ縦幅を超えて広がってしまう。
                    gridTemplateRows: 'minmax(0, 1fr)',
                    columnGap: 2,
                }}
            >
                <Pane side='left' />
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        // 入れ替えボタン (上) と変換ボタン (下) を視覚的に分離する
                        gap: 4,
                        // ペイン上部の "入力 / 出力" overline + cat/type 行の中心に揃える
                        pt: 5.5,
                    }}
                >
                    <CenterControls
                        canConvert={compatibility.convertible}
                        busy={busy}
                        disabledReason={reasonText}
                        onSwap={swapPanes}
                        onConvert={handleConvert}
                    />
                </Box>
                <Pane side='right' />
            </Box>
            {message && (
                <BottomBar severity={message.severity} message={message.text} onClose={clearMessage} />
            )}
            <ConvertingOverlay open={busy} />
        </Box>
    );
}

// オーバーレイの描画コミットを待つ。requestAnimationFrame を 2 回挟むことで
// 「状態更新 -> 再レンダリング -> ペイント」が完了してから次の処理に進む。
function waitForPaint(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
}
