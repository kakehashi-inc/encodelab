import React from 'react';
import { Button, Snackbar, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';

type Props = {
    text: string;
    disabled?: boolean;
};

export default function CopyButton({ text, disabled }: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);

    const handleClick = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setOpen(true);
        } catch (err) {
            console.error('Clipboard write failed', err);
        }
    };

    return (
        <>
            <Tooltip title={t('common.copy')}>
                <span>
                    <Button
                        size='small'
                        startIcon={<ContentCopyIcon fontSize='small' />}
                        onClick={handleClick}
                        disabled={disabled || text.length === 0}
                        variant='outlined'
                    >
                        {t('common.copy')}
                    </Button>
                </span>
            </Tooltip>
            <Snackbar
                open={open}
                autoHideDuration={1500}
                onClose={() => setOpen(false)}
                message={t('common.copied')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
}
