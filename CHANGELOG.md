# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-01-10

### Added
- **Loop Modes:** Support for `off`, `track`, and `queue` repeat modes in `Player`.
- **Audio Filters:** Added `setFilters`, `setBassboost`, and `setNightcore` to `Player`.
- **Session Resuming:** Implemented Lavalink session resuming support in `LavalinkNode`.
- **Enhanced Search:** Improved metadata handling in `manager.search()` including automatic thumbnail resolution.
- **Improved Events:** Added `playerMove` and `playerDisconnect` events to `LavalinkManager`.
- **New Properties:** Added `displayThumbnail` to track objects returned by search.

### Changed
- Refactored `handleVoiceUpdate` for better stability and event emission.
- Updated `Client-Name` header to include the full scoped package name.

### Fixed
- Fixed an issue where the queue would not advance correctly on certain track end reasons.
