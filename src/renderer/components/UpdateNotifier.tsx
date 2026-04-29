import React from 'react';
import { Snackbar, Alert, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { UpdateState } from '@shared/types';

/**
 * 自動アップデート通知 UI。
 * - idle / checking / not-available / error: 何も表示しない
 * - available: 「アップデートしますか？」を確認 (アップデート / 後で)
 * - downloading: 進捗を表示
 * - downloaded: 適用中メッセージを表示 (メイン側が短い遅延で再起動)
 */
export default function UpdateNotifier() {
    const { t } = useTranslation();
    const [state, setState] = React.useState<UpdateState>({ status: 'idle' });
    // ユーザーがこのセッションで「後で」を押したかどうか
    const [dismissed, setDismissed] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;

        // 取りこぼしを防ぐため購読を先に登録
        const unsubscribe = window.encodelab.updater.onStateChanged(next => {
            setState(next);
        });

        window.encodelab.updater.getState().then(initial => {
            if (cancelled) return;
            setState(initial);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const shouldShow =
        (state.status === 'available' && !dismissed) ||
        state.status === 'downloading' ||
        state.status === 'downloaded';

    if (!shouldShow) return null;

    const renderContent = () => {
        switch (state.status) {
            case 'available':
                return (
                    <Alert
                        severity='info'
                        action={
                            <Stack direction='row' spacing={1}>
                                <Button color='inherit' size='small' onClick={() => setDismissed(true)}>
                                    {t('updater.later')}
                                </Button>
                                <Button
                                    color='inherit'
                                    size='small'
                                    variant='outlined'
                                    onClick={() => {
                                        void window.encodelab.updater.download();
                                    }}
                                >
                                    {t('updater.update')}
                                </Button>
                            </Stack>
                        }
                    >
                        {t('updater.confirm', { version: state.version ?? '' })}
                    </Alert>
                );
            case 'downloading':
                return (
                    <Alert severity='info' icon={false}>
                        <Stack spacing={1} sx={{ minWidth: 280 }}>
                            <Typography variant='body2'>
                                {t('updater.downloading', { progress: state.progress ?? 0 })}
                            </Typography>
                            <LinearProgress variant='determinate' value={state.progress ?? 0} />
                        </Stack>
                    </Alert>
                );
            case 'downloaded':
                return (
                    <Alert severity='success' icon={false}>
                        <Stack spacing={1} sx={{ minWidth: 280 }}>
                            <Typography variant='body2'>{t('updater.installing')}</Typography>
                            <LinearProgress />
                        </Stack>
                    </Alert>
                );
            default:
                return null;
        }
    };

    const content = renderContent();
    if (!content) return null;

    return (
        <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} autoHideDuration={null}>
            {content}
        </Snackbar>
    );
}
