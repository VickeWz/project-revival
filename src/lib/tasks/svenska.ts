import { choice, pick, sample, type Generator, type Level, type Rng } from "./questions";

type Pairs = ReadonlyArray<readonly [string, string]>;

/** "Vad är motsatsen/synonymen till X?" with wrong answers of the same word class. */
const fromPairs = (groups: Pairs[], question: (word: string) => string, explain: (a: string, b: string) => string): Generator => (rng) => {
  const group = pick(rng, groups);
  const [word, answer] = pick(rng, group);
  const wrong = sample(rng, group.map(([, other]) => other), 3, [answer, word]);
  return choice(rng, question(word), answer, wrong, explain(word, answer));
};

// Opposites with one clear answer (no "gammal", which has both "ung" and "ny").
const OPPOSITE_ADJECTIVES: Pairs = [
  ["stor", "liten"], ["varm", "kall"], ["ljus", "mörk"], ["snabb", "långsam"], ["glad", "ledsen"],
  ["tung", "lätt"], ["lång", "kort"], ["öppen", "stängd"], ["full", "tom"], ["våt", "torr"],
  ["mjuk", "hård"], ["rik", "fattig"], ["tjock", "tunn"], ["stark", "svag"], ["frisk", "sjuk"],
  ["ren", "smutsig"], ["dyr", "billig"], ["ung", "gammal"],
];
const OPPOSITE_VERBS: Pairs = [
  ["börja", "sluta"], ["vinna", "förlora"], ["fråga", "svara"], ["skratta", "gråta"],
  ["köpa", "sälja"], ["öppna", "stänga"], ["komma ihåg", "glömma"], ["ge", "ta"],
];
const OPPOSITE_NOUNS: Pairs = [
  ["dag", "natt"], ["sommar", "vinter"], ["början", "slutet"], ["krig", "fred"], ["fiende", "vän"],
];
const opposites = fromPairs([OPPOSITE_ADJECTIVES, OPPOSITE_VERBS, OPPOSITE_NOUNS],
  (word) => `Vad är motsatsen till ”${word}”?`, (a, b) => `${a} – ${b}`);

const SYNONYM_ADJECTIVES: Pairs = [
  ["glad", "lycklig"], ["ledsen", "sorgsen"], ["arg", "ilsken"], ["rädd", "skrämd"], ["modig", "tapper"],
  ["smart", "klok"], ["lugn", "stilla"], ["konstig", "märklig"], ["vacker", "snygg"], ["snäll", "vänlig"],
];
const SYNONYM_VERBS: Pairs = [
  ["börja", "starta"], ["prata", "tala"], ["titta", "kolla"], ["slänga", "kasta"], ["laga", "reparera"], ["springa", "rusa"],
];
const synonyms = fromPairs([SYNONYM_ADJECTIVES, SYNONYM_VERBS],
  (word) => `Vilket ord betyder ungefär samma sak som ”${word}”?`, (a, b) => `${a} och ${b} betyder ungefär samma sak`);

const HARD_SYNONYMS: Pairs[] = [
  [["förmodligen", "troligen"], ["omedelbart", "genast"], ["möjligen", "kanske"], ["ofta", "många gånger"]],
  [["bistå", "hjälpa"], ["upphöra", "sluta"], ["erhålla", "få"], ["påbörja", "starta"], ["avvakta", "vänta"]],
  [["ändamål", "syfte"], ["anledning", "orsak"], ["betydelse", "innebörd"], ["förmåga", "kapacitet"]],
  [["förvånad", "överraskad"], ["noggrann", "omsorgsfull"], ["väsentlig", "viktig"], ["ovanlig", "sällsynt"]],
];
const hardSynonyms = fromPairs(HARD_SYNONYMS,
  (word) => `Vilket ord betyder ungefär samma sak som ”${word}”?`, (a, b) => `${a} betyder ungefär ${b}`);

const WORDS = {
  substantiv: ["bil", "hund", "bok", "stol", "äpple", "skola", "boll", "katt", "hus", "sko"],
  verb: ["springa", "äta", "hoppa", "läsa", "skriva", "simma", "sova", "cykla", "sjunga", "dansa"],
  adjektiv: ["glad", "röd", "snabb", "stor", "mjuk", "kall", "söt", "rolig", "trött", "grön"],
} as const;
const WORD_CLASS_HINT = {
  substantiv: "namn på en sak, ett djur eller en person",
  verb: "något man gör",
  adjektiv: "beskriver hur något är",
} as const;
const wordClasses: Generator = (rng) => {
  const target = pick(rng, Object.keys(WORDS) as Array<keyof typeof WORDS>);
  const others = (Object.keys(WORDS) as Array<keyof typeof WORDS>).filter((key) => key !== target).flatMap((key) => WORDS[key]);
  const answer = pick(rng, WORDS[target]);
  return choice(rng, `Vilket ord är ett ${target} (${WORD_CLASS_HINT[target]})?`, answer, sample(rng, others, 3), `”${answer}” är ett ${target}`);
};

const ALPHABET_WORDS = [
  "apa", "boll", "cykel", "dörr", "eld", "fisk", "glass", "hatt", "is", "jord", "kaka", "lampa", "mus",
  "näsa", "ost", "penna", "ros", "sol", "tåg", "uggla", "vagn", "zebra", "ål", "äpple", "öga",
];
const SAME_START = [
  ["bad", "bil", "bok", "bur", "byxa"], ["sal", "sax", "sil", "sol", "sur"], ["katt", "kex", "kniv", "kod", "kung"],
  ["mamma", "mat", "mos", "mus", "myra"], ["tak", "tid", "tom", "tunga", "tåg"], ["hal", "hem", "hus", "hylla", "häst"],
];
const firstInAlphabet = (words: (rng: Rng) => string[]): Generator => (rng) => {
  const options = words(rng);
  const answer = [...options].sort((a, b) => a.localeCompare(b, "sv"))[0];
  return choice(rng, "Vilket ord kommer först i alfabetet?", answer, options.filter((word) => word !== answer),
    "I svenska alfabetet kommer å, ä och ö sist, efter z.");
};
const alphabetEasy = firstInAlphabet((rng) => {
  const byLetter = new Map<string, string>();
  for (const word of sample(rng, ALPHABET_WORDS, ALPHABET_WORDS.length)) if (!byLetter.has(word[0])) byLetter.set(word[0], word);
  return [...byLetter.values()].slice(0, 4);
});
const alphabetSameStart = firstInAlphabet((rng) => sample(rng, pick(rng, SAME_START), 4));

// Correct spelling first, then three misspellings that are not real words.
const SPELLING_EASY: ReadonlyArray<readonly string[]> = [
  ["sjuk", "schuk", "skjuk", "shuk"], ["stjärna", "sjärna", "skjärna", "stärna"], ["choklad", "schoklad", "sjoklad", "tjoklad"],
  ["tjugo", "kjugo", "schugo", "sjugo"], ["ljus", "lius", "ljuss", "gjus"], ["hjärta", "järta", "gjärta", "hjerta"],
  ["skjorta", "sjorta", "schorta", "skorta"], ["mjölk", "mölk", "mjölck", "mjölg"], ["gärna", "järna", "gjärna", "gerna"],
  ["tröja", "tröia", "tröjja", "trögja"], ["äpple", "epple", "äppele", "äplle"], ["nyckel", "nykel", "nyckell", "nyckle"],
  ["känna", "tjänna", "chänna", "kenna"], ["kjol", "schol", "skjol", "chol"],
];
const SPELLING_HARD: ReadonlyArray<readonly string[]> = [
  ["kanske", "kansje", "kanshe", "kankse"], ["intressant", "intresant", "interessant", "intressang"],
  ["dessutom", "desutom", "dessotom", "dessuttom"], ["parallell", "paralell", "parallel", "paralel"],
  ["självklart", "självklat", "själfklart", "sjävklart"], ["restaurang", "resturang", "restaurrang", "restorang"],
  ["äntligen", "entligen", "äntlien", "ändtligen"], ["egentligen", "egentlien", "ejentligen", "egenligen"],
  ["medicin", "medisin", "meddicin", "medecin"], ["förmodligen", "förmodlien", "förmodlingen", "förmåldligen"],
];
const spelling = (words: ReadonlyArray<readonly string[]>): Generator => (rng) => {
  const [answer, ...wrong] = pick(rng, words);
  return choice(rng, "Vilket ord är rätt stavat?", answer, wrong);
};

// Sentences with ___ and the right word; "de" is the subject form, "dem" the object form.
const DE_DEM: ReadonlyArray<readonly [string, "de" | "dem" | "De"]> = [
  ["Jag såg ___ i parken igår.", "dem"], ["___ spelar fotboll varje dag.", "De"], ["Kan du hjälpa ___ med läxan?", "dem"],
  ["Igår åkte ___ till stranden.", "de"], ["Vi bjöd in ___ till festen.", "dem"], ["___ har en hund som heter Bamse.", "De"],
  ["Läraren gav ___ en uppgift.", "dem"], ["När ___ kom hem var det mörkt.", "de"],
];
const deDem: Generator = (rng) => {
  const [sentence, answer] = pick(rng, DE_DEM);
  const wrong = answer === "dem" ? "de" : answer === "De" ? "Dem" : "dem";
  return choice(rng, `Vilket ord passar? ${sentence}`, answer, [wrong],
    answer.toLowerCase() === "de" ? "”De” gör något i meningen (som ”jag” eller ”vi”)." : "”Dem” är de som något görs mot (som ”mig” eller ”oss”).");
};

const VAR_VART: ReadonlyArray<readonly [string, "Var" | "Vart"]> = [
  ["___ bor du?", "Var"], ["___ ska du åka i sommar?", "Vart"], ["___ ligger mina skor?", "Var"],
  ["___ tog katten vägen?", "Vart"], ["___ är du nu?", "Var"], ["___ är du på väg?", "Vart"],
];
const varVart: Generator = (rng) => {
  const [sentence, answer] = pick(rng, VAR_VART);
  return choice(rng, `Vilket ord passar? ${sentence}`, answer, [answer === "Var" ? "Vart" : "Var"],
    answer === "Var" ? "”Var” frågar om en plats där något är." : "”Vart” frågar om riktningen dit något är på väg.");
};

const IDIOMS: ReadonlyArray<readonly [string, string]> = [
  ["ha is i magen", "vara lugn och inte stressa"], ["glida in på en räkmacka", "få något utan att anstränga sig"],
  ["slå två flugor i en smäll", "klara två saker på en gång"], ["inte se skogen för alla träd", "missa helheten för alla detaljer"],
  ["ta tjuren vid hornen", "ta itu med något svårt direkt"], ["det är ingen ko på isen", "det är ingen fara"],
  ["kasta in handduken", "ge upp"], ["ana ugglor i mossen", "misstänka att något är fel"],
  ["hålla tummarna", "önska någon lycka till"], ["sitta i samma båt", "ha samma problem som någon annan"],
  ["få kalla fötter", "ångra sig i sista stund"], ["lägga rabarber på något", "ta något för sig själv utan att fråga"],
];
const idioms: Generator = (rng) => {
  const [idiom, meaning] = pick(rng, IDIOMS);
  return choice(rng, `Vad betyder ”att ${idiom}”?`, meaning, sample(rng, IDIOMS.map(([, m]) => m), 3, [meaning]));
};

const CLASS_NAMES = ["substantiv", "verb", "adjektiv", "adverb", "pronomen", "preposition", "konjunktion", "räkneord"];
const CLASS_IN_SENTENCE: ReadonlyArray<readonly [string, string, string]> = [
  ["Hon springer snabbt.", "snabbt", "adverb"], ["Vi åt glass efter skolan.", "efter", "preposition"],
  ["Han och jag spelar schack.", "jag", "pronomen"], ["Katten sover på mattan.", "sover", "verb"],
  ["Det var en spännande film.", "spännande", "adjektiv"], ["Jag är trött men glad.", "men", "konjunktion"],
  ["Tre katter satt på taket.", "Tre", "räkneord"], ["Glädjen var stor.", "Glädjen", "substantiv"],
  ["De kom hem sent.", "sent", "adverb"], ["Boken ligger under sängen.", "under", "preposition"],
  ["Hon skrev ett långt brev.", "skrev", "verb"],
];
const classInSentence: Generator = (rng) => {
  const [sentence, word, answer] = pick(rng, CLASS_IN_SENTENCE);
  return choice(rng, `Vilken ordklass är ”${word}” i meningen ”${sentence}”?`, answer, sample(rng, CLASS_NAMES, 3, [answer]));
};

export const SWEDISH: Record<Level, Generator[]> = {
  1: [opposites, wordClasses, alphabetEasy, spelling(SPELLING_EASY)],
  2: [synonyms, spelling(SPELLING_HARD), deDem, varVart, alphabetSameStart, opposites],
  3: [idioms, classInSentence, hardSynonyms, spelling(SPELLING_HARD), deDem],
};
