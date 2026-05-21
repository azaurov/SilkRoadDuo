# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm start          # start Expo dev server (scan QR with Expo Go app)
npm run android    # launch on Android emulator/device
npm run ios        # launch on iOS simulator (macOS only)
```

### EAS Builds

```bash
npx eas build -p android --profile preview     # installable APK for sideloading
npx eas build -p android --profile production  # .aab for Play Store submission
npx eas build:list --limit 5                   # check build status
```

- **preview** profile: `buildType: "apk"`, `distribution: "internal"` — use this for test installs on devices
- **production** profile: outputs `.aab`, auto-increments version code — use for Play Store
- Local builds (`--local`) are not supported on Windows; all builds run on Expo's cloud servers

### Installing a preview APK on a device

`adb` is not on PATH on this machine, so USB install via `adb install` does not work directly.
Preferred method: open the APK artifact URL from the build in the Android device's browser and tap to download and install.
The build detail page is at `https://expo.dev/accounts/schepsterwasp/projects/silk-road-duo/builds/<build-id>`.

There is no test suite and no linter configured.

### SDK / dependency notes

The project uses **Expo SDK 56**. If adding new packages, always use `npx expo install <package>` (not `npm install`) so Expo picks the SDK-compatible version. Run `npx expo-doctor` to verify compatibility after any dependency changes.

## Architecture

The entire app lives in a single file: **`App.js`**. There are no subdirectories, routers, or state-management libraries.

### Screen flow

Navigation is implemented as a `screen` string in root state, rendered via `{screen === "x" && <XScreen />}` conditionals:

```
home → topic → loading → lesson → result
home → achievements
```

Root state in `App` (the only stateful owner):
- `screen` — which screen is visible
- `activeLang` / `activeTopic` — selected language object and topic id
- `exercises` — array of exercise objects fetched from Claude API
- `stats` — cumulative user progress (XP, streak, lessons, per-language XP, perfectLessons)
- `resultData` — summary passed to ResultScreen after a lesson

### AI lesson generation

`fetchLesson(langId, topicId)` calls the Anthropic Messages API directly from the client (no backend). It sends a structured prompt via `buildPrompt()` and expects a raw JSON array of 8 exercise objects in one of four types: `mcq`, `match`, `fillblank`, `wordarrange`.

The API key is hardcoded in `App.js` at the top of the file (`const API_KEY = ...`). This is intentional for the prototype but should be moved to environment config before any production deployment.

The model used is `llama-3.3-70b-versatile` via Groq (OpenAI-compatible API at `https://api.groq.com/openai/v1/chat/completions`). Response text is at `d.choices[0].message.content`.

### Exercise components

Each exercise type is a self-contained component that receives `ex` (the exercise object), `lang` (the language config), and an `onAnswer(correct, answer)` callback:

| Component | Exercise type | Answer trigger |
|---|---|---|
| `ExerciseMCQ` | `mcq` | tap an option |
| `ExerciseFillBlank` | `fillblank` | tap an option |
| `ExerciseMatch` | `match` | calls `onComplete` when all pairs matched |
| `ExerciseWordArrange` | `wordarrange` | tap CHECK after placing all words |

`LessonScreen` sequences exercises by index, tracks hearts (lives) and XP, and shows a `FeedbackBar` overlay after each answer.

### Data shape

Language objects (`LANGS` array) carry id, display name, native script, emoji, and three color values (`color`, `shadow`, `pale`) used pervasively for theming.

Stats are a flat object; per-language XP is stored as `stats[langId + "_xp"]`. Achievement checks run against this stats object via predicate functions in the `ACHIEVEMENTS` array.

All styles are in a single `StyleSheet.create({})` block at the bottom of `App.js`.
