# SpiritLog — Product Specification

> Meditation timer app with customizable presets, session tracking, and cloud backup.  
> Target: React Native (Android + iOS)  
> Reference: Existing native Android app at `c:/Users/razva/StudioProjects/spiritlog`

---

## 1. App Overview

**SpiritLog** helps users build a consistent meditation practice by providing a fully customizable timer with multi-phase presets, interval sounds, session logging, statistics, and cloud backup.

**Tagline:** "Create your meditation"

---

## 2. Screens & Features

### 2.1 Home Screen (Preset Selection)

**Header:**
- App name "SpiritLog" + subtitle "Create your meditation"
- Two icon buttons in top-right:
  - History icon (clock) → navigates to "Your Journey" screen
  - Backup/account icon → navigates to "Backup & Sync" screen

**Stats Banner (top card):**
- Three stats displayed horizontally:
  - **This Week** — number of sessions this week (Mon–Sun), with a droplet icon
  - **Day Streak** — consecutive days with at least one session, with a flame icon
  - **Avg Session** — average session duration in minutes, with a timer icon
- Icons change color based on streak/activity thresholds (e.g., flame turns gold at higher streaks)

**Preset Lists:**
- **Favorites section** (heart icon header) — presets marked as favorite, shown first
- **All Presets section** (clock icon header) — all remaining presets
- **Drag-to-reorder** within each section — long-press a preset card to enter reorder mode, drag to desired position. Order persists.

**Each Preset Card shows:**
- Timer icon (left)
- Preset name (bold)
- Total duration + phase count (e.g., "20 min · 2 phases")
- Phase duration badges — colored pills showing each phase (e.g., `30s` warm-up pill, `20m` meditation pill)
  - Badge colors differ by duration type: warm-up = gold/brown, normal = olive/green, infinite = teal
- Favorite toggle (heart icon, filled red if favorite)
- Expand/collapse chevron
- When expanded: **Edit** and **Delete** action buttons

**"+ Create Preset" FAB** — floating action button at bottom-right

---

### 2.2 Create/Edit Preset Screen

Full-screen modal with close (X) button.

**Section: Preset Details**
- Preset Name (text input, required)
- Description (text input, optional)

**Section: Duration Preview**
- Visual badge showing total calculated duration (e.g., `10m`)

**Section: Duration Types** (reference icons)
- Warm-up — hourglass/timer icon (brown)
- Normal — clock icon (blue)
- Infinite — infinity icon (teal)

**Section: Sound Markings** (toggles)
- Start sound — toggle on/off
- End sound — toggle on/off

**Section: Sound Interval Types** (reference icons)
- Fixed interval — clock icon
- Random interval — shuffle icon
- Ambient sound — waves icon

**Section: Meditation Elements**
- Ordered list of elements that compose the meditation session
- **"+ Add Element"** button to add new elements
- Each element is either a **Sound Element** or a **Duration Element**

**Sound Elements:**
- Display: music note icon, sound name (e.g., "Start Meditation"), sound file name (e.g., "Bell")
- Play button to preview the sound
- Remove button (red minus icon)
- Tappable to open **Edit Sound** dialog:
  - Sound Name (text input)
  - Sound (dropdown selector with play preview)
  - Cancel / Save Changes buttons

**Duration Elements:**
- Display: timer icon, phase name (e.g., "Meditation"), type label (e.g., "Meditation Phase"), duration (e.g., "10m")
- "Configure Interval Sounds" button
- Remove button (red minus icon)

**Sound Configuration Dialog** (per duration element):
- Title: "Sound Configuration"
- Subtitle: "Phase: [phase name]"
- **Start/End Sounds section:**
  - Start Sound — dropdown with play preview
  - End Sound — dropdown with play preview
- **Interval Sounds section:**
  - "No interval sounds configured" placeholder or list of configured sounds
  - "**+ Add Sound**" button
  - Cancel / Save Changes buttons

**Add Interval Sound Dialog:**
- Select Sound — dropdown with play preview
- Interval Type — radio toggle:
  - **Fixed Interval**: shows single slider for interval (seconds)
  - **Random Interval**: shows two sliders for min/max interval (seconds)
- Cancel / Add Sound buttons

**Available Sounds (v1 — reused from existing app):**
| ID | Name    | File           |
|----|---------|----------------|
| 1  | Bell    | bell.mp3       |
| 2  | Swoosh  | swoosh.mp3     |
| 3  | Drone   | drone.mp3      |
| 4  | Bird    | bird_sing.mp3  |
| 5  | Bark    | bark.wav       |
| 6  | Rar     | distorted_rar.mp3 |

> **Future**: More bundled sounds will be added over time. Custom sound import (user picks audio file from device) is planned for a later version.

**"Save Preset" button** — bottom of screen, enabled when valid

---

### 2.3 Meditation Timer Screen (Player)

**Header:**
- Back arrow (left)
- Preset name (center, e.g., "20 intens")

**Timer Display (center):**
- Large circular progress indicator with subtle dots around the perimeter
- Phase name label above the time (e.g., "Warm-up", "Meditation")
- Large countdown/countup timer (MM:SS format)
- Progress arc color changes by phase type:
  - Warm-up = gold/amber
  - Normal meditation = light blue
  - Infinite = (no progress, just counting up)
- Three dots indicator below time (showing total phase count)

**Phase Timeline (horizontal):**
- Visual pipeline of all meditation elements
- Alternating icons: music notes (sound elements) and timers (duration elements)
- Connected by lines
- Current element is highlighted (larger, colored)
- Completed elements are dimmed
- Upcoming elements are grey

**Playback Controls:**
- **Restart** button (left) — reset current phase
- **Play/Pause** button (center, large circle) — toggle timer
- **Stop** button (right) — end session entirely
- **"Skip to next phase"** text button (bottom)

**Notification (when app is backgrounded):**
- Persistent notification: "SpiritLog"
- Shows current phase name + timer
- Shows "(Paused)" when paused
- Controls: Play/Pause, Skip, Stop

**Session Completion Flow:**
- When timer ends (or user stops), shows **"Save Meditation Session"** dialog:
  - "Your Meditation Time" label
  - Large display of elapsed time (MM:SS format, blue)
  - "Total Time (minutes)" — editable field, pre-filled with preset total
  - Helper text: "You can adjust the total time if needed"
  - **"Don't Save"** / **"Save Session"** buttons

---

### 2.4 Your Journey Screen (History & Statistics)

**Header:**
- Back arrow + "Your Journey" title
- Share icon (top-right)
<!-- TODO: Define share format — screenshot of stats card? Formatted text message? 
     e.g., "I've meditated 127 sessions with a 4-day streak on SpiritLog!" 
     Or a generated image card? Decide before implementing. -->

**Stats Grid (2x2 cards):**
| Stat | Description | Icon Color |
|------|-------------|------------|
| Total Time | e.g., "1d 5h" | Teal |
| Day Streak | e.g., "4" | Gold |
| Sessions | e.g., "127" | Green |
| Average | e.g., "14m" | Purple |

**Time Range Filter:**
- Horizontal toggle pills: **Week** | Month | 3 Months | Year

**Progress Chart:**
- Bar chart showing meditation minutes per day/period
- Y-axis: minutes, X-axis: days (0–6 for week view)

<!-- TODO: Review chart type — bar chart? line chart? heatmap calendar? -->
<!-- TODO: Decide if we want additional charts (e.g., session time distribution, best time of day, weekly trends) -->
<!-- TODO: Should tapping a bar/day show session details for that day? -->
<!-- TODO: Consider adding a "GitHub-style" contribution heatmap (calendar grid with color intensity) -->
<!-- TODO: Any goal-setting feature? e.g., "Meditate 10 min/day" with progress tracking -->

**Recent Sessions List:**
- Each entry: date icon + formatted date (e.g., "Apr 6, 2026 · 11:40 am") + duration (e.g., "10 min")
<!-- TODO: Should sessions be deletable/editable from this list? -->
<!-- TODO: Should tapping a session show more detail (which preset was used, phases completed)? -->
<!-- TODO: Consider adding session notes — a text field after meditation to jot down how it went -->
<!-- TODO: Consider adding mood/rating — quick 1-5 emoji rating after each session -->

---

### 2.5 Backup & Sync Screen

**Header:** Back arrow + "Backup & Sync" title

**Account Card:**
- Google account avatar + email (e.g., "razvan.tdr@gmail.com")
- "Connected" status label
- **Sign Out** button
- (If not signed in: Google Sign-In button)

**Backup Action Card:**
- Upload icon
- "Backup Your Data" title
- "Keep your meditation journey safe" subtitle
- **"Backup Now"** button

**Auto Backup Settings:**
- **After Each Session** — toggle (auto backup after every completed session)
- **Daily Backup** — toggle (backup once every day, scheduled)

**Your Backups List:**
- Each entry: cloud icon + backup filename with timestamp
- Expandable (chevron) — presumably to restore or delete

---

## 3. Data Model

### 3.1 PresetTimer
| Field       | Type                | Description                    |
|-------------|---------------------|--------------------------------|
| id          | string (UUID)       | Primary key                    |
| name        | string              | Preset display name            |
| description | string              | Optional description           |
| durations   | DurationConfig[]    | Ordered list of phases         |
| isFavorite  | boolean             | Whether shown in favorites     |
| lastUsed    | number (timestamp)  | Last time this preset was used |
| createdAt   | number (timestamp)  | Creation timestamp             |

### 3.2 DurationConfig (Phase)
| Field          | Type          | Description                          |
|----------------|---------------|--------------------------------------|
| type           | enum          | "WARMUP" \| "NORMAL" \| "INFINITE"  |
| durationMillis | number        | Duration in ms (0 for infinite)      |
| name           | string        | Phase display name                   |
| startSound     | number \| null | Sound ID for phase start            |
| endSound       | number \| null | Sound ID for phase end              |
| soundConfigs   | SoundConfig[] | Interval sounds during this phase    |

### 3.3 SoundConfig (Interval Sound)
| Field  | Type   | Description                                      |
|--------|--------|--------------------------------------------------|
| type   | enum   | "FIXED_INTERVAL" \| "RANDOM_INTERVAL" \| "AMBIENT" |
| soundId| number | Reference to a sound asset                        |
| params | object | Type-specific parameters (see below)              |

**Params by type:**
- `FIXED_INTERVAL`: `{ intervalMillis: number }`
- `RANDOM_INTERVAL`: `{ minIntervalMillis: number, maxIntervalMillis: number }`
- `AMBIENT`: `{ volume: number }` — continuous looping sound on a **separate audio channel**

### 3.3.1 Ambient Sound Behavior
Ambient sounds play on a dedicated audio channel that is independent from the main sound channel. This means:
- Ambient loops continuously for the entire duration of the phase
- Fixed/random interval sounds and start/end sounds **overlap on top of** the ambient track
- Multiple ambient sounds can potentially stack (future consideration)
- Volume is controllable independently
- Ambient fades out when the phase ends or the user pauses/stops

### 3.4 MeditationSession
| Field    | Type              | Description                    |
|----------|-------------------|--------------------------------|
| id       | string (UUID)     | Primary key                    |
| duration | number            | Duration in minutes            |
| date     | number (timestamp) | When the session occurred      |
| presetId | string \| null    | Which preset was used          |
| notes    | SessionNotes \| null | Post-session reflection data |

### 3.5 SessionNotes (Post-Session Reflection)

<!-- TODO: The notes system should support MULTIPLE configurable note element types.
     The user has a vision for this that goes beyond simple text notes.
     
     Planned element types to consider:
     - **Slider elements** — rate aspects of the meditation on a scale (e.g., 1-10)
       organized along "pillars" of the meditation process. Examples:
       - Focus quality
       - Calmness / inner peace
       - Body relaxation
       - Mind clarity
       - Emotional state
     - **Text note** — free-form text reflection
     - **Mood/emoji picker** — quick overall session rating
     - **Tags** — quick-tap labels (e.g., "restless", "deep", "sleepy", "breakthrough")
     
     The note template should be CONFIGURABLE — user can choose which elements
     appear in their post-session prompt and in what order.
     
     Data structure needs to be flexible enough to store varying element types.
     Consider a schema like:
     
     SessionNotes {
       elements: NoteElement[]
     }
     
     NoteElement = 
       | { type: "slider", pillar: string, value: number, min: number, max: number }
       | { type: "text", label: string, value: string }
       | { type: "mood", value: number }  // 1-5
       | { type: "tags", selected: string[] }
     
     The user's note template (which elements to show) should be stored in 
     user preferences, not per-session.
     
     THIS SECTION NEEDS FULL DESIGN BEFORE IMPLEMENTATION.
-->

### 3.6 Sound (Static Asset)
| ID | Name   | File              |
|----|--------|-------------------|
| 1  | Bell   | bell.mp3          |
| 2  | Swoosh | swoosh.mp3        |
| 3  | Drone  | drone.mp3         |
| 4  | Bird   | bird_sing.mp3     |
| 5  | Bark   | bark.wav          |
| 6  | Rar    | distorted_rar.mp3 |

---

## 4. Computed Statistics

| Stat             | Calculation                                                   |
|------------------|---------------------------------------------------------------|
| This Week        | Count of sessions from Monday 00:00 to now                    |
| Day Streak       | Consecutive days (backwards from today/yesterday) with ≥1 session |
| Avg Session      | Sum of all durations / count of all sessions                  |
| Total Time       | Sum of all session durations                                  |
| Total Sessions   | Count of all sessions                                         |
| Progress Chart   | Sessions grouped by day/week/month, filtered by range         |

---

## 5. Timer Engine Behavior

### 5.1 Element Sequencing
A preset is converted to a flat list of **MeditationElements**:
1. **SoundElement** — plays a sound immediately, then advances
2. **DurationElement** — runs a timer (countdown or countup), may trigger interval sounds

Example for a preset "20 intens" (30s warm-up + 20m meditation):
```
[StartSound] → [Warm-up 30s] → [TransitionSound] → [Meditation 20m] → [EndSound]
```

### 5.2 Duration Types
| Type     | Timer Direction | Progress Bar | Behavior                    |
|----------|-----------------|--------------|-----------------------------|
| WARMUP   | Count UP        | Fills arc    | Short prep phase            |
| NORMAL   | Count DOWN      | Drains arc   | Main meditation             |
| INFINITE | Count UP        | No progress  | Ends only when user stops   |

### 5.3 Interval Sounds During Durations
- **Fixed**: play sound every N seconds
- **Random**: play sound at random intervals between min and max seconds
- Tracked by `lastPlayTime` to calculate next trigger

### 5.4 Playback Controls
| Action    | Behavior                                          |
|-----------|---------------------------------------------------|
| Play      | Start/resume timer                                |
| Pause     | Freeze timer, pause interval sound scheduling     |
| Stop      | End session, show save dialog                     |
| Skip      | Jump to next element in the sequence              |
| Restart   | Reset current element to beginning                |

### 5.5 Background Execution
- Timer must continue running when app is backgrounded
- Persistent notification with media-style controls
- Wake lock to prevent CPU sleep during active timer

---

## 6. Data Persistence & Backup

### 6.0 Offline-First Principle
**The app is fully offline.** All data is stored locally on-device. Internet is never required to use any feature. Backup is an optional convenience — it runs only when internet is available.

### 6.1 Local Storage
- All presets, sessions, notes, and preferences stored in local SQLite database
- App works 100% without internet, always

### 6.2 Authentication
- Google Sign-In (OAuth2)
- Required scope: Google Drive file access

### 6.3 Backup Format
- Full database export (all presets + all sessions + all notes)
- Stored as a single file in Google Drive under a dedicated app folder
- Filename pattern: `spiritlog_backup_YYYY-MM-DD_HH-MM-SS`

### 6.4 Backup Triggers
- **Manual**: user taps "Backup Now"
- **After session**: queued after each saved session (toggleable) — **executes only when internet is available**
- **Daily**: queued once per day (toggleable) — **executes only when internet is available**
- If backup is triggered while offline, it is queued and runs automatically when connectivity is restored

### 6.5 Restore
- User can view list of past backups
- Select a backup to restore → replaces local database
- App restarts after restore

### 6.6 No Migration Feature
Data migration from the existing Android app is handled manually by the developer (only user). No in-app migration tool needed.

---

## 7. Default Presets (Created on First Launch)

| Name            | Duration | Phases                                    |
|-----------------|----------|-------------------------------------------|
| Quick 5         | 5 min    | 5m meditation                             |
| Basic 10        | 10.5 min | 30s warm-up → 10m meditation              |
| Deep 20         | 20.5 min | 30s warm-up → 20m meditation (random interval sounds) |
| Open-ended      | ∞        | Infinite duration                         |
| Multi-phase 30  | 30 min   | 30s warm-up → 5m body scan → 15m breath → 10m open awareness |

---

## 8. Theme & Visual Design

### 8.1 Multi-Theme Support

The app ships with multiple color schemes. The user can switch between them in a Settings screen. The selected theme persists across sessions.

**Theme: Ocean (Default — matches current app)**
| Token              | Value        | Usage                            |
|--------------------|-------------|----------------------------------|
| background         | #1A2332     | Main screen background           |
| surface            | #243447     | Cards, dialogs                   |
| surfaceVariant     | #2D3F52     | Elevated cards, expanded states  |
| primary            | #5F8CA0     | Buttons, active elements, links  |
| primaryContainer   | #3A6478     | FAB, primary button backgrounds  |
| onPrimary          | #FFFFFF     | Text on primary buttons          |
| onBackground       | #E8EDF2     | Primary text                     |
| onSurface          | #C4CDD6     | Secondary text                   |
| accent             | #6BA3B8     | Timer arc (normal), highlights   |
| warmup             | #C8954C     | Warm-up badges, warm-up arc      |
| infinite           | #4DAAAA     | Infinite badges, infinite arc    |
| favorite           | #E05555     | Filled heart                     |
| error              | #CF6679     | Delete buttons, destructive      |

**Theme: Midnight**
| Token              | Value        | Usage                            |
|--------------------|-------------|----------------------------------|
| background         | #0D0D1A     | Deep black-blue                  |
| surface            | #1A1A2E     | Cards                            |
| surfaceVariant     | #252540     | Elevated cards                   |
| primary            | #7B68EE     | Medium slate blue accent         |
| primaryContainer   | #5B4BC7     | Buttons                          |
| onPrimary          | #FFFFFF     | Text on buttons                  |
| onBackground       | #E0E0F0     | Primary text                     |
| onSurface          | #A0A0C0     | Secondary text                   |
| accent             | #9B8AFB     | Timer arc                        |
| warmup             | #E0A458     | Warm-up                          |
| infinite           | #5EC4C4     | Infinite                         |
| favorite           | #FF6B8A     | Heart                            |
| error              | #FF6B8A     | Destructive                      |

**Theme: Forest**
| Token              | Value        | Usage                            |
|--------------------|-------------|----------------------------------|
| background         | #1A2318     | Dark green                       |
| surface            | #253423     | Cards                            |
| surfaceVariant     | #2F4030     | Elevated cards                   |
| primary            | #6AAF6A     | Green accent                     |
| primaryContainer   | #4A8A4A     | Buttons                          |
| onPrimary          | #FFFFFF     | Text on buttons                  |
| onBackground       | #E0EDE0     | Primary text                     |
| onSurface          | #A8C4A8     | Secondary text                   |
| accent             | #7EC87E     | Timer arc                        |
| warmup             | #D4A054     | Warm-up                          |
| infinite           | #5AB8A0     | Infinite                         |
| favorite           | #E06060     | Heart                            |
| error              | #CF6679     | Destructive                      |

**Theme: Sunrise (Light theme)**
| Token              | Value        | Usage                            |
|--------------------|-------------|----------------------------------|
| background         | #FFF8F0     | Warm white                       |
| surface            | #FFFFFF     | Cards                            |
| surfaceVariant     | #F5EDE4     | Elevated cards                   |
| primary            | #D4845A     | Warm terracotta accent           |
| primaryContainer   | #E8A070     | Buttons                          |
| onPrimary          | #FFFFFF     | Text on buttons                  |
| onBackground       | #2C2420     | Primary text                     |
| onSurface          | #6B5E56     | Secondary text                   |
| accent             | #D4945A     | Timer arc                        |
| warmup             | #CC8844     | Warm-up                          |
| infinite           | #5A9E9E     | Infinite                         |
| favorite           | #D05050     | Heart                            |
| error              | #C04040     | Destructive                      |

**Theme: Monochrome (Light theme)**
| Token              | Value        | Usage                            |
|--------------------|-------------|----------------------------------|
| background         | #FAFAFA     | Near-white                       |
| surface            | #FFFFFF     | Cards                            |
| surfaceVariant     | #F0F0F0     | Elevated cards                   |
| primary            | #333333     | Black accent                     |
| primaryContainer   | #555555     | Buttons                          |
| onPrimary          | #FFFFFF     | Text on buttons                  |
| onBackground       | #1A1A1A     | Primary text                     |
| onSurface          | #666666     | Secondary text                   |
| accent             | #444444     | Timer arc                        |
| warmup             | #AA8844     | Warm-up (only badges get color)  |
| infinite           | #558888     | Infinite                         |
| favorite           | #CC4444     | Heart                            |
| error              | #CC4444     | Destructive                      |

### 8.2 Shared Design Tokens (all themes)

- **Phase badge colors**: always warmup/normal/infinite as above, regardless of theme
- **Favorite heart**: always red-ish when active
- **Timer arc**: animated, color matches current phase type
- **Typography**: clean sans-serif, large bold timer digits (monospace for timer)
- **Border radius**: 12px cards, 8px badges, 24px buttons
- **Overall feel**: calm, minimal, focused
- **Spacing scale**: 4, 8, 12, 16, 24, 32px

---

## 9. Platform Considerations (React Native)

### Must Work On:
- Android 8+ (API 26+)
- iOS 14+

### Platform-Specific Features Needed:
| Feature | Android | iOS |
|---------|---------|-----|
| Background timer | Foreground Service | Background Audio session |
| Notifications | Notification channels | UNUserNotificationCenter |
| Sound playback | MediaPlayer | AVAudioPlayer |
| Google Sign-In | Play Services | Google Sign-In SDK |
| Local storage | SQLite | SQLite |

---

## 10. UX Philosophy: Intuitive First, Settings Minimal

The app should be **self-explanatory**. A new user should understand how to create a preset and start meditating without any tutorial.

### 10.1 Onboarding (First Launch)
- **No heavy tutorial/walkthrough.** The app should speak for itself.
- Subtle **UI hints** on first use — small contextual tooltips that appear once:
  - "Tap a preset to start meditating"
  - "Long-press to reorder" (if applicable)
  - Hints auto-dismiss and never show again
- **Optional PDF guide** — accessible from a small "?" or "Guide" link somewhere unobtrusive (e.g., Home screen header or about section). Contains a visual walkthrough of features for users who want it.

### 10.2 Settings — Keep It Light
Instead of a heavy dedicated settings screen, distribute settings contextually:

- **Theme picker** — accessible from Home screen header (palette icon). Opens a quick bottom sheet with theme swatches. One tap to switch.
- **Timer behavior** (screen awake, haptics) — small gear icon on the Timer screen itself, opens a compact bottom sheet. Settings live where they're relevant.
- **Backup & Sync** — already has its own screen (accessed from Home header)
- **About / App info** — accessible from a subtle info icon or long-press on the app title

This avoids a separate "Settings" screen while keeping everything discoverable. The goal: **zero configuration needed to get started, all options findable when wanted.**

### 10.3 Navigation Model

**Header icons on Home screen (no bottom tab bar).** This keeps the UI clean and focused — meditation apps should feel spacious, not busy.

Navigation flow:
```
Home Screen (preset list)
  ├── 🎨 Theme picker (palette icon) → bottom sheet
  ├── 🕐 Your Journey (history icon) → full screen
  ├── ☁️ Backup & Sync (cloud/account icon) → full screen
  ├── ❓ How to Use (info icon) → full screen, short guide
  ├── [tap preset] → Timer Screen → Session Save → (optional) Notes
  └── [+ Create Preset] → Create/Edit Preset Screen
```

All navigation is **stack-based** (push/pop). Back arrow returns to previous screen. No tabs, no drawer.

---

## 11. Feature Roadmap

### 11.1 v1 — Core Features
All features described in sections 2–9 above, plus:
- **Session notes** — configurable post-session reflection with slider/text/mood/tag elements (see 3.5 TODO)
- **Haptic feedback** — subtle vibration on phase transitions
- **Screen keep-awake** — screen stays on during meditation (default ON)
- **Ambient sound layer** — separate audio channel for continuous background sounds
- **Multi-theme** — 5 color schemes, switchable from home screen

### 11.2 v1.x — Post-Launch Enhancements
- **Daily reminder notification** — "Time to meditate" at user-configured time
- **Contribution heatmap** — GitHub-style calendar on Journey screen
- **Preset reordering** — drag-to-reorder in the list
- **Element drag-to-reorder** — reorder phases within Create Preset
- **Custom sounds** — user imports audio files from device
- **More bundled sounds** — expand beyond the initial 6

### 11.3 v2+ — Future Ideas
- **Guided audio support** — attach an MP3 to a preset (guided meditations)
- **Widget** — home screen widget showing streak + quick-start
- **Apple Health / Google Fit integration** — log mindfulness minutes
- **Export sessions as CSV**
- **Social** — share streaks, compare with friends (opt-in)

---

## 12. Resolved Decisions

All major questions resolved:

| Question | Decision |
|----------|----------|
| Sound assets | Reuse existing 6, add more later, custom import in future |
| Ambient sound | Continuous loop on separate audio channel, other sounds overlap on top |
| Offline-first | Yes — always offline, backup queues until internet available |
| Data migration | No in-app migration, manual by developer only |
| Onboarding | Minimal UI hints + short in-app "how to" section, plus external PDF guide written by developer |
| Settings screen | No dedicated screen — distribute contextually (theme picker on home, timer settings on timer) |
| Session notes | Yes in v1 — configurable multi-element system (sliders on pillars, text, mood, tags) — needs full design |
| Share feature | TODO — format/content of shared message to be designed later |
| App icon & splash | No existing assets — see section 13 for what's needed |
| Navigation | Header icons on Home (no bottom tabs) — see section 10.3 |
| Preset sorting | Favorites section first, then drag-to-reorder within each section (v1) |
| PDF guide | Developer writes external PDF, app includes a short in-app "How to Use" section |

---

## 13. Assets Needed

You'll need the following assets before publishing. None are needed to start development — we can use placeholders and create these later.

### 13.1 App Icon
- **Required for both stores.** One 1024x1024 PNG source file is enough — we generate all sizes from it.
- Should work at small sizes (simple, recognizable, no fine detail)
- Recommendation: a minimal symbol (lotus, meditation silhouette, or abstract "S" mark) in your accent color on a dark background
- **Tools to create it yourself:** Figma (free), Canva, or commission on Fiverr (~$20-50)
- **For development:** we'll use a placeholder colored square

### 13.2 Splash Screen
- Simple: app icon centered on a solid background color (matches theme)
- React Native can generate this from just the icon + a background color
- No custom artwork needed

### 13.3 Store Listing Assets (needed for publishing only)
| Asset | Android (Play Store) | iOS (App Store) |
|-------|---------------------|-----------------|
| Screenshots | Min 2, recommended 5-8 | Required per device size |
| Feature graphic | 1024x500 PNG | Not needed |
| Short description | 80 chars | 30 chars (subtitle) |
| Full description | 4000 chars | 4000 chars |
| Privacy policy URL | Required | Required |

> **Bottom line:** You need ONE icon design to start. Everything else can wait until you're ready to publish. We'll use a placeholder icon during development.

---

*All questions resolved. Spec is ready for architecture & API design phase.*
