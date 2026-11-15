import { CARDS_PER_DECK } from './deck';
import { RANK_GROUPS, RANKS, type Card, type Rank, type RankGroup } from './types';

/** Hi-Lo: 2〜6 は +1、7〜9 は 0、10〜A は -1 */
export function hiLoValue(rank: Rank): number {
  if (rank === 'A' || rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return -1;
  const n = Number(rank);
  return n <= 6 ? 1 : 0;
}

export function runningCountOf(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + hiLoValue(c.rank), 0);
}

export function remainingDecks(unseenCount: number): number {
  return unseenCount / CARDS_PER_DECK;
}

/** トゥルーカウント = ランニングカウント / 残りデッキ数。残りがないときは 0 */
export function trueCountOf(runningCount: number, unseenCount: number): number {
  if (unseenCount <= 0) return 0;
  return runningCount / remainingDecks(unseenCount);
}

/** 13ランク(A〜K)ごとの枚数 */
export function countByRank(cards: Card[]): Record<Rank, number> {
  const counts = Object.fromEntries(RANKS.map((r) => [r, 0])) as Record<Rank, number>;
  for (const c of cards) counts[c.rank]++;
  return counts;
}

export function rankGroupOf(rank: Rank): RankGroup {
  return rank === 'J' || rank === 'Q' || rank === 'K' ? 'JQK' : rank;
}

/** 区分ごとの枚数 */
export function countByGroup(cards: Card[]): Record<RankGroup, number> {
  const counts = Object.fromEntries(RANK_GROUPS.map((g) => [g, 0])) as Record<RankGroup, number>;
  for (const c of cards) counts[rankGroupOf(c.rank)]++;
  return counts;
}

/** 区分ごとの「次に出る確率」(%) = 残り枚数 / 全体の残り枚数 * 100 */
export function probabilityByGroup(unseen: Card[]): Record<RankGroup, number> {
  const counts = countByGroup(unseen);
  const total = unseen.length;
  return Object.fromEntries(
    RANK_GROUPS.map((g) => [g, total === 0 ? 0 : (counts[g] / total) * 100]),
  ) as Record<RankGroup, number>;
}

/** 1デッキあたりの区分ごとの初期枚数 */
export function initialPerDeck(group: RankGroup): number {
  return group === 'JQK' ? 12 : 4;
}

/**
 * チャンスの判定(3パターン)。
 * 0 = 非表示(TC +1 未満) / 1 = chance?(TC +1 以上。もう少しでチャンス) / 2 = chance!(TC +2 以上)
 */
export const MAYBE_CHANCE_TC = 1;
export const CHANCE_TC = 2;
export type ChanceLevel = 0 | 1 | 2;
export function chanceLevel(trueCount: number): ChanceLevel {
  if (trueCount >= CHANCE_TC) return 2;
  if (trueCount >= MAYBE_CHANCE_TC) return 1;
  return 0;
}

const isTen = (c: Card) => c.value === 10;

/** 次の2枚がブラックジャック(A と 10点札)になる確率(%)。A→10 と 10→A の2通り */
export function blackjackChance(unseen: Card[]): number {
  const n = unseen.length;
  if (n < 2) return 0;
  const aces = unseen.filter((c) => c.rank === 'A').length;
  const tens = unseen.filter(isTen).length;
  return ((2 * aces * tens) / (n * (n - 1))) * 100;
}

/** シャッフル直後の、ブラックジャックになる確率(%) */
export function freshBlackjackChance(deckCount: number): number {
  const n = CARDS_PER_DECK * deckCount;
  return ((2 * (4 * deckCount) * (16 * deckCount)) / (n * (n - 1))) * 100;
}

export type HiLoBreakdown ={ low: number; neutral: number; high: number; total: number };

/** 残りカードを Hi-Lo の3区分(低 2-6 / 中 7-9 / 高 10-A)に分ける */
export function hiLoBreakdown(unseen: Card[]): HiLoBreakdown {
  const r = { low: 0, neutral: 0, high: 0, total: unseen.length };
  for (const c of unseen) {
    const v = hiLoValue(c.rank);
    if (v === 1) r.low++;
    else if (v === 0) r.neutral++;
    else r.high++;
  }
  return r;
}

/** 七並べの並び(1〜13)。A を 1、J・Q・K を 11〜13 として並べる */
export const SEVENS_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** マーク×数字ごとの残り枚数。キーは `${suit}-${rank}` */
export function countBySuitRank(cards: Card[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of cards) {
    const k = `${c.suit}-${c.rank}`;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

/**
 * 残り枚数の色分けの段階(0〜6)。0 = もう残っていない、6 = まだ全部ある。
 * 1〜5 は残りの割合で分ける(6デッキなら ①〜⑤ がそれぞれ別の色になる)
 */
export function remainLevel(remaining: number, deckCount: number): number {
  if (remaining <= 0) return 0;
  if (remaining >= deckCount) return 6;
  return Math.min(5, Math.max(1, Math.ceil((remaining / deckCount) * 5)));
}
