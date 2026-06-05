# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Simpler conversion controls: press the arrow button in the center to convert, and use the new swap button to exchange the left and right panes.
- Result messages now appear only after a conversion, in a colored banner (green for success, red for errors) that you can dismiss at any time.
- Long text and large images no longer stretch the window; they scroll inside their own area, and the buttons around them always stay visible.

### Added

- A "Converting..." indicator is shown while a conversion is running, so the app no longer looks frozen during heavy conversions.
- Automatic updates now work on macOS.
- If an update fails to download, a clear error message appears with "Retry" and "Close" buttons.

### Fixed

- Changing the format of one pane no longer erases what you entered in the other pane.
- Long results no longer spill past the edge of the window; they now scroll inside their own area.
- After you choose to update, progress is shown right away instead of the app appearing to do nothing.
- You are no longer interrupted by update errors that happen in the background (for example while offline); errors are only shown for updates you started yourself.

> Note for macOS users: automatic updates take effect only from the next version onward. Please install this version manually once; after that, updates will be applied automatically.
