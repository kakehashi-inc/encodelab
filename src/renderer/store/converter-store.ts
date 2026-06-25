// 変換ツール本体の状態管理 (Zustand)
import { create } from 'zustand';
import { CATEGORIES, defaultTypeOfCategory, findType, type CategoryId, type TypeId } from '@shared/conversion/catalog';
import type { Favorite, PersistedPanes, PersistedPaneSide } from '@shared/types';
import { EMPTY_PANE_VALUE, type PaneValue } from '../conversion/pane-value';
import { DEFAULT_QR_OPTIONS, type QrOptions } from '../conversion/qr/generator';
import { DEFAULT_BARCODE_OPTIONS, type BarcodeOptions } from '../conversion/barcode/generator';

// お気に入りの安定 ID。入出力タイプから決定的に生成し、重複登録の判定に使う。
export function favoriteId(inputType: TypeId, outputType: TypeId): string {
    return `${inputType}>${outputType}`;
}

// 矢印の向き。
// - 'rtl'（→）: 左ペインが入力、右ペインが出力
// - 'ltr'（←）: 右ペインが入力、左ペインが出力
export type Direction = 'rtl' | 'ltr';

export type Side = 'left' | 'right';

export type PaneState = {
    category: CategoryId;
    type: TypeId;
    value: PaneValue;
};

// 下段メッセージバーの種別。Web のアラートに準じ、severity で配色を変える。
export type MessageSeverity = 'success' | 'info' | 'warning' | 'error';

export type ConverterMessage = {
    severity: MessageSeverity;
    text: string;
};

type ConverterState = {
    direction: Direction;
    left: PaneState;
    right: PaneState;
    qrOptions: QrOptions;
    barcodeOptions: BarcodeOptions;
    // 登録済みのお気に入り (変換元/変換先のタイプ組合せ)。
    favorites: Favorite[];
    // 直近に変換した入出力パターン (新しい順、最大 RECENT_LIMIT 件)。
    recentConversions: Favorite[];
    // 直近の変換結果メッセージ (下段バーに表示)。未設定ならバーは非表示。
    message?: ConverterMessage;

    // ====== Actions ======
    setCategory(side: Side, category: CategoryId): void;
    setType(side: Side, type: TypeId): void;
    setValue(side: Side, value: PaneValue): void;
    swapPanes(): void;
    setQrOptions(options: Partial<QrOptions>): void;
    setBarcodeOptions(options: Partial<BarcodeOptions>): void;
    setMessage(message: ConverterMessage | undefined): void;
    clearMessage(): void;
    clearBothPanes(): void;
    // 起動時に永続化済みのお気に入りを反映する (永続化はしない)。
    setFavorites(favorites: Favorite[]): void;
    // 現在の入出力パターンの登録/解除をトグルする (永続化する)。
    toggleFavorite(): void;
    // 指定したお気に入りを削除する (永続化する)。
    removeFavorite(id: string): void;
    // 指定したお気に入りの入出力タイプを左右ペインに適用する (ペインのデータは維持)。
    applyFavorite(id: string): void;
    // 起動時に永続化済みの直近変換履歴を反映する (永続化はしない)。
    setRecentConversions(recent: Favorite[]): void;
    // 変換成功時に現在の入出力パターンを直近履歴へ記録する (永続化する)。
    recordRecentConversion(): void;
    // 入出力パターン (Favorite 形) を左右ペインへ適用する (ペインのデータは維持)。
    applyPattern(pattern: Favorite): void;
    // 起動時に永続化済みのペイン選択状態を復元する (永続化はしない)。
    restorePanes(panes: PersistedPanes): void;
};

const INITIAL_LEFT: PaneState = {
    category: 'binary',
    type: 'dataUrl',
    value: EMPTY_PANE_VALUE,
};

const INITIAL_RIGHT: PaneState = {
    category: 'binary',
    type: 'binaryRaw',
    value: EMPTY_PANE_VALUE,
};

// 直近変換履歴の最大保持件数。
export const RECENT_LIMIT = 5;

// お気に入りをメインプロセスへ永続化する (失敗は致命でないので握りつぶす)。
function persistFavorites(favorites: Favorite[]): void {
    void window.encodelab.saveFavorites(favorites).catch(() => {});
}

// 直近変換履歴をメインプロセスへ永続化する (失敗は致命でないので握りつぶす)。
function persistRecent(recent: Favorite[]): void {
    void window.encodelab.saveRecentConversions(recent).catch(() => {});
}

// 左右ペインの選択状態 (タイプ・矢印の向き) を永続化する。入力データ (value) は保存しない。
function persistPanes(state: ConverterState): void {
    void window.encodelab
        .savePanes({
            direction: state.direction,
            left: { category: state.left.category, type: state.left.type },
            right: { category: state.right.category, type: state.right.type },
        })
        .catch(() => {});
}

// 永続化された 1 ペイン分の選択状態を PaneState へ復元する。
// タイプが現行カタログに存在しない場合は null を返す (壊れた保存値を弾く)。
function toRestoredPaneState(side: PersistedPaneSide): PaneState | null {
    try {
        const def = findType(side.type);
        // カテゴリは保存値ではなくカタログ定義から導出し、整合性を保証する。
        return { category: def.category, type: side.type, value: EMPTY_PANE_VALUE };
    } catch {
        return null;
    }
}

// 入力/出力のペア (Favorite 形) を左右ペインに適用する共通処理。
// direction は 'rtl' 固定 (左=入力 / 右=出力)。ペインのデータ (value) は維持する。
function applyPatternToPanes(state: ConverterState, pattern: Favorite): Partial<ConverterState> {
    const inSide = inputSide(state.direction);
    const outSide = outputSide(state.direction);
    return {
        [inSide]: { ...state[inSide], category: pattern.inputCategory, type: pattern.inputType },
        [outSide]: { ...state[outSide], category: pattern.outputCategory, type: pattern.outputType },
        message: undefined,
    };
}

export const useConverterStore = create<ConverterState>((set, get) => ({
    direction: 'rtl',
    left: INITIAL_LEFT,
    right: INITIAL_RIGHT,
    qrOptions: DEFAULT_QR_OPTIONS,
    barcodeOptions: DEFAULT_BARCODE_OPTIONS,
    favorites: [],
    recentConversions: [],
    message: undefined,

    setCategory(side, category) {
        set(state => {
            const next: PaneState = {
                category,
                type: defaultTypeOfCategory(category),
                value: EMPTY_PANE_VALUE,
            };
            // 変更した側のみクリア。反対側のペインは関係ないため維持する。
            return {
                ...state,
                [side]: next,
                message: undefined,
            };
        });
        persistPanes(get());
    },

    setType(side, type) {
        set(state => {
            const def = findType(type);
            const next: PaneState = {
                category: def.category,
                type,
                value: EMPTY_PANE_VALUE,
            };
            // 変更した側のみクリア。反対側のペインは関係ないため維持する。
            return {
                ...state,
                [side]: next,
                message: undefined,
            };
        });
        persistPanes(get());
    },

    setValue(side, value) {
        set(state => ({
            ...state,
            [side]: { ...state[side], value },
        }));
    },

    swapPanes() {
        // 左右ペインの内容 (カテゴリ / 型 / 値) を物理的に入れ替える。
        // direction は 'rtl' (左=入力 / 右=出力) 固定運用なので、
        // 入れ替えにより入力と出力の役割が反転する。
        set(state => ({
            ...state,
            left: state.right,
            right: state.left,
            message: undefined,
        }));
        persistPanes(get());
    },

    setQrOptions(options) {
        set(state => ({ ...state, qrOptions: { ...state.qrOptions, ...options } }));
    },

    setBarcodeOptions(options) {
        set(state => ({ ...state, barcodeOptions: { ...state.barcodeOptions, ...options } }));
    },

    setMessage(message) {
        set(state => ({ ...state, message }));
    },

    clearMessage() {
        set(state => ({ ...state, message: undefined }));
    },

    clearBothPanes() {
        set(state => ({
            ...state,
            left: { ...state.left, value: EMPTY_PANE_VALUE },
            right: { ...state.right, value: EMPTY_PANE_VALUE },
            message: undefined,
        }));
    },

    setFavorites(favorites) {
        set(state => ({ ...state, favorites }));
    },

    toggleFavorite() {
        const state = get();
        const input = state[inputSide(state.direction)];
        const output = state[outputSide(state.direction)];
        const id = favoriteId(input.type, output.type);
        const exists = state.favorites.some(f => f.id === id);
        const favorites = exists
            ? state.favorites.filter(f => f.id !== id)
            : [
                  ...state.favorites,
                  {
                      id,
                      inputCategory: input.category,
                      inputType: input.type,
                      outputCategory: output.category,
                      outputType: output.type,
                  },
              ];
        set({ favorites });
        persistFavorites(favorites);
    },

    removeFavorite(id) {
        const favorites = get().favorites.filter(f => f.id !== id);
        set({ favorites });
        persistFavorites(favorites);
    },

    applyFavorite(id) {
        const state = get();
        const fav = state.favorites.find(f => f.id === id);
        if (fav) {
            set(applyPatternToPanes(state, fav));
            persistPanes(get());
        }
    },

    applyPattern(pattern) {
        set(state => applyPatternToPanes(state, pattern));
        persistPanes(get());
    },

    restorePanes(panes) {
        const left = toRestoredPaneState(panes.left);
        const right = toRestoredPaneState(panes.right);
        // どちらかが壊れていれば復元しない (初期状態のまま)。
        if (!left || !right) return;
        set(state => ({ ...state, direction: panes.direction, left, right }));
    },

    setRecentConversions(recent) {
        set(state => ({ ...state, recentConversions: recent }));
    },

    recordRecentConversion() {
        const state = get();
        const input = state[inputSide(state.direction)];
        const output = state[outputSide(state.direction)];
        const id = favoriteId(input.type, output.type);
        const entry: Favorite = {
            id,
            inputCategory: input.category,
            inputType: input.type,
            outputCategory: output.category,
            outputType: output.type,
        };
        // 同一パターンを先頭へ繰り上げ、新しい順で最大 RECENT_LIMIT 件に保つ。
        const recent = [entry, ...state.recentConversions.filter(r => r.id !== id)].slice(0, RECENT_LIMIT);
        set({ recentConversions: recent });
        persistRecent(recent);
    },
}));

// 入出力サイドを direction から導出
export function inputSide(direction: Direction): Side {
    return direction === 'rtl' ? 'left' : 'right';
}

export function outputSide(direction: Direction): Side {
    return direction === 'rtl' ? 'right' : 'left';
}

// カテゴリ一覧 (UI のドロップダウン用)
export const CATEGORY_LIST = CATEGORIES;
