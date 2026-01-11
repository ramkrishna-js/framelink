# Changelog

All notable changes to this project will be documented in this file.

## [1.0.5] - 2026-01-11

### Fixed
- **Voice Compatibility:** Updated voice handling to use REST-based player updates for Lavalink v4.
- **Track Mapping:** Ensured consistent `track` property for both v3 and v4 search results.

## [1.0.4] - 2026-01-11

### Fixed
- **Lavalink v4 Support:** Implemented REST-based player updates for full v4 compatibility (play, stop, pause, seek, volume, filters).

## [1.0.3] - 2026-01-11

### Fixed
- **Search Compatibility:** Fixed search results handling to be compatible with both Lavalink v3 and v4 (data vs tracks fields).

## [1.0.2] - 2026-01-11

### Added
- **Enhanced Queue System:** New methods for `remove`, `move`, `clear`, `shuffle`, `skipTo`, and `removeDuplicates`.
- **Advanced Player Controls:** Added `skip`, `previous`, `pause`, `resume`, `seek`, `connect`, and `disconnect` helper methods.
- **Aggressive Autoplay:** Intelligent recommendation system to keep the music playing automatically.
- **Data Serialization:** Added `toJSON` methods to `Player` and `Queue` for easier state persistence.
- **Property Tracking:** Added `volume` property tracking in the `Player` class.

### Changed
- Improved `TrackEndEvent` logic to better handle queue transitions and autoplay.
- Updated documentation with new methods and features.

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
