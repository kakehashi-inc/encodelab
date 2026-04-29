// ユーザー設定 (テーマ / 言語) を userData/settings.json に永続化する。
// 値が未保存のときは undefined を返し、呼び出し側が OS 既定にフォールバックする。
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { AppLanguage, AppTheme } from '../../shared/types';

export type PersistedSettings = {
    theme?: AppTheme;
    language?: AppLanguage;
};

function getSettingsPath(): string {
    return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): PersistedSettings {
    try {
        const file = getSettingsPath();
        if (!fs.existsSync(file)) return {};
        const raw = fs.readFileSync(file, 'utf-8');
        const parsed = JSON.parse(raw) as PersistedSettings;
        const result: PersistedSettings = {};
        if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
            result.theme = parsed.theme;
        }
        if (parsed.language === 'ja' || parsed.language === 'en' || parsed.language === 'system') {
            result.language = parsed.language;
        }
        return result;
    } catch {
        return {};
    }
}

export function saveSettings(patch: PersistedSettings): void {
    try {
        const current = loadSettings();
        const next: PersistedSettings = { ...current, ...patch };
        const file = getSettingsPath();
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf-8');
    } catch {
        // 永続化失敗は致命ではないので握りつぶす
    }
}
