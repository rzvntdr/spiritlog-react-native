# Road to Play Store — release TODO

Realistic checklist to take SpiritLog from "works on my phone" to a published
Play Store app. **Product/UX work first** (sections 1–6, the fun part), then the
**mandatory Play Store mechanics** (section 7 — hard blockers, but boring, so
batched at the end).

Legend: 🔴 blocker for publishing · 🟡 should-have before launch · 🟢 nice-to-have / next release

---

## 1. Preset create/edit flow — audit + warmup duration UX 🟡

The most-deferred, most-important item. Go through create + edit end to end and
fix friction.

- [ ] Walk the full **create preset** flow: add each element kind (warmup,
      normal, infinite, sound marker), reorder, delete, attach/edit/remove
      interval sounds, save. Note anything awkward.
- [ ] Walk the full **edit preset** flow on an existing preset (incl. one with
      many elements) — same checks.
- [ ] **Warmup duration picker**: warmup's purpose is *short* lead-ins (30s, 1–3
      min), but it currently reuses the normal-duration picker that's tuned for
      long sittings. Give warmup its own quick-pick affordance (e.g. 30s / 1 / 2
      / 3 / 5 min chips + fine adjust) so a short time is one tap.
      → likely in `DurationEditor` / the duration editing component.
- [ ] Sanity-check interval-sound editing now that the native schedule bugs are
      fixed (fixed + random interval, ambient) actually behave in-session.
- [ ] Small UI/UX polish surfaced during the walkthrough (collect here as found).

## 2. Pass through the remaining screens 🟡

Make sure nothing else is broken before strangers use it.

- [ ] **Backup / restore** (Google Drive): sign-in, backup, restore on a fresh
      install, auto-backup-after-session toggle. Most likely the risky one.
- [ ] Journey / stats / records / patterns / calendar heatmap with real data.
- [ ] **Warn before a destructive delete**: if deleting a session would drop the
      current streak (or break it), show a confirm that says so ("This will lose
      your 22-day streak"). Cheap now that the streak is a pure rebuild — compute
      `rebuildFromHistory` without that day and compare to current before
      confirming.
- [ ] Settings: every toggle persists and takes effect (theme, haptics, DND,
      screen-awake, reminders, ambient volume, freeze earn rate).
- [ ] Reminders / notifications actually fire.
- [ ] Home / streak hero / widget across a few streak values.

## 3. About / How-to-use copy 🟡

- [ ] Expand the About / How-to-use section with a longer intent statement —
      what SpiritLog is for, the no-gamification / no-guilt philosophy, how
      streaks + freezes work. (Content task; you write the text, I wire it in.)

## 4. Achievements — small enhancement 🟢

- [ ] Add a handful of new achievements (reuse the existing tiered system; the
      redesign mock supports variable tier lengths). Keep it small — bank the
      rest for a future release.

## 5. New screen: plant gallery / history 🟢

- [ ] Screen to view all your plants, including the snapshot a plant was at when
      a streak ended — so losing a streak preserves the plant at its peak.
- [ ] Decide persistence: snapshot plant state (seed + tuning + day count) on
      streak break; store a small history list.

## 6. Finalize the plant 🟢

- [ ] Lock in the plant tuning itself (the saved seed/algorithm/form/tuning
      defaults that ship).
- [ ] Streak-driven extras that appear as the streak grows: flowers, fruit,
      glow, birds flying by, small animals near the plant.
- [ ] Make sure the widget plant stays in sync with whatever the hero renders.

---

## 7. Play Store mechanics (mandatory — batched at the end) 🔴

All required to publish. None are hard, just tedious.

### 7a. Release signing 🔴
- [ ] Generate a real upload keystore (NOT the checked-in `debug.keystore` —
      Play rejects debug-signed builds).
- [ ] Store it base64 as a GitHub Actions secret; add a release `signingConfig`
      in `android/app/build.gradle` + a CI step that decodes + signs.
- [ ] Keep the keystore backed up safely (losing it = can't update the app
      without Play key reset).

### 7b. App bundle 🔴
- [ ] Add an **AAB** build (`bundleRelease`) for Play (sideload distribution can
      stay on APK via the public releases repo).

### 7c. Privacy & data safety 🔴
- [ ] Write a privacy policy (covers Google Drive backup, notifications, any
      analytics/none) and host it at a public URL.
- [ ] Complete the Play Console **Data Safety** form to match.
- [ ] Review declared permissions + foreground-service type justification
      (media playback) for the console questionnaire.

### 7d. Store listing assets 🔴
- [ ] Final adaptive app icon.
- [ ] 2–8 phone screenshots, feature graphic (1024×500), short + full
      description, category, content-rating questionnaire.

### 7e. Build hygiene before submit 🟡
- [ ] **Hide the DEBUG menu + Demo bar behind a dev flag** (override streak/
      freeze, plant tuning panel, share logs) so they don't ship visible in
      release. Keep them in code for development (e.g. gate on `__DEV__` or a
      build-time flag). The native `MedSound` debug logging can stay (low volume,
      useful via `adb logcat MedSound:*`).
- [ ] Confirm `targetSdkVersion` meets Play's current minimum.
- [ ] Smoke-test a fresh install of the signed release build on a clean device
      (no leftover data) — onboarding, first session, first streak.

---

### Suggested order

1 → 2 → 3 (product confidence + content) → 6 → 5 → 4 (plant/visual polish) →
7 (the boring mechanics, once the product is final). Cut a `1.0.0` when 1–3 + 7
are done; 4/5/6 can trickle into later releases if needed.
