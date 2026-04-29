// 下段バー: 変換不可理由 / 直近のエラーメッセージ + 変換ボタン。
import { Box, Button, Paper, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';

type Props = {
    canConvert: boolean;
    reason?: string;
    busy: boolean;
    onConvert: () => void;
};

export default function BottomBar({ canConvert, reason, busy, onConvert }: Props) {
    const { t } = useTranslation();
    return (
        <Paper
            elevation={1}
            sx={{
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                {reason ? (
                    <Typography
                        variant='body2'
                        color={canConvert ? 'text.secondary' : 'warning.main'}
                        sx={{ textAlign: 'center', wordBreak: 'break-word' }}
                    >
                        {reason}
                    </Typography>
                ) : (
                    <Typography variant='body2' color='text.disabled' sx={{ textAlign: 'center' }}>
                        &nbsp;
                    </Typography>
                )}
            </Box>
            <Button
                variant='contained'
                onClick={onConvert}
                disabled={!canConvert || busy}
                startIcon={<PlayArrowIcon />}
                sx={{ minWidth: 140 }}
            >
                {t('common.convert')}
            </Button>
        </Paper>
    );
}
