# SpiritLog React Native — Architecture & Technical Design

> This document defines the tech stack, project structure, data layer, state management,
> sound engine, and key APIs for the SpiritLog React Native app.
> 
> Prerequisite: [SPECS.md](./SPECS.md)

---

## 1. Tech Stack

### 1.1 Framework & Tooling

| Choice | Why |
|--------|-----|
| **Expo (managed workflow + dev builds)** | Modern RN default. Config plugins give native access without ejecting. Simpler build/deploy pipeline. Great docs. |
| **TypeScript** | Type safety, better IDE support, catches bugs early. Non-negotiable for a real app. |
| **EAS Build + EAS Submit** | Expo's cloud build service. Builds Android APK/AAB and iOS IPA without a Mac for iOS (mostly). Handles signing. |

> We use Expo with **custom development builds** (not Expo Go) because we need native modules
> (background audio, notifications, Google Sign-In). This means `npx expo prebuild` to generate
> native projects, then build with EAS or locally.

### 1.2 Core Libraries

| Library | Purpose | Why this one |
|---------|---------|-------------|
| `react-navigation` (v7) | Navigation | Industry standard for RN. Stack navigator for our push/pop flow. |
| `zustand` | State management | Lightweight, no boilerplate, works great with RN. Perfect for our scale. |
| `expo-sqlite` | Local database | SQLite access. Expo-maintained, well-documented. Offline-first. |
| `react-native-track-player` | Background service + notification controls | Keeps app alive in background (foreground service on Android, audio session on iOS). Provides media notification with play/pause/skip/stop. |
| `expo-av` | Sound effects playback | Multiple simultaneous sounds (interval bells, ambient layer). Independent from track-player. |
| `react-native-reanimated` (v3) | Animations | Smooth timer arc animation, drag-reorder, transitions. Runs on UI thread. |
| `react-native-gesture-handler` | Gestures | Drag-to-reorder presets, swipe actions. Required by react-navigation anyway. |
| `react-native-svg` | Timer circle | Circular progress arc on the timer screen. |
| `@react-native-google-signin/google-signin` | Google auth | Google Sign-In for backup. Well-maintained, Expo config plugin available. |
| `@react-native-async-storage/async-storage` | Key-value prefs | Theme selection, backup toggles, onboarding flags. Not for main data. |
| `react-native-haptics` (or `expo-haptics`) | Haptic feedback | Phase transition vibrations. |
| `expo-keep-awake` | Screen wake | Keep screen on during meditation. |
| `expo-notifications` | Local notifications | Daily reminders (v1.x), but also for any future notification needs. |
| `@react-native-community/netinfo` | Network detection | Queue backups until internet is available. |
| `react-native-draggable-flatlist` | Drag reorder | Preset list reordering. Well-maintained, works with reanimated. |
| `nativewind` (v4) + `tailwindcss` (v3) | Styling | Tailwind CSS utility classes for React Native. Fast iteration, consistent spacing/colors, built-in CSS variable theming for our 5 color schemes. All components are custom-built — NativeWind handles styling only. |

### 1.3 Development Tools

| Tool | Purpose |
|------|---------|
| ESLint + Prettier | Code formatting & linting |
| Jest + React Native Testing Library | Unit & component tests |
| Flipper or Expo Dev Tools | Debugging |
| EAS Build | CI/CD for app builds |

---

## 2. Project Structure

```
spiritlog/
├── app.json                    # Expo config
├── tsconfig.json
├── package.json
├── eas.json                    # EAS Build config
├── assets/
│   ├── icon.png                # App icon (1024x1024 placeholder)
│   ├── splash.png              # Splash screen
│   ├── fonts/                  # Custom fonts if needed
│   └── sounds/                 # Audio files
│       ├── bell.mp3
│       ├── swoosh.mp3
│       ├── drone.mp3
│       ├── bird_sing.mp3
│       ├── bark.wav
│       ├── distorted_rar.mp3
│       └── silence.mp3         # Silent track for background service
│
├── src/
│   ├── app/                    # App entry & navigation
│   │   ├── App.tsx             # Root component (providers, theme, navigation)
│   │   └── navigation.tsx      # Stack navigator config
│   │
│   ├── screens/                # One file per screen
│   │   ├── HomeScreen.tsx
│   │   ├── TimerScreen.tsx
│   │   ├── CreatePresetScreen.tsx
│   │   ├── JourneyScreen.tsx
│   │   ├── BackupScreen.tsx
│   │   └── HowToUseScreen.tsx
│   │
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Generic (Button, Card, Badge, BottomSheet, Slider)
│   │   ├── preset/             # PresetCard, PresetList, PhaseTimeline, PhaseBadge
│   │   ├── timer/              # TimerCircle, TimerControls, PhaseIndicator
│   │   ├── journey/            # StatsGrid, ProgressChart, SessionList
│   │   ├── notes/              # NoteSlider, NoteTags, NoteMood, NoteText
│   │   └── backup/             # BackupCard, BackupList, AccountCard
│   │
│   ├── stores/                 # Zustand stores
│   │   ├── presetStore.ts      # Presets CRUD + ordering
│   │   ├── timerStore.ts       # Active timer session state
│   │   ├── sessionStore.ts     # Meditation session history
│   │   ├── settingsStore.ts    # Theme, haptics, screen wake, note template
│   │   └── backupStore.ts      # Backup state, auth status, queue
│   │
│   ├── db/                     # Database layer
│   │   ├── database.ts         # SQLite init, migrations
│   │   ├── presetRepository.ts # Preset CRUD queries
│   │   ├── sessionRepository.ts# Session CRUD + stats queries
│   │   └── migrations/         # Versioned schema migrations
│   │       ├── v1.ts
│   │       └── index.ts
│   │
│   ├── services/               # Business logic & platform services
│   │   ├── timerEngine.ts      # Core timer logic (element sequencing, countdown)
│   │   ├── soundEngine.ts      # Multi-channel audio (ambient + effects)
│   │   ├── backgroundService.ts# Track player setup for background execution
│   │   ├── backupService.ts    # Google Drive backup/restore
│   │   ├── googleAuth.ts       # Google Sign-In wrapper
│   │   └── notificationService.ts # Local notifications (reminders)
│   │
│   ├── theme/                  # Theming system
│   │   ├── themes.ts           # All 5 theme definitions
│   │   ├── ThemeContext.tsx     # React context for current theme
│   │   └── tokens.ts           # TypeScript types for theme tokens
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useTimer.ts         # Hook wrapping timerStore + timerEngine
│   │   ├── useStats.ts         # Computed stats from sessionStore
│   │   ├── useTheme.ts         # Shortcut to ThemeContext
│   │   └── useBackup.ts        # Backup operations with network awareness
│   │
│   ├── types/                  # Shared TypeScript types
│   │   ├── preset.ts           # PresetTimer, DurationConfig, SoundConfig
│   │   ├── session.ts          # MeditationSession, SessionNotes, NoteElement
│   │   ├── timer.ts            # TimerState, MeditationElement, PlaybackAction
│   │   └── sound.ts            # Sound catalog, SoundChannel
│   │
│   └── utils/                  # Pure utility functions
│       ├── time.ts             # Format duration, calculate streaks
│       ├── presetBuilder.ts    # Convert preset config → element sequence
│       └── uuid.ts             # UUID generation
│
└── __tests__/                  # Test files mirroring src/ structure
```

---

## 3. Database Schema (SQLite)

### 3.1 Tables

```sql
-- v1 schema

CREATE TABLE presets (
  id            TEXT PRIMARY KEY,          -- UUID
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  durations     TEXT NOT NULL,             -- JSON: DurationConfig[]
  is_favorite   INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  last_used     INTEGER NOT NULL DEFAULT 0, -- timestamp ms
  created_at    INTEGER NOT NULL            -- timestamp ms
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,          -- UUID
  duration      INTEGER NOT NULL,          -- minutes
  date          INTEGER NOT NULL,          -- timestamp ms
  preset_id     TEXT,                      -- FK to presets.id (nullable, preset may be deleted)
  notes         TEXT                       -- JSON: SessionNotes | null
);

CREATE TABLE settings (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL              -- JSON-encoded value
);

-- Indexes for common queries
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_presets_favorite ON presets(is_favorite);
CREATE INDEX idx_presets_sort ON presets(sort_order);
```

### 3.2 Settings Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `theme` | string | `"ocean"` | Active theme ID |
| `screen_awake` | boolean | `true` | Keep screen on during timer |
| `haptics_enabled` | boolean | `true` | Vibrate on phase transitions |
| `backup_after_session` | boolean | `false` | Auto-backup after each session |
| `backup_daily` | boolean | `false` | Daily auto-backup |
| `note_template` | JSON | `[...]` | Which note elements to show post-session |
| `onboarding_seen` | boolean | `false` | Whether hints have been shown |
| `google_user_email` | string | `null` | Cached signed-in email |

### 3.3 Migration Strategy

Migrations are versioned JS files. On app launch:
1. Check current schema version from `PRAGMA user_version`
2. Run any pending migrations in order
3. Set new version

```typescript
// db/migrations/v1.ts
export const v1 = {
  version: 1,
  up: (db: SQLiteDatabase) => {
    db.execSync(`CREATE TABLE presets (...)`);
    db.execSync(`CREATE TABLE sessions (...)`);
    db.execSync(`CREATE TABLE settings (...)`);
    // Insert default presets
  }
};
```

---

## 4. State Management (Zustand)

### 4.1 Store Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ presetStore   │     │ timerStore   │     │ sessionStore │
│              │     │              │     │              │
│ presets[]    │────▶│ activePreset │     │ sessions[]   │
│ favorites[]  │     │ timerState   │────▶│ stats{}      │
│ CRUD ops     │     │ currentPhase │     │ insert()     │
│ reorder()    │     │ play/pause() │     │ getStats()   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │ soundEngine │ (not a store — a service)
                     │ timerEngine │
                     └─────────────┘

┌──────────────┐     ┌──────────────┐
│settingsStore │     │ backupStore  │
│              │     │              │
│ theme        │     │ isSignedIn   │
│ haptics      │     │ backups[]    │
│ noteTemplate │     │ queue[]      │
│ screenAwake  │     │ backup()     │
└──────────────┘     └──────────────┘
```

### 4.2 Key Store Interfaces

```typescript
// stores/timerStore.ts
interface TimerState {
  // Session state
  isActive: boolean;
  isPaused: boolean;
  activePreset: PresetTimer | null;

  // Current element tracking
  elements: MeditationElement[];
  currentElementIndex: number;
  
  // Timer display
  displayTime: number;          // ms — what's shown on screen
  currentPhaseName: string;
  currentPhaseType: DurationType;
  phaseProgress: number;        // 0–1 for arc

  // Totals
  elapsedMeditationTime: number; // ms — only counts duration elements
  
  // Actions
  startSession: (preset: PresetTimer) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  skipToNext: () => void;
  restart: () => void;
}
```

```typescript
// stores/presetStore.ts
interface PresetState {
  presets: PresetTimer[];
  
  // Derived
  favorites: PresetTimer[];       // computed: presets.filter(p => p.isFavorite)
  nonFavorites: PresetTimer[];    // computed: the rest
  
  // Actions
  loadPresets: () => Promise<void>;
  createPreset: (preset: PresetTimer) => Promise<void>;
  updatePreset: (preset: PresetTimer) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  reorder: (fromIndex: number, toIndex: number, section: 'favorites' | 'all') => Promise<void>;
}
```

### 4.3 Data Flow

```
User taps preset → HomeScreen
  → timerStore.startSession(preset)
    → presetBuilder.buildElements(preset)  // pure function
    → timerEngine.init(elements)           // starts the engine
    → backgroundService.activate()         // foreground service + notification
    → navigate('Timer')

Timer tick (every 100ms):
  → timerEngine.tick()
    → updates timerStore state
    → soundEngine.checkIntervalSounds()    // plays if due
    → if element complete → timerEngine.advance()
      → soundEngine.playTransitionSound()
      → haptics.impact() if enabled

User stops:
  → timerStore.stop()
    → backgroundService.deactivate()
    → show SaveSessionDialog
    → sessionStore.insertSession(session)
    → backupStore.queueBackupIfEnabled()
```

---

## 5. Sound Engine Architecture

The most architecturally complex part of the app. Two independent audio channels.

### 5.1 Channel Design

```
┌─────────────────────────────────────────────┐
│                Sound Engine                  │
│                                              │
│  ┌───────────────────┐  ┌────────────────┐  │
│  │  AMBIENT CHANNEL   │  │ EFFECT CHANNEL │  │
│  │  (expo-av)         │  │ (expo-av)      │  │
│  │                    │  │                │  │
│  │  • Continuous loop │  │ • One-shot     │  │
│  │  • Fade in/out     │  │ • Overlaps OK  │  │
│  │  • Independent vol │  │ • Bell, swoosh │  │
│  │  • Pauses with     │  │ • Start/end    │  │
│  │    timer           │  │ • Interval     │  │
│  └───────────────────┘  └────────────────┘  │
│                                              │
│  ┌───────────────────────────────────────┐   │
│  │  BACKGROUND SERVICE                    │   │
│  │  (react-native-track-player)           │   │
│  │                                        │   │
│  │  • Plays silent track to keep alive    │   │
│  │  • Provides notification controls      │   │
│  │  • Foreground service (Android)        │   │
│  │  • Audio session (iOS)                 │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 5.2 Sound Engine API

```typescript
// services/soundEngine.ts

interface SoundEngine {
  // Lifecycle
  init(): Promise<void>;
  dispose(): Promise<void>;

  // Effect channel — one-shot sounds (bell, swoosh, etc.)
  playSound(soundId: number): Promise<void>;
  
  // Ambient channel — continuous loop
  startAmbient(soundId: number, volume?: number): Promise<void>;
  stopAmbient(fadeOutMs?: number): Promise<void>;
  setAmbientVolume(volume: number): void;
  
  // Interval sound scheduling
  startIntervalSounds(configs: SoundConfig[]): void;
  stopIntervalSounds(): void;
  pauseIntervalSounds(): void;
  resumeIntervalSounds(): void;
  
  // Called by timer engine every tick
  tick(elapsedMs: number): void;
}
```

### 5.3 Background Service

```typescript
// services/backgroundService.ts

interface BackgroundService {
  // Activate foreground service (Android) / audio session (iOS)
  activate(presetName: string): Promise<void>;
  
  // Update notification content
  updateNotification(phaseName: string, timeDisplay: string, isPaused: boolean): void;
  
  // Deactivate when session ends
  deactivate(): Promise<void>;
}
```

The background service uses `react-native-track-player` playing a silent audio track. This is the standard pattern for keeping a React Native app alive in the background — track-player maintains a foreground service (Android) or audio session (iOS) that prevents the OS from killing the app.

Notification buttons (play/pause/skip/stop) are handled by track-player's remote events, which we bridge to the timer store.

---

## 6. Timer Engine

### 6.1 Core Design

The timer engine is a **pure logic module** (no React, no UI). It processes a sequence of MeditationElements and emits state updates.

```typescript
// services/timerEngine.ts

interface TimerEngine {
  // Setup
  init(elements: MeditationElement[]): void;
  
  // Control
  play(): void;
  pause(): void;
  stop(): TimerResult;     // Returns elapsed time for save dialog
  skipToNext(): void;
  restartCurrent(): void;
  
  // Called every 100ms by a setInterval
  tick(): TimerTickResult;
  
  // State
  getState(): TimerEngineState;
}

interface TimerEngineState {
  currentElementIndex: number;
  displayTimeMs: number;
  phaseProgress: number;       // 0–1
  phaseName: string;
  phaseType: DurationType;
  isComplete: boolean;
  elapsedMeditationMs: number; // only duration elements count
}

type MeditationElement =
  | { kind: 'sound'; soundId: number; name: string }
  | { kind: 'duration'; type: DurationType; durationMs: number; name: string; 
      soundConfigs: SoundConfig[]; startSound: number | null; endSound: number | null };
```

### 6.2 Tick Loop

```
setInterval (100ms)
  │
  ├── if paused → skip
  │
  ├── if current element is 'sound' → play it → advance to next
  │
  ├── if current element is 'duration':
  │     ├── update elapsed time
  │     ├── calculate display time:
  │     │     WARMUP:   elapsed (counts up)
  │     │     NORMAL:   remaining = total - elapsed (counts down)
  │     │     INFINITE: elapsed (counts up)
  │     ├── calculate progress: elapsed / total (0 for infinite)
  │     ├── soundEngine.tick(elapsed) → checks interval sounds
  │     └── if elapsed >= total (for non-infinite):
  │           → play end sound
  │           → advance to next element
  │
  └── if no more elements → session complete → stop
```

---

## 7. Backup Service

### 7.1 API

```typescript
// services/backupService.ts

interface BackupService {
  // Auth
  signIn(): Promise<GoogleUser>;
  signOut(): Promise<void>;
  isSignedIn(): boolean;
  
  // Backup
  backup(): Promise<BackupResult>;
  
  // Restore
  listBackups(): Promise<BackupEntry[]>;
  restore(backupId: string): Promise<void>;
  deleteBackup(backupId: string): Promise<void>;
}

interface BackupEntry {
  id: string;
  name: string;          // spiritlog_backup_2026-04-07_22-08-02
  createdAt: number;
  sizeBytes: number;
}
```

### 7.2 Backup Queue

```typescript
// Offline-aware backup queue (in backupStore)

queueBackup():
  → add to pending queue (AsyncStorage)
  → if online → execute immediately
  → if offline → NetInfo listener will trigger when connectivity restored

// NetInfo listener (registered at app startup):
onConnectivityChange(isConnected):
  → if isConnected && queue.length > 0
    → execute queued backup
    → clear queue
```

### 7.3 Backup Format

```json
{
  "version": 1,
  "exportedAt": 1743976082000,
  "presets": [ /* full PresetTimer objects */ ],
  "sessions": [ /* full MeditationSession objects with notes */ ],
  "settings": { /* key-value pairs */ }
}
```

Exported as JSON, compressed (gzip), uploaded to Google Drive under `appDataFolder` or a dedicated `SpiritLogBackups` folder.

---

## 8. Theme System

### 8.1 Implementation

```typescript
// theme/ThemeContext.tsx

const ThemeContext = React.createContext<Theme>(oceanTheme);

// Provider wraps the entire app
<ThemeProvider>
  <NavigationContainer>
    <App />
  </NavigationContainer>
</ThemeProvider>

// Usage in components
const { colors } = useTheme();
<View style={{ backgroundColor: colors.surface }}>
  <Text style={{ color: colors.onSurface }}>...</Text>
</View>
```

### 8.2 Theme Switching

- User taps palette icon on Home screen → bottom sheet with 5 theme swatches
- Selection saved to `settingsStore.theme` → persisted in SQLite settings table
- `ThemeContext` re-renders all themed components
- Navigation bar and status bar colors update to match

---

## 9. Navigation Map

```typescript
// app/navigation.tsx

type RootStackParamList = {
  Home: undefined;
  Timer: { presetId: string };
  CreatePreset: undefined;
  EditPreset: { presetId: string };
  Journey: undefined;
  Backup: undefined;
  HowToUse: undefined;
};

// All screens use stack navigation (push/pop)
// No tabs, no drawer
// Modal presentation for CreatePreset/EditPreset
```

---

## 10. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Expo vs bare RN | Expo + dev builds | Faster setup, EAS builds, config plugins for native modules. No need to manage Xcode/Gradle manually. |
| State management | Zustand | Minimal boilerplate, great TS support, perfect for this app's scale. Redux is overkill, Context alone gets messy. |
| Database | SQLite via expo-sqlite | Matches the offline-first model. Same tech as the Android app. Single source of truth on device. |
| Background timer | Track Player (silent track) + JS interval | Standard RN pattern. Track player keeps process alive, JS runs timer logic. |
| Sound playback | expo-av (multi-instance) | Supports multiple simultaneous sounds. One instance for ambient (loop), new instances for each effect. |
| Animations | Reanimated v3 | UI-thread animations for smooth timer arc. Required for drag-reorder too. |
| JSON in SQLite | `durations` and `notes` columns | Flexible schema for nested data (phases, note elements) without complex joins. Parse on read. |

---

## 11. Build & Deploy

### 11.1 Development

```bash
# Initial setup
npx create-expo-app spiritlog --template blank-typescript
cd spiritlog
npx expo install [all dependencies]

# Development
npx expo start --dev-client    # NOT expo go (we need native modules)

# Local builds for testing
npx expo prebuild
npx expo run:android
npx expo run:ios               # requires Mac
```

### 11.2 Production Builds

```bash
# Configure EAS
eas build:configure

# Build for stores
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 12. Implementation Order

Suggested order to build features, each one shippable:

| Phase | What | Depends on |
|-------|------|-----------|
| **P0** | Project setup, navigation, theme system, placeholder screens | Nothing |
| **P1** | Database + preset CRUD + Home screen (list, favorites, reorder) | P0 |
| **P2** | Create/Edit Preset screen (full element builder) | P1 |
| **P3** | Timer engine + Timer screen (no sound, no background) | P1 |
| **P4** | Sound engine (effects channel + ambient channel) | P3 |
| **P5** | Background service + notifications | P3, P4 |
| **P6** | Session saving + Journey screen (stats, chart) | P3 |
| **P7** | Session notes (configurable elements) | P6 |
| **P8** | Google Sign-In + Backup & Sync | P1, P6 |
| **P9** | Polish: haptics, screen wake, onboarding hints, How To Use | All |

---

*Review this architecture. Once approved, we start building from P0.*
