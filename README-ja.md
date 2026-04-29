# EncodeLab

文字列・バイナリデータの各種変換を 2 ペイン構成で双方向に行う Electron 製デスクトップツール。

## 1. システム概要

- 3 カラム構成 (左ペイン / 中央コントロール / 右ペイン)
- 各ペイン上部のカテゴリ・タイプの 2 段ドロップダウンで扱う形式を選択
- 中央の方向矢印 (→ / ←) で入出力の役割を切り替え (反転だけでは変換は実行されない)
- 中央の変換ボタンで変換を実行 (リアルタイム変換は行わない)
- 変換不能な組合せは変換ボタンが disabled になり、その理由が中央エリアに表示される
- カテゴリ・タイプの切替時は両ペインのデータをクリア。方向反転時は保持
- 変換履歴は保持しない

詳細な機能仕様は [Documents/システム仕様.md](Documents/システム仕様.md) を参照。
内部設計は [Documents/アーキテクチャ.md](Documents/アーキテクチャ.md) を参照。

### 対応データ形式

| カテゴリ | タイプ |
| --- | --- |
| テキスト | Plain |
| エンコード文字列 | Base64 / Base32 (RFC 4648) / Base58 / Ascii85 / Z85 |
| エスケープ文字列 | URL Encoded / Unicode (\uXXXX) / HTML Entities (通常 / Decimal) / XML Entities |
| 構造化データ | JSON / YAML / JSON String / JSON Byte Array / Hex String |
| 整数 | 通常 (10 進) / Crockford Base32 |
| バイナリ | Raw / data URL |
| ハッシュ (出力専用) | MD5 / SHA-1 / SHA-256 / SHA-512 (Hex / Base64) |
| 画像 | QR コード (生成 / 読取) |

### ライブラリ方針

- MIME 自動判定: [`file-type`](https://github.com/sindresorhus/file-type)
- QR コード生成: [`qrcode`](https://github.com/soldair/node-qrcode)
- QR コード読取: [`jsqr`](https://github.com/cozmo/jsQR)
- ハッシュ: Node.js 標準 `crypto`
- Base 系全般 / エスケープ系 / JSON↔YAML: 自前実装 (`src/renderer/conversion/`)

## 2. 対応OS

- Windows 10/11
- macOS 10.15+
- Linux (Debian系/RHEL系)

注記: 本プロジェクトは Windows ではコード署名を行っていません。SmartScreen が警告を表示する場合は「詳細情報」→「実行」を選択してください。

## 3. 開発者向けリファレンス

### 必要要件

- Node.js 22.x以上
- yarn 4
- Git

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd <repository-name>

# 依存関係のインストール
yarn install

# 開発起動
yarn dev
```

開発時のDevTools:

- DevTools はデタッチ表示で自動的に開きます
- F12 または Ctrl+Shift+I（macOSは Cmd+Option+I）でトグル可能

### Lint / Build

```bash
# 型チェック (開発時はこれだけで OK)
yarn lint

# プロダクションビルド (リリース前に実行)
yarn build
```

### ビルド/配布

- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

開発時は BrowserRouter で `<http://localhost:3001>` を、配布ビルドでは HashRouter で `dist/renderer/index.html` を読み込みます。

### GitHub への直接リリース (自動アップデート用)

`electron-builder.yml` の `publish:` に設定した GitHub リポジトリに、ビルド成果物と `latest*.yml` (自動アップデート用メタデータ) を直接アップロードするコマンドです。`releaseType: draft` 設定のため、各コマンドは GitHub 上の **同一バージョンのドラフトリリースに集約** されます。全プラットフォーム揃ってから GitHub UI で「Publish release」を押すとユーザーへ配信されます。

- Windows: `yarn release:win`
- macOS: `yarn release:mac`
- Linux: `yarn release:linux`

実行前に GitHub Personal Access Token (`public_repo` スコープ) を環境変数 `GH_TOKEN` に設定してください。

```bash
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

複数台で各プラットフォームをビルドする場合は、`package.json` の `version` を全マシンで一致させた上で、各マシンで該当する `release:*` を順に実行してください。

### macOS 事前準備: 署名・公証用の環境変数

macOS 向けに署名・公証付きビルドを行う場合は、`yarn dist:mac` の実行前に以下の環境変数を設定してください。

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows 事前準備: 開発者モード

Windows で署名なしのローカルビルド/配布物を実行・テストする場合は、OSの開発者モードを有効にしてください。

1. 設定 → プライバシーとセキュリティ → 開発者向け
2. 「開発者モード」をオンにする
3. OSを再起動

### プロジェクト構造 (抜粋)

```text
src/
├── main/                  # Electron メイン: IPC / 各種マネージャ / ファイル・MIME・ハッシュ
│   ├── index.ts
│   ├── ipc/               # IPC ハンドラ (updater / conversion)
│   ├── services/          # file / mime / hash / updater
│   └── utils/
├── preload/               # renderer へ window.encodelab を expose
├── renderer/              # React + MUI UI
│   ├── components/
│   │   └── converter/     # 変換 UI (3 カラム構成)
│   ├── conversion/        # 変換エンジン + 各エンコーダ / デコーダ
│   ├── store/             # Zustand ストア
│   └── i18n/              # 日本語 / 英語ロケール
└── shared/                # 型定義 / IPC チャンネル / カテゴリ・タイプ定義
    └── conversion/        # catalog / compatibility / domain
```

### 使用技術

- **Electron**
- **React (MUI v9)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**
- **qrcode** / **jsqr** / **file-type**

### Windows用アイコンの作成

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
