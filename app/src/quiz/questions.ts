import { hiLoValue } from '../game/count';
import { rankValue, shuffle } from '../game/deck';
import { RANKS, SUITS, type Card, type Rank } from '../game/types';

export type QuizKind = 'point' | 'count' | 'prob' | 'change' | 'tc';
export type QuizMode = 'all' | 'point' | 'count' | 'prob' | 'tc';

export const MODE_KINDS: Record<QuizMode, QuizKind[]> = {
  all: ['point', 'count', 'prob', 'change', 'tc'],
  point: ['point'],
  count: ['count'],
  prob: ['prob', 'change'],
  tc: ['tc'],
};

type Base = { id: number; choices: string[]; answer: string };

export type PointQ = Base & { kind: 'point'; card: Card };
export type CountQ = Base & { kind: 'count'; cards: Card[] };
export type ProbQ = Base & { kind: 'prob'; total: number; target: Rank; count: number; pile: Card[] };
export type ChangeQ = Base & { kind: 'change'; total: number; drawn: Rank; target: Rank; targetCount: number; drawnCount: number };
export type TcQ = Base & { kind: 'tc'; rc: number; decks: number };
export type Question = PointQ | CountQ | ProbQ | ChangeQ | TcQ;

type Rand = () => number;
const pick = <T,>(items: T[], r: Rand): T => items[Math.floor(r() * items.length)];
const int = (min: number, max: number, r: Rand) => min + Math.floor(r() * (max - min + 1));
let seq = 0;

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const fmtPct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

export function randomCard(r: Rand, rank?: Rank): Card {
  const rk = rank ?? pick(RANKS, r);
  return { id: `q${seq++}`, suit: pick(SUITS, r), rank: rk, value: rankValue(rk) };
}

/** 正解と、まぎらわしい選択肢を合わせて4つにする(重複なし、並びはランダム) */
function withDistractors(answer: number, candidates: number[], r: Rand, format: (n: number) => string): string[] {
  const set = new Set<number>([answer]);
  for (const c of shuffle(candidates, r)) {
    if (set.size >= 4) break;
    set.add(c);
  }
  let k = 1;
  while (set.size < 4) {
    set.add(answer + k);
    k = k > 0 ? -k : -k + 1;
  }
  return shuffle([...set], r).map(format);
}

/** このカードは何点? */
export function pointQuestion(r: Rand): PointQ {
  const card = randomCard(r);
  return { id: seq++, kind: 'point', card, choices: ['+1', '0', '-1'], answer: signed(hiLoValue(card.rank)) };
}

/** 順番に出るカードを数えて、ランニングカウントを答える */
export function countQuestion(r: Rand, length?: number): CountQ {
  const n = length ?? int(4, 6, r);
  const cards = Array.from({ length: n }, () => randomCard(r));
  const rc = cards.reduce((s, c) => s + hiLoValue(c.rank), 0);
  return {
    id: seq++,
    kind: 'count',
    cards,
    choices: withDistractors(rc, [rc + 1, rc - 1, rc + 2, rc - 2, -rc], r, signed),
    answer: signed(rc),
  };
}

/** のこり T 枚のうち target が k 枚。次に target が出る確率は? (T は割り切れやすい数にする) */
export function probQuestion(r: Rand): ProbQ {
  const total = pick([10, 20, 25], r);
  const target = pick<Rank>(['A', 'K', '5', '7', '10'], r);
  const count = int(1, Math.min(6, total / 2), r);
  const pct = (count / total) * 100;
  const others = RANKS.filter((x) => x !== target);
  const pile = shuffle(
    [...Array.from({ length: count }, () => randomCard(r, target)), ...Array.from({ length: total - count }, () => randomCard(r, pick(others, r)))],
    r,
  );
  return {
    id: seq++,
    kind: 'prob',
    total,
    target,
    count,
    pile,
    // まちがえやすい答え: 2倍・半分・1枚ずれ・枚数をそのまま%にしたもの
    choices: withDistractors(
      pct,
      [pct * 2, pct / 2, ((count + 1) / total) * 100, ((count - 1) / total) * 100, count].filter((x) => x > 0 && x <= 100),
      r,
      fmtPct,
    ),
    answer: fmtPct(pct),
  };
}

/** drawn を1枚引いたら、次に target が出る確率は上がる? 下がる? */
export function changeQuestion(r: Rand): ChangeQ {
  const total = pick([20, 30, 40, 52], r);
  const target = pick<Rank>(['A', '10', 'K', '6'], r);
  const same = r() < 0.4;
  const drawn = same ? target : pick(RANKS.filter((x) => x !== target), r);
  const targetCount = int(2, 4, r);
  const drawnCount = same ? targetCount : int(1, 4, r);
  return {
    id: seq++,
    kind: 'change',
    total,
    drawn,
    target,
    targetCount,
    drawnCount,
    choices: ['上がる', '下がる', '変わらない'],
    answer: same ? '下がる' : '上がる',
  };
}

/** ランニングカウントと残りデッキ数から、トゥルーカウントを答える(割り切れる数にする) */
export function tcQuestion(r: Rand): TcQ {
  const decks = pick([1, 2, 3, 4, 5, 6], r);
  let tc = int(-3, 4, r);
  if (tc === 0) tc = 2;
  const rc = tc * decks;
  return {
    id: seq++,
    kind: 'tc',
    rc,
    decks,
    choices: withDistractors(tc, [rc, tc + 1, tc - 1, -tc, rc * decks].filter((x) => Math.abs(x) <= 30), r, signed),
    answer: signed(tc),
  };
}

const MAKERS: Record<QuizKind, (r: Rand) => Question> = {
  point: pointQuestion,
  count: (r) => countQuestion(r),
  prob: probQuestion,
  change: changeQuestion,
  tc: tcQuestion,
};

/** モードに合わせて、問題を n 問作る。同じ種類が続きすぎないように順番に回す */
export function makeQuiz(mode: QuizMode, n: number, r: Rand = Math.random): Question[] {
  const kinds = MODE_KINDS[mode];
  const order = shuffle(kinds, r);
  return Array.from({ length: n }, (_, i) => MAKERS[order[i % order.length]](r));
}
