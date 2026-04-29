// バイナリ系ペイン (入力/出力 共通)。role で振る舞いを切り替える。
//
// - input:  ファイル選択ボタン + メタ情報 (ファイル名 + バイト数 + 自動検出 MIME) + 画像プレビュー (Web 表示可能 MIME のみ)
// - output: バイト数 + MIME ドロップダウン (RAW フォールバック / 手動上書き) + 保存ボタン
//           + 表示コントロール:
//             * 画像 MIME → 画像プレビュー
//             * RAW かつ中身がテキスト → 読取専用テキストエリア + コピー
//             * それ以外 → メタ情報のみ
import React from 'react';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';
import type { PaneValue } from '../../conversion/pane-value';
import { decodeAsText, looksLikeText } from '../../conversion/text-detect';
import ImagePreview from './ImagePreview';
import CopyButton from './CopyButton';
import {
    COMMON_MIMES,
    EmptyStateBox,
    FILL_HEIGHT_TEXTAREA_SX,
    PREVIEWABLE_MIMES,
    RAW_MIME,
    guessExtension,
    stripExt,
} from './shared';

type Role = 'input' | 'output';

type Props = {
    role: Role;
    value: PaneValue;
    onChange: (value: PaneValue) => void;
};

export default function BinaryPane({ role, value, onChange }: Props) {
    if (role === 'input') return <BinaryInput value={value} onChange={onChange} />;
    return <BinaryOutput value={value} onChange={onChange} />;
}

// ==================== Input ====================

function BinaryInput({ value, onChange }: { value: PaneValue; onChange: (value: PaneValue) => void }) {
    const { t } = useTranslation();

    const handleOpen = async () => {
        const result = await window.encodelab.file.open();
        if (!result.ok) return;
        const detected = await window.encodelab.mime.detect(result.bytes);
        onChange({
            kind: 'binary',
            name: result.name,
            mime: detected.mime ?? RAW_MIME,
            bytes: result.bytes,
        });
    };

    const isReady = value.kind === 'binary' && value.bytes.byteLength > 0;
    const showPreview = isReady && value.kind === 'binary' && PREVIEWABLE_MIMES.has(value.mime);

    return (
        <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
            <Box>
                <Button variant='contained' startIcon={<UploadFileIcon />} onClick={handleOpen}>
                    {t('common.open')}
                </Button>
            </Box>
            <Box
                sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                }}
            >
                {isReady && value.kind === 'binary' ? (
                    <Stack spacing={0.5}>
                        <Typography variant='body2' sx={{ wordBreak: 'break-all' }}>
                            {t('pane.binaryReady', { name: value.name, count: value.bytes.byteLength })}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                            {t('pane.mime')}: {value.mime}
                        </Typography>
                    </Stack>
                ) : (
                    <Typography variant='body2' color='text.secondary'>
                        {t('pane.binaryNoFile')}
                    </Typography>
                )}
            </Box>
            {showPreview && value.kind === 'binary' && <ImagePreview mime={value.mime} bytes={value.bytes} />}
        </Stack>
    );
}

// ==================== Output ====================

function BinaryOutput({ value, onChange }: { value: PaneValue; onChange: (value: PaneValue) => void }) {
    const { t } = useTranslation();
    const [customMime, setCustomMime] = React.useState('');

    // 内容に応じた表示モード判定
    const detection = React.useMemo<{ kind: 'image' } | { kind: 'text'; text: string } | { kind: 'none' }>(() => {
        if (value.kind !== 'binary') return { kind: 'none' };
        if (PREVIEWABLE_MIMES.has(value.mime)) return { kind: 'image' };
        if (value.mime === RAW_MIME && looksLikeText(value.bytes)) {
            return { kind: 'text', text: decodeAsText(value.bytes) };
        }
        return { kind: 'none' };
    }, [value]);

    if (value.kind !== 'binary') {
        return <EmptyStateBox message={t('pane.outputEmpty')} />;
    }

    const isPredefined = COMMON_MIMES.includes(value.mime);

    const applyMimeChange = (mime: string) => {
        const ext = guessExtension(mime);
        const baseName = stripExt(value.name);
        const newName = ext ? `${baseName}.${ext}` : baseName;
        onChange({ ...value, mime, name: newName });
    };

    const handleSave = async () => {
        await window.encodelab.file.save({ suggestedName: value.name, bytes: value.bytes });
    };

    return (
        <Stack spacing={1.5} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Box
                sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                }}
            >
                <Typography variant='body2'>
                    {t('pane.outputBinaryReady', { count: value.bytes.byteLength })}
                </Typography>
            </Box>

            <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                <FormControl size='small' sx={{ minWidth: 200, flex: 1 }}>
                    <InputLabel>{t('pane.mime')}</InputLabel>
                    <Select
                        label={t('pane.mime')}
                        value={isPredefined ? value.mime : '__custom__'}
                        onChange={e => {
                            const v = e.target.value as string;
                            if (v === '__custom__') {
                                setCustomMime(value.mime);
                            } else {
                                applyMimeChange(v);
                            }
                        }}
                    >
                        {COMMON_MIMES.map(m => (
                            <MenuItem key={m} value={m}>
                                {m === RAW_MIME ? `${m} (${t('pane.mimeRaw')})` : m}
                            </MenuItem>
                        ))}
                        <MenuItem value='__custom__'>{t('pane.mimeCustom')}</MenuItem>
                    </Select>
                </FormControl>
                {!isPredefined && (
                    <TextField
                        size='small'
                        value={customMime || value.mime}
                        onChange={e => setCustomMime(e.target.value)}
                        onBlur={() => applyMimeChange(customMime || value.mime)}
                        sx={{ flex: 1 }}
                    />
                )}
                <Button variant='contained' startIcon={<SaveIcon />} onClick={handleSave}>
                    {t('common.save')}
                </Button>
            </Stack>

            {detection.kind === 'image' && <ImagePreview mime={value.mime} bytes={value.bytes} />}

            {detection.kind === 'text' && (
                <Stack spacing={1} sx={{ flexGrow: 1, minHeight: 0 }}>
                    <TextField
                        multiline
                        fullWidth
                        value={detection.text}
                        slotProps={{ input: { readOnly: true } }}
                        sx={FILL_HEIGHT_TEXTAREA_SX}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <CopyButton text={detection.text} />
                    </Box>
                </Stack>
            )}
        </Stack>
    );
}
