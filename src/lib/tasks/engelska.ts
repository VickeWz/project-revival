import { choice, pick, sample, type Generator, type Level } from "./questions";

type Glossary = ReadonlyArray<readonly [string, string]>; // [svenska, english]

// Groups of the same kind of word, so wrong answers are plausible. One translation per word.
const EASY_WORDS: Glossary[] = [
  [["hund", "dog"], ["katt", "cat"], ["häst", "horse"], ["fågel", "bird"], ["fisk", "fish"], ["ko", "cow"], ["gris", "pig"], ["mus", "mouse"]],
  [["röd", "red"], ["blå", "blue"], ["grön", "green"], ["gul", "yellow"], ["svart", "black"], ["vit", "white"], ["rosa", "pink"], ["brun", "brown"]],
  [["mamma", "mother"], ["pappa", "father"], ["bror", "brother"], ["syster", "sister"], ["farmor", "grandmother"], ["kusin", "cousin"]],
  [["äpple", "apple"], ["bröd", "bread"], ["mjölk", "milk"], ["vatten", "water"], ["ost", "cheese"], ["ägg", "egg"], ["smör", "butter"]],
  [["hus", "house"], ["bil", "car"], ["bok", "book"], ["skola", "school"], ["boll", "ball"], ["stol", "chair"], ["bord", "table"]],
  [["fem", "five"], ["åtta", "eight"], ["tolv", "twelve"], ["tjugo", "twenty"], ["tre", "three"], ["elva", "eleven"]],
  [["måndag", "Monday"], ["tisdag", "Tuesday"], ["onsdag", "Wednesday"], ["torsdag", "Thursday"], ["fredag", "Friday"], ["lördag", "Saturday"]],
];
const MEDIUM_WORDS: Glossary[] = [
  [["kylskåp", "fridge"], ["nyckel", "key"], ["fönster", "window"], ["kudde", "pillow"], ["sked", "spoon"], ["gaffel", "fork"], ["kniv", "knife"], ["spegel", "mirror"]],
  [["trädgård", "garden"], ["flygplats", "airport"], ["bibliotek", "library"], ["sjukhus", "hospital"], ["kyrka", "church"], ["affär", "shop"], ["bro", "bridge"]],
  [["berg", "mountain"], ["strand", "beach"], ["skog", "forest"], ["ö", "island"], ["moln", "cloud"], ["regn", "rain"], ["snö", "snow"], ["vind", "wind"]],
  [["trött", "tired"], ["hungrig", "hungry"], ["arg", "angry"], ["rädd", "scared"], ["stolt", "proud"], ["uttråkad", "bored"]],
];

const translate = (groups: Glossary[]): Generator => (rng) => {
  const group = pick(rng, groups);
  const [sv, en] = pick(rng, group);
  if (rng() < 0.5) {
    return choice(rng, `Vad betyder ”${en}” på svenska?`, sv, sample(rng, group.map(([word]) => word), 3, [sv]), `${en} = ${sv}`);
  }
  return choice(rng, `Hur säger man ”${sv}” på engelska?`, en, sample(rng, group.map(([, word]) => word), 3, [en]), `${sv} = ${en}`);
};

// [sentence, right form, wrong forms]
const PRESENT: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ["She ___ to school every day.", "goes", ["go", "going", "gone"]],
  ["He ___ football on Saturdays.", "plays", ["play", "playing", "is play"]],
  ["They ___ pizza on Fridays.", "eat", ["eats", "eating", "is eat"]],
  ["I ___ a brother and a sister.", "have", ["has", "having", "haves"]],
  ["My cat ___ on my bed.", "sleeps", ["sleep", "sleeping", "is sleep"]],
  ["We ___ in Sweden.", "live", ["lives", "living", "is live"]],
  ["It ___ a lot in autumn.", "rains", ["rain", "raining", "is rain"]],
  ["Tom ___ a new bike.", "has", ["have", "haves", "having"]],
];
const present: Generator = (rng) => {
  const [sentence, answer, wrong] = pick(rng, PRESENT);
  return choice(rng, `Vilket ord passar? ${sentence}`, answer, wrong, "Med he, she och it får verbet ett -s i presens.");
};

// [base, past, past participle, Swedish]
const IRREGULAR: ReadonlyArray<readonly [string, string, string, string]> = [
  ["go", "went", "gone", "gå"], ["eat", "ate", "eaten", "äta"], ["see", "saw", "seen", "se"], ["take", "took", "taken", "ta"],
  ["write", "wrote", "written", "skriva"], ["swim", "swam", "swum", "simma"], ["buy", "bought", "bought", "köpa"],
  ["think", "thought", "thought", "tänka"], ["run", "ran", "run", "springa"], ["drink", "drank", "drunk", "dricka"],
  ["sing", "sang", "sung", "sjunga"], ["give", "gave", "given", "ge"], ["find", "found", "found", "hitta"],
  ["sleep", "slept", "slept", "sova"], ["know", "knew", "known", "veta"], ["fly", "flew", "flown", "flyga"],
];
const regularized = (base: string) => (base.endsWith("e") ? `${base}d` : `${base}ed`);
const pastTense: Generator = (rng) => {
  const [base, past, participle, sv] = pick(rng, IRREGULAR);
  return choice(rng, `Vilket ord passar? Yesterday I ___ (${base} = ${sv}).`, past,
    [regularized(base), `${base}s`, participle !== past ? participle : `${base}ing`], `${base} – ${past} – ${participle}`);
};
const participle: Generator = (rng) => {
  const [base, past, part, sv] = pick(rng, IRREGULAR.filter(([, p, pp]) => p !== pp));
  return choice(rng, `Vilket ord passar? She has ___ (${base} = ${sv}).`, part,
    [past, regularized(base), `${base}ing`], `${base} – ${past} – ${part}. Efter ”have” används den tredje formen.`);
};

const PREPOSITIONS = ["at", "in", "on", "of", "to", "by", "for", "since", "with"];
const PREPOSITION_SENTENCES: ReadonlyArray<readonly [string, string]> = [
  ["I'm good ___ football.", "at"], ["She is interested ___ music.", "in"], ["It depends ___ the weather.", "on"],
  ["He is afraid ___ spiders.", "of"], ["I'm looking forward ___ the holidays.", "to"], ["This book was written ___ my teacher.", "by"],
  ["She has lived here ___ 2015.", "since"], ["I have known him ___ ten years.", "for"], ["We arrived ___ the airport late.", "at"],
];
const prepositions: Generator = (rng) => {
  const [sentence, answer] = pick(rng, PREPOSITION_SENTENCES);
  return choice(rng, `Vilket ord passar? ${sentence}`, answer, sample(rng, PREPOSITIONS, 3, [answer]));
};

// English words that look like a Swedish word but mean something else.
const FALSE_FRIENDS: ReadonlyArray<readonly [string, string, string]> = [
  ["eventually", "till slut", "eventuellt"], ["actually", "faktiskt", "aktuellt"], ["sensible", "förnuftig", "sensibel"],
  ["fabric", "tyg", "fabrik"], ["gift", "present", "gift"], ["chef", "kock", "chef"], ["novel", "roman", "novell"],
  ["billion", "miljard", "biljon"], ["become", "bli", "bekomma"],
];
const falseFriends: Generator = (rng) => {
  const [en, sv, trap] = pick(rng, FALSE_FRIENDS);
  const others = sample(rng, FALSE_FRIENDS.map(([, meaning]) => meaning), 2, [sv, trap]);
  return choice(rng, `Vad betyder ”${en}” på svenska?`, sv, [trap, ...others], `”${en}” betyder ${sv}, inte ${trap}.`);
};

export const ENGLISH: Record<Level, Generator[]> = {
  1: [translate(EASY_WORDS), translate(EASY_WORDS), present],
  2: [translate(MEDIUM_WORDS), present, pastTense, translate(EASY_WORDS)],
  3: [pastTense, participle, prepositions, falseFriends, translate(MEDIUM_WORDS)],
};
