import { create } from 'zustand';
import { useGameStore } from './useGameStore';
import { addRound, addVisit, cleanName, loadProfile, saveProfile, type Profile, type Stats } from './profile';
import { dayKey } from './wallet';

const dataOf = (p: Profile): Profile => ({
  id: p.id,
  guestNo: p.guestNo,
  name: p.name,
  since: p.since,
  stats: p.stats,
  visits: p.visits,
  visitDays: p.visitDays,
  lastVisit: p.lastVisit,
});

type ProfileStore = Profile & {
  setName: (name: string) => void;
  /** 記録を足す(交換・ボーナス) */
  record: (patch: (s: Stats) => Partial<Stats>) => void;
};

export const useProfile = create<ProfileStore>((set, get) => {
  const save = () => saveProfile(dataOf(get()));
  // 画面を開くたびに、この端末からのアクセスを記録する
  const today = dayKey(new Date());
  const initial = addVisit(loadProfile(today), today);
  saveProfile(initial);
  return {
    ...initial,
    setName: (name) => {
      set({ name: cleanName(name) });
      save();
    },
    record: (patch) => {
      const stats = get().stats;
      set({ stats: { ...stats, ...patch(stats) } });
      save();
    },
  };
});

// ラウンドの勝ち負けを記録する。配札したときの手持ち(roundStart)と、精算後の手持ちの差を、そのラウンドの勝ち負けとする。
// リセットや設定変更で中止したラウンドは roundOver にならないので、数えない
useGameStore.subscribe((s, prev) => {
  if (s.phase === 'roundOver' && prev.phase !== 'roundOver') {
    const net = s.bankroll - s.roundStart;
    useProfile.setState((p) => ({ stats: addRound(p.stats, net) }));
    saveProfile(dataOf(useProfile.getState()));
  }
});
