import { describe, expect, it } from 'vitest';
import { addRound, cleanName, displayName, EMPTY_STATS, newProfile } from './profile';

describe('プレイヤー情報と記録', () => {
  it('ゲスト番号は6けた。名前がなければゲスト番号で表示する', () => {
    const p = newProfile('2026-11-16', () => 0.5);
    expect(p.guestNo).toBe('550000');
    expect(displayName(p)).toBe('ゲスト550000');
    expect(displayName({ ...p, name: 'なおや' })).toBe('なおや');
  });
  it('名前は前後の空白を取り、12文字まで', () => {
    expect(cleanName('  たろう  ')).toBe('たろう');
    expect(cleanName('あいうえおかきくけこさしすせそ')).toBe('あいうえおかきくけこさし');
    expect(cleanName('   ')).toBe('');
  });
  it('ラウンドの結果を足す: 勝ち・負け・引き分けの数、勝ち負けの合計、最高の勝ち', () => {
    let s = addRound(EMPTY_STATS, 50);
    s = addRound(s, -25);
    s = addRound(s, 0);
    s = addRound(s, 150);
    expect(s).toMatchObject({ rounds: 4, wins: 2, losses: 1, pushes: 1, net: 175, bestWin: 150 });
  });
});
