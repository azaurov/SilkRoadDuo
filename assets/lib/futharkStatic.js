// Hand-checked Old Norse lessons for the two topics the AI kept getting wrong (it invented
// words like "seint" for six, mixed up fem/fimm, and put Old Norse words in the options of
// target->English questions). Vocabulary is fixed here; only the order/distractors are random.
// Returns exercises in the same shape the AI backends produce, or null for other topics.

import { toRunes } from "./runes";

const NUMBERS = [
  ["einn", "one (1)"], ["tveir", "two (2)"], ["þrír", "three (3)"], ["fjórir", "four (4)"],
  ["fimm", "five (5)"], ["sex", "six (6)"], ["sjau", "seven (7)"], ["átta", "eight (8)"],
  ["níu", "nine (9)"], ["tíu", "ten (10)"], ["ellifu", "eleven (11)"], ["tólf", "twelve (12)"],
  ["þrettán", "thirteen (13)"], ["fjórtán", "fourteen (14)"], ["fimmtán", "fifteen (15)"],
  ["sextán", "sixteen (16)"], ["sautján", "seventeen (17)"], ["átján", "eighteen (18)"],
  ["nítján", "nineteen (19)"], ["tuttugu", "twenty (20)"], ["þrjátíu", "thirty (30)"],
  ["hundrað", "one hundred (100)"],
];
const NUMBER_PHRASES = [
  ["einn tveir þrír", "one two three"],
  ["fjórir fimm sex", "four five six"],
  ["sjau átta níu tíu", "seven eight nine ten"],
  ["tveir ok þrír", "two and three"],
  ["sex ok fjórir", "six and four"],
  ["tíu ok tíu", "ten and ten"],
];

const GREETINGS = [
  ["heill", "hello (to a man)"], ["heil", "hello (to a woman)"], ["vertu heill", "be well"],
  ["far vel", "farewell"], ["velkominn", "welcome"], ["góðan dag", "good day"],
  ["góða nótt", "good night"], ["þakka þér", "thank you"], ["já", "yes"], ["nei", "no"],
  ["vinr", "friend"], ["skál", "cheers"], ["hvat heitir þú", "what is your name?"],
  ["ek heiti", "my name is"],
];
const GREETING_PHRASES = [
  ["velkominn vinr", "welcome, friend"],
  ["góða nótt vinr", "good night, friend"],
  ["þakka þér vinr", "thank you, friend"],
  ["heill vinr", "hello, friend"],
  ["far vel vinr", "farewell, friend"],
  ["vertu heill vinr", "be well, friend"],
];

const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (arr, n) => shuffle(arr).slice(0, n);

function buildFrom(pool, phrases) {
  const mcqWords = pick(pool, 11);
  let m = 0;
  const mcq = () => {
    const [word, english] = mcqWords[m];
    const toEn = m % 3 !== 2; // mostly Old Norse -> English, every third is English -> Old Norse
    m++;
    const others = pick(pool.filter(p => p[0] !== word), 3);
    const base = { type: "mcq", direction: toEn ? "target_to_en" : "en_to_target", word, word_native: toRunes(word), english };
    return toEn
      ? { ...base, correct: english, options: shuffle([english, ...others.map(o => o[1])]) }
      : { ...base, correct: word, options: shuffle([word, ...others.map(o => o[0])]) };
  };
  const match = () => ({ type: "match", pairs: pick(pool, 4).map(([target, english]) => ({ target, english })) });
  const blankWords = pick(pool, 3);
  let b = 0;
  const fill = () => {
    const [word, english] = blankWords[b++];
    const others = pick(pool.filter(p => p[0] !== word), 3).map(o => o[0]);
    return { type: "fillblank", template: `"${english}" in Old Norse is ___`, correct_target: word, options: shuffle([word, ...others]) };
  };
  const phr = pick(phrases, 3);
  let p = 0;
  const arrange = () => {
    const [norse, english] = phr[p++];
    const order = norse.split(" ");
    return { type: "wordarrange", english, words: [...order], correct_order: order, hint: "Word order follows the English here; 'ok' means 'and'." };
  };
  const order = [mcq, mcq, match, mcq, fill, mcq, arrange, mcq, mcq, match, mcq, fill, mcq, arrange, mcq, mcq, match, mcq, fill, arrange];
  return order.map(f => f());
}

export function futharkStaticLesson(topicId) {
  if (topicId === "numbers") return buildFrom(NUMBERS, NUMBER_PHRASES);
  if (topicId === "greetings") return buildFrom(GREETINGS, GREETING_PHRASES);
  return null;
}
