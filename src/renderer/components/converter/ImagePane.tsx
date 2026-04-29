// 画像系ペイン (入力/出力 共通)。role で振る舞いを切り替える。
//
// - input:  ファイル選択 + クリップボード貼付 + 画像プレビュー (現状 QR コード読取)
// - output: 画像プレビュー + 保存ボタン (+ QR コード生成オプションパネル)
import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import type { PaneValue } from '../../conversion/pane-value';
import type { QrOptions } from '../../conversion/qr/generator';
import ImagePreview from './ImagePreview';
import QrOptionsPanel from './QrOptionsPanel';
import { EmptyStateBox, RAW_MIME } from './shared';

type Role = 'input' | 'output';

type Props = {
    role: Role;
    value: PaneValue;
    qrOptions: QrOptions;
    onValueChange: (value: PaneValue) => void;
    onQrOptionsChange: (next: Partial<QrOptions>) => void;
    showQrOptions: boolean;
};

export default function ImagePane(props: Props) {
    if (props.role === 'input') return <ImageInput value={props.value} onChange={props.onValueChange} />;
    return (
        <ImageOutput
            value={props.value}
            qrOptions={props.qrOptions}
            onQrOptionsChange={props.onQrOptionsChange}
            showQrOptions={props.showQrOptions}
        />
    );
}

// ==================== Input ====================

function ImageInput({ value, onChange }: { value: PaneValue; onChange: (value: PaneValue) => void }) {
    const { t } = useTranslation();
    const [pasteError, setPasteError] = React.useState<string | undefined>(undefined);

    const handleOpen = async () => {
        const result = await window.encodelab.file.open();
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
        <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
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
                    <ImagePreview mime={value.mime} bytes={value.bytes} />
                </>
            ) : (
                <EmptyStateBox message={t('pane.binaryNoFile')} />
            )}
        </Stack>
    );
}

// ==================== Output ====================

function ImageOutput({
    value,
    qrOptions,
    onQrOptionsChange,
    showQrOptions,
}: {
    value: PaneValue;
    qrOptions: QrOptions;
    onQrOptionsChange: (next: Partial<QrOptions>) => void;
    showQrOptions: boolean;
}) {
    const { t } = useTranslation();

    const handleSave = async () => {
        if (value.kind !== 'image') return;
        const ext = qrOptions.format === 'svg' ? 'svg' : 'png';
        await window.encodelab.file.save({ suggestedName: `qrcode.${ext}`, bytes: value.bytes });
    };

    return (
        <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
            {showQrOptions && <QrOptionsPanel options={qrOptions} onChange={onQrOptionsChange} />}
            {value.kind === 'image' && value.bytes.byteLength > 0 ? (
                <>
                    <ImagePreview mime={value.mime} bytes={value.bytes} />
                    <Stack direction='row' spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
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

function guessImageMime(name: string): string | null {
    const lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return null;
}
