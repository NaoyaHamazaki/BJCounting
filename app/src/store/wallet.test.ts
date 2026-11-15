import { describe, expect, it } from 'vitest';
import { canClaimBonus, dayKey, exchange, exchangeRange, maxChipsFor, MONEY_PER_CHIP } from './wallet';

describe('チップと所持金', () => {
  it('1チップ = 所持金20。ログインボーナス20000で1000チップ買える', () => {
    expect(MONEY_PER_CHIP).toBe(20);
    expect(maxChipsFor(20000)).toBe(1000);
    expect(maxChipsFor(39)).toBe(1);
  });
  it('所持金→チップ、チップ→所持金の両方向に交換できる', () => {
    expect(exchange({ chips: 0, money: 20000 }, 1000)).toEqual({ chips: 1000, money: 0 });
    expect(exchange({ chips: 300, money: 0 }, -300)).toEqual({ chips: 0, money: 6000 });
  });
  it('足りないときや、0枚・小数の交換はできない', () => {
    expect(exchange({ chips: 0, money: 19 }, 1)).toBeNull();
    expect(exchange({ chips: 5, money: 0 }, -6)).toBeNull();
    expect(exchange({ chips: 5, money: 100 }, 0)).toBeNull();
    expect(exchange({ chips: 5, money: 100 }, 1.5)).toBeNull();
  });
  it('ログインボーナスは1日1回(端末の日付が変わると、また受け取れる)', () => {
    const today = dayKey(new Date(2026, 10, 16, 23, 59));
    expect(today).toBe('2026-11-16');
    expect(canClaimBonus(null, today)).toBe(true);
    expect(canClaimBonus(today, today)).toBe(false);
    expect(canClaimBonus(today, dayKey(new Date(2026, 10, 17, 0, 1)))).toBe(true);
  });
  it('チップ交換のスライダーは100枚ずつ。端数のチップと、2,000に満たない所持金は残る', () => {
    expect(exchangeRange(500, 8000)).toEqual({ min: 0, max: 900 });
    expect(exchangeRange(537, 3999)).toEqual({ min: 37, max: 637 });
    expect(exchangeRange(40, 1999)).toEqual({ min: 40, max: 40 });
    expect(exchangeRange(0, 20000)).toEqual({ min: 0, max: 1000 });
  });
});

describe('クイズ・トレーニングでかせぐ', () => {
  it('1日 10,000 まで。上限をこえた分は足さない', async () => {
    const { grantStudy, studyLeft, STUDY_DAILY_CAP } = await import('./wallet');
    expect(STUDY_DAILY_CAP).toBe(10000);
    let w = { studyDay: null as string | null, studyEarned: 0 };
    let g = grantStudy(w, 9950, '2026-11-16');
    expect(g.granted).toBe(9950);
    w = g;
    g = grantStudy(w, 100, '2026-11-16');
    expect(g.granted).toBe(50);
    expect(studyLeft(g, '2026-11-16')).toBe(0);
  });
  it('日付が変わると、また 10,000 までかせげる', async () => {
    const { grantStudy, studyLeft } = await import('./wallet');
    const w = { studyDay: '2026-11-16', studyEarned: 10000 };
    expect(studyLeft(w, '2026-11-17')).toBe(10000);
    expect(grantStudy(w, 100, '2026-11-17')).toEqual({ granted: 100, studyDay: '2026-11-17', studyEarned: 100 });
  });
});
