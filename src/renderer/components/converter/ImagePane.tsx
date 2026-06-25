// 画像系ペイン (入力/出力 共通)。role で振る舞いを切り替える。
//
// - input:  ファイル選択 + クリップボード貼付 + 画像プレビュー (QR コード / バーコード読取)
// - output: 画像プレビュー + 保存ボタン (+ QR コード / バーコード生成オプションパネル)
import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import type { TypeId } from '@shared/conversion/catalog';
import type { PaneValue } from '../../conversion/pane-value';
import type { QrOptions } from '../../conversion/qr/generator';
import type { BarcodeOptions } from '../../conversion/barcode/generator';
import ImagePreview from './ImagePreview';
import QrOptionsPanel from './QrOptionsPanel';
import BarcodeOptionsPanel from './BarcodeOptionsPanel';
import { EmptyStateBox, FILL_REMAINING_SX, RAW_MIME, guessExtension } from './shared';

type Role = 'input' | 'output';

type Props = {
    role: Role;
    type: TypeId;
    value: PaneValue;
    qrOptions: QrOptions;
    barcodeOptions: BarcodeOptions;
    onValueChange: (value: PaneValue) => void;
    onQrOptionsChange: (next: Partial<QrOptions>) => void;
    onBarcodeOptionsChange: (next: Partial<BarcodeOptions>) => void;
};

export default function ImagePane(props: Props) {
    if (props.role === 'input') return <ImageInput value={props.value} onChange={props.onValueChange} />;
    return (
        <ImageOutput
            type={props.type}
            value={props.value}
            qrOptions={props.qrOptions}
            barcodeOptions={props.barcodeOptions}
            onQrOptionsChange={props.onQrOptionsChange}
            onBarcodeOptionsChange={props.onBarcodeOptionsChange}
        />
    );
}

// ==================== Input ====================

function ImageInput({ value, onChange }: { value: PaneValue; onChange: (value: PaneValue) => void }) {
    const { t } = useTranslation();
    const [pasteError, setPasteError] = React.useState<string | undefined>(undefined);

    const handleOpen = async () => {
        // QR / バーコード読取は画像のみ対象。ダイアログを対応形式で絞り込む。
        const result = await window.encodelab.file.open({
            filters: [{ name: t('pane.imageFilterName'), extensions: IMAGE_EXTENSIONS }],
        });
        if (!result.ok) return;
        const detected = await window.encodelab.mime.detect(result.bytes);
        const mime = detected.mime ?? guessImageMime(result.name) ?? RAW_MIME;
        onChange({ kind: 'image', mime, bytes: result.bytes });
    };

    const handlePaste = async () => {
        setPasteError(undefined);
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const arrayBuffer = await blob.arrayBuffer();
                        onChange({ kind: 'image', mime: type, bytes: new Uint8Array(arrayBuffer) });
                        return;
                    }
                }
            }
            setPasteError(t('pane.clipboardNoImage'));
        } catch (err) {
            setPasteError(err instanceof Error ? err.message : String(err));
        }
    };

    const isReady = value.kind === 'image' && value.bytes.byteLength > 0;

    return (
        <Stack spacing={1.5} sx={FILL_REMAINING_SX}>
            <Stack direction='row' spacing={1}>
                <Button variant='contained' startIcon={<UploadFileIcon />} onClick={handleOpen}>
                    {t('common.open')}
                </Button>
                <Button variant='outlined' startIcon={<ContentPasteIcon />} onClick={handlePaste}>
                    {t('common.paste')}
                </Button>
            </Stack>
            {pasteError && (
                <Typography variant='caption' color='error'>
                    {pasteError}
                </Typography>
            )}
            {isReady && value.kind === 'image' ? (
                <>
                    <Typography variant='caption' color='text.secondary'>
                        {t('pane.outputBinaryReady', { count: value.bytes.byteLength })} · {value.mime}
                    </Typography>
                    <ImagePreview mime={value.mime} bytes={value.bytes} fill />
                </>
            ) : (
                <EmptyStateBox message={t('pane.binaryNoFile')} />
            )}
        </Stack>
    );
}

// ==================== Output ====================

function ImageOutput({
    type,
    value,
    qrOptions,
    barcodeOptions,
    onQrOptionsChange,
    onBarcodeOptionsChange,
}: {
    type: TypeId;
    value: PaneValue;
    qrOptions: QrOptions;
    barcodeOptions: BarcodeOptions;
    onQrOptionsChange: (next: Partial<QrOptions>) => void;
    onBarcodeOptionsChange: (next: Partial<BarcodeOptions>) => void;
}) {
    const { t } = useTranslation();
    const isBarcode = type === 'barcode';

    const handleSave = async () => {
        if (value.kind !== 'image') return;
        // 拡張子は UI の選択ではなく、生成済み画像の実際の MIME から決める。
        // (変換後に出力形式ドロップダウンを変えても、表示中のバイト列は変換時の形式のままで、
        //  これが保存すべき真の内容。UI の format を参照すると内容と拡張子が食い違う。)
        const ext = guessExtension(value.mime) ?? 'bin';
        const baseName = isBarcode ? 'barcode' : 'qrcode';
        await window.encodelab.file.save({ suggestedName: `${baseName}.${ext}`, bytes: value.bytes });
    };

    return (
        <Stack spacing={1.5} sx={FILL_REMAINING_SX}>
            {isBarcode ? (
                <BarcodeOptionsPanel options={barcodeOptions} onChange={onBarcodeOptionsChange} />
            ) : (
                <QrOptionsPanel options={qrOptions} onChange={onQrOptionsChange} />
            )}
            {value.kind === 'image' && value.bytes.byteLength > 0 ? (
                <>
                    <ImagePreview mime={value.mime} bytes={value.bytes} fill />
                    {/* 保存行はプレビュー枠の下に常に表示する (プレビューが fill で伸縮する) */}
                    <Stack
                        direction='row'
                        spacing={1}
                        sx={{ alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}
                    >
                        <Typography variant='caption' color='text.secondary'>
                            {t('pane.outputBinaryReady', { count: value.bytes.byteLength })} · {value.mime}
                        </Typography>
                        <Button variant='contained' startIcon={<SaveIcon />} onClick={handleSave}>
                            {t('common.save')}
                        </Button>
                    </Stack>
                </>
            ) : (
                <Box sx={{ flexGrow: 1 }}>
                    <EmptyStateBox message={t('pane.outputEmpty')} minHeight={220} />
                </Box>
            )}
        </Stack>
    );
}

// ファイル選択ダイアログのフィルタ用拡張子 (QR / バーコード読取が対応する画像形式)。
// guessImageMime が判定する形式と揃える。
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

function guessImageMime(name: string): string | null {
    const lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return null;
}
