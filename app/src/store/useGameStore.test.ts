import { beforeEach, describe, expect, it } from 'vitest';
import { runningCountOf } from '../game/count';
import { rankValue } from '../game/deck';
import type { Card, Rank } from '../game/types';
import { EMPTY_STATS } from './profile';
import { chipsAtStake, INITIAL_BANKROLL, initialData, unseenCards, useGameStore } from './useGameStore';
import { useProfile } from './useProfile';

let n = 0;
const c = (rank: Rank): Card => ({ id: `s${n++}`, suit: 'Hearts', rank, value: rankValue(rank) });

/** 配る順に並べたカードをシューに積む(末尾から引くので逆順にする) */
function stackShoe(order: Rank[], deckCount = 1) {
  const filler = Array.from({ length: 52 * deckCount - order.length }, () => c('8'));
  useGameStore.setState({ ...initialData(deckCount, 0), shoe: [...filler, ...order.map(c).reverse()] });
}

const st = () => useGameStore.getState();

describe('ラウンドの進行(結合)', () => {
  beforeEach(() => useGameStore.setState(initialData(1, 0)));

  it('配札: 4枚配り、ホールカードはカウントしない', () => {
    // プレイヤー5, ディーラー10, プレイヤー6, ホール2
    stackShoe(['5', '10', '6', '2']);
    st().addChip(25);
    st().deal();
    const s = st();
    expect(s.phase).toBe('playerTurn');
    expect(s.seen).toHaveLength(3);
    expect(s.runningCount).toBe(1); // +1 -1 +1
    expect(unseenCards(s)).toHaveLength(52 - 3);
    expect(s.bankroll).toBe(INITIAL_BANKROLL - 25);
  });

  it('スタンドするとディーラーが S17 まで引き、精算される', async () => {
    // P10, D10, P9, ホール6, ディーラーが引く5 → 21
    stackShoe(['10', '10', '9', '6', '5']);
    st().addChip(100);
    st().deal();
    st().stand();
    await new Promise((r) => setTimeout(r, 2500));
    const s = st();
    expect(s.phase).toBe('roundOver');
    expect(s.dealer).toHaveLength(3);
    expect(s.hands[0].result).toBe('lose');
    expect(s.runningCount).toBe(runningCountOf(s.seen));
    expect(s.seen).toHaveLength(5);
  }, 5000);

  it('プレイヤーのブラックジャックは即精算で 3:2', () => {
    stackShoe(['A', '9', 'K', '7']);
    st().addChip(100);
    st().deal();
    const s = st();
    expect(s.phase).toBe('roundOver');
    expect(s.hands[0].result).toBe('blackjack');
    expect(s.bankroll).toBe(INITIAL_BANKROLL + 150);
    expect(s.holeRevealed).toBe(true);
  });

  it('アップカードが A ならインシュランスを聞き、ディーラーBJなら 2:1 で払う', () => {
    stackShoe(['10', 'A', '9', 'K']);
    st().addChip(100);
    st().deal();
    expect(st().phase).toBe('insurance');
    st().takeInsurance(true);
    const s = st();
    expect(s.phase).toBe('roundOver');
    expect(s.hands[0].result).toBe('lose');
    // ベット100を失い、インシュランス50が150になって戻る → 差し引き0
    expect(s.bankroll).toBe(INITIAL_BANKROLL);
  });

  it('ダブル: 賭け金が2倍になり、1枚だけ受け取る', async () => {
    stackShoe(['6', '10', '5', '7', 'K']);
    st().addChip(50);
    st().deal();
    st().double();
    const s = st();
    expect(s.hands[0].bet).toBe(100);
    expect(s.hands[0].cards).toHaveLength(3);
    expect(s.phase).toBe('dealerTurn');
    await new Promise((r) => setTimeout(r, 1500));
    expect(st().hands[0].result).toBe('win'); // 21 vs 17
    expect(st().bankroll).toBe(INITIAL_BANKROLL + 100);
  });

  it('スプリット: 2ハンドに分かれ、それぞれ1枚ずつ追加される', () => {
    stackShoe(['8', '10', '8', '7', '3', '2']);
    st().addChip(10);
    st().deal();
    st().split();
    const s = st();
    expect(s.hands).toHaveLength(2);
    expect(s.hands[0].cards.map((x) => x.rank)).toEqual(['8', '3']);
    expect(s.hands[1].cards.map((x) => x.rank)).toEqual(['8', '2']);
    expect(s.bankroll).toBe(INITIAL_BANKROLL - 20);
    expect(s.active).toBe(0);
  });

  it('75% を超えたら、次のラウンドの前にシャッフルしてカウントを 0 に戻す', () => {
    useGameStore.setState({ ...initialData(1, 0), phase: 'roundOver', runningCount: 5 });
    useGameStore.setState({ shoe: st().shoe.slice(0, 10) }); // 42枚配った状態
    st().nextRound();
    const s = st();
    expect(s.shoe).toHaveLength(52);
    expect(s.runningCount).toBe(0);
    expect(s.seen).toHaveLength(0);
    expect(s.justShuffled).toBe(true);
  });

  it('リセットはシューとカウントだけ戻し、チップはそのまま(置いたベットは手元に戻る)', () => {
    useGameStore.setState({ bankroll: 1500 });
    st().addChip(100);
    st().reset();
    expect(st().bankroll).toBe(1500);
    expect(st().bet).toBe(0);
    expect(st().shoe).toHaveLength(52);
    expect(st().runningCount).toBe(0);
  });

  it('チップ交換: チップを増減でき、足りなければ減らせない', () => {
    expect(st().adjustChips(50)).toBe(true);
    expect(st().bankroll).toBe(INITIAL_BANKROLL + 50);
    expect(st().adjustChips(-(INITIAL_BANKROLL + 51))).toBe(false);
    expect(st().bankroll).toBe(INITIAL_BANKROLL + 50);
  });
});

describe('CPU と同じテーブル(結合)', () => {
  it('配札は 右CPU → 自分 → 左CPU → ディーラー の順で2周。CPU のカードもカウントされる', () => {
    // CPU 2人(CPU1=右, CPU2=左)。1周目: CPU1=2, 自分=10, CPU2=3, ディーラー=9 / 2周目: CPU1=4, 自分=9, CPU2=5, ホール=7
    const order = ['2', '10', '3', '9', '4', '9', '5', '7'] as Rank[];
    const filler = Array.from({ length: 52 - order.length }, () => c('8'));
    useGameStore.setState({ ...initialData(1, 2), shoe: [...filler, ...order.map(c).reverse()] });
    st().addChip(10);
    st().deal();
    const s = st();
    expect(s.cpus[0].side).toBe('right');
    expect(s.cpus[1].side).toBe('left');
    expect(s.cpus[0].cards.map((x) => x.rank)).toEqual(['2', '4']);
    expect(s.hands[0].cards.map((x) => x.rank)).toEqual(['10', '9']);
    expect(s.cpus[1].cards.map((x) => x.rank)).toEqual(['3', '5']);
    expect(s.dealer.map((x) => x.rank)).toEqual(['9', '7']);
    // ホール以外の7枚: +1 -1 +1 0 +1 0 +1 = +3
    expect(s.seen).toHaveLength(7);
    expect(s.runningCount).toBe(3);
    // 右の CPU が先に行動する
    expect(s.phase).toBe('cpuTurn');
    expect(s.activeCpu).toBe(0);
  });

  it('最後まで自動で進み、全員が精算され、RC は出たカードの合計と一致する', async () => {
    useGameStore.setState(initialData(2, 2));
    st().addChip(10);
    st().deal();
    for (let i = 0; i < 40 && st().phase !== 'roundOver'; i++) {
      if (st().phase === 'insurance') st().takeInsurance(false);
      if (st().phase === 'playerTurn') st().stand();
      await new Promise((r) => setTimeout(r, 400));
    }
    const s = st();
    expect(s.phase).toBe('roundOver');
    expect(s.cpus.every((x) => x.result)).toBe(true);
    expect(s.runningCount).toBe(runningCountOf(s.seen));
  }, 20000);

  it('CPU の人数を変えると席が作り直される', () => {
    st().setCpuCount(3);
    expect(st().cpus.map((x) => x.side)).toEqual(['right', 'right', 'left']);
  });
});
describe('解説用の記録(roundLog)', () => {
  it('表になったカードだけが、引く前の状態つきで記録される。ホールカードは開いたときに記録', async () => {
    // P5, D10, P6, ホール2 → スタンド → ディーラー 12 なので 1枚引く(8)
    const order = ['5', '10', '6', '2', '8'] as Rank[];
    const filler = Array.from({ length: 52 - order.length }, () => c('9'));
    useGameStore.setState({ ...initialData(1, 0), shoe: [...filler, ...order.map(c).reverse()] });
    st().addChip(10);
    st().deal();
    let log = st().roundLog;
    expect(log.map((e) => e.card.rank)).toEqual(['5', '10', '6']);
    expect(log.map((e) => e.owner)).toEqual(['あなた', 'ディーラー', 'あなた']);
    // 1枚目を引く前は 52枚すべてが見えていない
    expect(log[0].totalBefore).toBe(52);
    expect(log[0].rcBefore).toBe(0);
    // 3枚目を引く前: 52 - 2枚(表) = 50枚(伏せたホールカードを含む)
    expect(log[2].totalBefore).toBe(50);
    expect(log[2].rcBefore).toBe(0); // +1 -1
    st().stand();
    await new Promise((r) => setTimeout(r, 2000));
    log = st().roundLog;
    expect(log.map((e) => e.owner)).toEqual(['あなた', 'ディーラー', 'あなた', 'ディーラー(伏せていたカード)', 'ディーラー']);
    expect(log[3].totalBefore).toBe(49);
    // 最後の記録の RC + その点数 = 現在の RC
    const last = log[log.length - 1];
    expect(last.rcBefore + 0).toBe(st().runningCount); // 8 は 0点
  }, 5000);

  it('ラウンド途中で CPU 人数を変えると、賭けたチップが戻る', () => {
    stackShoe(['5', '10', '6', '2']);
    st().addChip(100);
    st().deal();
    expect(st().bankroll).toBe(INITIAL_BANKROLL - 100);
    st().setCpuCount(2);
    expect(st().bankroll).toBe(INITIAL_BANKROLL);
    expect(st().phase).toBe('betting');
    expect(st().cpus).toHaveLength(2);
  });
});
describe('テーブルに置いているチップ', () => {
  it('配札前はベット、ラウンド中は賭け金、精算後は0', () => {
    const base = initialData(1, 0);
    expect(chipsAtStake({ ...base, bet: 30 })).toBe(30);
    const hand = { cards: [], bet: 40, doubled: false, done: false, splitAces: false };
    expect(chipsAtStake({ ...base, phase: 'playerTurn', hands: [hand], insurance: 20 })).toBe(60);
    expect(chipsAtStake({ ...base, phase: 'roundOver', hands: [hand] })).toBe(0);
  });
});

describe('記録(結合)', () => {
  it('精算したラウンドの勝ち負けが記録に足され、中止したラウンドは数えない', async () => {
    useProfile.setState({ stats: { ...EMPTY_STATS } });
    // プレイヤー 10+9=19、ディーラー 10+7=17 → 勝ち
    stackShoe(['10', '10', '9', '7']);
    st().addChip(25);
    st().deal();
    st().stand();
    await new Promise((r) => setTimeout(r, 1500));
    expect(st().phase).toBe('roundOver');
    expect(useProfile.getState().stats).toMatchObject({ rounds: 1, wins: 1, net: 25 });
    // 配札してからリセット → 数えない
    st().nextRound();
    stackShoe(['10', '10', '9', '7']);
    st().addChip(25);
    st().deal();
    st().reset();
    expect(useProfile.getState().stats.rounds).toBe(1);
  });
});
