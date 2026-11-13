// Post-parse cleanup of AI-generated lessons: strips/derives scripts and drops exercises the
// app could never mark correct. Shared by App.js (fetchLesson) and scripts/check-lesson.mjs
// so the checker exercises the exact code the app runs.

import { toRunes } from "./runes";

// BiDi / zero-width controls the AI sometimes sprinkles into RTL text.
const INVISIBLES = /[​-‏‪-‮⁦-⁩﻿]/g;
export const norm = s => (s || "").normalize("NFC").replace(INVISIBLES, "").trim().toLowerCase();

export function cleanExercises(exercises, langId) {
  // Sogdian ancient script cannot be shaped by Android's HarfBuzz; use romanized only.
  // Aramaic is romanized by design too, but the AI fills word_native with real Syriac
  // script anyway (the prompt hint alone doesn't stop it) — different vocabulary items
  // sharing a Semitic root then render as near-identical, hard-to-distinguish glyphs
  // in the MCQ prompt card, defeating the exercise.
  if (langId === "sogdian" || langId === "aramaic" || langId === "futhark") {
    exercises.forEach(ex => { delete ex.word_native; });
  }
  // Futhark: runes come from our own deterministic table (assets/lib/runes.js), never
  // from the AI. word_native was stripped above; re-derive it from the romanized word.
  if (langId === "futhark") {
    exercises.forEach(ex => { if (ex.type === "mcq" && ex.word) ex.word_native = toRunes(ex.word); });
  }
  // Normalize correct answer to exactly match the option string (guards against AI casing/whitespace/BiDi drift)
  return exercises.filter(ex => {
    // Drop wordarrange exercises where the AI put English words in the bank
    // instead of romanized target-language words (every bank word literally
    // appears in the English sentence), or where correct_order doesn't use
    // the same words as the bank.
    if (ex.type === "wordarrange" && ex.words && ex.english) {
      const englishWords = new Set(ex.english.toLowerCase().match(/[a-z']+/g) || []);
      const allWordsAreEnglish = ex.words.every(w => englishWords.has(norm(w)));
      const orderMatchesBank = ex.correct_order && ex.correct_order.length === ex.words.length
        && ex.correct_order.every(w => ex.words.includes(w));
      if (allWordsAreEnglish || !orderMatchesBank) return false;
    }
    // Drop MCQs that offer the same option twice (compared case/whitespace-insensitively):
    // the learner is shown two identical buttons.
    if (ex.type === "mcq" && Array.isArray(ex.options)) {
      if (new Set(ex.options.map(norm)).size !== ex.options.length) return false;
    }
    // Drop fillblanks nobody can answer: the AI sometimes lists English meanings as the options
    // while correct_target is the target-language word, so the right answer is never offered
    // (and every tap counts as wrong). Repair first via the case/whitespace-insensitive match.
    if (ex.type === "fillblank") {
      const opts = Array.isArray(ex.options) ? ex.options : [];
      if (!opts.some(o => norm(o) === norm(ex.correct_target))) return false;
      if (new Set(opts.map(norm)).size !== opts.length) return false;
    }
    // Match pairs are paired by equality of the English side, so duplicate english/target
    // values make the board unsolvable or ambiguous.
    if (ex.type === "match") {
      const pairs = Array.isArray(ex.pairs) ? ex.pairs : [];
      if (new Set(pairs.map(p => norm(p.english))).size !== pairs.length) return false;
      if (new Set(pairs.map(p => norm(p.target))).size !== pairs.length) return false;
    }
    return true;
  }).map(ex => {
    if (ex.type === "mcq" && ex.options) {
      const match = ex.options.find(o => norm(o) === norm(ex.correct));
      if (match) ex.correct = match;
    }
    if (ex.type === "fillblank" && ex.options) {
      const match = ex.options.find(o => norm(o) === norm(ex.correct_target));
      if (match) ex.correct_target = match;
    }
    return ex;
  });
}
