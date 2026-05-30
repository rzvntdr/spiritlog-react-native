# Changelog

All notable changes to SpiritLog are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Streak freezes (Q2)**: missed days are auto-covered by earned freezes instead of breaking the streak. You earn 1 freeze per N consecutive days (configurable in Settings → STREAK, default 10). Consolidated streak math in `getStreakState()`; the 🛡 line on the hero now reflects real freezes available.
- **Streak increment animation**: returning to Home after a session that grew the streak plays a count-up (duration scaled to the jump) with a spring "pop" on the number. 0 → first streak crossfades from the WelcomeCard to the StreakHero. State is snapshotted (`lastShownStreakState`, persisted) so it animates the delta once, not on every visit.
- **Celebration bursts (Lottie)**: streak/freeze increments play a one-shot Lottie over the hero. Bundled themes (Gold burst, Arrow Up, Level Up) selectable; freeze earns play a small frost burst anchored on the 🛡 line. The combined threshold day (+1 streak earns a freeze) plays the streak burst then the freeze burst.
- **Streak art styles**: pick `Classic` (glow + sparkles) or `Plant` (an SVG plant that grows through all 10 tiers) for the hero card.
- **Custom streak subtitle**: Settings → STREAK lets you template the line under the number with `{streak} {best} {hours} {sessions} {freezes}`.
- **Persistent logs**: the in-app logger now writes to a rotating file (`documentDirectory/logs`, 256 KB rotation) so logs survive crashes and app restarts. Settings → DEBUG → "Share recent logs" exports them.
- **Demo mode controls** (Settings → DEBUG + on-Home bar): override streak and freezes independently, a "+1 day & +1 freeze" button for the threshold case, and a celebration-theme picker — all to preview hero visuals without real data.

### Changed

- **Plant art**: denser, more detailed foliage with monotonic growth (no tier ever looks emptier than the one before); widened canvas and the streak number nudged right-of-center for balance.

### Fixed

- **Doubled marker sound**: phase-boundary bells played twice in the foreground (native ONE_SHOT fallback + JS playback). Native now suppresses its ONE_SHOT while the app is foregrounded (JS owns playback) and only fires it in the background; returning from background briefly skips JS replay to avoid a double.
- **Foreground-service crash** (`ForegroundServiceDidNotStartInTimeException`): the meditation service now always calls `startForeground()` on every `onStartCommand` (including stray UPDATE/STOP before START), eliminating a recurring crash.
- **Recent Sessions delete**: restored the ✕ delete affordance on each row in Journey (long-press still works too).
- **Stale version in About**: Settings shows the real app version (sourced from `package.json`).

## [0.3.0] — 2026-05-27

UX iteration — denser preset cards, faster session start, more visible in-session toggles. Plus version + tooling overhaul.

### Added

- **Demo streak override** in Settings → DEBUG: number input + quick-preset chips (0 / 1 / 7 / 30 / 100 / 365 / 800) force `StreakHero` to display the chosen value without touching the DB. Lets you preview all 10 tier treatments live on device.
- **Logger infrastructure** (`src/utils/logger.ts`): module-tagged ring buffer (last 500 events) + `installGlobalErrorHandlers` that catches uncaught JS errors and unhandled promise rejections. Settings → DEBUG exposes "Share recent logs" and "Clear logs" actions. Instrumented hot paths: timer lifecycle, sound engine (no more silent `catch`), native `MeditationService` wrapper, TimerScreen `useEffect` side-effects, session DB ops.
- **Wireless ADB install helper**: `scripts/installmy.ps1` (PowerShell — primary) and `scripts/installmy.sh` (Bash — fallback). Args `<oct3> <oct4> <port> [apk-path]` → tries direct connect, falls back to interactive `adb pair`, then installs. Default APK is `android/app/build/outputs/apk/release/app-release.apk`.
- **End-of-task checklist** in `CLAUDE.md` — Claude self-prompts for CHANGELOG entry + version-bump proposal after non-trivial changes.

### Changed

- **Preset cards (home)**: removed horizontal scroll. New `PresetStrip` allocates pixels proportionally to a per-kind weight (`sound=1, warmup=3, infinite=3, normal=10`) and renders each cell in a tier that degrades as space tightens — full chip (emoji + name + duration + sub-line) → medium → small (emoji + duration) → tiny (emoji only) → colored block. All presets fit in one row regardless of element count. Sound markers between phases are narrow tile-emoji or thin warm dividers.
- **In-session toggles** (`DemotedToggle`): noticeably larger and more legible — emoji 13→16px, label `meta`→`bodyEm` 13/600, vertical padding 6→9px, min-height 32→40px, off-state opacity 0.45→0.65. Row gap also bumped in TimerScreen.
- **Navigation**: tapping a preset on Home now opens the Timer directly. The intermediate PreSession screen is bypassed (kept in the navigator for future use).
- **App version handling**: `package.json`'s `version` is the only place to bump. `app.config.js` (new — replaces static `app.json`) reads `pkg.version`; `android/app/build.gradle` parses `package.json` and sets `versionName` to it + derives `versionCode` as `MAJOR*10000 + MINOR*100 + PATCH` (always monotonic). `SettingsScreen` imports `package.json` directly.

### Fixed

- Settings → ABOUT now shows the actual app version (was stale because `Constants.expoConfig?.version` could fall through to a `'1.0.0'` literal in release builds).

### Technical

- TypeScript strict mode passes; no new dependencies added.

## [0.2.0] — 2026-05-26

First public-facing pre-release. Full UI redesign and major UX overhaul.

### Added

- **Design token system** (`src/theme/scale.ts` + extended `tokens.ts`): typography, spacing, radius, elevation scales shared across all 6 themes. New `calmTheme` set as primary.
- **Streak bloom hero** (`StreakHero`): 10 tier visual treatment (ember → seed → spark → sprout → bud → bloom → flourish → radiance → year → aurora). Tier-mapped glows, sparkles, and number colors interpolate continuously with streak length.
- **Welcome card** for users with `streak = 0` — soft teal greeting, never shames absence.
- **Records panel** ("Best ever") on Journey: longest streak, longest session, total time, total sessions. Never decreases.
- **Patterns card** on Journey: surfaces day-of-week / time-of-day / length-trend observations once ≥ 12 sessions exist. Only positive signals.
- **PreSession screen** between Home and Timer: deliberate "Begin when ready" gate with session-structure preview and keep-awake toggle.
- **Phase chip + sound marker** components (`PhaseChip`, `SoundMarker`): unified visual across PresetCard, CreatePresetScreen, and PreSession preview. Three render modes (card / editor / preview).
- **Demoted in-session toggles** (`DemotedToggle`): pill-shaped DND + Keep-Awake controls above the timer; legible but secondary to the timer itself.
- **Hybrid heatmap rendering** on calendar: session cells opacity-ramped by duration (5m–45m+), protected days reserved for future grace-day / freeze logic with shield tooltip.
- **All-time best-streak query** in `sessionRepository` (`getBestStreak`, `getLongestSession`).

### Changed

- **HomeScreen**: 4-stat grid replaced with StreakHero/WelcomeCard + HomeStats (2 tiles, hidden when 0 history).
- **TimerScreen**: phase timeline now muted with current-phase pulse; controls re-laid out (small End / large Pause / small Skip); long-press End triggers discard confirm.
- **CreatePresetScreen**: per-element rendering unified via PhaseChip; sound configs managed inside DurationEditor (no more inline juggling); "+ Add here" affordance between adjacent items for inserting at position.
- **DurationEditor**: now consolidates phase config + attached sounds list (emoji + name + interval + edit/remove) in one screen — no longer requires bouncing between modals.
- **PresetCard**: expand-on-tap removed; long-press opens context menu (favorite / edit / delete); inline phase chips show sound badges directly.
- **JourneyScreen**: session rows now show phase emoji + preset name + date; long-press to delete (no more inline ✕).
- **DurationLineChart**: single teal hue across stroke + 12% fill (no rainbow); axis labels use `textMute`.
- **Sound assets**: each sound now has an emoji field (🔔 Bell, 💨 Swoosh, 🎶 Drone, 🐦 Bird, 🐕 Bark, ⚡ Rar, 🌿 Rainforest, 🌊 Ocean, 🌲 Forest).
- **Phase types**: end/start sounds removed from `DurationConfig`; sound markers are now first-class sibling elements between phases.

### Fixed

- Sounds continued playing after a session ended via the Discard / End-without-save path (foreground service was not stopped in all exit paths).
- `PhaseChip` overflow with long phase names in horizontal scroll context (now uses `width: 220` + `ellipsizeMode: tail` in card mode).
- Drag handle on PhaseChip / SoundMarker triggered drag on simple touch (was bound to both `onPressIn` and `onLongPress`); now uses `onLongPress` with 300 ms delay.

### Technical

- TypeScript strict mode passes (`tsc --noEmit` clean).
- All 6 themes extended with `surface2`, `surface3`, `line`, `textDim`, `textMute`, `tealSoft`, `tealDeep`, `warmBright`, `gold`, `goldPale`.

[Unreleased]: https://github.com/rzvntdr/spiritlog-react-native/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/rzvntdr/spiritlog-react-native/releases/tag/v0.3.0
[0.2.0]: https://github.com/rzvntdr/spiritlog-react-native/releases/tag/v0.2.0
