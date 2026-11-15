import { create } from 'zustand';
import { countByRank, hiLoValue } from '../game/count';
import { CARDS_PER_DECK, createShuffledShoe, shuffle } from '../game/deck';
import { cpuShouldHit, dealerShouldHit, handTotal, isBlackjack, isBust, isPair, settleHand } from '../game/hand';
import type { Card, CpuSeat, LogEntry, Phase, PlayerHand } from '../game/types';
import { loadSettings } from './useSettings';
import { INITIAL_CHIPS, loadWallet, saveWallet } from './wallet';

export const INITIAL_BANKROLL = INITIAL_CHIPS;
export const DEFAULT_DECKS = 6;
export const DEFAULT_CPUS = 2;
export const MAX_CPUS = 3;
export const PENETRATION = 0.75;
export const MAX_HANDS = 4;
const STEP_MS = 650;
const CPU_BETS = [10, 25, 25, 50, 100];

export type GameData = {
  deckCount: number;
  cpuCount: number;
  /** シューに残っているカード(配る順。末尾から引く) */
  shoe: Card[];
  /** 使用済みカード(ディスカードトレイ) */
  discard: Card[];
  /** このシューで表向きになったカード(出た順)。自分・CPU・ディーラーすべて。カウントの対象 */
  seen: Card[];
  runningCount: number;
  bankroll: number;
  /** ベット中の額(配札前) */
  bet: number;
  lastBet: number;
  dealer: Card[];
  holeRevealed: boolean;
  hands: PlayerHand[];
  active: number;
  /** CPU の席(行動する順) */
  cpus: CpuSeat[];
  /** 行動中の CPU。いなければ -1 */
  activeCpu: number;
  phase: Phase;
  insurance: number;
  message: string;
  /** 直前のラウンド終了時にシャッフルした */
  justShuffled: boolean;
  /** このラウンドで表になったカードの記録(解説モーダル用) */
  roundLog: LogEntry[];
};

type Actions = {
  setDeckCount: (n: number) => void;
  setCpuCount: (n: number) => void;
  reset: () => void;
  /** 銀行でチップを交換したとき。delta > 0 で増やす、< 0 で減らす(足りなければ何もしない) */
  adjustChips: (delta: number) => boolean;
  addChip: (v: number) => void;
  clearBet: () => void;
  rebet: () => void;
  deal: () => void;
  takeInsurance: (take: boolean) => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  split: () => void;
  nextRound: () => void;
};

export type GameStore = GameData & Actions;

// 非同期の CPU・ディーラー処理が、リセット後のラウンドを触らないための番号
let roundToken = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function freshShoe(deckCount: number): Pick<GameData, 'shoe' | 'discard' | 'seen' | 'runningCount'> {
  return { shoe: createShuffledShoe(deckCount), discard: [], seen: [], runningCount: 0 };
}

/** CPU の席を作る。半分(端数は右)を自分より先に行動する右側に置く */
export function createCpus(n: number): CpuSeat[] {
  const right = Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i) => ({
    name: `CPU ${i + 1}`,
    side: i < right ? 'right' : 'left',
    cards: [],
    bet: 0,
  }));
}

export function initialData(deckCount = DEFAULT_DECKS, cpuCount = DEFAULT_CPUS): GameData {
  return {
    deckCount,
    cpuCount,
    ...freshShoe(deckCount),
    bankroll: INITIAL_BANKROLL,
    bet: 0,
    lastBet: 0,
    dealer: [],
    holeRevealed: false,
    hands: [],
    active: 0,
    cpus: createCpus(cpuCount),
    activeCpu: -1,
    phase: 'betting',
    insurance: 0,
    message: 'チップを置いて DEAL を押してください',
    justShuffled: false,
    roundLog: [],
  };
}

/** 1回の操作の中で状態を書き換えるための作業用コピー */
type Draft = GameData;

function draftOf(s: GameData): Draft {
  return {
    ...s,
    shoe: s.shoe.slice(),
    discard: s.discard.slice(),
    seen: s.seen.slice(),
    dealer: s.dealer.slice(),
    hands: s.hands.map((h) => ({ ...h, cards: h.cards.slice() })),
    cpus: s.cpus.map((c) => ({ ...c, cards: c.cards.slice() })),
    roundLog: s.roundLog.slice(),
  };
}

const DATA_KEYS = Object.keys(initialData(1, 0)) as (keyof GameData)[];
function dataOf(d: Draft): GameData {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, d[k]])) as GameData;
}

/** いま見えていないカード(シュー + 伏せたホールカード) */
function unseenNow(d: Draft): Card[] {
  return d.dealer[1] && !d.holeRevealed ? [...d.shoe, d.dealer[1]] : d.shoe;
}

/** カードが表になった。カウントに加え、解説用に「表になる前」の状態を記録する */
function markSeen(d: Draft, card: Card, owner: string) {
  const before = [...unseenNow(d), card];
  d.roundLog.push({ card, owner, rcBefore: d.runningCount, before: countByRank(before), totalBefore: before.length });
  d.seen.push(card);
  d.runningCount += hiLoValue(card.rank);
}

/** シューから1枚引く。owner を渡すと表向き(カウントに加える)、渡さなければ伏せる */
function draw(d: Draft, owner?: string): Card {
  if (d.shoe.length === 0) {
    // 通常は75%で再シャッフルするため起きないが、スプリットが続いた場合の保険
    d.shoe = shuffle(d.discard);
    d.discard = [];
    d.seen = [];
    d.runningCount = 0;
    d.message = 'シューが空になったため、使用済みカードをシャッフルしました(カウントは0から)';
  }
  const card = d.shoe.pop()!;
  if (owner) markSeen(d, card, owner);
  return card;
}

function revealHole(d: Draft) {
  if (!d.holeRevealed && d.dealer[1]) {
    d.holeRevealed = true;
    markSeen(d, d.dealer[1], 'ディーラー(伏せていたカード)');
  }
}

const userLabel = (d: Draft) => (d.hands.length > 1 ? `あなた(ハンド${d.active + 1})` : 'あなた');

/** テーブルのカードを片付ける。ラウンド途中なら、賭けたチップを返す */
function clearTable(d: Draft) {
  const midRound = d.phase !== 'betting' && d.phase !== 'roundOver';
  if (midRound) d.bankroll += d.hands.reduce((n, h) => n + h.bet, 0) + d.insurance;
  for (const h of d.hands) d.discard.push(...h.cards);
  for (const c of d.cpus) {
    d.discard.push(...c.cards);
    c.cards = [];
    c.result = undefined;
    c.bet = 0;
  }
  d.discard.push(...d.dealer);
  d.hands = [];
  d.dealer = [];
  d.holeRevealed = false;
  d.insurance = 0;
  d.active = 0;
  d.activeCpu = -1;
  d.phase = 'betting';
}

const RESULT_LABEL: Record<string, string> = {
  blackjack: 'ブラックジャック!',
  win: '勝ち',
  push: '引き分け',
  lose: '負け',
  bust: 'バースト',
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** 全員を精算して、ラウンドを終える */
function finishRound(d: Draft) {
  revealHole(d);
  d.activeCpu = -1;
  for (const c of d.cpus) {
    if (c.cards.length) c.result = settleHand(c.cards, d.dealer, c.bet, false).result;
  }
  const fromSplit = d.hands.length > 1;
  let returned = 0;
  let staked = d.insurance;
  for (const h of d.hands) {
    const { result, payout } = settleHand(h.cards, d.dealer, h.bet, fromSplit);
    h.result = result;
    h.payout = payout;
    h.done = true;
    returned += payout;
    staked += h.bet;
  }
  let insuranceText = '';
  if (d.insurance > 0) {
    if (isBlackjack(d.dealer)) {
      returned += d.insurance * 3;
      insuranceText = 'インシュランス的中。';
    } else {
      insuranceText = 'インシュランスは没収。';
    }
  }
  d.bankroll += returned;
  const net = returned - staked;
  const results = d.hands.map((h) => RESULT_LABEL[h.result!]).join(' / ');
  const dealerText = isBlackjack(d.dealer) ? 'ディーラーはブラックジャック。' : '';
  d.message = `${dealerText}${insuranceText}${results}(収支 ${net >= 0 ? '+' : ''}${fmt(net)})`;
  d.phase = 'roundOver';
}

/** ディーラーが引く必要があるか(バーストでも、ナチュラルBJでもないハンドが1つでもある) */
function anyLiveHand(s: GameData): boolean {
  const userSplit = s.hands.length > 1;
  const userLive = s.hands.some((h) => !isBust(h.cards) && (userSplit || !isBlackjack(h.cards)));
  const cpuLive = s.cpus.some((c) => c.cards.length > 0 && !isBust(c.cards) && !isBlackjack(c.cards));
  return userLive || cpuLive;
}

/** 現在のハンドが終わっていれば、次のハンドへ。全部終われば true */
function advance(d: Draft): boolean {
  while (d.active < d.hands.length) {
    const h = d.hands[d.active];
    if (!h.done && handTotal(h.cards).total >= 21) h.done = true;
    if (!h.done) return false;
    d.active++;
  }
  d.active = d.hands.length - 1;
  return true;
}

export const useGameStore = create<GameStore>((set, get) => {
  /** 作業用コピーで処理して、まとめて反映する */
  const mutate = <T,>(fn: (d: Draft) => T): T => {
    const d = draftOf(get());
    const r = fn(d);
    set(dataOf(d));
    return r;
  };

  /** 指定した側の CPU を、順番に自動でプレイさせる */
  const playCpus = async (side: 'right' | 'left', token: number) => {
    const order = get()
      .cpus.map((c, i) => ({ c, i }))
      .filter((x) => x.c.side === side)
      .map((x) => x.i);
    for (const i of order) {
      mutate((d) => {
        d.phase = 'cpuTurn';
        d.activeCpu = i;
        d.message = `${d.cpus[i].name} の番です`;
      });
      await sleep(STEP_MS);
      if (token !== roundToken) return false;
      while (cpuShouldHit(get().cpus[i].cards, get().dealer[0])) {
        mutate((d) => {
          d.cpus[i].cards.push(draw(d, d.cpus[i].name));
        });
        await sleep(STEP_MS);
        if (token !== roundToken) return false;
      }
    }
    mutate((d) => {
      d.activeCpu = -1;
    });
    return true;
  };

  const runDealer = async (token: number) => {
    mutate((d) => {
      d.phase = 'dealerTurn';
      revealHole(d);
      d.message = 'ディーラーの番です';
    });
    if (!anyLiveHand(get())) {
      mutate(finishRound);
      return;
    }
    while (dealerShouldHit(get().dealer)) {
      await sleep(STEP_MS);
      if (token !== roundToken) return;
      mutate((d) => {
        d.dealer.push(draw(d, 'ディーラー'));
      });
    }
    await sleep(STEP_MS / 2);
    if (token !== roundToken) return;
    mutate(finishRound);
  };

  const hasCpus = (side: 'right' | 'left') => get().cpus.some((c) => c.side === side);

  /**
   * 行動の順番: 右側の CPU → 自分 → 左側の CPU → ディーラー。
   * CPU がいない段階は待たずに進む(自分の番まで同期で進むので、テストもしやすい)。
   */
  const runFrom = async (stage: 'right' | 'user' | 'left') => {
    const token = roundToken;
    if (stage === 'right') {
      if (hasCpus('right') && !(await playCpus('right', token))) return;
      stage = 'user';
    }
    if (stage === 'user') {
      if (!get().hands.every((h) => h.done)) {
        set({ phase: 'playerTurn', message: 'あなたの番です。HIT / STAND / DOUBLE / SPLIT を選んでください' });
        return;
      }
      stage = 'left';
    }
    if (hasCpus('left') && !(await playCpus('left', token))) return;
    await runDealer(token);
  };

  /** 配札直後、またはインシュランス判断の後の続き */
  const afterPeek = () => {
    const s = get();
    if (isBlackjack(s.dealer)) {
      mutate(finishRound);
      return;
    }
    if (isBlackjack(s.hands[0].cards)) {
      mutate((d) => {
        d.hands[0].done = true;
      });
    }
    void runFrom('right');
  };

  const playerAction = (fn: (d: Draft, h: PlayerHand) => void) => {
    if (get().phase !== 'playerTurn') return;
    const finished = mutate((d) => {
      fn(d, d.hands[d.active]);
      return advance(d);
    });
    if (finished) void runFrom('left');
  };

  const betweenRounds = () => {
    const s = get();
    return s.phase === 'betting' || s.phase === 'roundOver';
  };

  const saved = loadSettings();

  return {
    ...initialData(saved.deckCount, saved.cpuCount),
    bankroll: loadWallet().chips,

    // 設定画面から呼ぶ。ラウンドの途中でも、賭けたチップを返してから反映する
    setDeckCount: (n) => {
      if (n === get().deckCount) return;
      roundToken++;
      const refund = mutate((d) => {
        clearTable(d);
        return d.bankroll + d.bet;
      });
      const s = get();
      set({
        ...initialData(n, s.cpuCount),
        bankroll: refund,
        lastBet: s.lastBet,
        message: `${n}デッキでシャッフルしました。チップを置いて DEAL を押してください`,
        justShuffled: true,
      });
    },

    setCpuCount: (n) => {
      if (n === get().cpuCount) return;
      roundToken++;
      mutate((d) => {
        clearTable(d);
        d.cpuCount = n;
        d.cpus = createCpus(n);
        d.message = 'チップを置いて DEAL を押してください';
      });
    },

    // シューとカウントだけ最初に戻す。チップはそのまま(ラウンドの途中なら、賭けたチップを返す)
    reset: () => {
      roundToken++;
      const chips = mutate((d) => {
        clearTable(d);
        return d.bankroll + d.bet;
      });
      const s = get();
      set({
        ...initialData(s.deckCount, s.cpuCount),
        bankroll: chips,
        lastBet: s.lastBet,
        message: 'シャッフルしました(カウントは0から)。チップを置いて DEAL を押してください',
        justShuffled: true,
      });
    },

    adjustChips: (delta) => {
      const s = get();
      if (!Number.isInteger(delta) || s.bankroll + delta < 0) return false;
      set({ bankroll: s.bankroll + delta });
      return true;
    },

    addChip: (v) => {
      if (!betweenRounds()) return;
      if (get().phase === 'roundOver') get().nextRound();
      const t = get();
      if (t.bankroll < v) return;
      set({ bankroll: t.bankroll - v, bet: t.bet + v });
    },

    clearBet: () => {
      const s = get();
      if (s.phase !== 'betting') return;
      set({ bankroll: s.bankroll + s.bet, bet: 0 });
    },

    rebet: () => {
      if (get().phase === 'roundOver') get().nextRound();
      const t = get();
      if (t.phase !== 'betting' || t.lastBet <= 0) return;
      const pool = t.bankroll + t.bet;
      if (pool < t.lastBet) return;
      set({ bankroll: pool - t.lastBet, bet: t.lastBet });
    },

    deal: () => {
      if (get().phase === 'roundOver') get().nextRound();
      if (get().phase !== 'betting' || get().bet <= 0) return;
      roundToken++;
      const offerInsurance = mutate((d) => {
        const bet = d.bet;
        d.lastBet = bet;
        d.bet = 0;
        d.insurance = 0;
        d.justShuffled = false;
        d.activeCpu = -1;
        d.roundLog = [];
        for (const c of d.cpus) {
          c.cards = [];
          c.result = undefined;
          c.bet = CPU_BETS[Math.floor(Math.random() * CPU_BETS.length)];
        }
        const right = d.cpus.filter((c) => c.side === 'right');
        const left = d.cpus.filter((c) => c.side === 'left');
        const user: Card[] = [];
        // 実際のテーブルと同じく、行動する順に1枚ずつ、2周配る(ディーラーの2枚目は伏せる)
        for (let round = 0; round < 2; round++) {
          for (const c of right) c.cards.push(draw(d, c.name));
          user.push(draw(d, 'あなた'));
          for (const c of left) c.cards.push(draw(d, c.name));
          d.dealer[round] = round === 0 ? draw(d, 'ディーラー') : draw(d);
        }
        d.dealer.length = 2;
        d.holeRevealed = false;
        d.hands = [{ cards: user, bet, doubled: false, done: false, splitAces: false }];
        d.active = 0;
        if (d.dealer[0].rank === 'A' && d.bankroll >= bet / 2) {
          d.phase = 'insurance';
          d.message = 'ディーラーのアップカードはA。インシュランスをかけますか?(ベットの半額、2:1)';
          return true;
        }
        return false;
      });
      if (!offerInsurance) afterPeek();
    },

    takeInsurance: (take) => {
      if (get().phase !== 'insurance') return;
      if (take) {
        mutate((d) => {
          const amount = d.hands[0].bet / 2;
          d.bankroll -= amount;
          d.insurance = amount;
        });
      }
      afterPeek();
    },

    hit: () =>
      playerAction((d, h) => {
        h.cards.push(draw(d, userLabel(d)));
        if (isBust(h.cards)) h.done = true;
      }),

    stand: () =>
      playerAction((_d, h) => {
        h.done = true;
      }),

    double: () =>
      playerAction((d, h) => {
        if (h.cards.length !== 2 || h.splitAces || d.bankroll < h.bet) return;
        d.bankroll -= h.bet;
        h.bet *= 2;
        h.doubled = true;
        h.cards.push(draw(d, userLabel(d)));
        h.done = true;
      }),

    split: () =>
      playerAction((d, h) => {
        if (!isPair(h.cards) || h.splitAces || d.hands.length >= MAX_HANDS || d.bankroll < h.bet) return;
        d.bankroll -= h.bet;
        const aces = h.cards[0].rank === 'A';
        const second: PlayerHand = { cards: [h.cards[1]], bet: h.bet, doubled: false, done: false, splitAces: aces };
        h.cards = [h.cards[0]];
        h.splitAces = aces;
        h.cards.push(draw(d, `あなた(ハンド${d.active + 1})`));
        second.cards.push(draw(d, `あなた(ハンド${d.active + 2})`));
        if (aces) {
          h.done = true;
          second.done = true;
        }
        d.hands.splice(d.active + 1, 0, second);
      }),

    nextRound: () => {
      if (get().phase !== 'roundOver') return;
      mutate((d) => {
        clearTable(d);
        const total = d.deckCount * CARDS_PER_DECK;
        const dealt = total - d.shoe.length;
        if (dealt / total >= PENETRATION) {
          Object.assign(d, freshShoe(d.deckCount));
          d.justShuffled = true;
          d.message = 'カットカードに到達したため、シャッフルしました。カウントは0に戻ります';
        } else {
          d.justShuffled = false;
          d.message = 'チップを置いて DEAL を押してください';
        }
      });
    },
  };
});

// ---- 表示用の派生値 ----

/** プレイヤーから見えていないカード(シュー + 伏せたホールカード)。確率とトゥルーカウントの分母 */
export function unseenCards(s: GameData): Card[] {
  if (s.dealer.length >= 2 && !s.holeRevealed) return [...s.shoe, s.dealer[1]];
  return s.shoe;
}

/** テーブルに出ているカードの枚数(効果音の判定に使う) */
export function cardsOnTable(s: GameData): number {
  return s.dealer.length + s.hands.reduce((n, h) => n + h.cards.length, 0) + s.cpus.reduce((n, c) => n + c.cards.length, 0);
}

// 所持チップをブラウザに保存する。配札前に置いたベットは手元に戻る分として含める。
// 配札後に賭けたチップは含めない(ラウンドの途中で再読み込みすると、そのラウンドの賭け金は失われる)
const chipsToSave = (s: GameData) => s.bankroll + (s.phase === 'betting' ? s.bet : 0);
useGameStore.subscribe((s, prev) => {
  const chips = chipsToSave(s);
  if (chips !== chipsToSave(prev)) saveWallet({ chips });
});

/** いまテーブルに置いているチップ(配札前のベット、またはラウンド中の賭け金)。精算が済んだ賭け金は含めない */
export function chipsAtStake(s: GameData): number {
  if (s.phase === 'betting') return s.bet;
  if (s.phase === 'roundOver') return 0;
  return s.hands.reduce((n, h) => n + h.bet, 0) + s.insurance;
}
