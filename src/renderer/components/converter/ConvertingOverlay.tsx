// 変換実行中に表示する全画面オーバーレイ。
//
// 通常の変換 (Base58 など): スピナーと「処理中」メッセージのみ。進捗・キャンセルは出さない
// (従来通り)。
//
// 画像認識 (QR コード / バーコード読取): progress が渡されたときは、進捗 (段階・ステップ) と
// キャンセルボタンを表示する。認識は時間がかかり得るため、固まったように見せず、ユーザーが
// 中断できるようにする目的。
import { Backdrop, Box, Button, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { RecognizeProgress } from '../../conversion/recognition';

type Props = {
    open: boolean;
    // 画像認識時のみ渡される。null の通常変換ではスピナーのみ表示する。
    progress?: RecognizeProgress | null;
    onCancel?: () => void;
};

export default function ConvertingOverlay({ open, progress, onCancel }: Props) {
    const { t } = useTranslation();

    const showProgress = progress != null;
    // 総ステップ未確定 (準備中) は割合表示を出さない。
    const ready = showProgress && progress.total > 0;
    const percent = ready ? Math.min(100, (progress.done / progress.total) * 100) : 0;

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
            <Stack spacing={2} sx={{ alignItems: 'center', width: 320, maxWidth: '80%' }}>
                {showProgress ? (
                    <>
                        <Typography variant='body1'>{t('common.converting')}</Typography>
                        {ready ? (
                            <Box sx={{ width: '100%' }}>
                                <LinearProgress
                                    variant='determinate'
                                    value={percent}
                                    color='inherit'
                                    sx={{ height: 8, borderRadius: 1 }}
                                />
                                <Stack
                                    direction='row'
                                    sx={{ justifyContent: 'space-between', mt: 0.75 }}
                                >
                                    <Typography variant='caption'>
                                        {t('recognize.stage', {
                                            stage: progress.stage,
                                            stageCount: progress.stageCount,
                                        })}
                                    </Typography>
                                    <Typography variant='caption'>
                                        {t('recognize.step', {
                                            done: progress.done,
                                            total: progress.total,
                                        })}
                                    </Typography>
                                </Stack>
                            </Box>
                        ) : (
                            <CircularProgress color='inherit' />
                        )}
                        {onCancel && (
                            <Button
                                onClick={onCancel}
                                variant='outlined'
                                color='inherit'
                                size='small'
                            >
                                {t('common.cancel')}
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        <CircularProgress color='inherit' />
                        <Typography variant='body1'>{t('common.converting')}</Typography>
                    </>
                )}
            </Stack>
        </Backdrop>
    );
}
