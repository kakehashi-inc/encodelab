import React from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AppInfo, AppLanguage, AppTheme } from '@shared/types';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';

type Props = {
    info: AppInfo | undefined;
    onThemeChange: (theme: AppTheme) => void;
    onLanguageChange: (language: AppLanguage) => void;
};

export default function TitleBar({ info, onThemeChange, onLanguageChange }: Props) {
    const { t } = useTranslation();
    const isMac = info?.os === 'darwin';

    const [themeAnchor, setThemeAnchor] = React.useState<HTMLElement | null>(null);
    const [langAnchor, setLangAnchor] = React.useState<HTMLElement | null>(null);

    const currentTheme: AppTheme = info?.theme ?? 'system';
    const currentLang: AppLanguage = info?.language ?? 'system';

    const themeIcon =
        currentTheme === 'dark' ? (
            <DarkModeIcon fontSize='small' />
        ) : currentTheme === 'light' ? (
            <LightModeIcon fontSize='small' />
        ) : (
            <SettingsBrightnessIcon fontSize='small' />
        );

    return (
        <Box
            data-app-titlebar='true'
            sx={{
                WebkitAppRegion: 'drag',
                display: 'flex',
                alignItems: 'center',
                px: 2,
                height: 48,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
                userSelect: 'none',
            }}
        >
            <Box sx={{ flexGrow: 1, ml: isMac ? 10 : 0, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant='body1' sx={{ fontWeight: 500, fontSize: '0.95rem' }}>
                    {t('appTitle')}
                </Typography>
                {info?.version && (
                    <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        v{info.version}
                    </Typography>
                )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
                {/* テーマ切替 */}
                <IconButton
                    size='medium'
                    onClick={e => setThemeAnchor(e.currentTarget)}
                    sx={{
                        borderRadius: 0,
                        width: 48,
                        height: 48,
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                    aria-label={t('titleBar.themeMenu')}
                >
                    {themeIcon}
                </IconButton>
                <Menu anchorEl={themeAnchor} open={Boolean(themeAnchor)} onClose={() => setThemeAnchor(null)}>
                    <ThemeMenuItem
                        value='light'
                        current={currentTheme}
                        icon={<LightModeIcon fontSize='small' />}
                        label={t('titleBar.themeLight')}
                        onSelect={v => {
                            onThemeChange(v);
                            setThemeAnchor(null);
                        }}
                    />
                    <ThemeMenuItem
                        value='dark'
                        current={currentTheme}
                        icon={<DarkModeIcon fontSize='small' />}
                        label={t('titleBar.themeDark')}
                        onSelect={v => {
                            onThemeChange(v);
                            setThemeAnchor(null);
                        }}
                    />
                    <Divider />
                    <ThemeMenuItem
                        value='system'
                        current={currentTheme}
                        icon={<SettingsBrightnessIcon fontSize='small' />}
                        label={t('titleBar.themeSystem')}
                        onSelect={v => {
                            onThemeChange(v);
                            setThemeAnchor(null);
                        }}
                    />
                </Menu>

                {/* 言語切替 */}
                <IconButton
                    size='medium'
                    onClick={e => setLangAnchor(e.currentTarget)}
                    sx={{
                        borderRadius: 0,
                        width: 48,
                        height: 48,
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                    aria-label={t('titleBar.languageMenu')}
                >
                    <LanguageIcon fontSize='small' />
                </IconButton>
                <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)}>
                    <LangMenuItem
                        value='ja'
                        current={currentLang}
                        label={t('titleBar.languageJa')}
                        onSelect={v => {
                            onLanguageChange(v);
                            setLangAnchor(null);
                        }}
                    />
                    <LangMenuItem
                        value='en'
                        current={currentLang}
                        label={t('titleBar.languageEn')}
                        onSelect={v => {
                            onLanguageChange(v);
                            setLangAnchor(null);
                        }}
                    />
                    <Divider />
                    <LangMenuItem
                        value='system'
                        current={currentLang}
                        label={t('titleBar.languageSystem')}
                        onSelect={v => {
                            onLanguageChange(v);
                            setLangAnchor(null);
                        }}
                    />
                </Menu>

                {/* Window controls - macOSでは非表示 */}
                {!isMac && (
                    <>
                        <IconButton
                            size='medium'
                            onClick={() => window.encodelab.minimize()}
                            sx={{
                                borderRadius: 0,
                                width: 48,
                                height: 48,
                                color: 'text.primary',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <MinimizeIcon />
                        </IconButton>
                        <IconButton
                            size='medium'
                            onClick={async () => {
                                await window.encodelab.maximizeOrRestore();
                            }}
                            sx={{
                                borderRadius: 0,
                                width: 48,
                                height: 48,
                                color: 'text.primary',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <CropSquareIcon />
                        </IconButton>
                        <IconButton
                            size='medium'
                            onClick={() => window.encodelab.close()}
                            sx={{
                                borderRadius: 0,
                                width: 48,
                                height: 48,
                                color: 'text.primary',
                                '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </>
                )}
            </Box>
        </Box>
    );
}

function ThemeMenuItem({
    value,
    current,
    icon,
    label,
    onSelect,
}: {
    value: AppTheme;
    current: AppTheme;
    icon: React.ReactNode;
    label: string;
    onSelect: (value: AppTheme) => void;
}) {
    const selected = current === value;
    return (
        <MenuItem onClick={() => onSelect(value)} selected={selected}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText>{label}</ListItemText>
            {selected && (
                <ListItemIcon sx={{ minWidth: 0, ml: 2 }}>
                    <CheckIcon fontSize='small' />
                </ListItemIcon>
            )}
        </MenuItem>
    );
}

function LangMenuItem({
    value,
    current,
    label,
    onSelect,
}: {
    value: AppLanguage;
    current: AppLanguage;
    label: string;
    onSelect: (value: AppLanguage) => void;
}) {
    const selected = current === value;
    return (
        <MenuItem onClick={() => onSelect(value)} selected={selected}>
            <ListItemText>{label}</ListItemText>
            {selected && (
                <ListItemIcon sx={{ minWidth: 0, ml: 2 }}>
                    <CheckIcon fontSize='small' />
                </ListItemIcon>
            )}
        </MenuItem>
    );
}
