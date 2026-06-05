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
    // 直近の変換結果メッセージ (下段バーに表示)。未設定ならバーは非表示。
    message?: ConverterMessage;

    // ====== Actions ======
    setCategory(side: Side, category: CategoryId): void;
    setType(side: Side, type: TypeId): void;
    setValue(side: Side, value: PaneValue): void;
    swapPanes(): void;
    setQrOptions(options: Partial<QrOptions>): void;
    setMessage(message: ConverterMessage | undefined): void;
    clearMessage(): void;
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
                message: undefined,
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
                message: undefined,
            };
        });
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
    },

    setQrOptions(options) {
        set(state => ({ ...state, qrOptions: { ...state.qrOptions, ...options } }));
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
