# SpiritLog

A meditation and mindfulness tracking app built with React Native and Expo.

Cross-platform rebuild of the original native Android [SpiritLog](https://github.com/razva/spiritlog) app.

## Tech Stack

- **Framework:** React Native 0.81 + Expo SDK 54
- **Navigation:** React Navigation 7 (native stack)
- **Styling:** NativeWind (Tailwind CSS)
- **State:** Zustand
- **Database:** expo-sqlite with migrations
- **Animations:** Reanimated 4
- **Language:** TypeScript

## Project Structure

```
src/
  app/           # App entry, providers, navigation
  components/    # UI components by feature
    backup/      # Backup & restore
    common/      # Shared components
    journey/     # Journey / history view
    notes/       # Session notes
    preset/      # Timer presets
    timer/       # Meditation timer
  db/            # Database layer & migrations
  hooks/         # Custom React hooks
  screens/       # Screen components
  services/      # Business logic services
  stores/        # Zustand stores
  theme/         # Theme tokens, context, palettes
  types/         # TypeScript type definitions
  utils/         # Utility functions
```

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Versioning

This project uses [Semantic Versioning](https://semver.org/). Milestones are tracked with git tags. Run `git log --oneline` or check GitHub Releases for the change history.
