// チップと所持金のしくみ(純粋な計算と、ブラウザへの保存)

/** はじめて遊ぶ人の所持チップ */
export const INITIAL_CHIPS = 1000;
/** ログインボーナス(所持金)。1日1回 */
export const LOGIN_BONUS = 20000;
/** 1チップ = 所持金 20 */
export const MONEY_PER_CHIP = 20;

export type Wallet = {
  /** 所持チップ(テーブルで使える分。配札前に置いたベットも含む) */
  chips: number;
  /** 所持金(単位なし) */
  money: number;
  /** 最後にログインボーナスを受け取った日(YYYY-MM-DD、端末の日付) */
  lastBonus: string | null;
  /** クイズ・トレーニングでかせいだ日と、その日にかせいだ所持金(1日の上限の判定に使う) */
  studyDay: string | null;
  studyEarned: number;
};

/** クイズ1問正解でもらえる所持金 */
export const QUIZ_REWARD = 100;
/** クイズ全問正解のボーナス */
export const QUIZ_PERFECT_BONUS = 500;
/** トレーニング(スピード点数)1回正解でもらえる所持金 */
export const SPEED_REWARD = 10;
/** クイズ・トレーニングでかせげる所持金の、1日の上限 */
export const STUDY_DAILY_CAP = 10000;

/** 今日あといくらかせげるか */
export function studyLeft(w: Pick<Wallet, 'studyDay' | 'studyEarned'>, today: string): number {
  return Math.max(0, STUDY_DAILY_CAP - (w.studyDay === today ? w.studyEarned : 0));
}

/** かせいだ所持金を、1日の上限までで足す。実際に足した額を返す */
export function grantStudy(w: Pick<Wallet, 'studyDay' | 'studyEarned'>, amount: number, today: string): { granted: number; studyDay: string; studyEarned: number } {
  const granted = Math.max(0, Math.min(amount, studyLeft(w, today)));
  const base = w.studyDay === today ? w.studyEarned : 0;
  return { granted, studyDay: today, studyEarned: base + granted };
}

export const DEFAULT_WALLET: Wallet = { chips: INITIAL_CHIPS, money: 0, lastBonus: null, studyDay: null, studyEarned: 0 };

const KEY = 'prob21-wallet';

/** 端末の日付を YYYY-MM-DD にする(日付が変わったら、またボーナスを受け取れる) */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function canClaimBonus(lastBonus: string | null, today: string): boolean {
  return lastBonus !== today;
}

/** 所持金で買えるチップの最大数 */
export function maxChipsFor(money: number): number {
  return Math.floor(money / MONEY_PER_CHIP);
}

/** チップ ⇔ 所持金 の交換。chips > 0 は所持金→チップ、chips < 0 はチップ→所持金。足りなければ null */
export function exchange(w: Pick<Wallet, 'chips' | 'money'>, chips: number): Pick<Wallet, 'chips' | 'money'> | null {
  if (!Number.isInteger(chips) || chips === 0) return null;
  const money = w.money - chips * MONEY_PER_CHIP;
  const nextChips = w.chips + chips;
  if (money < 0 || nextChips < 0) return null;
  return { chips: nextChips, money };
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

export function loadWallet(): Wallet {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_WALLET;
    const w = JSON.parse(raw) as Partial<Wallet>;
    return {
      chips: isNum(w.chips) ? w.chips : DEFAULT_WALLET.chips,
      money: isNum(w.money) ? w.money : DEFAULT_WALLET.money,
      lastBonus: typeof w.lastBonus === 'string' ? w.lastBonus : null,
      studyDay: typeof w.studyDay === 'string' ? w.studyDay : null,
      studyEarned: isNum(w.studyEarned) ? w.studyEarned : 0,
    };
  } catch {
    return DEFAULT_WALLET;
  }
}

/** 一部だけ書きかえて保存する(チップはゲーム、所持金はチップを用意する画面から書くため) */
export function saveWallet(patch: Partial<Wallet>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadWallet(), ...patch }));
  } catch {
    /* 保存できなくても動作は続ける */
  }
}

/** チップ交換のスライダーの1目盛り(チップの枚数)。100チップ = 所持金 2,000 */
export const EXCHANGE_STEP = 100;

/**
 * チップ交換のスライダーで選べる「交換後のチップ」の範囲。
 * 今のチップから 100枚ずつ増減する。100枚に満たない端数はチップのまま残る
 */
export function exchangeRange(chips: number, money: number): { min: number; max: number } {
  return {
    min: chips % EXCHANGE_STEP,
    max: chips + Math.floor(money / (EXCHANGE_STEP * MONEY_PER_CHIP)) * EXCHANGE_STEP,
  };
}
