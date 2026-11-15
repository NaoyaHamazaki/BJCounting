// カードの型定義(企画書 3.3 に id を追加。React の key と、同じカードの識別に使う)
export type Suit = 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number; // ブラックジャックにおける値 (2-11。A は 11 として持ち、合計計算で 1 に落とす)
};

export const SUITS: Suit[] = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** アナリティクスで表示する区分。企画書「2〜10、絵札、A」に合わせ、J/Q/K は「絵札」にまとめる */
export type RankGroup = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'JQK' | 'A';
export const RANK_GROUPS: RankGroup[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'JQK', 'A'];

export type HandResult = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';

export type PlayerHand = {
  cards: Card[];
  bet: number;
  doubled: boolean;
  done: boolean;
  /** スプリットしたエースのハンド(1枚だけ受け取って終了) */
  splitAces: boolean;
  result?: HandResult;
  /** 精算で戻る額(賭け金を含む)。負けは 0 */
  payout?: number;
};

/** 自分以外のプレイヤー(CPU)の席 */
export type CpuSeat = {
  name: string;
  /** right = 自分より先に行動(画面の右側)、left = 自分より後に行動(画面の左側) */
  side: 'right' | 'left';
  cards: Card[];
  bet: number;
  result?: HandResult;
};

/** 解説用の記録。カードが表になった瞬間の「引く前」の状態を残す */
export type LogEntry = {
  card: Card;
  /** 誰のカードか(あなた / CPU 1 / ディーラー など) */
  owner: string;
  /** 表になる前のランニングカウント */
  rcBefore: number;
  /** 表になる前の、見えていないカードのランクごとの枚数 */
  before: Record<Rank, number>;
  /** 表になる前の、見えていないカードの枚数 */
  totalBefore: number;
};

export type Phase = 'betting' | 'insurance' | 'cpuTurn' | 'playerTurn' | 'dealerTurn' | 'roundOver';
