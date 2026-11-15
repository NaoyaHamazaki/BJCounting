import { describe, expect, it } from 'vitest';
import { hiLoValue } from '../game/count';
import { changeQuestion, countQuestion, makeQuiz, MODE_KINDS, pointQuestion, probQuestion, signed, tcQuestion } from './questions';

/** 再現できる乱数(テスト用) */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('クイズの問題', () => {
  it('どの問題も、正解が選択肢に1つだけ含まれ、選択肢に重複がない', () => {
    const r = seeded(1);
    for (let i = 0; i < 300; i++) {
      for (const q of [pointQuestion(r), countQuestion(r), probQuestion(r), changeQuestion(r), tcQuestion(r)]) {
        expect(q.choices.filter((c) => c === q.answer)).toHaveLength(1);
        expect(new Set(q.choices).size).toBe(q.choices.length);
      }
    }
  });

  it('点数クイズの正解は Hi-Lo の点数', () => {
    const r = seeded(2);
    for (let i = 0; i < 50; i++) {
      const q = pointQuestion(r);
      expect(q.answer).toBe(signed(hiLoValue(q.card.rank)));
    }
  });

  it('カウントクイズの正解は、出たカードの点数の合計', () => {
    const q = countQuestion(seeded(3), 5);
    expect(q.cards).toHaveLength(5);
    expect(q.answer).toBe(signed(q.cards.reduce((s, c) => s + hiLoValue(c.rank), 0)));
  });

  it('確率クイズ: 山の枚数と、目当てのカードの枚数が問題文と一致する', () => {
    const r = seeded(4);
    for (let i = 0; i < 50; i++) {
      const q = probQuestion(r);
      expect(q.pile).toHaveLength(q.total);
      expect(q.pile.filter((c) => c.rank === q.target)).toHaveLength(q.count);
    }
  });

  it('確率の増減: 同じカードを引くと下がる、ちがうカードなら上がる', () => {
    const r = seeded(5);
    for (let i = 0; i < 50; i++) {
      const q = changeQuestion(r);
      expect(q.answer).toBe(q.drawn === q.target ? '下がる' : '上がる');
    }
  });

  it('トゥルーカウントは割り切れる数で、RC ÷ デッキ数', () => {
    const r = seeded(6);
    for (let i = 0; i < 50; i++) {
      const q = tcQuestion(r);
      expect(q.answer).toBe(signed(q.rc / q.decks));
    }
  });

  it('モードに合った種類の問題を、指定した数だけ作る', () => {
    const qs = makeQuiz('prob', 10, seeded(7));
    expect(qs).toHaveLength(10);
    expect(qs.every((q) => MODE_KINDS.prob.includes(q.kind))).toBe(true);
    const all = makeQuiz('all', 10, seeded(8));
    expect(new Set(all.map((q) => q.kind)).size).toBe(5);
  });
});
