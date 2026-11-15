import { create } from 'zustand';
import { useGameStore } from './useGameStore';
import { useProfile } from './useProfile';
import { canClaimBonus, dayKey, LOGIN_BONUS, loadWallet, MONEY_PER_CHIP, saveWallet } from './wallet';

type WalletStore = {
  money: number;
  lastBonus: string | null;
  /** 今日のログインボーナスを受け取る。受け取れたら true */
  claimBonus: () => boolean;
  /** 所持金 → チップ */
  buyChips: (chips: number) => boolean;
  /** チップ → 所持金 */
  sellChips: (chips: number) => boolean;
};

/** 所持金とログインボーナス。チップ(所持チップ)はゲームのストアの bankroll が持つ */
export const useWallet = create<WalletStore>((set, get) => {
  const w = loadWallet();
  return {
    money: w.money,
    lastBonus: w.lastBonus,

    claimBonus: () => {
      const today = dayKey(new Date());
      if (!canClaimBonus(get().lastBonus, today)) return false;
      const money = get().money + LOGIN_BONUS;
      set({ money, lastBonus: today });
      saveWallet({ money, lastBonus: today });
      useProfile.getState().record((st) => ({ bonusTotal: st.bonusTotal + LOGIN_BONUS }));
      return true;
    },

    buyChips: (chips) => {
      const cost = chips * MONEY_PER_CHIP;
      if (!Number.isInteger(chips) || chips <= 0 || cost > get().money) return false;
      if (!useGameStore.getState().adjustChips(chips)) return false;
      const money = get().money - cost;
      set({ money });
      saveWallet({ money });
      useProfile.getState().record((st) => ({ invested: st.invested + cost }));
      return true;
    },

    sellChips: (chips) => {
      if (!Number.isInteger(chips) || chips <= 0) return false;
      if (!useGameStore.getState().adjustChips(-chips)) return false;
      const money = get().money + chips * MONEY_PER_CHIP;
      set({ money });
      saveWallet({ money });
      useProfile.getState().record((st) => ({ cashedOut: st.cashedOut + chips * MONEY_PER_CHIP }));
      return true;
    },
  };
});

/** 今日のボーナスがまだ受け取れるか(画面表示用) */
export const bonusAvailable = (lastBonus: string | null) => canClaimBonus(lastBonus, dayKey(new Date()));
