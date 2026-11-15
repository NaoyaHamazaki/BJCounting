import type { Card, HandResult } from './types';

export type HandTotal = { total: number; soft: boolean };

/** 合計を計算する。A は 11 で数え、21 を超えるあいだ 1 に落とす。soft = 11 として数えている A が残っている */
export function handTotal(cards: Card[]): HandTotal {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.value;
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards).total === 21;
}

export function isBust(cards: Card[]): boolean {
  return handTotal(cards).total > 21;
}

/** 同じ値(10/J/Q/K は同じ扱い)の2枚ならスプリットできる */
export function isPair(cards: Card[]): boolean {
  return cards.length === 2 && cards[0].value === cards[1].value;
}

/** S17: ディーラーは16以下で引き、ソフト17を含む17以上で止まる */
export function dealerShouldHit(cards: Card[]): boolean {
  return handTotal(cards).total < 17;
}

/**
 * CPU の簡易戦略(ベーシックストラテジーを簡略化したもの)。
 * ソフトは17以下でヒット。ハードは11以下でヒット、12〜16はディーラーのアップカードが7以上ならヒット、17以上はスタンド。
 */
export function cpuShouldHit(cards: Card[], dealerUp: Card | undefined): boolean {
  const { total, soft } = handTotal(cards);
  if (total >= 21) return false;
  if (soft) return total <= 17;
  if (total <= 11) return true;
  if (total <= 16) return (dealerUp?.value ?? 10) >= 7;
  return false;
}

/**
 * 1ハンドの勝敗と、戻る額(賭け金を含む)を決める。
 * fromSplit のハンドで 21 になっても、ブラックジャックではなく通常の 21 として扱う。
 */
export function settleHand(
  player: Card[],
  dealer: Card[],
  bet: number,
  fromSplit: boolean,
): { result: HandResult; payout: number } {
  const p = handTotal(player).total;
  const d = handTotal(dealer).total;
  const playerBJ = !fromSplit && isBlackjack(player);
  const dealerBJ = isBlackjack(dealer);

  if (p > 21) return { result: 'bust', payout: 0 };
  if (playerBJ && dealerBJ) return { result: 'push', payout: bet };
  if (playerBJ) return { result: 'blackjack', payout: bet * 2.5 };
  if (dealerBJ) return { result: 'lose', payout: 0 };
  if (d > 21 || p > d) return { result: 'win', payout: bet * 2 };
  if (p === d) return { result: 'push', payout: bet };
  return { result: 'lose', payout: 0 };
}
