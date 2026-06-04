# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Automatic updates now work on macOS.
- When an update download fails, a clear error message is shown with "Retry" and "Close" buttons.

### Fixed

- Starting an update now shows progress immediately, so the app no longer looks unresponsive after you choose to update.
- Update errors that happen quietly in the background (for example when you are offline) no longer interrupt you, while errors from an update you started are now shown.

> Note for macOS users: automatic updates take effect only from the next version onward. Please install this version manually once; after that, updates will be applied automatically.
