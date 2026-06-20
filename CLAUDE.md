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

## Environment Variables

Copy `.env.example` (or set these in `.env`) before running locally:

```
EXPO_PUBLIC_GROQ_API_KEY=...
EXPO_PUBLIC_GEMINI_API_KEY=...
EXPO_PUBLIC_OPENROUTER_API_KEY=...
EXPO_PUBLIC_LLM_BACKEND=openrouter   # openrouter | groq | gemini | local
```

`EXPO_PUBLIC_LLM_BACKEND` controls which AI provider is used at runtime. Defaults to `openrouter`. The `local` backend hits Ollama at `http://10.0.2.2:11434` (Android emulator host alias).

## Architecture

The entire app lives in a single file: **`App.js`**. There are no subdirectories, routers, or state-management libraries.

### Screen flow

Navigation is a `screen` string in root state, rendered via `{screen === "x" && <XScreen />}` conditionals:

```
home → topic → loading → lesson → result
home → achievements
```

Root state in `App` (the only stateful owner):
- `screen` — which screen is visible
- `activeLang` / `activeTopic` — selected language object and topic id
- `exercises` — array of exercise objects fetched from the AI backend
- `stats` — cumulative user progress (XP, streak, lessons, per-language XP, perfectLessons)
- `resultData` — summary passed to ResultScreen after a lesson

Stats are never persisted to storage — they reset on app restart. Per-language XP is stored as `stats[langId + "_xp"]`.

### AI lesson generation

`fetchLesson(langId, topicId)` calls whichever backend is active (set via `EXPO_PUBLIC_LLM_BACKEND`). It sends a structured prompt via `buildPrompt()` expecting a raw JSON array of exactly 8 exercise objects in this fixed order: `mcq, mcq, match, mcq, fillblank, mcq, wordarrange, mcq`.

All backends use the OpenAI-compatible chat completions format; response text is at `d.choices[0].message.content`. After parsing, the response is normalized:
- Sogdian exercises have `word_native` stripped (ancient script cannot render on Android HarfBuzz)
- MCQ/fillblank `correct` fields are case/whitespace-normalized to exactly match the corresponding option string

### Exercise components

Each exercise type is a self-contained component receiving `ex` (exercise object), `lang` (language config), and an `onAnswer(correct, answer)` callback:

| Component | Exercise type | Answer trigger |
|---|---|---|
| `ExerciseMCQ` | `mcq` | tap an option |
| `ExerciseFillBlank` | `fillblank` | tap an option |
| `ExerciseMatch` | `match` | calls `onComplete` when all pairs matched |
| `ExerciseWordArrange` | `wordarrange` | tap CHECK after placing all words |

`LessonScreen` sequences exercises by index, tracks hearts (lives: `HEARTS_MAX = 3`) and XP (`XP_PER_CORRECT = 10`), and shows a `FeedbackBar` overlay after each answer.

### Language config

`LANGS` array contains 7 languages: Bukharian, Farsi, Sogdian, Arabic, Uzbek, Hebrew, Aramaic. Each entry has `id`, `name`, `native`, `emoji`, and three color values (`color`, `shadow`, `pale`) used pervasively for per-language theming.

Sogdian uses romanized transliteration only — both `word` and `word_native` are romanized in prompts, and `word_native` is deleted from AI responses. The `sogdianFont()` helper picks between two bundled Noto fonts (`NotoSansSogdian` / `NotoSansOldUyghur`) based on Unicode codepoint range, but these fonts are only used defensively — Sogdian content is romanized.

### Fonts

Two custom fonts are bundled in `assets/fonts/` and loaded via `useFonts` from `expo-font`. The app returns `null` until fonts load (no splash screen beyond the OS default).

### Achievements

`ACHIEVEMENTS` array of 10 entries; each has a `check(stats)` predicate. Achievement unlock detection runs in `handleLessonComplete` by diffing before/after stats.

All styles are in a single `StyleSheet.create({})` block at the bottom of `App.js`.
