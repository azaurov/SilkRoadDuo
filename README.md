# Silk Road Duo

A mobile application built with React Native and Expo, designed to provide a seamless experience on both iOS and Android platforms.

## 📱 About

**Silk Road Duo** is a cross-platform mobile application that leverages modern React Native technology. The app is optimized for portrait orientation and provides a light user interface style for comfortable viewing.

## 🌍 Supported Languages

This app teaches **7 ancient and classical languages** from the Silk Road:

| Language | Native Script | Emoji | Description |
|----------|---------------|-------|-------------|
| **Bukharian** | Бухорӣ | 🕌 | Judeo-Tajik · Silk Road Jews of Central Asia |
| **Farsi** | فارسی | 🦁 | Persian · Language of Hafez & Rumi |
| **Sogdian** | Sogdī | 🐪 | Ancient · Voice of the Silk Road |
| **Arabic** | العربية | 🌙 | Classical · Language of trade & scholarship |
| **Uzbek** | O'zbek | 🌟 | Turkic · Heart of the ancient Silk Road |
| **Hebrew** | עברית | ✡️ | Semitic · Sacred language of Torah & Jewish tradition |
| **Aramaic** | ܐܪܡܝܐ | 🏺 | Ancient · Lingua franca of the Near East |

## 🎓 Learning Topics

Each language includes lessons on the following topics:

- **👋 Greetings** - Hello, goodbye & pleasantries
- **🍎 Food & Market** - Fruits, spices & market talk
- **🔢 Numbers** - Count from 1 to 100
- **👨‍👩‍👧 Family** - Parents, siblings & relatives
- **🗺️ Travel** - Roads, cities & directions
- **🌿 Nature** - Animals, plants & landscape
- **🎨 Colors** - The full color spectrum
- **📅 Time & Days** - Days, months & telling time

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- Expo CLI installed globally (`npm install -g expo-cli`)
- iOS Simulator (for macOS) or Android Emulator/Device

### Installation

1. Clone the repository:
```bash
git clone https://github.com/azaurov/SilkRoadDuo.git
cd SilkRoadDuo
```

2. Install dependencies:
```bash
npm install
```

### Running the App

#### Development Mode
```bash
npm start
```

#### Android
```bash
npm run android
```

#### iOS (macOS only)
```bash
npm run ios
```

## 📋 Project Structure

- **App.js** - Main application component with all screens and logic
- **app.json** - Expo configuration file
- **package.json** - Project dependencies and scripts
- **babel.config.js** - Babel configuration
- **eas.json** - EAS (Expo Application Services) configuration

## 💻 Programming Languages

This project is built entirely with:

| Language | Usage |
|----------|-------|
| **JavaScript** | 100% |

The entire codebase is written in JavaScript, utilizing modern ES6+ syntax with React and React Native.

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) 0.81.5
- **Build Tool**: [Expo](https://expo.dev/) ~54.0.0
- **Language**: JavaScript
- **React Version**: 19.1.0

### Key Dependencies

- `react-native-safe-area-context` - For handling safe area on notched devices
- `expo-status-bar` - For controlling the status bar appearance

### Dev Dependencies

- `@babel/core` - JavaScript compiler
- `babel-preset-expo` - Babel preset optimized for Expo

## 🎮 Features

- **AI-Powered Lessons**: Content generated dynamically using Claude AI
- **Multiple Exercise Types**:
  - Multiple Choice Questions (MCQ)
  - Fill in the Blank
  - Matching Pairs
  - Word Arrangement
  
- **Progress Tracking**:
  - XP (Experience Points) system
  - Daily streaks
  - Achievement unlocks
  - Per-language progress tracking

- **Rich Cultural Context**:
  - Daily Silk Road facts
  - Historical and cultural information
  - Proper transliteration for ancient languages

- **Gamification**:
  - 3-heart lives system per lesson
  - 8 exercises per lesson
  - Perfect lesson bonuses
  - 10+ achievements to unlock

## 📦 Build Information

- **iOS Bundle Identifier**: `com.silkroadduo.app`
- **Android Package**: `com.silkroadduo.app`
- **Version**: 1.0.0
- **Architecture**: New Architecture Enabled

## 📁 Project Details

- **App Slug**: `silk-road-duo`
- **Orientation**: Portrait
- **UI Style**: Light
- **Tablet Support**: iOS tablet support is disabled

## 🔧 Configuration

The project uses Expo Application Services (EAS) for building and deploying. Configuration can be found in `eas.json`.

### EAS Project ID
```
1b16f9e7-520c-448f-8e42-0e1ee3456dd9
```

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the development server |
| `npm run android` | Run on Android emulator/device |
| `npm run ios` | Run on iOS simulator (macOS only) |

## 🏆 Achievements

Unlock achievements as you progress:

- **First Steps** 👣 - Complete your first lesson
- **On Fire** 🔥 - Reach a 3-day streak
- **Week Warrior** ⚔️ - Reach a 7-day streak
- **XP Collector** ⚡ - Earn 100 total XP
- **XP Master** 💎 - Earn 500 total XP
- **Trilingual** 🗣️ - Try all 3 core languages
- **Polyglot** 🌐 - Try all 7 languages
- **Perfectionist** 🏅 - Complete 10 perfect lessons
- **Dedicated** 📚 - Complete 5 lessons
- **Scholar** 🎓 - Complete 25 lessons

## 📚 Learning Statistics

Each lesson provides:
- **8 exercises** mixing different question types
- **10 XP** per correct answer
- **Hearts system** - 3 lives per lesson
- **Fun facts** - Cultural insights after each exercise

## 🗂️ Important Notes

- The `.expo` folder contains device and server configuration specific to your machine and should not be committed
- The `.expo` folder is already added to `.gitignore`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private. For licensing information, please contact the repository owner.

## 👤 Author

[azaurov](https://github.com/azaurov)

---

**Happy coding and learning! 🎉**
