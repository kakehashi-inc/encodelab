// バーコード生成オプションパネル (出力側 barcode=barcode のとき表示)
import {
    Box,
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { BarcodeOptions, BarcodeSymbology, BarcodeFormat } from '../../conversion/barcode/generator';
import { BORDERED_BOX_SX, FORMAT_SELECT_SX } from './shared';

type Props = {
    options: BarcodeOptions;
    onChange: (next: Partial<BarcodeOptions>) => void;
};

// 規格の選択肢。ラベルは規格名そのものなので i18n しない。
const SYMBOLOGIES: { value: BarcodeSymbology; label: string }[] = [
    { value: 'code128', label: 'CODE128' },
    { value: 'gs1-128', label: 'GS1-128' },
    { value: 'ean13', label: 'JAN / EAN-13' },
    { value: 'ean8', label: 'EAN-8' },
    { value: 'upca', label: 'UPC-A' },
    { value: 'upce', label: 'UPC-E' },
    { value: 'code39', label: 'CODE39' },
    { value: 'interleaved2of5', label: 'ITF (Interleaved 2 of 5)' },
    { value: 'rationalizedCodabar', label: 'NW-7 (Codabar)' },
];

export default function BarcodeOptionsPanel({ options, onChange }: Props) {
    const { t } = useTranslation();

    return (
        <Box sx={{ ...BORDERED_BOX_SX, p: 1.5, bgcolor: 'background.paper' }}>
            <Stack spacing={1.5}>
                <Stack direction='row' spacing={1}>
                    <FormControl size='small' sx={FORMAT_SELECT_SX}>
                        <InputLabel>{t('pane.qrFormat')}</InputLabel>
                        <Select
                            label={t('pane.qrFormat')}
                            value={options.format}
                            onChange={e => onChange({ format: e.target.value as BarcodeFormat })}
                        >
                            <MenuItem value='svg'>SVG</MenuItem>
                            <MenuItem value='png'>PNG</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size='small' sx={{ flex: 1 }}>
                        <InputLabel>{t('pane.barcodeSymbology')}</InputLabel>
                        <Select
                            label={t('pane.barcodeSymbology')}
                            value={options.symbology}
                            onChange={e => onChange({ symbology: e.target.value as BarcodeSymbology })}
                        >
                            {SYMBOLOGIES.map(s => (
                                <MenuItem key={s.value} value={s.value}>
                                    {s.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
                <Stack direction='row' spacing={1}>
                    <TextField
                        size='small'
                        type='number'
                        label={t('pane.barcodeScale')}
                        value={options.scale}
                        onChange={e => onChange({ scale: clamp(Number(e.target.value), 1, 10) })}
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        size='small'
                        type='number'
                        label={t('pane.barcodeHeight')}
                        value={options.height}
                        onChange={e => onChange({ height: clamp(Number(e.target.value), 1, 100) })}
                        sx={{ flex: 1 }}
                    />
                </Stack>
                <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                size='small'
                                checked={options.includeText}
                                onChange={e => onChange({ includeText: e.target.checked })}
                            />
                        }
                        label={<Typography variant='caption'>{t('pane.barcodeIncludeText')}</Typography>}
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
