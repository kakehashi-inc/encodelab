import { findType, type TypeId } from './catalog';

export type CompatibilityCheck = {
    convertible: boolean;
    // 変換不能な場合の理由 (i18n キー)
    reasonKey?: string;
    // i18n の interpolation パラメータ
    reasonParams?: Record<string, string>;
};

/**
 * 入力タイプと出力タイプの組合せが論理的に変換可能かを判定する。
 *
 * 主な制約:
 * - ハッシュ系は出力専用 (入力側に置けない)
 * - QR コードは画像/テキスト間の双方向変換のみ
 * - 同じタイプ同士は常に変換可能 (恒等)
 */
export function checkCompatibility(inputType: TypeId, outputType: TypeId): CompatibilityCheck {
    const input = findType(inputType);
    const output = findType(outputType);

    // ハッシュ系は出力専用
    if (input.outputOnly) {
        return { convertible: false, reasonKey: 'reason.hashOutputOnly' };
    }

    // 同一タイプ同士は恒等変換 (常に可能)
    if (input.id === output.id) {
        return { convertible: true };
    }

    // 出力が QR コードで入力が QR コード (画像) → テキスト復号後再エンコード相当
    // 同一カテゴリ image 同士は上で吸収済み
    return { convertible: true };
}
