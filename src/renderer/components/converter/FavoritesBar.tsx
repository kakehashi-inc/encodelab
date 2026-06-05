// 変換画面上部のお気に入りバー。
// 登録済みの変換パターン (入力タイプ → 出力タイプ) をドロップダウンで一覧表示し、
// 選択で左右ペインに適用、各項目の × で削除できる。
// 登録 / 解除は中央のお気に入り (星) ボタンで行う。
import React from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { findType } from '@shared/conversion/catalog';
import type { Favorite } from '@shared/types';
import { useConverterStore } from '../../store/converter-store';

// 「入力タイプ名 → 出力タイプ名」のラベルを i18n で生成する。
function useFavoriteLabel() {
    const { t } = useTranslation();
    return (fav: Favorite) => {
        const input = t(findType(fav.inputType).labelKey);
        const output = t(findType(fav.outputType).labelKey);
        return `${input} → ${output}`;
    };
}

export default function FavoritesBar() {
    const { t } = useTranslation();
    const favorites = useConverterStore(s => s.favorites);
    const recentConversions = useConverterStore(s => s.recentConversions);
    const applyFavorite = useConverterStore(s => s.applyFavorite);
    const applyPattern = useConverterStore(s => s.applyPattern);
    const removeFavorite = useConverterStore(s => s.removeFavorite);
    const labelOf = useFavoriteLabel();

    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
    const close = () => setAnchor(null);

    const handleApply = (id: string) => {
        applyFavorite(id);
        close();
    };

    return (
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Button
                size='small'
                variant='outlined'
                color='inherit'
                startIcon={<StarIcon fontSize='small' sx={{ color: 'warning.main' }} />}
                endIcon={<ArrowDropDownIcon />}
                onClick={e => setAnchor(e.currentTarget)}
                sx={{ textTransform: 'none', borderColor: 'divider', flexShrink: 0 }}
            >
                {t('favorites.menu')}
                {favorites.length > 0 ? ` (${favorites.length})` : ''}
            </Button>

            {recentConversions.length > 0 && (
                <>
                    <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
                    <Tooltip title={t('favorites.recent')}>
                        <HistoryIcon fontSize='small' sx={{ color: 'text.secondary', flexShrink: 0 }} />
                    </Tooltip>
                    {/* 直近に変換した組合せ (最大 5 件)。クリックで左右ペインに適用。 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                        {recentConversions.map(r => (
                            <Chip
                                key={r.id}
                                size='small'
                                variant='outlined'
                                label={labelOf(r)}
                                onClick={() => applyPattern(r)}
                                sx={{ flexShrink: 0 }}
                            />
                        ))}
                    </Box>
                </>
            )}

            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
                {favorites.length === 0 ? (
                    <MenuItem disabled>
                        <Typography variant='body2' color='text.secondary'>
                            {t('favorites.empty')}
                        </Typography>
                    </MenuItem>
                ) : (
                    favorites.map(fav => (
                        <MenuItem
                            key={fav.id}
                            onClick={() => handleApply(fav.id)}
                            sx={{ pr: 1, gap: 1, minWidth: 240 }}
                        >
                            <ListItemText primary={labelOf(fav)} />
                            <Box
                                component='span'
                                sx={{ display: 'inline-flex' }}
                                // 削除アイコンのクリックが適用 (MenuItem onClick) に伝播しないようにする。
                                onClick={e => e.stopPropagation()}
                            >
                                <Tooltip title={t('favorites.remove')}>
                                    <IconButton
                                        size='small'
                                        edge='end'
                                        aria-label={t('favorites.remove')}
                                        onClick={() => removeFavorite(fav.id)}
                                    >
                                        <CloseIcon fontSize='small' />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </MenuItem>
                    ))
                )}
            </Menu>
        </Box>
    );
}
