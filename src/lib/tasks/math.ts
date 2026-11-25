import { choice, int, nearNumbers, num, pick, type Generator, type Level } from "./questions";

const ask = (expression: string) => `Vad är ${expression}?`;

const add = (max: number): Generator => (rng) => {
  const a = int(rng, Math.ceil(max / 10), max);
  const b = int(rng, 2, max);
  const c = a + b;
  return choice(rng, ask(`${num(a)} + ${num(b)}`), num(c), nearNumbers(rng, c, [c + 1, c - 1, c + 10, c - 10, c + 2]), `${num(a)} + ${num(b)} = ${num(c)}`);
};

const subtract = (max: number): Generator => (rng) => {
  const a = int(rng, Math.ceil(max / 5), max);
  const b = int(rng, 1, a);
  const c = a - b;
  return choice(rng, ask(`${num(a)} − ${num(b)}`), num(c), nearNumbers(rng, c, [c + 1, c - 1, c + 10, c - 10, a + b]), `${num(a)} − ${num(b)} = ${num(c)}`);
};

const multiply = (tables: number[], maxFactor: number): Generator => (rng) => {
  const a = pick(rng, tables);
  const b = int(rng, 2, maxFactor);
  const c = a * b;
  return choice(rng, ask(`${a} · ${b}`), num(c), nearNumbers(rng, c, [a * (b + 1), a * (b - 1), (a + 1) * b, c + 1, c - 10, a + b]), `${a} · ${b} = ${num(c)}`);
};

const divide: Generator = (rng) => {
  const b = int(rng, 2, 10);
  const c = int(rng, 2, 10);
  const a = b * c;
  return choice(rng, ask(`${a} / ${b}`), num(c), nearNumbers(rng, c, [c + 1, c - 1, c + 2, b]), `${b} · ${c} = ${a}, så ${a} / ${b} = ${c}`);
};

const half: Generator = (rng) => {
  const whole = int(rng, 5, 60) * 2;
  const c = whole / 2;
  return choice(rng, `Vad är hälften av ${whole}?`, num(c), nearNumbers(rng, c, [c + 1, c - 1, c + 10, whole * 2]), `${whole} / 2 = ${c}`);
};

const orderOfOperations: Generator = (rng) => {
  const a = int(rng, 2, 20);
  const b = int(rng, 2, 9);
  const c = int(rng, 2, 9);
  const right = a + b * c;
  return choice(rng, ask(`${a} + ${b} · ${c}`), num(right), nearNumbers(rng, right, [(a + b) * c, right + 1, right - 1, a * b + c]),
    `Multiplikation först: ${b} · ${c} = ${b * c}, sedan ${a} + ${b * c} = ${right}`);
};

const fractionOf: Generator = (rng) => {
  const parts = pick(rng, [2, 3, 4, 5, 10]);
  const c = int(rng, 2, 12);
  const whole = parts * c;
  return choice(rng, `Vad är 1/${parts} av ${whole}?`, num(c), nearNumbers(rng, c, [c + 1, c - 1, whole - parts, c * 2]), `${whole} / ${parts} = ${c}`);
};

const percent: Generator = (rng) => {
  const p = pick(rng, [5, 10, 20, 25, 50, 75]);
  const base = pick(rng, [20, 40, 60, 80, 120, 160, 200, 240, 300, 400, 500, 800]);
  const c = (base * p) / 100;
  return choice(rng, `Vad är ${p} % av ${base}?`, num(c), nearNumbers(rng, c, [c * 2, c + 10, c - 5, base - c, p]), `${p} % = ${p}/100, och ${base} · ${p} / 100 = ${num(c)}`);
};

const equation: Generator = (rng) => {
  const x = int(rng, 2, 12);
  const k = int(rng, 2, 9);
  const m = int(rng, 1, 20);
  const total = k * x + m;
  return choice(rng, `Lös ekvationen: ${k}x + ${m} = ${total}. Vad är x?`, num(x), nearNumbers(rng, x, [x + 1, x - 1, total - m, Math.round(total / k)]),
    `${k}x = ${total} − ${m} = ${total - m}, så x = ${total - m} / ${k} = ${x}`);
};

const negatives: Generator = (rng) => {
  const a = -int(rng, 2, 15);
  const b = int(rng, 2, 20);
  if (rng() < 0.5) {
    const c = a + b;
    return choice(rng, ask(`${num(a)} + ${num(b)}`), num(c), nearNumbers(rng, c, [-c, c + 1, c - 1, a - b]), `${num(a)} + ${num(b)} = ${num(c)}`);
  }
  const f = int(rng, 2, 9);
  const c = a * f;
  return choice(rng, ask(`${num(a)} · ${f}`), num(c), nearNumbers(rng, c, [-c, c + f, c - 1, a + f]), `Minus gånger plus blir minus: ${num(a)} · ${f} = ${num(c)}`);
};

const squares: Generator = (rng) => {
  const n = int(rng, 4, 15);
  if (rng() < 0.5) {
    return choice(rng, ask(`${n}²`), num(n * n), nearNumbers(rng, n * n, [n * 2, n * n + n, (n - 1) * (n - 1), n * n - 1]), `${n}² = ${n} · ${n} = ${n * n}`);
  }
  return choice(rng, ask(`√${n * n}`), num(n), nearNumbers(rng, n, [n + 1, n - 1, (n * n) / 2, n * 2]), `${n} · ${n} = ${n * n}, så √${n * n} = ${n}`);
};

const parentheses: Generator = (rng) => {
  const a = int(rng, 8, 30);
  const b = int(rng, 1, a - 2);
  const c = int(rng, 2, 9);
  const right = (a - b) * c;
  return choice(rng, ask(`(${a} − ${b}) · ${c}`), num(right), nearNumbers(rng, right, [a - b * c, right + c, right - 1, a * c - b]),
    `Parentesen först: ${a} − ${b} = ${a - b}, sedan ${a - b} · ${c} = ${right}`);
};

export const MATH: Record<Level, Generator[]> = {
  1: [add(50), subtract(50), multiply([2, 3, 4, 5, 10], 10), add(20), half],
  2: [add(999), subtract(999), multiply([3, 4, 6, 7, 8, 9], 10), divide, orderOfOperations, fractionOf],
  3: [percent, equation, negatives, squares, parentheses, orderOfOperations],
};
