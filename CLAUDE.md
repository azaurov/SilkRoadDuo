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
- EAS free plan build limit resets July 1. When exhausted, use local builds (see below).

### Local Android Builds

Local builds require Java 17 (Java 25 causes NDK failures) and the EAS keystore:

```bash
# 1. After every expo prebuild --clean, restore signing files:
echo "sdk.dir=/home/azaurov/Android/Sdk" > android/local.properties
# Restore android/keystore.properties and android/app/release.keystore from secure storage
# Re-apply signing config to android/app/build.gradle (keystore loader block + signingConfigs.release)
# Re-add keystore entries to android/.gitignore

# 2. Build
cd android && JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew app:assembleRelease -x lint -x test

# 3. Install via wireless ADB
~/Android/Sdk/platform-tools/adb -s <ip>:<port> install -r app/build/outputs/apk/release/app-release.apk
```

`expo prebuild --clean` wipes the entire `android/` directory — signing config, keystore files, local.properties, and .gitignore entries must all be re-applied after every prebuild.

### Wireless ADB pairing

```bash
# Pair (one-time per session, code as argument not stdin)
~/Android/Sdk/platform-tools/adb pair <ip>:<pairing-port> <6-digit-code>
# Connect
~/Android/Sdk/platform-tools/adb connect <ip>:<debug-port>
```

On the phone: Developer Options → Wireless debugging → Pair device with pairing code.

### Installing a preview APK on a device

Preferred method for EAS builds: open the APK artifact URL on the device browser.
The build detail page is at `https://expo.dev/accounts/schepsterwasp/projects/silk-road-duo/builds/<build-id>`.

For local builds: use `adb install -r` via wireless ADB (see above).

### Sentinel tests

```bash
python3 scripts/sentinel.py   # runs 3 smoke-test loops on the emulator
```

There is no other test suite or linter configured.

### SDK / dependency notes

The project uses **Expo SDK 56**. Always use `npx expo install <package>` (not `npm install`) so Expo picks the SDK-compatible version. Run `npx expo-doctor` after dependency changes.

- **Audio**: uses `expo-audio@~56.0.12` (NOT `expo-av` — both 15.x and 16.x have ABI incompatibilities with RN 0.85.3 in local builds)
- `expo-av` must not be re-added; `expo-audio` is the SDK 56 replacement

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

`fetchLesson(langId, topicId)` calls whichever backend is active. It sends a structured prompt via `buildPrompt()` expecting a raw JSON array of 20 exercise objects. All backends use the OpenAI-compatible chat completions format; `max_tokens` is set to 8000 to avoid truncation on verbose scripts (Arabic, Hebrew, Farsi).

Auto-fallback chain on 429 rate limit: **Groq → OpenRouter → Gemini**.

After parsing, the response is normalized:
- Sogdian exercises have `word_native` stripped (ancient script cannot render on Android HarfBuzz)
- MCQ/fillblank `correct` fields are normalized to exactly match the option string: NFC unicode normalization + BiDi/invisible character stripping + case/whitespace folding. This is critical for RTL languages (Hebrew, Arabic, Farsi) where AI responses may include invisible control characters.
- JSON truncation recovery: if the array is cut off mid-stream, incomplete trailing elements are dropped

### Exercise components

Each exercise type is a self-contained component receiving `ex` (exercise object), `lang` (language config), and an `onAnswer(correct, answer)` callback:

| Component | Exercise type | Answer trigger |
|---|---|---|
| `ExerciseMCQ` | `mcq` | tap an option |
| `ExerciseFillBlank` | `fillblank` | tap an option |
| `ExerciseMatch` | `match` | calls `onComplete` when all pairs matched |
| `ExerciseWordArrange` | `wordarrange` | tap CHECK after placing ≥ correct_order.length words |

CHECK in `ExerciseWordArrange` appears when `placed.length >= ex.correct_order.length`. The bank may contain distractor words not needed for the correct answer — the user should place only the words that form the sentence.

`LessonScreen` sequences exercises by index, tracks hearts (lives: `HEARTS_MAX = 3`) and XP (`XP_PER_CORRECT = 10`), and shows a `FeedbackBar` overlay after each answer.

### TTS (Text-to-Speech)

All exercise types show a 🔊 button. On app start, a retry loop calls `Speech.getAvailableVoicesAsync()` until voices load (Android TTS engine initializes asynchronously). The `availableTtsLocales` set is populated from returned voices; only locales present in this set use native script TTS — others fall back to romanized text.

`SPEECH_LOCALE` map: `{ farsi: "fa-IR", arabic: "ar-SA", uzbek: "uz-UZ", hebrew: "he-IL" }`.

Android TTS silently falls back to the default locale (English) when a requested locale isn't installed — it does not throw errors. This produces inaudible output for RTL scripts if the locale isn't in `availableTtsLocales`.

### Background music

The Prince of Persia theme (`assets/prince_of_persia.mp3`) plays on app launch via `useAudioPlayer` from `expo-audio`. It loops at 0.5 volume. `stopTheme()` / `resumeTheme()` pause/resume it when entering/leaving lesson screens.

### Language config

`LANGS` array contains 7 languages: Bukharian, Farsi, Sogdian, Arabic, Uzbek, Hebrew, Aramaic. Each entry has `id`, `name`, `native`, `emoji`, and three color values (`color`, `shadow`, `pale`) used pervasively for per-language theming.

Sogdian uses romanized transliteration only — both `word` and `word_native` are romanized in prompts, and `word_native` is deleted from AI responses.

### Fonts

Two custom fonts are bundled in `assets/fonts/` and loaded via `useFonts` from `expo-font`. The app returns `null` until fonts load.

### Achievements

`ACHIEVEMENTS` array of 10 entries; each has a `check(stats)` predicate. Achievement unlock detection runs in `handleLessonComplete` by diffing before/after stats.

All styles are in a single `StyleSheet.create({})` block at the bottom of `App.js`.
