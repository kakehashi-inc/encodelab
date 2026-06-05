# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
