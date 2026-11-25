export type Subject = "matte" | "svenska" | "engelska";
export type Level = 1 | 2 | 3;
export type Rng = () => number;

export interface TaskQuestion {
  prompt: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  /** Shown after answering, e.g. "7 · 8 = 56". */
  explanation?: string;
}

export type Generator = (rng: Rng) => TaskQuestion;

export const SUBJECTS: Record<Subject, { title: string; description: string }> = {
  matte: { title: "Matte", description: "Räkna och lös problem" },
  svenska: { title: "Svenska", description: "Stavning, ord och grammatik" },
  engelska: { title: "Engelska", description: "Glosor och grammatik" },
};

export const LEVELS: Record<Level, { title: string; grades: string }> = {
  1: { title: "Lätt", grades: "åk 2–4" },
  2: { title: "Mellan", grades: "åk 5–7" },
  3: { title: "Svår", grades: "åk 8 och uppåt" },
};

export const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** `count` different items, none equal to anything in `exclude`. */
export function sample<T>(rng: Rng, items: readonly T[], count: number, exclude: readonly T[] = []): T[] {
  return shuffle(rng, items.filter((item, index) => !exclude.includes(item) && items.indexOf(item) === index)).slice(0, count);
}

/** Correct answer plus up to three different wrong answers, in random order. */
export function choice(rng: Rng, prompt: string, correct: string, wrong: readonly string[], explanation?: string): TaskQuestion {
  const distractors = wrong.filter((option, index) => option !== correct && wrong.indexOf(option) === index).slice(0, 3);
  const options = shuffle(rng, [correct, ...distractors]);
  return { prompt, options, answer: options.indexOf(correct), explanation };
}

/** Numbers as Swedish children read them: "1 998", "−5". */
export const num = (value: number) => value.toLocaleString("sv-SE");

/** Wrong numeric answers close to the right one (never negative unless the answer is). */
export function nearNumbers(rng: Rng, correct: number, candidates: number[]): string[] {
  const allowNegative = correct < 0;
  const unique = candidates.filter((n, i) => n !== correct && candidates.indexOf(n) === i && (allowNegative || n >= 0));
  const picked = shuffle(rng, unique).slice(0, 3);
  for (let step = 1; picked.length < 3; step++) {
    for (const n of [correct + step, correct - step]) {
      if (picked.length < 3 && n !== correct && !picked.includes(n) && (allowNegative || n >= 0)) picked.push(n);
    }
  }
  return picked.map(num);
}

/** A round of `size` questions with different prompts, mixing the level's question types. */
export function buildRound(generators: readonly Generator[], size: number, rng: Rng): TaskQuestion[] {
  const questions: TaskQuestion[] = [];
  const prompts = new Set<string>();
  let order = shuffle(rng, generators);
  for (let attempt = 0; questions.length < size && attempt < size * 30; attempt++) {
    if (order.length === 0) order = shuffle(rng, generators);
    const question = order.shift()!(rng);
    if (prompts.has(question.prompt) || question.answer < 0) continue;
    prompts.add(question.prompt);
    questions.push(question);
  }
  return questions;
}
