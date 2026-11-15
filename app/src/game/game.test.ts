import { describe, expect, it } from 'vitest';
import { blackjackChance, chanceLevel, countByGroup, countBySuitRank, freshBlackjackChance, hiLoValue, probabilityByGroup, remainLevel, runningCountOf, SEVENS_ORDER, trueCountOf } from './count';
import { createShoe, createShuffledShoe, rankValue, shuffle } from './deck';
import { cpuShouldHit, dealerShouldHit, handTotal, isBlackjack, isPair, settleHand } from './hand';
import type { Card, Rank } from './types';

let n = 0;
const c = (rank: Rank): Card => ({ id: `t${n++}`, suit: 'Spades', rank, value: rankValue(rank) });
const cs = (...ranks: Rank[]) => ranks.map(c);

describe('デッキ', () => {
  it('1〜8デッキで 52×N 枚を作る', () => {
    for (let d = 1; d <= 8; d++) expect(createShoe(d)).toHaveLength(52 * d);
  });
  it('各ランクはデッキあたり4枚、id は重複しない', () => {
    const shoe = createShoe(6);
    const counts = countByGroup(shoe);
    expect(counts['2']).toBe(24);
    expect(counts.JQK).toBe(72);
    expect(counts.A).toBe(24);
    expect(new Set(shoe.map((x) => x.id)).size).toBe(shoe.length);
  });
  it('シャッフルは同じカードの並べ替えで、元の配列を変えない', () => {
    const shoe = createShoe(1);
    const copy = shoe.slice();
    const s = shuffle(shoe, () => 0.3);
    expect(shoe).toEqual(copy);
    expect([...s].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...shoe].sort((a, b) => a.id.localeCompare(b.id)));
    expect(createShuffledShoe(2)).toHaveLength(104);
  });
});

describe('Hi-Lo カウント', () => {
  it('2〜6 は +1、7〜9 は 0、10〜A は -1', () => {
    (['2', '3', '4', '5', '6'] as Rank[]).forEach((r) => expect(hiLoValue(r)).toBe(1));
    (['7', '8', '9'] as Rank[]).forEach((r) => expect(hiLoValue(r)).toBe(0));
    (['10', 'J', 'Q', 'K', 'A'] as Rank[]).forEach((r) => expect(hiLoValue(r)).toBe(-1));
  });
  it('1デッキを全部数えると 0 になる(バランス型)', () => {
    expect(runningCountOf(createShoe(1))).toBe(0);
  });
  it('トゥルーカウント = RC / 残りデッキ数', () => {
    expect(trueCountOf(6, 156)).toBeCloseTo(2); // 3デッキ残りで RC+6
    expect(trueCountOf(-3, 26)).toBeCloseTo(-6); // 半デッキ残りで RC-3
    expect(trueCountOf(5, 0)).toBe(0);
  });
});

describe('確率', () => {
  it('残り枚数 / 全体 × 100、合計は 100%', () => {
    const p = probabilityByGroup(createShoe(1));
    expect(p['2']).toBeCloseTo((4 / 52) * 100);
    expect(p.JQK).toBeCloseTo((12 / 52) * 100);
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });
  it('残りが 0 枚なら全部 0%', () => {
    expect(Object.values(probabilityByGroup([])).every((v) => v === 0)).toBe(true);
  });
});

describe('ハンド', () => {
  it('A を 11 / 1 で数える', () => {
    expect(handTotal(cs('A', '6'))).toEqual({ total: 17, soft: true });
    expect(handTotal(cs('A', '6', '10'))).toEqual({ total: 17, soft: false });
    expect(handTotal(cs('A', 'A', '9'))).toEqual({ total: 21, soft: true });
    expect(handTotal(cs('K', 'Q', '5')).total).toBe(25);
  });
  it('ブラックジャックとペアの判定', () => {
    expect(isBlackjack(cs('A', 'K'))).toBe(true);
    expect(isBlackjack(cs('7', '7', '7'))).toBe(false);
    expect(isPair(cs('K', '10'))).toBe(true);
    expect(isPair(cs('9', '8'))).toBe(false);
  });
  it('ディーラーは 16 以下で引き、ソフト17 を含む 17 以上で止まる(S17)', () => {
    expect(dealerShouldHit(cs('10', '6'))).toBe(true);
    expect(dealerShouldHit(cs('A', '6'))).toBe(false);
    expect(dealerShouldHit(cs('10', '7'))).toBe(false);
  });
});

describe('精算', () => {
  it('ブラックジャックは 3:2', () => {
    expect(settleHand(cs('A', 'K'), cs('10', '9'), 10, false)).toEqual({ result: 'blackjack', payout: 25 });
  });
  it('スプリット後の A+10 は通常の 21(1:1)', () => {
    expect(settleHand(cs('A', 'K'), cs('10', '9'), 10, true)).toEqual({ result: 'win', payout: 20 });
  });
  it('両者ブラックジャックは引き分け', () => {
    expect(settleHand(cs('A', 'K'), cs('A', 'Q'), 10, false).result).toBe('push');
  });
  it('バーストはディーラーの結果に関係なく負け', () => {
    expect(settleHand(cs('10', '6', '9'), cs('10', '6', '8'), 10, false)).toEqual({ result: 'bust', payout: 0 });
  });
  it('ディーラーのバーストで勝ち、同点は引き分け、低いと負け', () => {
    expect(settleHand(cs('10', '2'), cs('10', '6', '8'), 10, false).payout).toBe(20);
    expect(settleHand(cs('10', '8'), cs('10', '8'), 10, false).payout).toBe(10);
    expect(settleHand(cs('10', '7'), cs('10', '8'), 10, false).payout).toBe(0);
  });
  it('ディーラーのブラックジャックには、通常の 21 でも負け', () => {
    expect(settleHand(cs('7', '7', '7'), cs('A', 'K'), 10, false).result).toBe('lose');
  });
});

describe('CPU の戦略', () => {
  it('ソフト17以下はヒット、ハード12〜16はディーラーが7以上ならヒット', () => {
    expect(cpuShouldHit(cs('A', '6'), c('5'))).toBe(true);
    expect(cpuShouldHit(cs('A', '7'), c('10'))).toBe(false);
    expect(cpuShouldHit(cs('10', '5'), c('9'))).toBe(true);
    expect(cpuShouldHit(cs('10', '5'), c('6'))).toBe(false);
    expect(cpuShouldHit(cs('5', '6'), c('6'))).toBe(true);
    expect(cpuShouldHit(cs('10', '7'), c('A'))).toBe(false);
  });
});
describe('チャンスの判定', () => {
  it('3パターン: TC +1 未満は非表示、+1 以上で chance?、+2 以上で chance!', () => {
    expect(chanceLevel(0.9)).toBe(0);
    expect(chanceLevel(1)).toBe(1);
    expect(chanceLevel(1.9)).toBe(1);
    expect(chanceLevel(2)).toBe(2);
    expect(chanceLevel(6)).toBe(2);
    expect(chanceLevel(-5)).toBe(0);
  });
  it('ブラックジャックになる確率: シャッフル直後の1デッキは 2×4×16÷(52×51) ≒ 4.83%', () => {
    expect(freshBlackjackChance(1)).toBeCloseTo((2 * 4 * 16 * 100) / (52 * 51));
    expect(blackjackChance(createShoe(1))).toBeCloseTo(freshBlackjackChance(1));
  });
  it('小さいカードが減ると、ブラックジャックになる確率が上がる', () => {
    const shoe = createShoe(1).filter((c, i) => !(c.value <= 6 && i % 2 === 0));
    expect(blackjackChance(shoe)).toBeGreaterThan(freshBlackjackChance(1));
  });
});describe('カード一覧(七並べ)', () => {
  it('マーク×数字ごとの残り枚数: 6デッキなら各カード6枚、1枚引くとそのカードだけ5枚', () => {
    const shoe = createShoe(6);
    const all = countBySuitRank(shoe);
    expect(Object.keys(all)).toHaveLength(52);
    expect(Object.values(all).every((v) => v === 6)).toBe(true);
    const i = shoe.findIndex((x) => x.suit === 'Hearts' && x.rank === '7');
    const after = countBySuitRank(shoe.filter((_, k) => k !== i));
    expect(after['Hearts-7']).toBe(5);
    expect(after['Spades-7']).toBe(6);
    expect(SEVENS_ORDER[0]).toBe('A');
    expect(SEVENS_ORDER[12]).toBe('K');
  });
  it('色分けの段階: 0 は残りなし、全部あれば 6、6デッキの ①〜⑤ はすべて別の段階', () => {
    expect(remainLevel(0, 6)).toBe(0);
    expect(remainLevel(6, 6)).toBe(6);
    expect([5, 4, 3, 2, 1].map((n) => remainLevel(n, 6))).toEqual([5, 4, 3, 2, 1]);
    expect(remainLevel(1, 1)).toBe(6);
    expect(remainLevel(1, 2)).toBe(3);
    expect(remainLevel(7, 8)).toBe(5);
    expect(remainLevel(1, 8)).toBe(1);
  });
});
