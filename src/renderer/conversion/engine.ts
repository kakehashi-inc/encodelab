// 変換エンジン本体。
// 入力ペイン値 → CanonicalValue → 出力ドメインへ adapt → 出力ペイン値。
//
// ハッシュ出力は特例: ユーザーの直観に沿うよう「入力そのもの」のバイト列をハッシュする。
// (canonical 経由で構造化データを再シリアライズしてしまうと、整形空白の有無で
//  ハッシュ値が変わる予期せぬ挙動になるため。)
import { findType, type TypeId } from '@shared/conversion/catalog';
import { adapt } from './adapt';
import { parsePane, serializePane, type ConvertContext, computeHashOf } from './handlers';
import type { PaneValue } from './pane-value';

export type ConvertResult = { ok: true; value: PaneValue } | { ok: false; error: string };

const textEncoder = new TextEncoder();

export async function runConversion(
    inputType: TypeId,
    inputValue: PaneValue,
    outputType: TypeId,
    ctx: ConvertContext
): Promise<ConvertResult> {
    try {
        const outputDef = findType(outputType);

        // ハッシュ出力は canonical を経由せず、入力ペインのバイト列を直接ハッシュする
        if (outputDef.category === 'hash') {
            const bytes = inputBytesForHash(inputType, inputValue);
            const text = await computeHashOf(outputDef.id, bytes, ctx);
            return { ok: true, value: { kind: 'text', text } };
        }

        const canonical = await parsePane(inputType, inputValue);
        const adapted = adapt(canonical, outputDef.domain);
        const value = await serializePane(outputType, adapted, ctx);
        return { ok: true, value };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}

// ハッシュ用に入力ペインの「ユーザーが見ているそのまま」のバイト列を返す。
function inputBytesForHash(inputType: TypeId, value: PaneValue): Uint8Array {
    const def = findType(inputType);
    if (def.outputOnly) {
        throw new Error(`Type ${inputType} is output-only`);
    }
    switch (def.display) {
        case 'text':
            return textEncoder.encode(value.kind === 'text' ? value.text : '');
        case 'binary':
            return value.kind === 'binary' ? value.bytes : new Uint8Array(0);
        case 'image':
            return value.kind === 'image' ? value.bytes : new Uint8Array(0);
    }
}
