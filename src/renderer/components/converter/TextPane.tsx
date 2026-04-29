// テキスト系ペイン (入出力共通)。
// 入出力どちらも編集可能 (要件 §11)。
// テキストエリアは親ペインの残り高さを全て占有する (FILL_HEIGHT_TEXTAREA_SX)。
import { Box, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CopyButton from './CopyButton';
import { FILL_HEIGHT_TEXTAREA_SX } from './shared';

type Props = {
    value: string;
    onChange: (text: string) => void;
    placeholder?: string;
};

export default function TextPane({ value, onChange, placeholder }: Props) {
    const { t } = useTranslation();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, minHeight: 0 }}>
            <TextField
                multiline
                fullWidth
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? t('pane.textPlaceholder')}
                sx={FILL_HEIGHT_TEXTAREA_SX}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <CopyButton text={value} />
            </Box>
        </Box>
    );
}
