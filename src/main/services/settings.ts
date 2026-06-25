// ユーザー設定 (テーマ / 言語) を userData/settings.json に永続化する。
// 値が未保存のときは undefined を返し、呼び出し側が OS 既定にフォールバックする。
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { AppLanguage, AppTheme, Favorite, PersistedPanes } from '../../shared/types';

export type PersistedSettings = {
    theme?: AppTheme;
    language?: AppLanguage;
    favorites?: Favorite[];
    recentConversions?: Favorite[];
    // 左右ペインの選択状態 (タイプ保存)。
    lastPanes?: PersistedPanes;
};

// 永続化された lastPanes を型安全に検証する。壊れていれば undefined を返す。
function sanitizePanes(value: unknown): PersistedPanes | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const v = value as PersistedPanes;
    const okSide = (s: unknown): s is PersistedPanes['left'] =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as PersistedPanes['left']).category === 'string' &&
        typeof (s as PersistedPanes['left']).type === 'string';
    if ((v.direction !== 'rtl' && v.direction !== 'ltr') || !okSide(v.left) || !okSide(v.right)) {
        return undefined;
    }
    return {
        direction: v.direction,
        left: { category: v.left.category, type: v.left.type },
        right: { category: v.right.category, type: v.right.type },
    };
}

// 永続化された favorites を型安全に検証する。壊れた要素は捨てる。
function sanitizeFavorites(value: unknown): Favorite[] {
    if (!Array.isArray(value)) return [];
    const result: Favorite[] = [];
    for (const item of value) {
        if (
            item &&
            typeof item === 'object' &&
            typeof (item as Favorite).id === 'string' &&
            typeof (item as Favorite).inputCategory === 'string' &&
            typeof (item as Favorite).inputType === 'string' &&
            typeof (item as Favorite).outputCategory === 'string' &&
            typeof (item as Favorite).outputType === 'string'
        ) {
            const f = item as Favorite;
            result.push({
                id: f.id,
                inputCategory: f.inputCategory,
                inputType: f.inputType,
                outputCategory: f.outputCategory,
                outputType: f.outputType,
            });
        }
    }
    return result;
}

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
        result.favorites = sanitizeFavorites(parsed.favorites);
        result.recentConversions = sanitizeFavorites(parsed.recentConversions);
        const panes = sanitizePanes(parsed.lastPanes);
        if (panes) result.lastPanes = panes;
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
