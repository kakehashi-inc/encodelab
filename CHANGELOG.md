# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [v0.2.3] - 2026-06-26

### Added

- QR code and barcode reading now show progress while scanning and can be cancelled at any time. Other conversions are unchanged.

## [v0.2.2] - 2026-06-26

### Added

- The converter now remembers the input and output type selection of both panes and restores them the next time you open the app.

### Fixed

- QR code reading now works with common image formats (PNG, JPEG, GIF, WebP, SVG).
- SVG images are now recognized correctly, including SVG files that start with an XML declaration (which previously failed to preview and could not be used for QR code reading).
- QR codes on a transparent background are now read correctly, regardless of the QR module color (no longer limited to black on transparent).

### Changed

- The file picker for QR code / barcode reading now lists only supported image files. The picker for binary input still shows all files.

## [v0.2.1] - 2026-06-05

### Fixed

- macOS: automatic updates are now reliably installed. Previously the download could finish successfully but the new version was not applied after you quit the app; updates now take effect on the next launch as expected.

## [v0.2.0] - 2026-06-05

### Added

- 1D barcode support (generation and reading): JAN/EAN-13/8, UPC-A/E, CODE128, GS1-128, CODE39, ITF, and NW-7 (Codabar), alongside QR Code, under the new "QR Code / Barcode" category.
- Favorites and recent conversions. Save the current input/output type combination with the star button; a bar at the top of the converter lets you apply or remove saved favorites and quickly re-apply your last 5 conversions. Both are kept across launches.
- A "Converting..." indicator is shown while a conversion is running, so the app no longer looks frozen during heavy conversions.
- Automatic updates now work on macOS.

### Changed

- The "Image" category is now "QR Code / Barcode". QR Code has moved here from the old Image category.
- Simpler conversion controls: press the arrow button in the center to convert, and use the new swap button to exchange the left and right panes.
- Result messages now appear only after a conversion, in a colored banner (green for success, red for errors) that you can dismiss at any time.
- Long text and large images no longer stretch the window; they scroll inside their own display area, and the buttons around them always stay visible.

### Fixed

- Changing the format of one pane no longer erases what you entered in the other pane.

> Note for macOS users: automatic updates take effect only from the next version onward. Please install this version manually once; after that, updates will be applied automatically.
