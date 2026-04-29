# EncodeLab

A two-pane Electron desktop tool for bidirectional conversion of text and binary data.

## 1. Overview

- 3-column layout (left pane / center controls / right pane).
- Each pane has a two-level dropdown (Category > Type) that determines the data format it handles.
- The center direction arrow (→ / ←) swaps the input/output roles. Flipping alone does not run a conversion.
- The center Convert button runs the conversion (no real-time conversion).
- Incompatible combinations disable the Convert button and show the reason in the center area.
- Both panes are cleared whenever you change a category or type. Flipping the direction preserves data.
- No conversion history is kept.

See [Documents/システム仕様.md](Documents/システム仕様.md) (Japanese) for the full functional spec
and [Documents/アーキテクチャ.md](Documents/アーキテクチャ.md) for the internal design.

### Supported formats

| Category | Types |
| --- | --- |
| Text | Plain |
| Encoded String | Base64 / Base32 (RFC 4648) / Base58 / Ascii85 / Z85 |
| Escape String | URL Encoded / Unicode (\uXXXX) / HTML Entities (Named / Decimal) / XML Entities |
| Structured Data | JSON / YAML / JSON String / JSON Byte Array / Hex String |
| Integer | Decimal / Crockford Base32 |
| Binary | Raw / data URL |
| Hash (output only) | MD5 / SHA-1 / SHA-256 / SHA-512 (Hex / Base64) |
| Image | QR Code (generation / reading) |

### Library policy

- MIME auto-detection: [`file-type`](https://github.com/sindresorhus/file-type)
- QR code generation: [`qrcode`](https://github.com/soldair/node-qrcode)
- QR code reading: [`jsqr`](https://github.com/cozmo/jsQR)
- Hashing: Node.js built-in `crypto`
- Base/escape/structured codecs: in-house implementation under `src/renderer/conversion/`

## 2. Supported OS

- Windows 10/11
- macOS 10.15+
- Linux (Debian / RHEL families)

Note: This project does not sign Windows builds. If SmartScreen warns you, choose "More info" → "Run anyway".

## 3. Developer reference

### Requirements

- Node.js 22.x or later
- yarn 4
- Git

### Install

```bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Install dependencies
yarn install

# Run in development
yarn dev
```

DevTools in development:

- DevTools opens automatically in detached mode.
- Toggle with F12 or Ctrl+Shift+I (Cmd+Option+I on macOS).

### Lint / Build

```bash
# Type check (sufficient during development)
yarn lint

# Production build (run before release)
yarn build
```

### Build / Distribution

- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

In development the renderer is loaded from `http://localhost:3001` via BrowserRouter.
Production builds load `dist/renderer/index.html` via HashRouter.

### Direct release to GitHub (for auto-update)

These commands upload artifacts and `latest*.yml` (auto-update metadata) to the GitHub repository configured in
`electron-builder.yml`'s `publish:` section. With `releaseType: draft`, every command **funnels into the same draft
release for that version** on GitHub. After all platform artifacts are uploaded, click "Publish release" in the GitHub UI
to ship to users.

- Windows: `yarn release:win`
- macOS: `yarn release:mac`
- Linux: `yarn release:linux`

Set a GitHub Personal Access Token (`public_repo` scope) as `GH_TOKEN` before running:

```bash
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

When building per platform on multiple machines, keep the `version` field in `package.json` in sync across machines and
run the corresponding `release:*` command on each one.

### macOS prerequisite: signing & notarization environment variables

To produce a signed and notarized macOS build, set the following environment variables before running `yarn dist:mac`:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows prerequisite: developer mode

To run unsigned local builds / artifacts on Windows, enable developer mode:

1. Settings → Privacy & security → For developers
2. Turn on "Developer Mode"
3. Reboot

### Project structure (excerpt)

```text
src/
├── main/                  # Electron main: IPC / managers / file / MIME / hash
│   ├── index.ts
│   ├── ipc/               # IPC handlers (updater / conversion)
│   ├── services/          # file / mime / hash / updater
│   └── utils/
├── preload/               # Bridges window.encodelab to the renderer
├── renderer/              # React + MUI UI
│   ├── components/
│   │   └── converter/     # 3-column conversion UI
│   ├── conversion/        # Conversion engine + encoders / decoders
│   ├── store/             # Zustand store
│   └── i18n/              # Japanese / English locales
└── shared/                # Types / IPC channel names / category & type catalog
    └── conversion/        # catalog / compatibility / domain
```

### Tech stack

- **Electron**
- **React (MUI v9)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**
- **qrcode** / **jsqr** / **file-type**

### Generating the Windows icon

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
