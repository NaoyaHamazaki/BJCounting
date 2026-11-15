// プレイヤー情報と記録(ログインなし。ブラウザに保存する)

export type Stats = {
  /** チップにかえた所持金の合計 */
  invested: number;
  /** チップから所持金にもどした合計 */
  cashedOut: number;
  /** 受け取ったログインボーナスの合計 */
  bonusTotal: number;
  /** 遊んだラウンド数(途中で中止したラウンドは数えない) */
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  /** ゲームでの勝ち負けの合計(チップ) */
  net: number;
  /** 1ラウンドでいちばん多く勝ったチップ */
  bestWin: number;
};

export type Profile = {
  /** 端末ごとの識別子(将来サーバーに保存するときに使う) */
  id: string;
  /** ゲスト番号(6けた) */
  guestNo: string;
  /** プレイヤー名。空ならゲスト番号で表示 */
  name: string;
  /** はじめて遊んだ日(YYYY-MM-DD) */
  since: string;
  stats: Stats;
};

export const EMPTY_STATS: Stats = { invested: 0, cashedOut: 0, bonusTotal: 0, rounds: 0, wins: 0, losses: 0, pushes: 0, net: 0, bestWin: 0 };
export const NAME_MAX = 12;

const KEY = 'prob21-profile';

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

export function newProfile(today: string, random: () => number = Math.random): Profile {
  return { id: randomId(), guestNo: String(Math.floor(random() * 900000) + 100000), name: '', since: today, stats: { ...EMPTY_STATS } };
}

/** 表示名。名前がなければ「ゲスト123456」 */
export function displayName(p: Pick<Profile, 'name' | 'guestNo'>): string {
  return p.name.trim() || `ゲスト${p.guestNo}`;
}

/** 名前の整形(前後の空白を取り、最大12文字) */
export function cleanName(name: string): string {
  return [...name.replace(/\s+/g, ' ').trim()].slice(0, NAME_MAX).join('');
}

/** 1ラウンドの結果を記録に足す。net = そのラウンドで増えた(減った)チップ */
export function addRound(s: Stats, net: number): Stats {
  return {
    ...s,
    rounds: s.rounds + 1,
    wins: s.wins + (net > 0 ? 1 : 0),
    losses: s.losses + (net < 0 ? 1 : 0),
    pushes: s.pushes + (net === 0 ? 1 : 0),
    net: s.net + net,
    bestWin: Math.max(s.bestWin, net),
  };
}

export function loadProfile(today: string): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      if (typeof p.id === 'string' && typeof p.guestNo === 'string') {
        return {
          id: p.id,
          guestNo: p.guestNo,
          name: typeof p.name === 'string' ? cleanName(p.name) : '',
          since: typeof p.since === 'string' ? p.since : today,
          stats: { ...EMPTY_STATS, ...(p.stats ?? {}) },
        };
      }
    }
  } catch {
    /* 読めなければ作り直す */
  }
  const p = newProfile(today);
  saveProfile(p);
  return p;
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 保存できなくても動作は続ける */
  }
}
