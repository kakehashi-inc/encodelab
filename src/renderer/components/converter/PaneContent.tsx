// 1 ペイン分のコンテンツ部 (テキスト / バイナリ / 画像 を display で振り分け)。
// 枠 (Paper) は親側 (Pane.tsx) で持つので、ここでは内部要素のみを返す。
import { Box } from '@mui/material';
import { findType, type TypeId } from '@shared/conversion/catalog';
import TextPane from './TextPane';
import BinaryPane from './BinaryPane';
import ImagePane from './ImagePane';
import type { PaneValue } from '../../conversion/pane-value';
import type { QrOptions } from '../../conversion/qr/generator';

type Role = 'input' | 'output';

type Props = {
    role: Role;
    type: TypeId;
    value: PaneValue;
    qrOptions: QrOptions;
    onValueChange: (value: PaneValue) => void;
    onQrOptionsChange: (next: Partial<QrOptions>) => void;
};

export default function PaneContent({ role, type, value, qrOptions, onValueChange, onQrOptionsChange }: Props) {
    const def = findType(type);

    const renderInner = () => {
        if (def.display === 'text') {
            const text = value.kind === 'text' ? value.text : '';
            return <TextPane value={text} onChange={v => onValueChange({ kind: 'text', text: v })} />;
        }
        if (def.display === 'binary') {
            return <BinaryPane role={role} value={value} onChange={onValueChange} />;
        }
        // image
        const showQrOptions = role === 'output' && def.id === 'qrCode';
        return (
            <ImagePane
                role={role}
                value={value}
                qrOptions={qrOptions}
                onValueChange={onValueChange}
                onQrOptionsChange={onQrOptionsChange}
                showQrOptions={showQrOptions}
            />
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>{renderInner()}</Box>
    );
}
