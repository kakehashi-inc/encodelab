// QR コード生成オプションパネル (出力側 image=qrCode のとき表示)
import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { QrOptions, QrErrorCorrection, QrFormat } from '../../conversion/qr/generator';

type Props = {
    options: QrOptions;
    onChange: (next: Partial<QrOptions>) => void;
};

export default function QrOptionsPanel({ options, onChange }: Props) {
    const { t } = useTranslation();
    const isPng = options.format === 'png';

    return (
        <Box
            sx={{
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
            }}
        >
            <Stack spacing={1.5}>
                <Stack direction='row' spacing={1}>
                    <FormControl size='small' sx={{ flex: 1 }}>
                        <InputLabel>{t('pane.qrFormat')}</InputLabel>
                        <Select
                            label={t('pane.qrFormat')}
                            value={options.format}
                            onChange={e => onChange({ format: e.target.value as QrFormat })}
                        >
                            <MenuItem value='svg'>SVG</MenuItem>
                            <MenuItem value='png'>PNG</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size='small' sx={{ flex: 1 }}>
                        <InputLabel>{t('pane.qrErrorCorrection')}</InputLabel>
                        <Select
                            label={t('pane.qrErrorCorrection')}
                            value={options.errorCorrection}
                            onChange={e => onChange({ errorCorrection: e.target.value as QrErrorCorrection })}
                        >
                            <MenuItem value='L'>L (7%)</MenuItem>
                            <MenuItem value='M'>M (15%)</MenuItem>
                            <MenuItem value='Q'>Q (25%)</MenuItem>
                            <MenuItem value='H'>H (30%)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
                <Stack direction='row' spacing={1}>
                    <TextField
                        size='small'
                        type='number'
                        label={t('pane.qrCellSize')}
                        value={options.cellSize}
                        disabled={!isPng}
                        onChange={e => onChange({ cellSize: clamp(Number(e.target.value), 1, 64) })}
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        size='small'
                        type='number'
                        label={t('pane.qrMargin')}
                        value={options.margin}
                        onChange={e => onChange({ margin: clamp(Number(e.target.value), 0, 16) })}
                        sx={{ flex: 1 }}
                    />
                </Stack>
                <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant='caption' sx={{ minWidth: 64 }}>
                        {t('pane.qrForeground')}
                    </Typography>
                    <input
                        type='color'
                        aria-label={t('pane.qrForeground')}
                        title={t('pane.qrForeground')}
                        value={options.foregroundColor}
                        onChange={e => onChange({ foregroundColor: e.target.value })}
                    />
                    <Typography variant='caption' sx={{ minWidth: 64, ml: 2 }}>
                        {t('pane.qrBackground')}
                    </Typography>
                    <input
                        type='color'
                        aria-label={t('pane.qrBackground')}
                        title={t('pane.qrBackground')}
                        value={options.backgroundColor}
                        onChange={e => onChange({ backgroundColor: e.target.value })}
                    />
                </Stack>
            </Stack>
        </Box>
    );
}

function clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
}
