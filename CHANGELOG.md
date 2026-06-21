# Changelog

All notable changes to SpiritLog are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- **Freeze earn rate no longer rewrites history**: streak + freezes are now held in a sealed, incrementally-advanced checkpoint instead of being recomputed from scratch every read. Changing the earn rate (Settings → STREAK) seals the current state and applies the new rate only going forward — your streak can't suddenly jump up or down from a settings toggle. Accumulated progress toward the next freeze is preserved and converted at the new rate (lowering the rate can grant a freeze immediately if enough progress was banked). Migrates existing history automatically on first run; rebuilds on session delete / backup restore.

### Fixed

- **Interval sounds silent on single-phase presets**: a preset whose first (or only) phase is a duration with a fixed/random-interval sound played nothing. The native sound schedule was pushed synchronously right after starting the foreground service, before the service instance existed, so it was silently dropped. The schedule is now buffered and applied once the service comes up.
- **Interval/marker sounds cut off mid-playback**: native one-shot players were held only in a local variable, so on some devices the GC finalized them while still playing (`MediaPlayer finalized without being released`) and the sound was clipped. Active players are now retained until they finish (or the session ends).

### Changed

- **Log export shows the most recent slice**: "Share recent logs" now exports the tail (~96 KB) of the on-disk log instead of dumping oldest-first, so the latest session isn't buried under weeks of history (the full log is still kept on disk).

## [0.4.0] — 2026-06-12

### Added

- **Streak freezes (Q2)**: missed days are auto-covered by earned freezes instead of breaking the streak. You earn 1 freeze per N consecutive days (configurable in Settings → STREAK, default 10). Consolidated streak math in `getStreakState()`; the 🛡 line on the hero now reflects real freezes available.
- **Streak increment animation**: returning to Home after a session that grew the streak plays a count-up (duration scaled to the jump) with a spring "pop" on the number. 0 → first streak crossfades from the WelcomeCard to the StreakHero. State is snapshotted (`lastShownStreakState`, persisted) so it animates the delta once, not on every visit.
- **Freeze shield blessing**: earning a freeze plays a one-shot golden "holy" burst anchored on the 🛡 shield line (paladin-shield feel). This is the only celebration effect — the broader streak-increment Lottie system (number bursts + theme picker) was built and then removed during this cycle.
- **Streak art styles**: pick `Classic` (glow + sparkles) or `Plant` (an SVG plant that grows through all 10 tiers) for the hero card.
- **Custom streak subtitle**: Settings → STREAK lets you template the line under the number with `{streak} {best} {hours} {sessions} {freezes}`.
- **Persistent logs**: the in-app logger now writes to a rotating file (`documentDirectory/logs`, 256 KB rotation) so logs survive crashes and app restarts. Settings → DEBUG → "Share recent logs" exports them.
- **Demo mode controls** (Settings → DEBUG + on-Home bar): override streak and freezes independently and a "+1 day & +1 freeze" button for the threshold case — all to preview hero visuals without real data.

### Changed

- **Plant art rebuilt on the procedural plant engine**: the `Plant` hero style now uses the space-colonization / L-system engine (seeded sprout → sapling → mature tree lifecycle, branch-staggered growth, aging colors, exposed roots). The plant's seed is rolled once on first activation and persisted — its identity is fixed from then on. While DEMO/debug mode is active, an on-Home tuning panel appears (sliders for density/leaf size/thickness/branchiness/crown, algorithm + silhouette pickers, reroll-seed button). The panel edits a TRANSIENT draft previewed live by the hero; the explicit "💾 Salvează (override)" button commits it over the saved config, and dismissing demo mode discards unsaved experiments. Outside demo mode there is intentionally no way to change seed or tuning. Hero layout: text column anchored left, the right side is the art slot. The home-screen widget renders THE SAME plant (engine + your seed/tuning, maturity from the streak) instead of the old tier-based mini drawing.
- **Plant art (legacy)**: denser, more detailed foliage with monotonic growth (no tier ever looks emptier than the one before); widened canvas and the streak number nudged right-of-center for balance. (Superseded by the engine above.)

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
