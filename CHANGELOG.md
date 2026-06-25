# Changelog

All notable changes to the ByRutGame Checker userscript.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.3] — 2026-06-25

### Added
- `fmtNum` — number formatting with commas (108057 → 108,057) for players, seeders, leechers
- SteamDB "Last Record Update" — shows when Steam last pushed an update (`/app/{appid}/` page)
- SteamCharts as primary source for player counts (`steamcharts.com/app/{appid}`)
- `parseSteamCharts` — parses `.app-stat > .num` elements

### Changed
- All Steam data rows merged into the main `.byrut-meta` table (removed separate block)
- URL changed to SteamCharts for player peaks (SteamDB blocked by Cloudflare)
- `fetchSteamPrice` removed — SteamDB prices unreliable due to 403

### Removed
- PCGamingWiki integration (cargoquery API field mismatch)
- HowLongToBeat integration
- Watchlist / tracking feature
- Drag-and-drop widget repositioning
- System requirements block
- Price display (current price, lowest recorded)

## [5.0] — 2026-06-24

### Added
- XHR timeout (15s) with exponential retry (2 retries, 1s → 2s delay)
- Parallel search — first 3 queries run simultaneously
- MutationObserver targeted to `#appHubAppName` parent
- SteamDB block: online players, 24h peak, current price, lowest recorded price, last build
- PCGamingWiki: DRM, FOV, ultrawide via cargoquery API
- HowLongToBeat: main story, main+extra, completionist times
- ProtonDB: Linux/Steam Deck compatibility tier
- Settings panel: position, cache TTL, auto-collapse, mini-mode, language, SteamDB toggle
- Drag-and-drop widget repositioning
- Mini-mode — widget collapses to colored dot, expands on hover
- Watchlist — track games by appid, periodic check with sound notification
- Localization (ru/en) with auto-detection
- Game history — last 10 viewed games
- Magnet link copy button
- Release type badges (pirate/repack/steamrip) with colored buttons
- Keyboard shortcut Alt+B to toggle widget
- Background cache refresh with version diff detection
- Cache age display in source line

### Fixed
- Empty version strings filtered from display
- Empty query guard in `searchOnByrut`
- Collapsed widget title click now expands instead of opening link
- Observer timeout shows "Not found" instead of perpetual loading
- Settings panel CSS scoping (removed `#byrut-widget` prefix)

### Changed
- Styles extracted to `STYLES` constant
- `showWidget` decomposed into `buildHeader`, `buildMeta`, `buildActions`, `buildFooter`
- Global `<textarea>` decoder replaced with local `decodeHtml`
- JSDoc added to key functions
- `@grant`/`@connect` extended for new domains

## [4.4] — Initial release

### Added
- Steam game name detection from `#appHubAppName` or page title
- ByRut search with multiple query variants
- Floating widget: game info, download buttons, collapse/refresh
- Online version detection and network data merging
- localStorage cache with configurable TTL
- Result scoring and best-match selection
