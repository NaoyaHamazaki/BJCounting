import { create } from 'zustand';
import { setMuted } from '../sound/sfx';

export type QuizSpeed = 'slow' | 'normal' | 'fast';

export type Settings = {
  deckCount: number;
  cpuCount: number;
  sound: boolean;
  /** chance? / chance! を表示する */
  showChance: boolean;
  /** クイズ1回の問題数 */
  quizCount: number;
  /** カウントクイズでカードを見せる速さ */
  quizSpeed: QuizSpeed;
  /** ゲーム開始時の「1〜2デッキがおすすめ」を出さない */
  hideDeckTip: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  deckCount: 6,
  cpuCount: 2,
  sound: true,
  showChance: true,
  quizCount: 10,
  quizSpeed: 'normal',
  hideDeckTip: false,
};

export const QUIZ_SPEED_MS: Record<QuizSpeed, number> = { slow: 1500, normal: 1000, fast: 600 };

const KEY = 'prob21-settings';

/** 保存された設定を読む。壊れていたり、読めなかったりしたら初期値 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type Store = Settings & { update: (patch: Partial<Settings>) => void };

export const useSettings = create<Store>((set, get) => {
  const initial = loadSettings();
  setMuted(!initial.sound);
  return {
    ...initial,
    update: (patch) => {
      set(patch);
      const { update: _u, ...data } = get();
      void _u;
      if ('sound' in patch) setMuted(!data.sound);
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        /* 保存できなくても動作は続ける */
      }
    },
  };
});
