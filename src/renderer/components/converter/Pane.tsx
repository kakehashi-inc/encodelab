// 左右共通のペインコンポーネント。
// 内部で store から自分の side ('left' | 'right') の状態を読み出し、
// direction から role ('input' | 'output') を導出する。
// 親 (ConverterApp) は <Pane side="left" /> <Pane side="right" /> を 2 つ並べるだけでよい。
//
// このコンポーネント自体に枠 (Paper) と内部レイアウト (header + content) を持つので、
// PaneContent は枠なしで配置する。
import { Box, Paper } from '@mui/material';
import { useConverterStore, inputSide, type Side } from '../../store/converter-store';
import PaneHeader from './PaneHeader';
import PaneContent from './PaneContent';
import { FILL_REMAINING_SX } from './shared';

type Props = {
    side: Side;
};

export default function Pane({ side }: Props) {
    const direction = useConverterStore(s => s.direction);
    const pane = useConverterStore(s => s[side]);
    const qrOptions = useConverterStore(s => s.qrOptions);
    const barcodeOptions = useConverterStore(s => s.barcodeOptions);
    const setCategory = useConverterStore(s => s.setCategory);
    const setType = useConverterStore(s => s.setType);
    const setValue = useConverterStore(s => s.setValue);
    const setQrOptions = useConverterStore(s => s.setQrOptions);
    const setBarcodeOptions = useConverterStore(s => s.setBarcodeOptions);

    const role = inputSide(direction) === side ? 'input' : 'output';

    return (
        <Paper
            elevation={1}
            sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                height: '100%',
                minHeight: 0,
            }}
        >
            <PaneHeader
                role={role}
                category={pane.category}
                type={pane.type}
                onCategoryChange={c => setCategory(side, c)}
                onTypeChange={ty => setType(side, ty)}
            />
            <Box sx={{ ...FILL_REMAINING_SX, display: 'flex', flexDirection: 'column' }}>
                <PaneContent
                    role={role}
                    type={pane.type}
                    value={pane.value}
                    qrOptions={qrOptions}
                    barcodeOptions={barcodeOptions}
                    onValueChange={v => setValue(side, v)}
                    onQrOptionsChange={setQrOptions}
                    onBarcodeOptionsChange={setBarcodeOptions}
                />
            </Box>
        </Paper>
    );
}
