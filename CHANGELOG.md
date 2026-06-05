# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Reworked the center controls: the right-arrow button is now the Convert button, and a new swap button (placed where the direction toggle used to be) exchanges the left and right panes. The bottom-right Convert button has been removed.
- The bottom message bar is now hidden by default and only appears after a conversion. It is shown as a web-style alert whose color reflects the result (green for success, red for errors) and can be dismissed with a close (×) button.

### Added

- Automatic updates now work on macOS.
- When an update download fails, a clear error message is shown with "Retry" and "Close" buttons.

### Fixed

- Starting an update now shows progress immediately, so the app no longer looks unresponsive after you choose to update.
- Update errors that happen quietly in the background (for example when you are offline) no longer interrupt you, while errors from an update you started are now shown.

> Note for macOS users: automatic updates take effect only from the next version onward. Please install this version manually once; after that, updates will be applied automatically.
