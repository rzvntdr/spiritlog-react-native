# SpiritLog React Native — Claude Code guide


## Installing on Razvan's phone (wireless ADB)

Razvan's typical device is on `192.168.50.60:33325` (port changes if WiFi debugging is restarted — check phone for fresh values).

### Build + install in one go

```powershell
# from C:\Users\razva\StudioProjects\spiritlog-react-native
.\android\gradlew.bat -p android assembleRelease --no-daemon
.\scripts\installmy.ps1 50 60 33325
```

### Just reinstall an existing APK

```powershell
.\scripts\installmy.ps1 50 60 33325
```

### What the script does

[`scripts/installmy.ps1`](scripts/installmy.ps1) (PowerShell — primary) / [`scripts/installmy.sh`](scripts/installmy.sh) (Bash — fallback):
- Args: `<oct3> <oct4> <port> [apk-path]` → builds IP as `192.168.<oct3>.<oct4>:<port>`
- Tries `adb connect`; if device already paired, installs immediately
- If not paired, prompts for the pairing port (different one shown on phone under "Pair device with pairing code"), runs `adb pair`, reconnects, then installs
- Default APK path: `android\app\build\outputs\apk\release\app-release.apk`

### Pairing the phone the first time

Phone: Settings → Developer options → Wireless debugging → **Pair device with pairing code**. Note both:
- the **pairing port** (one-time, shown only on this screen) — enter when the script asks
- the **connect port** (persistent, shown on the main Wireless debugging screen) — this is the third arg to `installmy`

After successful pair, only the connect port matters.

**Tip**: if `adb connect IP:PORT` times out, check `adb devices -l` first — after
pairing, adb often auto-discovers the phone via mDNS (serial like
`adb-...-XXXX._adb-tls-connect._tcp`) and you can `adb -s "<that serial>"
install -r <apk>` directly, no port needed.

## Principles (from 00-ux-principles.md)

- No gamification, no guilt, no FOMO — the app should feel calm and supportive.
- Emoji-first iconography (Q3 decision).
- Never hardcode colors or layout values — tokens only.
- Each plan step must ship to device before starting the next.

## Releasing

### Pre-release setup TODO (do once before first tag push)

- [ ] Create **public** repo `rzvntdr/spiritlog-releases` on GitHub (empty is fine — optional README).
- [ ] Generate a fine-grained PAT at <https://github.com/settings/tokens?type=beta>, scoped to that repo only, with permission **Contents: Read & write**.
- [ ] In the private repo: `Settings → Secrets and variables → Actions → New repository secret` → name `PUBLIC_RELEASES_TOKEN`, paste PAT.

Until those three are done, tag pushes still build the APK (private artifact) but the public-release step fails. The workflow goes red; re-push the tag after setup is complete.

### End-of-task checklist (every meaningful change)

After finishing a non-trivial change, before considering the task closed, ask yourself:

1. **Does this deserve a CHANGELOG entry?** If yes, add a bullet under `## [Unreleased]` in `CHANGELOG.md`. Skip for: pure refactors with no user-visible delta, internal log additions, comment-only changes, build-script tweaks that don't affect output.
2. **Does this deserve a version bump?** If yes, propose one to the user (don't bump silently) with a recommended level:
   - `patch` (0.2.0 → 0.2.1): bug fixes, small UX polish, copy changes
   - `minor` (0.2.0 → 0.3.0): new features, visible UI additions
   - `major` (0.2.0 → 1.0.0): breaking changes or "we're ready" moments

State the proposal as: "This change is _X_ — suggest bumping to _Y_, or keep as-is?" Don't bump without explicit confirmation.

### Cutting a release

**Version lives only in `package.json`.** Everything else derives from it automatically:
- `app.config.js` (replaces `app.json`) reads `pkg.version` at JS build time.
- `android/app/build.gradle` parses `package.json` and sets `versionName = pkg.version`, `versionCode = MAJOR*10000 + MINOR*100 + PATCH` (always monotonic).
- `SettingsScreen` imports `package.json` directly.

To cut a release:
1. Bump `version` in `package.json` only.
2. Add a `## [x.y.z] — YYYY-MM-DD` section to `CHANGELOG.md` (entries above the `[Unreleased]` link). Use Keep-a-Changelog headings: Added / Changed / Fixed / Removed / Technical.
3. Commit on `main`.
4. Tag `vX.Y.Z` and push the tag: `git tag v0.2.0 && git push origin v0.2.0`.
5. CI (`.github/workflows/build-android.yml`) builds the APK, extracts the matching section from `CHANGELOG.md` as release notes, and publishes a GitHub Release on **`rzvntdr/spiritlog-releases`** (the public mirror). The private repo stays private; users download the APK from the public releases page.

### One-time CI setup

1. Create a **public** repo `rzvntdr/spiritlog-releases` (empty is fine — a README is nice).
2. Create a fine-grained PAT scoped to that public repo with **Contents: Read & write** permission. ([github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta))
3. In the private repo, add it as secret `PUBLIC_RELEASES_TOKEN` (`Settings → Secrets and variables → Actions → New repository secret`).

Without that secret, tag pushes still build the APK as a private artifact — only the public-release step is skipped.

### Signing (sideload now, Play Store later)

Release APKs are currently signed with the checked-in `android/app/debug.keystore` (`signingConfig signingConfigs.debug` in `build.gradle`). That's fine for direct sideload distribution — the same key is used every build, so users can update in-place. **Google Play will not accept debug-signed APKs**, so before submitting to Play, generate a real keystore, store it as a base64-encoded GitHub secret, and add a release signing config + a CI step that decodes it.
