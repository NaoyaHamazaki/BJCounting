import { useState } from 'react';
import { GuideModal } from '../components/GuideModal';
import { AppIcon } from '../components/Icons';
import { PlayingCard } from '../components/PlayingCard';
import { rankValue } from '../game/deck';
import type { Card, Rank, Suit } from '../game/types';
import { sfx } from '../sound/sfx';
import { displayName } from '../store/profile';
import { chipsAtStake, useGameStore } from '../store/useGameStore';
import { useProfile } from '../store/useProfile';
import { bonusAvailable, useWallet } from '../store/useWallet';

export type Screen = 'home' | 'game' | 'quiz' | 'settings' | 'chips';

const deco = (rank: Rank, suit: Suit): Card => ({ id: `home-${rank}-${suit}`, rank, suit, value: rankValue(rank) });

function MenuButton({ label, sub, icon, onClick, primary, badge }: { label: string; sub: string; icon: string; onClick: () => void; primary?: boolean; badge?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.chip();
        onClick();
      }}
      className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left shadow-xl ring-1 transition hover:-translate-y-0.5 active:translate-y-0 ${
        primary
          ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 ring-amber-200/60 hover:from-amber-200'
          : 'bg-neutral-800/90 text-white ring-white/15 hover:bg-neutral-700'
      }`}
    >
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-lg font-black tracking-wide">
          {label}
          {badge && <span className="bonus-badge rounded-full px-2 py-0.5 text-[10px] font-black tracking-normal">{badge}</span>}
        </span>
        <span className={`block text-xs ${primary ? 'text-amber-900/80' : 'text-neutral-400'}`}>{sub}</span>
      </span>
      <span className="text-xl opacity-60 transition group-hover:translate-x-1" aria-hidden>
        ▶
      </span>
    </button>
  );
}

export function HomeScreen({ go }: { go: (s: Screen) => void }) {
  const [guide, setGuide] = useState(false);
  // テーブルに賭けているチップも、手持ちとして見せる
  const chips = useGameStore((s) => s.bankroll + chipsAtStake(s));
  const { money, lastBonus } = useWallet();
  const player = displayName(useProfile());
  const canBonus = bonusAvailable(lastBonus);
  return (
    <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-md flex-col items-center justify-center gap-6 py-6">
      <div className="relative flex flex-col items-center">
        {/* 背景に扇形に広げたカード */}
        <div className="pointer-events-none absolute -top-6 flex opacity-80" aria-hidden>
          {(
            [
              ['A', 'Spades'],
              ['10', 'Hearts'],
              ['5', 'Diamonds'],
              ['K', 'Clubs'],
            ] as [Rank, Suit][]
          ).map(([r, s], i) => (
            <div key={r} style={{ transform: `rotate(${(i - 1.5) * 14}deg) translateY(${Math.abs(i - 1.5) * 8}px)` }} className="-mx-2">
              <PlayingCard card={deco(r, s)} size="sm" />
            </div>
          ))}
        </div>
        <AppIcon size={112} className="relative mt-10 drop-shadow-[0_8px_20px_rgba(0,0,0,.6)]" />
        <h1 className="mt-4 text-4xl font-black tracking-wide">
          確率ラボ <span className="text-amber-300">21</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-300">トランプで学ぶ、確率とカウント</p>
      </div>

      {/* プレイヤー名と、所持チップ・所持金 */}
      <div className="-mb-3 text-xs text-neutral-400">
        ようこそ、<b className="text-neutral-200">{player}</b> さん
      </div>
      <button
        type="button"
        onClick={() => go('chips')}
        className="flex items-center gap-4 rounded-full bg-black/40 px-5 py-2 text-sm ring-1 ring-white/15 hover:bg-black/60"
        aria-label="チップを用意する画面へ"
      >
        <span>
          <span className="text-[11px] text-neutral-400">所持チップ </span>
          <b className="text-lg tabular-nums text-amber-300">{chips.toLocaleString()}</b>
        </span>
        <span className="h-5 w-px bg-white/20" />
        <span>
          <span className="text-[11px] text-neutral-400">所持金 </span>
          <b className="text-lg tabular-nums text-emerald-300">{money.toLocaleString()}</b>
        </span>
      </button>

      <nav className="flex w-full flex-col gap-3 px-2">
        <MenuButton primary icon="🃏" label="ゲームスタート" sub="CPU といっしょに遊びながら、カードを数えよう" onClick={() => go('game')} />
        <MenuButton icon="💡" label="クイズモード" sub="点数・カウント・確率のクイズに挑戦" onClick={() => go('quiz')} />
        <MenuButton
          icon="🏦"
          label="チップを用意する"
          sub="ログインボーナス、所持金とチップの交換"
          badge={canBonus ? 'ボーナス' : undefined}
          onClick={() => go('chips')}
        />
        <MenuButton icon="⚙️" label="設定" sub="デッキ数、CPU の人数、効果音など" onClick={() => go('settings')} />
      </nav>

      <button
        type="button"
        onClick={() => setGuide(true)}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-sky-200 ring-1 ring-sky-300/40 hover:bg-sky-500/10"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs font-black text-white">?</span>
        カードカウンティングってなに?
      </button>

      <p className="px-4 text-center text-[11px] leading-relaxed text-neutral-500">
        このアプリは、確率の考え方を学ぶための教材です。お金をかけた遊びをすすめるものではありません。
      </p>
      {guide && <GuideModal onClose={() => setGuide(false)} />}
    </div>
  );
}
