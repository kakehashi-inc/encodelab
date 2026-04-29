// 1 ペイン分のヘッダー: 役割ラベル + カテゴリ・タイプ選択。
import { Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CategoryId, TypeId } from '@shared/conversion/catalog';
import PaneSelectors from './PaneSelectors';

type Role = 'input' | 'output';

type Props = {
    role: Role;
    category: CategoryId;
    type: TypeId;
    onCategoryChange: (id: CategoryId) => void;
    onTypeChange: (id: TypeId) => void;
};

export default function PaneHeader({ role, category, type, onCategoryChange, onTypeChange }: Props) {
    const { t } = useTranslation();
    return (
        <Stack spacing={0.5}>
            <Typography variant='overline' color={role === 'input' ? 'primary.main' : 'secondary.main'}>
                {role === 'input' ? t('pane.input') : t('pane.output')}
            </Typography>
            <PaneSelectors
                category={category}
                type={type}
                onCategoryChange={onCategoryChange}
                onTypeChange={onTypeChange}
            />
        </Stack>
    );
}
