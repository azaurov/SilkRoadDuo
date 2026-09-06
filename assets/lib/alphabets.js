// Curated (not AI-generated) alphabet reference data — one entry per letter:
//   letter      — the native letterform (isolated form where scripts have positional variants)
//   name        — the letter's own name (romanized)
//   sound       — plain-language description of the sound
//   englishLike — the closest English letter/sound, as a quick mnemonic
//
// This is standard reference linguistics, not app-generated lesson content —
// still worth a native/heritage-speaker spot check before treating as gospel,
// same caveat as everything else in this app that touches script accuracy
// (see the Aramaic word_native fix in fetchLesson()).

export const ALPHABETS = {
  uzbek: [
    { letter: "A a",   name: "a",   sound: "open, like 'a' in \"father\"",              englishLike: "a — father" },
    { letter: "B b",   name: "be",  sound: "voiced lip stop",                           englishLike: "b — bed" },
    { letter: "D d",   name: "de",  sound: "voiced tongue-tip stop",                    englishLike: "d — dog" },
    { letter: "E e",   name: "e",   sound: "mid front vowel",                           englishLike: "e — bed" },
    { letter: "F f",   name: "ef",  sound: "voiceless lip fricative",                   englishLike: "f — fish" },
    { letter: "G g",   name: "ge",  sound: "voiced back stop",                          englishLike: "g — go" },
    { letter: "G' g'", name: "g'e", sound: "voiced uvular fricative, further back than g", englishLike: "like French 'r' in \"Paris\"" },
    { letter: "H h",   name: "he",  sound: "voiceless glottal fricative",               englishLike: "h — hat" },
    { letter: "I i",   name: "i",   sound: "close front vowel",                         englishLike: "i — machine" },
    { letter: "J j",   name: "je",  sound: "voiced postalveolar affricate",             englishLike: "j — jam" },
    { letter: "K k",   name: "ka",  sound: "voiceless back stop",                       englishLike: "k — kite" },
    { letter: "L l",   name: "el",  sound: "alveolar lateral",                          englishLike: "l — lamp" },
    { letter: "M m",   name: "em",  sound: "bilabial nasal",                            englishLike: "m — mom" },
    { letter: "N n",   name: "en",  sound: "alveolar nasal",                            englishLike: "n — no" },
    { letter: "O o",   name: "o",   sound: "open back rounded vowel",                   englishLike: "o — hot (British)" },
    { letter: "O' o'", name: "o'e", sound: "mid rounded vowel, between 'o' and 'u'",     englishLike: "like 'aw' in \"saw\"" },
    { letter: "P p",   name: "pe",  sound: "voiceless lip stop",                        englishLike: "p — pen" },
    { letter: "Q q",   name: "qa",  sound: "voiceless uvular stop, deeper than 'k'",    englishLike: "k, but further back in the throat" },
    { letter: "R r",   name: "er",  sound: "alveolar trill/tap",                        englishLike: "rolled r, like Spanish 'r'" },
    { letter: "S s",   name: "es",  sound: "voiceless alveolar fricative",              englishLike: "s — sun" },
    { letter: "Sh sh", name: "sha", sound: "voiceless postalveolar fricative",          englishLike: "sh — shoe" },
    { letter: "T t",   name: "te",  sound: "voiceless alveolar stop",                   englishLike: "t — top" },
    { letter: "U u",   name: "u",   sound: "close back rounded vowel",                  englishLike: "u — flute" },
    { letter: "V v",   name: "ve",  sound: "voiced lip-teeth fricative",                englishLike: "v — van" },
    { letter: "X x",   name: "xa",  sound: "voiceless velar fricative",                 englishLike: "ch — Scottish \"loch\"" },
    { letter: "Y y",   name: "ye",  sound: "palatal glide",                             englishLike: "y — yes" },
    { letter: "Z z",   name: "ze",  sound: "voiced alveolar fricative",                 englishLike: "z — zoo" },
    { letter: "Ch ch", name: "che", sound: "voiceless postalveolar affricate",          englishLike: "ch — chair" },
    { letter: "Ng ng", name: "nge", sound: "velar nasal",                               englishLike: "ng — sing" },
  ],

  hebrew: [
    { letter: "א", name: "alef",  sound: "silent (glottal stop) — carries whatever vowel is marked", englishLike: "closest to the catch in \"uh-oh\"" },
    { letter: "ב", name: "bet",   sound: "b, or v when marked without a dot",           englishLike: "b — boy" },
    { letter: "ג", name: "gimel", sound: "hard g",                                      englishLike: "g — go" },
    { letter: "ד", name: "dalet", sound: "d",                                           englishLike: "d — dog" },
    { letter: "ה", name: "he",    sound: "h, often silent at word end",                 englishLike: "h — hat" },
    { letter: "ו", name: "vav",   sound: "v, or the vowel 'oo'/'o'",                    englishLike: "v — van" },
    { letter: "ז", name: "zayin", sound: "z",                                           englishLike: "z — zoo" },
    { letter: "ח", name: "het",   sound: "raspy throat fricative",                      englishLike: "ch — Scottish \"loch\"" },
    { letter: "ט", name: "tet",   sound: "emphatic t",                                  englishLike: "t — top" },
    { letter: "י", name: "yod",   sound: "y, or the vowel 'ee'",                        englishLike: "y — yes" },
    { letter: "כ", name: "kaf",   sound: "k, or 'kh' when marked without a dot",        englishLike: "k — kite" },
    { letter: "ל", name: "lamed", sound: "l",                                           englishLike: "l — lamp" },
    { letter: "מ", name: "mem",   sound: "m",                                           englishLike: "m — mom" },
    { letter: "נ", name: "nun",   sound: "n",                                           englishLike: "n — no" },
    { letter: "ס", name: "samekh",sound: "s",                                           englishLike: "s — sun" },
    { letter: "ע", name: "ayin",  sound: "deep throat catch, often silent in modern speech", englishLike: "no true English equivalent" },
    { letter: "פ", name: "pe",    sound: "p, or f when marked without a dot",           englishLike: "p — pen" },
    { letter: "צ", name: "tsadi", sound: "ts",                                          englishLike: "ts — cats" },
    { letter: "ק", name: "qof",   sound: "k, further back in the throat",               englishLike: "k — kite" },
    { letter: "ר", name: "resh",  sound: "guttural r",                                  englishLike: "rolled/throaty r, like French 'r'" },
    { letter: "ש", name: "shin",  sound: "sh, or s when marked on the left",            englishLike: "sh — shoe" },
    { letter: "ת", name: "tav",   sound: "t",                                           englishLike: "t — top" },
  ],

  arabic: [
    { letter: "ا", name: "alif",  sound: "long 'aa' vowel, or a glottal stop carrier",  englishLike: "a — father" },
    { letter: "ب", name: "ba",    sound: "b",                                           englishLike: "b — boy" },
    { letter: "ت", name: "ta",    sound: "t",                                           englishLike: "t — top" },
    { letter: "ث", name: "tha",   sound: "voiceless 'th'",                              englishLike: "th — think" },
    { letter: "ج", name: "jim",   sound: "j",                                           englishLike: "j — jam" },
    { letter: "ح", name: "ha",    sound: "breathy h from deep in the throat",           englishLike: "stronger than English 'h'" },
    { letter: "خ", name: "kha",   sound: "raspy throat fricative",                      englishLike: "ch — Scottish \"loch\"" },
    { letter: "د", name: "dal",   sound: "d",                                           englishLike: "d — dog" },
    { letter: "ذ", name: "dhal",  sound: "voiced 'th'",                                 englishLike: "th — this" },
    { letter: "ر", name: "ra",    sound: "rolled r",                                    englishLike: "rolled r, like Spanish 'r'" },
    { letter: "ز", name: "zay",   sound: "z",                                           englishLike: "z — zoo" },
    { letter: "س", name: "sin",   sound: "s",                                           englishLike: "s — sun" },
    { letter: "ش", name: "shin",  sound: "sh",                                          englishLike: "sh — shoe" },
    { letter: "ص", name: "sad",   sound: "emphatic s",                                  englishLike: "s — sun, said more forcefully" },
    { letter: "ض", name: "dad",   sound: "emphatic d",                                  englishLike: "d — dog, said more forcefully" },
    { letter: "ط", name: "ta (emphatic)", sound: "emphatic t",                          englishLike: "t — top, said more forcefully" },
    { letter: "ظ", name: "za (emphatic)", sound: "emphatic voiced 'th'",                englishLike: "th — this, said more forcefully" },
    { letter: "ع", name: "ayn",   sound: "deep throat catch",                           englishLike: "no true English equivalent" },
    { letter: "غ", name: "ghayn", sound: "voiced uvular fricative",                     englishLike: "like French 'r' in \"Paris\"" },
    { letter: "ف", name: "fa",    sound: "f",                                           englishLike: "f — fish" },
    { letter: "ق", name: "qaf",   sound: "k, deep in the throat",                       englishLike: "k — kite, said further back" },
    { letter: "ك", name: "kaf",   sound: "k",                                           englishLike: "k — kite" },
    { letter: "ل", name: "lam",   sound: "l",                                           englishLike: "l — lamp" },
    { letter: "م", name: "mim",   sound: "m",                                           englishLike: "m — mom" },
    { letter: "ن", name: "nun",   sound: "n",                                           englishLike: "n — no" },
    { letter: "ه", name: "ha",    sound: "h",                                           englishLike: "h — hat" },
    { letter: "و", name: "waw",   sound: "w, or a long 'oo' vowel",                     englishLike: "w — win" },
    { letter: "ي", name: "ya",    sound: "y, or a long 'ee' vowel",                     englishLike: "y — yes" },
  ],

  farsi: [
    { letter: "ا", name: "alef",  sound: "long 'aa' vowel, or a glottal stop carrier",  englishLike: "a — father" },
    { letter: "ب", name: "be",    sound: "b",                                           englishLike: "b — boy" },
    { letter: "پ", name: "pe",    sound: "p",                                           englishLike: "p — pen" },
    { letter: "ت", name: "te",    sound: "t",                                           englishLike: "t — top" },
    { letter: "ث", name: "se",    sound: "s (spelling-only distinction in Farsi)",      englishLike: "s — sun" },
    { letter: "ج", name: "jim",   sound: "j",                                           englishLike: "j — jam" },
    { letter: "چ", name: "che",   sound: "ch",                                          englishLike: "ch — chair" },
    { letter: "ح", name: "he-ye jimi", sound: "h (spelling-only distinction in Farsi)", englishLike: "h — hat" },
    { letter: "خ", name: "khe",   sound: "raspy throat fricative",                      englishLike: "ch — Scottish \"loch\"" },
    { letter: "د", name: "dal",   sound: "d",                                           englishLike: "d — dog" },
    { letter: "ذ", name: "zal",   sound: "z (spelling-only distinction in Farsi)",      englishLike: "z — zoo" },
    { letter: "ر", name: "re",    sound: "rolled r",                                    englishLike: "rolled r, like Spanish 'r'" },
    { letter: "ز", name: "ze",    sound: "z",                                           englishLike: "z — zoo" },
    { letter: "ژ", name: "zhe",   sound: "voiced 'sh', like French 'j'",                englishLike: "s — pleasure, treasure" },
    { letter: "س", name: "sin",   sound: "s",                                           englishLike: "s — sun" },
    { letter: "ش", name: "shin",  sound: "sh",                                          englishLike: "sh — shoe" },
    { letter: "ص", name: "sad",   sound: "s (spelling-only distinction in Farsi)",      englishLike: "s — sun" },
    { letter: "ض", name: "zad",   sound: "z (spelling-only distinction in Farsi)",      englishLike: "z — zoo" },
    { letter: "ط", name: "ta",    sound: "t (spelling-only distinction in Farsi)",      englishLike: "t — top" },
    { letter: "ظ", name: "za",    sound: "z (spelling-only distinction in Farsi)",      englishLike: "z — zoo" },
    { letter: "ع", name: "eyn",   sound: "glottal catch, softer than Arabic",           englishLike: "close to the catch in \"uh-oh\"" },
    { letter: "غ", name: "gheyn", sound: "voiced uvular fricative, close to Farsi 'gh/q'", englishLike: "like French 'r' in \"Paris\"" },
    { letter: "ف", name: "fe",    sound: "f",                                           englishLike: "f — fish" },
    { letter: "ق", name: "qaf",   sound: "same as Farsi gheyn in most speech",          englishLike: "like French 'r' in \"Paris\"" },
    { letter: "ک", name: "kaf",   sound: "k",                                           englishLike: "k — kite" },
    { letter: "گ", name: "gaf",   sound: "hard g",                                      englishLike: "g — go" },
    { letter: "ل", name: "lam",   sound: "l",                                           englishLike: "l — lamp" },
    { letter: "م", name: "mim",   sound: "m",                                           englishLike: "m — mom" },
    { letter: "ن", name: "nun",   sound: "n",                                           englishLike: "n — no" },
    { letter: "و", name: "vav",   sound: "v, or a long 'oo' vowel",                     englishLike: "v — van" },
    { letter: "ه", name: "he",    sound: "h",                                           englishLike: "h — hat" },
    { letter: "ی", name: "ye",    sound: "y, or a long 'ee' vowel",                     englishLike: "y — yes" },
  ],

  bukharian: [
    { letter: "А а", name: "a",   sound: "open vowel",                                  englishLike: "a — father" },
    { letter: "Б б", name: "be",  sound: "b",                                           englishLike: "b — boy" },
    { letter: "В в", name: "ve",  sound: "v",                                           englishLike: "v — van" },
    { letter: "Г г", name: "ge",  sound: "hard g",                                      englishLike: "g — go" },
    { letter: "Ғ ғ", name: "ghe", sound: "voiced uvular fricative",                     englishLike: "like French 'r' in \"Paris\"" },
    { letter: "Д д", name: "de",  sound: "d",                                           englishLike: "d — dog" },
    { letter: "Е е", name: "ye",  sound: "ye",                                          englishLike: "ye — yes" },
    { letter: "Ё ё", name: "yo",  sound: "yo",                                          englishLike: "yo — yonder" },
    { letter: "Ж ж", name: "zhe", sound: "voiced 'sh'",                                 englishLike: "s — pleasure, treasure" },
    { letter: "З з", name: "ze",  sound: "z",                                           englishLike: "z — zoo" },
    { letter: "И и", name: "i",   sound: "close front vowel",                           englishLike: "ee — see" },
    { letter: "Ӣ ӣ", name: "i (long)", sound: "long version of 'и'",                    englishLike: "ee — see, held longer" },
    { letter: "Й й", name: "ye (short)", sound: "y glide",                              englishLike: "y — yes" },
    { letter: "К к", name: "ka",  sound: "k",                                           englishLike: "k — kite" },
    { letter: "Қ қ", name: "qa",  sound: "voiceless uvular stop, deeper than 'k'",      englishLike: "k, said further back in the throat" },
    { letter: "Л л", name: "el",  sound: "l",                                           englishLike: "l — lamp" },
    { letter: "М м", name: "em",  sound: "m",                                           englishLike: "m — mom" },
    { letter: "Н н", name: "en",  sound: "n",                                           englishLike: "n — no" },
    { letter: "О о", name: "o",   sound: "back rounded vowel",                          englishLike: "o — hot (British)" },
    { letter: "П п", name: "pe",  sound: "p",                                           englishLike: "p — pen" },
    { letter: "Р р", name: "er",  sound: "rolled r",                                    englishLike: "rolled r, like Spanish 'r'" },
    { letter: "С с", name: "es",  sound: "s",                                           englishLike: "s — sun" },
    { letter: "Т т", name: "te",  sound: "t",                                           englishLike: "t — top" },
    { letter: "У у", name: "u",   sound: "close back rounded vowel",                    englishLike: "u — flute" },
    { letter: "Ӯ ӯ", name: "u (long)", sound: "long version of 'у'",                    englishLike: "u — flute, held longer" },
    { letter: "Ф ф", name: "ef",  sound: "f",                                           englishLike: "f — fish" },
    { letter: "Х х", name: "kha", sound: "raspy throat fricative",                      englishLike: "ch — Scottish \"loch\"" },
    { letter: "Ҳ ҳ", name: "ha",  sound: "breathy h from deep in the throat",           englishLike: "stronger than English 'h'" },
    { letter: "Ч ч", name: "che", sound: "ch",                                          englishLike: "ch — chair" },
    { letter: "Ҷ ҷ", name: "je",  sound: "j",                                           englishLike: "j — jam" },
    { letter: "Ш ш", name: "sha", sound: "sh",                                          englishLike: "sh — shoe" },
    { letter: "Ъ ъ", name: "hamza", sound: "glottal stop marker, no sound of its own",  englishLike: "the catch in \"uh-oh\"" },
    { letter: "Э э", name: "e",   sound: "open-mid front vowel",                        englishLike: "e — bed" },
    { letter: "Ю ю", name: "yu",  sound: "yu",                                          englishLike: "yu — you" },
    { letter: "Я я", name: "ya",  sound: "ya",                                          englishLike: "ya — yard" },
  ],

  // strokePath: a simplified single-stroke practice path (normalized 0..1
  // coordinates, x right / y down) approximating each letter's dominant
  // visual form — NOT an authoritative Estrangela calligraphic stroke
  // order (no citable letter-by-letter source for that was used; treat
  // as a "roughly this shape, drawn roughly this way" practice aid, same
  // caveat as the rest of this file — worth a native/heritage-speaker or
  // calligrapher spot check before relying on it as pedagogically precise).
  // strokePath coordinates below were re-derived a second time after the
  // first pass turned out disconnected from the real glyphs in the live app
  // (verified against small isolated crops, which didn't match the actual
  // 240x240 TracingCanvas rendering closely enough). This pass reads
  // landmark points directly off on-device screenshots of the real
  // TracingCanvas glyph at its actual render size. Still a simplified
  // single-stroke approximation, not authoritative calligraphy (see the
  // file-level note above).
  aramaic: [
    { letter: "ܐ", name: "alap",  sound: "silent glottal stop — carries whatever vowel is marked", englishLike: "the catch in \"uh-oh\"",
      strokePath: [{x:0.82,y:0.28},{x:0.49,y:0.49},{x:0.3,y:0.65}] },
    { letter: "ܒ", name: "bet",   sound: "b, or v when softened",                       englishLike: "b — boy",
      strokePath: [{x:0.3,y:0.38},{x:0.62,y:0.38},{x:0.7,y:0.5},{x:0.55,y:0.62},{x:0.35,y:0.58}] },
    { letter: "ܓ", name: "gamal", sound: "hard g, or a softer throat sound between vowels", englishLike: "g — go",
      strokePath: [{x:0.47,y:0.71},{x:0.82,y:0.34}] },
    { letter: "ܕ", name: "dalat", sound: "d",                                           englishLike: "d — dog",
      strokePath: [{x:0.39,y:0.39},{x:0.54,y:0.39},{x:0.64,y:0.5},{x:0.64,y:0.71}] },
    { letter: "ܗ", name: "he",    sound: "h",                                           englishLike: "h — hat",
      strokePath: [{x:0.27,y:0.61},{x:0.4,y:0.39},{x:0.49,y:0.62},{x:0.58,y:0.42},{x:0.72,y:0.61},{x:0.69,y:0.68}] },
    { letter: "ܘ", name: "waw",   sound: "w, or a long 'oo' vowel",                     englishLike: "w — win",
      strokePath: [{x:0.54,y:0.36},{x:0.38,y:0.48},{x:0.42,y:0.67},{x:0.58,y:0.67},{x:0.64,y:0.35}] },
    { letter: "ܙ", name: "zayn",  sound: "z",                                           englishLike: "z — zoo",
      strokePath: [{x:0.51,y:0.38},{x:0.57,y:0.72}] },
    { letter: "ܚ", name: "het",   sound: "raspy throat fricative",                      englishLike: "ch — Scottish \"loch\"",
      strokePath: [{x:0.32,y:0.62},{x:0.44,y:0.44},{x:0.5,y:0.62},{x:0.6,y:0.44},{x:0.68,y:0.62},{x:0.73,y:0.46}] },
    { letter: "ܛ", name: "tet",   sound: "emphatic t",                                  englishLike: "t — top",
      strokePath: [{x:0.41,y:0.2},{x:0.69,y:0.85},{x:0.82,y:0.65},{x:0.22,y:0.58}] },
    { letter: "ܝ", name: "yod",   sound: "y, or a long 'ee' vowel",                     englishLike: "y — yes",
      strokePath: [{x:0.48,y:0.54},{x:0.56,y:0.65},{x:0.49,y:0.77}] },
    { letter: "ܟ", name: "kap",   sound: "k, or a softer throat sound between vowels",  englishLike: "k — kite",
      strokePath: [{x:0.63,y:0.41},{x:0.38,y:0.48},{x:0.35,y:0.61},{x:0.56,y:0.64},{x:0.77,y:0.88}] },
    { letter: "ܠ", name: "lamad", sound: "l",                                           englishLike: "l — lamp",
      strokePath: [{x:0.54,y:0.15},{x:0.71,y:0.64},{x:0.36,y:0.7}] },
    { letter: "ܡ", name: "mim",   sound: "m",                                           englishLike: "m — mom",
      strokePath: [{x:0.26,y:0.39},{x:0.69,y:0.42},{x:0.77,y:0.58},{x:0.58,y:0.67},{x:0.37,y:0.83}] },
    { letter: "ܢ", name: "nun",   sound: "n",                                           englishLike: "n — no",
      strokePath: [{x:0.36,y:0.62},{x:0.74,y:0.8}] },
    { letter: "ܣ", name: "semkat",sound: "s",                                           englishLike: "s — sun",
      strokePath: [{x:0.3,y:0.43},{x:0.3,y:0.6},{x:0.46,y:0.66},{x:0.46,y:0.43},{x:0.62,y:0.43},{x:0.62,y:0.6},{x:0.46,y:0.66}] },
    { letter: "ܥ", name: "ʿe",    sound: "deep throat catch",                           englishLike: "no true English equivalent",
      strokePath: [{x:0.46,y:0.37},{x:0.6,y:0.62},{x:0.8,y:0.66}] },
    { letter: "ܦ", name: "pe",    sound: "p, or f when softened",                       englishLike: "p — pen",
      strokePath: [{x:0.6,y:0.31},{x:0.46,y:0.38},{x:0.49,y:0.48},{x:0.6,y:0.43},{x:0.72,y:0.64},{x:0.28,y:0.67}] },
    { letter: "ܨ", name: "sade",  sound: "emphatic s",                                  englishLike: "ts — cats",
      strokePath: [{x:0.64,y:0.59},{x:0.38,y:0.67},{x:0.58,y:0.78},{x:0.35,y:0.87},{x:0.31,y:0.93}] },
    { letter: "ܩ", name: "qop",   sound: "k, deep in the throat",                       englishLike: "k — kite, said further back",
      strokePath: [{x:0.56,y:0.39},{x:0.75,y:0.54},{x:0.6,y:0.67},{x:0.27,y:0.68}] },
    { letter: "ܪ", name: "resh",  sound: "rolled r",                                    englishLike: "rolled r, like Spanish 'r'",
      strokePath: [{x:0.36,y:0.39},{x:0.49,y:0.39},{x:0.65,y:0.71}] },
    { letter: "ܫ", name: "shin",  sound: "sh",                                          englishLike: "sh — shoe",
      strokePath: [{x:0.41,y:0.4},{x:0.51,y:0.53},{x:0.65,y:0.65}] },
    { letter: "ܬ", name: "taw",   sound: "t",                                           englishLike: "t — top",
      strokePath: [{x:0.42,y:0.2},{x:0.48,y:0.48},{x:0.67,y:0.53},{x:0.72,y:0.69}] },
  ],

  // Sogdian used the Sogdian script (a Unicode block descended from Aramaic,
  // via Syriac) — but Android's text shaper (HarfBuzz) can't reliably shape
  // it even with the bundled NotoSansSogdian font (see the note in App.js's
  // fetchLesson — this is a known, pre-existing platform limitation, not
  // something fixable from JS). An earlier version of this data used the
  // real Sogdian Unicode codepoints directly and rendered as tofu boxes on
  // device; it also had the codepoint-to-letter mapping wrong (verified
  // against the font's own cmap — U+10F33 is "He", not "Daleth"). Using the
  // standard scholarly transliteration (the convention used in Sogdian
  // philology, e.g. Sims-Williams' grammars) instead sidesteps the rendering
  // bug entirely and is the accurate, citable representation either way.
  sogdian: [
    { letter: "ʾ", name: "aleph",  sound: "vowel carrier, similar role to Aramaic alap", englishLike: "the catch in \"uh-oh\"" },
    { letter: "β", name: "beth",   sound: "b, or a soft 'v' between vowels",             englishLike: "b — boy" },
    { letter: "γ", name: "gimel",  sound: "hard g, or a soft throat sound between vowels", englishLike: "g — go" },
    { letter: "δ", name: "daleth", sound: "d, or a soft 'th' between vowels",            englishLike: "d — dog" },
    { letter: "h", name: "he",     sound: "h",                                           englishLike: "h — hat" },
    { letter: "w", name: "waw",    sound: "w, or a long 'oo' vowel",                     englishLike: "w — win" },
    { letter: "z", name: "zayin",  sound: "z",                                           englishLike: "z — zoo" },
    { letter: "ḥ", name: "heth",   sound: "raspy throat fricative",                      englishLike: "ch — Scottish \"loch\"" },
    { letter: "y", name: "yodh",   sound: "y, or a long 'ee' vowel",                     englishLike: "y — yes" },
    { letter: "k", name: "kaph",   sound: "k",                                           englishLike: "k — kite" },
    { letter: "l", name: "lamedh", sound: "l",                                           englishLike: "l — lamp" },
    { letter: "m", name: "mem",    sound: "m",                                           englishLike: "m — mom" },
    { letter: "n", name: "nun",    sound: "n",                                           englishLike: "n — no" },
    { letter: "s", name: "samekh", sound: "s",                                           englishLike: "s — sun" },
    { letter: "ʿ", name: "ayin",   sound: "deep throat catch",                           englishLike: "no true English equivalent" },
    { letter: "p", name: "pe",     sound: "p",                                           englishLike: "p — pen" },
    { letter: "c", name: "sadhe",  sound: "emphatic s",                                  englishLike: "ts — cats" },
    { letter: "r", name: "resh",   sound: "rolled r",                                    englishLike: "rolled r, like Spanish 'r'" },
    { letter: "š", name: "shin",   sound: "sh",                                          englishLike: "sh — shoe" },
    { letter: "t", name: "taw",    sound: "t",                                           englishLike: "t — top" },
  ],
};

// Which languages already have a trustworthy TTS locale (see SPEECH_LOCALE in
// App.js) — only those get an audio button on the alphabet screen, so we
// never mispronounce a letter through a wrong-language fallback voice.
export const ALPHABET_TTS_LANGS = new Set(["farsi", "arabic", "uzbek", "hebrew"]);
