# Changelog

All notable changes to SpiritLog are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/rzvntdr/spiritlog-react-native/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/rzvntdr/spiritlog-react-native/releases/tag/v0.2.0
