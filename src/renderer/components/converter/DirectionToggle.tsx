// 方向矢印トグル単独のコンパクトボタン。上段ヘッダーの間に配置する。
import { IconButton, Tooltip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import type { Direction } from '../../store/converter-store';

type Props = {
    direction: Direction;
    onFlip: () => void;
};

export default function DirectionToggle({ direction, onFlip }: Props) {
    const { t } = useTranslation();
    return (
        <Tooltip title={t('common.flipDirection')}>
            <IconButton
                onClick={onFlip}
                size='large'
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                {direction === 'rtl' ? <ArrowForwardIcon /> : <ArrowBackIcon />}
            </IconButton>
        </Tooltip>
    );
}
