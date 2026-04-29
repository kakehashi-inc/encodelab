// 変換ツール本体の状態管理 (Zustand)
import { create } from 'zustand';
import { CATEGORIES, defaultTypeOfCategory, findType, type CategoryId, type TypeId } from '@shared/conversion/catalog';
import { EMPTY_PANE_VALUE, type PaneValue } from '../conversion/pane-value';
import { DEFAULT_QR_OPTIONS, type QrOptions } from '../conversion/qr/generator';

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

type ConverterState = {
    direction: Direction;
    left: PaneState;
    right: PaneState;
    qrOptions: QrOptions;
    // 直近の変換エラー (出力ペイン側に表示)
    errorMessage?: string;

    // ====== Actions ======
    setCategory(side: Side, category: CategoryId): void;
    setType(side: Side, type: TypeId): void;
    setValue(side: Side, value: PaneValue): void;
    flipDirection(): void;
    setQrOptions(options: Partial<QrOptions>): void;
    setError(message: string | undefined): void;
    clearBothPanes(): void;
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

export const useConverterStore = create<ConverterState>(set => ({
    direction: 'rtl',
    left: INITIAL_LEFT,
    right: INITIAL_RIGHT,
    qrOptions: DEFAULT_QR_OPTIONS,
    errorMessage: undefined,

    setCategory(side, category) {
        set(state => {
            const next: PaneState = {
                category,
                type: defaultTypeOfCategory(category),
                value: EMPTY_PANE_VALUE,
            };
            return {
                ...state,
                [side]: next,
                // 反対側もデータをクリア (要件 §7)
                left: side === 'left' ? next : { ...state.left, value: EMPTY_PANE_VALUE },
                right: side === 'right' ? next : { ...state.right, value: EMPTY_PANE_VALUE },
                errorMessage: undefined,
            };
        });
    },

    setType(side, type) {
        set(state => {
            const def = findType(type);
            const next: PaneState = {
                category: def.category,
                type,
                value: EMPTY_PANE_VALUE,
            };
            return {
                ...state,
                left: side === 'left' ? next : { ...state.left, value: EMPTY_PANE_VALUE },
                right: side === 'right' ? next : { ...state.right, value: EMPTY_PANE_VALUE },
                errorMessage: undefined,
            };
        });
    },

    setValue(side, value) {
        set(state => ({
            ...state,
            [side]: { ...state[side], value },
        }));
    },

    flipDirection() {
        // 方向反転時はデータをクリアしない (要件 §7)
        set(state => ({
            ...state,
            direction: state.direction === 'rtl' ? 'ltr' : 'rtl',
            errorMessage: undefined,
        }));
    },

    setQrOptions(options) {
        set(state => ({ ...state, qrOptions: { ...state.qrOptions, ...options } }));
    },

    setError(message) {
        set(state => ({ ...state, errorMessage: message }));
    },

    clearBothPanes() {
        set(state => ({
            ...state,
            left: { ...state.left, value: EMPTY_PANE_VALUE },
            right: { ...state.right, value: EMPTY_PANE_VALUE },
            errorMessage: undefined,
        }));
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
