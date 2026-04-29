// カテゴリ・タイプの 2 段ドロップダウン + 検索アイコン (カテゴリ横断のタイプ検索)。
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, findCategory, type CategoryId, type TypeId } from '@shared/conversion/catalog';
import TypeSearchButton from './TypeSearchButton';

type Props = {
    category: CategoryId;
    type: TypeId;
    onCategoryChange: (id: CategoryId) => void;
    onTypeChange: (id: TypeId) => void;
};

export default function PaneSelectors({ category, type, onCategoryChange, onTypeChange }: Props) {
    const { t } = useTranslation();
    const types = findCategory(category).types;

    return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size='small' sx={{ minWidth: 180, flex: 1 }}>
                <InputLabel>{t('pane.category')}</InputLabel>
                <Select
                    label={t('pane.category')}
                    value={category}
                    onChange={e => onCategoryChange(e.target.value as CategoryId)}
                >
                    {CATEGORIES.map(c => (
                        <MenuItem key={c.id} value={c.id}>
                            {t(c.labelKey)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControl size='small' sx={{ minWidth: 180, flex: 1 }}>
                <InputLabel>{t('pane.type')}</InputLabel>
                <Select label={t('pane.type')} value={type} onChange={e => onTypeChange(e.target.value as TypeId)}>
                    {types.map(t2 => (
                        <MenuItem key={t2.id} value={t2.id}>
                            {t(t2.labelKey)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <TypeSearchButton onSelect={onTypeChange} />
        </Box>
    );
}
