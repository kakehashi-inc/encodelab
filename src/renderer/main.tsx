import React from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, Box } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import './i18n/config';
import TitleBar from './components/TitleBar';
import UpdateNotifier from './components/UpdateNotifier';
import ConverterApp from './components/converter/ConverterApp';
import type { AppInfo, AppLanguage, AppTheme, ResolvedLanguage, ResolvedTheme } from '@shared/types';

function resolveTheme(theme: AppTheme, osTheme: ResolvedTheme): ResolvedTheme {
    return theme === 'system' ? osTheme : theme;
}

function resolveLanguage(language: AppLanguage, osLanguage: ResolvedLanguage): ResolvedLanguage {
    return language === 'system' ? osLanguage : language;
}

function App() {
    const { i18n } = useTranslation();
    const [info, setInfo] = React.useState<AppInfo | undefined>(undefined);
    // ウィンドウ内部のルート要素 (アプリ最外 Box)。起動時のフォーカス受け皿として使う。
    const appRootRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        window.encodelab.getAppInfo().then(appInfo => {
            setInfo(appInfo);
            i18n.changeLanguage(resolveLanguage(appInfo.language, appInfo.osLanguage));
        });
    }, [i18n]);

    // 起動時のフォーカスをキャプションバーから完全に剥がす。
    // Why: frame:false のカスタムタイトルバー構成だと、既定では最初の tab-stop (テーマ/最小化等のアイコン) に
    //      初期フォーカスが乗ってしまう。Electron / MUI のフォーカス処理が初回レンダリング後にも走るため、
    //      自前の focus() だけでは奪い返される。起動直後の短時間だけ focusin を監視し、TitleBar 配下に
    //      乗ったフォーカスをアプリのルート要素 (ウィンドウ内部本体) に戻す。
    React.useEffect(() => {
        const root = appRootRef.current;
        if (!root) return;
        root.focus({ preventScroll: true });
        const onFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if (target.closest('[data-app-titlebar="true"]')) {
                root.focus({ preventScroll: true });
            }
        };
        document.addEventListener('focusin', onFocusIn);
        // 1.5 秒後にガードを外す (以降のフォーカス操作はユーザー操作とみなす)
        const stop = window.setTimeout(() => {
            document.removeEventListener('focusin', onFocusIn);
        }, 1500);
        return () => {
            document.removeEventListener('focusin', onFocusIn);
            window.clearTimeout(stop);
        };
    }, []);

    const handleThemeChange = React.useCallback(async (theme: AppTheme) => {
        await window.encodelab.setTheme(theme);
        setInfo(prev => (prev ? { ...prev, theme } : prev));
    }, []);

    const handleLanguageChange = React.useCallback(
        async (language: AppLanguage) => {
            await window.encodelab.setLanguage(language);
            setInfo(prev => {
                if (!prev) return prev;
                const next = { ...prev, language };
                i18n.changeLanguage(resolveLanguage(language, next.osLanguage));
                return next;
            });
        },
        [i18n]
    );

    const muiTheme = React.useMemo(() => {
        const mode: ResolvedTheme = info ? resolveTheme(info.theme, info.osTheme) : 'light';
        return createTheme({ palette: { mode } });
    }, [info]);

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Box
                ref={appRootRef}
                tabIndex={-1}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    outline: 'none',
                }}
            >
                <TitleBar info={info} onThemeChange={handleThemeChange} onLanguageChange={handleLanguageChange} />
                <Box
                    sx={{
                        flexGrow: 1,
                        minHeight: 0,
                        bgcolor: 'background.default',
                        overflow: 'hidden',
                    }}
                >
                    <ConverterApp />
                </Box>
            </Box>
            <UpdateNotifier />
        </ThemeProvider>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
