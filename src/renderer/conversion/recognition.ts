// 画像認識 (QR コード / バーコード読取) 共通の進捗・キャンセル制御。
//
// 認識処理は回転・拡縮・デコードを多数試す同期 CPU ループで、放置すると UI スレッドを
// 長時間ブロックして「固まった」ように見える。そこで本モジュールが、ループから定期的に
// イベントループへ明け渡し (yield) を行うことで、以下を可能にする。
//   - 進捗 (現在のステップ / 総ステップ) の描画更新
//   - キャンセル操作 (AbortSignal) の受付と即時中断
//
// QR・バーコードの両 reader はこの RecognitionTracker を使って共通の進捗仕様を満たす。

export type RecognizeProgress = {
    // 完了した試行ステップ数 / 最悪ケースの総ステップ数。
    done: number;
    total: number;
    // 現在の段階 (1 始まり) / 総段階数。
    stage: number;
    stageCount: number;
};

export type RecognizeOptions = {
    // 中断用シグナル。abort されるとループは即座に RecognizeAbortError を投げる。
    signal?: AbortSignal;
    // 進捗通知。描画更新に使う。
    onProgress?: (progress: RecognizeProgress) => void;
};

// キャンセル時に投げるエラー。表示側はこれを「失敗」ではなく「中断」として扱う。
// name を 'AbortError' に揃え、DOMException の AbortError と同様に判定できるようにする。
export class RecognizeAbortError extends Error {
    constructor() {
        super('Recognition aborted');
        this.name = 'AbortError';
    }
}

export function isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === 'AbortError';
}

// イベントループへ明け渡す。setTimeout(0) は 4ms にクランプされ累積オーバーヘッドが大きいため、
// クランプの無い MessageChannel を使う。
function yieldToMain(): Promise<void> {
    return new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        channel.port2.postMessage(null);
    });
}

// 明け渡し・進捗通知を行う最小間隔 (ms)。これより短い間隔では描画/明け渡しを省いて
// オーバーヘッドを抑える (約 60 回/秒の更新に収まる)。
const YIELD_INTERVAL_MS = 16;

// 認識ループの進捗・キャンセル・イベントループ明け渡しを一括管理する。
export class RecognitionTracker {
    private done = 0;
    private readonly start = performance.now();
    private lastYield = this.start;

    constructor(
        private total: number,
        private readonly stageCount: number,
        private readonly options: RecognizeOptions
    ) {
        this.throwIfAborted();
        // 初期状態 (0/total) を即時通知し、オーバーレイにキャンセルボタン等を表示させる。
        this.emit(1);
    }

    // タイル数確定後など、総ステップ数を更新する。
    setTotal(total: number): void {
        this.total = total;
    }

    // 1 回のデコード試行ごとに呼ぶ。中断確認・進捗通知・必要ならイベントループ明け渡しを行う。
    async tick(stage: number): Promise<void> {
        this.done += 1;
        this.throwIfAborted();
        const now = performance.now();
        if (now - this.lastYield >= YIELD_INTERVAL_MS) {
            this.lastYield = now;
            this.emit(stage);
            await yieldToMain();
            this.throwIfAborted();
        }
    }

    private emit(stage: number): void {
        if (!this.options.onProgress) return;
        this.options.onProgress({
            done: this.done,
            total: this.total,
            stage,
            stageCount: this.stageCount,
        });
    }

    private throwIfAborted(): void {
        if (this.options.signal?.aborted) throw new RecognizeAbortError();
    }
}
