import { describe, expect, it } from 'vitest';
import { canClaimBonus, dayKey, exchange, maxChipsFor, MONEY_PER_CHIP } from './wallet';

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
});
