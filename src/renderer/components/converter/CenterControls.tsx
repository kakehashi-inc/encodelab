// 中央列のコントロール。
// 上段: 左右ペイン入れ替えボタン (旧 方向切り替えボタンの位置)
// 下段: 変換ボタン (右矢印)
import { IconButton, Tooltip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useTranslation } from 'react-i18next';

type Props = {
    canConvert: boolean;
    busy: boolean;
    // 変換不可の理由。canConvert が false のときツールチップに表示する。
    disabledReason?: string;
    onSwap: () => void;
    onConvert: () => void;
};

export default function CenterControls({ canConvert, busy, disabledReason, onSwap, onConvert }: Props) {
    const { t } = useTranslation();
    const convertTooltip = canConvert ? t('common.convert') : (disabledReason ?? t('common.convert'));
    return (
        <>
            <Tooltip title={t('common.swapPanes')}>
                <IconButton
                    onClick={onSwap}
                    size='large'
                    sx={{
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                >
                    <SwapHorizIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title={convertTooltip}>
                {/* disabled な IconButton は Tooltip を発火しないので span でラップする */}
                <span>
                    <IconButton
                        onClick={onConvert}
                        disabled={!canConvert || busy}
                        size='large'
                        color='primary'
                        sx={{
                            border: 1,
                            borderColor: 'primary.main',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            '&:hover': { bgcolor: 'primary.dark' },
                            '&.Mui-disabled': {
                                border: 1,
                                borderColor: 'divider',
                                bgcolor: 'action.disabledBackground',
                            },
                        }}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                </span>
            </Tooltip>
        </>
    );
}
