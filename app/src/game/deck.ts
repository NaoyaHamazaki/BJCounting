import { RANKS, SUITS, type Card, type Rank } from './types';

export const CARDS_PER_DECK = 52;

export function rankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

/** デッキ数に応じたカード配列を作る(シャッフル前) */
export function createShoe(deckCount: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${d}-${suit}-${rank}`, suit, rank, value: rankValue(rank) });
      }
    }
  }
  return cards;
}

/** Fisher-Yates シャッフル。元の配列は変えない */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createShuffledShoe(deckCount: number, random?: () => number): Card[] {
  return shuffle(createShoe(deckCount), random);
}
