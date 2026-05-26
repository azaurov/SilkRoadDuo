# Silk Road Duo

A modern mobile app built with React Native and Expo, designed for language learning through rich, dynamic lessons focused on the cultures and languages of the Silk Road.

---

## 📱 Overview

**Silk Road Duo** blends history and technology—the app leverages Expo SDK 56, React Native 0.81.5, and advanced AI (Anthropic Claude via Groq) to deliver dynamic lessons in **7 ancient and classical languages**. Everything runs from a unified App.js file, and the interface is portrait-only, with a clean and light design. All logic, UI, and navigation exist in a single file for rapid prototyping and simplicity.

---

## 🚀 Quick Start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm (bundled with Node.js)
- [Expo CLI](https://docs.expo.dev/get-started/installation/):  
  `npm install -g expo-cli`
- iOS Simulator (macOS) or Android emulator/device

### 2. Clone & Setup

```bash
git clone https://github.com/azaurov/SilkRoadDuo.git
cd SilkRoadDuo
npm install
```

### 3. Obtain a Groq API Key (Required)

**The app fetches real-time lessons from Anthropic Claude (Groq Llama) for each user. You must add your own [Groq API key](https://console.groq.com/keys) for the app to work:**

1. Sign up or log in at [https://console.groq.com/keys](https://console.groq.com/keys)
2. Create an API key (free for development)
3. Copy the key (beginning with `gsk_...`)
4. Open `App.js` and paste your key in the `GROQ_API_KEY` placeholder.
   - **Tip:** For local dev, you can just put the key in a constant. For production, use environment secrets (not committed).

> **Without a Groq API key, lessons cannot be generated.**

---

## 🏗️ Project Structure

- **All code lives in `App.js`:** All screens, navigation, UI, lesson fetching, progress, achievements, and styling.
    - Navigation: Simple state logic via `{screen === 'lesson' && <LessonScreen/>}`.
    - All styles are from one `StyleSheet.create({ ... })` block.
    - Each exercise type is a React component in the same file.
    - No external routers, folders, or extra architecture.

- **Configs:**  
  • `app.json` – Expo project config  
  • `eas.json` – Expo Application Services (build profiles)  
  • `package.json` – Scripts and dependencies  
  • `babel.config.js` – Babel config

- **No linter/test setup or device-specific code.** Simple and fast for hacking.

---

## 🛠️ Key Technologies

- **Framework:** React Native 0.81.5
- **Build/Dev:** Expo SDK 56 (profile: ~54.0.0)
- **Language:** JavaScript (ES6+ only, no TypeScript)
- **AI:** [Anthropic Claude](https://www.anthropic.com/) via [Groq Cloud](https://console.groq.com/)
- **Expo Libraries:**  
  - `react-native-safe-area-context`  
  - `expo-status-bar`
- **DevTools:**  
  - `@babel/core`, `babel-preset-expo`

---

## 🌍 Languages Taught

| Language      | Native Script | Emoji | Description                                |
|---------------|---------------|-------|--------------------------------------------|
| **Bukharian** | Бухорӣ        | 🕌    | Judeo-Tajik · Silk Road Jews of Central Asia |
| **Farsi**     | فارسی         | 🦁    | Persian · Language of Hafez & Rumi           |
| **Sogdian**   | Sogdī         | 🐪    | Ancient · Voice of the Silk Road             |
| **Arabic**    | العربية       | 🌙    | Classical · Trade & scholarship language     |
| **Uzbek**     | O'zbek        | 🌟    | Turkic · Heart of the Silk Road              |
| **Hebrew**    | עברית         | ✡️    | Semitic · Language of Torah & tradition      |
| **Aramaic**   | ܐܪܡܝܐ        | 🏺    | Ancient · Lingua franca of the Near East     |

---

## 🎓 Topics Covered

For each language, topics include:

- 👋 Greetings  
- 🍎 Food & Market  
- 🔢 Numbers  
- 👨‍👩‍👧 Family  
- 🗺️ Travel  
- 🌿 Nature  
- 🎨 Colors  
- 📅 Time & Days

---

## 🎮 Features

- **AI-Powered Lessons:**  
  Dynamic lesson content from Claude via Groq—tailored each time you start a lesson!
- **Multiple Exercise Types:**  
    - Multiple Choice (MCQ)
    - Fill in the Blank
    - Matching Pairs
    - Word Arrangement
- **Gamification:**  
    - 3-heart lives per lesson  
    - 8 random exercises per lesson  
    - XP, daily streak, “perfect” bonuses  
    - 10+ unlockable achievements
- **Cultural Context:**  
    - Fun facts after each lesson/exercise  
    - Proper transliteration for ancient scripts  
    - Historical/cultural tidbits each day
- **Statistics & Progress:**  
    - XP tracks per language  
    - Daily streaks, lesson stats  
    - Overview screen for milestones

---

## 🚦 Running the App

| Command             | Description                                   |
|---------------------|------------------------------------------------|
| `npm start`         | Expo Dev Server (scan QR with Expo Go)         |
| `npm run android`   | Run on Android device or emulator              |
| `npm run ios`       | Run on iOS simulator (macOS only)              |

> All logic is in `App.js`—just run and play!

### Building (with EAS)

- **Preview (APK sideload):**
  ```bash
  npx eas build -p android --profile preview
  ```
- **Production (Play Store-ready AAB):**
  ```bash
  npx eas build -p android --profile production
  ```
- **View recent builds:**
  ```bash
  npx eas build:list --limit 5
  ```
- Local builds are not supported on Windows—use Expo’s cloud build service!

---

## ⚙️ Configuration & Environment

- **App slug:** `silk-road-duo` (in `app.json`)
- **iOS Bundle:** `com.silkroadduo.app`
- **Android Package:** `com.silkroadduo.app`
- **Version:** 1.0.0
- **EAS project ID:** `1b16f9e7-520c-448f-8e42-0e1ee3456dd9`
- **New architecture enabled**
- **Tablet/iPad support:** Disabled (portrait, phone-optimized)
- **UI Style:** Light only

---

## 🧩 Design Notes

- The `.expo/` folder is config/cache and **not committed** (already git-ignored).
- No external state management or complex navigation (single-file patterns).

---

## 🏆 Achievements

Unlockable as you progress:

- **First Steps** 👣 - Finish your first lesson  
- **On Fire** 🔥 - 3-day streak  
- **Week Warrior** ⚔️ - 7-day streak  
- **XP Collector** ⚡ - 100 total XP  
- **XP Master** 💎 - 500 total XP  
- **Trilingual** 🗣️ - Try 3 core languages  
- **Polyglot** 🌐 - Try all 7 languages  
- **Perfectionist** 🏅 - 10 perfect lessons  
- **Dedicated** 📚 - 5 lessons  
- **Scholar** 🎓 - 25 lessons

---

## 📚 Learning System Details

- Each lesson: 8 mixed-type, auto-generated exercises
- 10 XP per correct answer
- “Hearts” system—3 lives per lesson
- Fun or cultural fact after each exercise

---

## 🧑‍💻 Contributing

Pull Requests are welcome! All code is in `App.js` for now—submit improvements, bug fixes, or new features via PRs.

---

## 📄 License

This project is **private**. For licensing, contact [azaurov](https://github.com/azaurov).

---

## 👤 Author

[azaurov](https://github.com/azaurov)

---

**Happy coding and learning! 🎉**
