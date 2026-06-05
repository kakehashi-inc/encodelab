// 下段メッセージバー: 変換結果 (成功 / エラー等) を Web のアラート風に表示する。
// メッセージがあるときのみ親 (ConverterApp) が描画する。右端の × ボタンで閉じられる。
//
// severity ごとに配色が変わる (成功=緑 / エラー=赤 等)。standard variant は
// 淡い背景 + 同系の濃い文字色を MUI が severity・ライト/ダークモードごとに
// 自動算出するため、いずれの状態でも文字が見やすいコントラストになる。
import { Alert } from '@mui/material';
import type { MessageSeverity } from '../../store/converter-store';

type Props = {
    severity: MessageSeverity;
    message: string;
    onClose: () => void;
};

export default function BottomBar({ severity, message, onClose }: Props) {
    return (
        <Alert
            severity={severity}
            variant='standard'
            onClose={onClose}
            sx={{ alignItems: 'center', '& .MuiAlert-message': { wordBreak: 'break-word' } }}
        >
            {message}
        </Alert>
    );
}
