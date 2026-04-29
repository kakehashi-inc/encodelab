// カテゴリ横断のタイプ検索ボタン。
// アイコンクリックで Popover が開き、フリーテキストで全カテゴリのタイプを検索できる。
// 候補選択で onSelect が呼ばれ、ストア側でカテゴリ・タイプが切り替わる。
import React from 'react';
import {
    Box,
    IconButton,
    InputAdornment,
    List,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Popover,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, type CategoryDefinition, type TypeDefinition, type TypeId } from '@shared/conversion/catalog';

type Props = {
    onSelect: (typeId: TypeId) => void;
};

export default function TypeSearchButton({ onSelect }: Props) {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const [query, setQuery] = React.useState('');
    const [activeIndex, setActiveIndex] = React.useState(0);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
        setQuery('');
        setActiveIndex(0);
    };
    const handleClose = () => setAnchorEl(null);

    // カテゴリ単位にグループ化したフィルタ結果。
    // - 検索文字列は小文字化して 'カテゴリ名 + タイプ名' に対する部分一致で判定
    // - 空文字なら全件表示
    const groups = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        const result: { category: CategoryDefinition; types: TypeDefinition[] }[] = [];
        for (const cat of CATEGORIES) {
            const catLabel = t(cat.labelKey).toLowerCase();
            const matched = cat.types.filter(ty => {
                if (q.length === 0) return true;
                const tyLabel = t(ty.labelKey).toLowerCase();
                return (
                    tyLabel.includes(q) ||
                    catLabel.includes(q) ||
                    ty.id.toLowerCase().includes(q) ||
                    `${catLabel} ${tyLabel}`.includes(q)
                );
            });
            if (matched.length > 0) {
                result.push({ category: cat, types: matched });
            }
        }
        return result;
    }, [query, t]);

    // フラットな候補列 (キーボード操作用)
    const flat = React.useMemo(() => groups.flatMap(g => g.types), [groups]);

    React.useEffect(() => {
        // クエリが変わるたびに先頭にハイライトを戻す
        setActiveIndex(0);
    }, [query]);

    const commit = (typeId: TypeId) => {
        onSelect(typeId);
        handleClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (flat.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => (i + 1) % flat.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => (i - 1 + flat.length) % flat.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = flat[activeIndex];
            if (target) commit(target.id);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleClose();
        }
    };

    return (
        <>
            <Tooltip title={t('common.searchType')}>
                <IconButton size='small' onClick={handleOpen} sx={{ alignSelf: 'center' }}>
                    <SearchIcon fontSize='small' />
                </IconButton>
            </Tooltip>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { width: 360 } } }}
            >
                <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }} onKeyDown={handleKeyDown}>
                    <TextField
                        autoFocus
                        size='small'
                        fullWidth
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t('common.searchPlaceholder')}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <SearchIcon fontSize='small' />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                        {flat.length === 0 ? (
                            <Typography variant='body2' color='text.secondary' sx={{ p: 2, textAlign: 'center' }}>
                                {t('common.searchNoResults')}
                            </Typography>
                        ) : (
                            <List dense disablePadding>
                                {groups.map(group => (
                                    <Box key={group.category.id}>
                                        <ListSubheader
                                            disableSticky
                                            sx={{ bgcolor: 'transparent', lineHeight: '24px', py: 0.5 }}
                                        >
                                            {t(group.category.labelKey)}
                                        </ListSubheader>
                                        {group.types.map(ty => {
                                            const indexInFlat = flat.findIndex(x => x.id === ty.id);
                                            const selected = indexInFlat === activeIndex;
                                            return (
                                                <ListItemButton
                                                    key={ty.id}
                                                    selected={selected}
                                                    onClick={() => commit(ty.id)}
                                                    onMouseEnter={() => setActiveIndex(indexInFlat)}
                                                    sx={{ pl: 3 }}
                                                >
                                                    <ListItemText primary={t(ty.labelKey)} />
                                                </ListItemButton>
                                            );
                                        })}
                                    </Box>
                                ))}
                            </List>
                        )}
                    </Box>
                </Box>
            </Popover>
        </>
    );
}
