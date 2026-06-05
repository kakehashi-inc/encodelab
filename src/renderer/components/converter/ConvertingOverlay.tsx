// 変換実行中に表示する全画面オーバーレイ。
// 進捗バーは出さず、処理中であることを示すスピナーとメッセージのみを表示する。
// Base58 など重い変換でも「固まった」ではなく「処理中」と分かるようにする目的。
import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

type Props = {
    open: boolean;
};

export default function ConvertingOverlay({ open }: Props) {
    const { t } = useTranslation();
    return (
        <Backdrop
            open={open}
            sx={{
                position: 'absolute',
                color: 'common.white',
                zIndex: theme => theme.zIndex.drawer + 1,
                bgcolor: 'rgba(0, 0, 0, 0.6)',
            }}
        >
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
                <CircularProgress color='inherit' />
                <Typography variant='body1'>{t('common.converting')}</Typography>
            </Stack>
        </Backdrop>
    );
}
