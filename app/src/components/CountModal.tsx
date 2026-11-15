import { useEffect, useState } from 'react';
import {
  blackjackChance,
  CHANCE_TC,
  chanceLevel,
  MAYBE_CHANCE_TC,
  countByGroup,
  freshBlackjackChance,
  hiLoBreakdown,
  hiLoValue,
  probabilityByGroup,
  remainingDecks,
  trueCountOf,
} from '../game/count';
import { CARDS_PER_DECK, rankValue } from '../game/deck';
import { RANK_GROUPS, type Card, type RankGroup } from '../game/types';
import { PENETRATION, unseenCards, useGameStore } from '../store/useGameStore';
import { CardGridModal } from './CardGridModal';
import { HelpButton, HelpModal, type HelpTopic } from './HelpModal';
import { ChanceIcon } from './Icons';
import { PlayingCard } from './PlayingCard';

const signed = (n: number, digits = 0) => `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;
const countColor = (n: number) => (n > 0 ? 'text-emerald-300' : n < 0 ? 'text-rose-300' : 'text-white');
const pointColor = (v: number) => (v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-neutral-400');

/** ランク区分の見本カード(確率の一覧で使う) */
const sample = (g: RankGroup): Card => {
  const rank = g === 'JQK' ? 'K' : g;
  return { id: `sample-${g}`, suit: g === 'JQK' || g === 'A' ? 'Spades' : 'Hearts', rank, value: rankValue(rank) };
};

function BigStat({ label, value, color, help, sub }: { label: string; value: string; color: string; help: () => void; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 text-center ring-1 ring-white/10">
      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-300">
        {label}
        <HelpButton onClick={help} label={label} />
      </div>
      <div className={`text-4xl font-black tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] text-neutral-400">{sub}</div>
    </div>
  );
}

function ChanceStat({ label, value, sub, sure }: { label: string; value: string; sub: string; sure: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-black/35 px-3 py-1.5 text-left sm:block sm:p-2 sm:text-center">
      <div className={`text-[11px] ${sure ? 'text-amber-100/80' : 'text-sky-100/80'}`}>{label}</div>
      <div className={`order-last text-xl font-black tabular-nums sm:text-2xl ${sure ? 'text-amber-200' : 'text-sky-200'}`}>{value}</div>
      <div className={`text-[10px] ${sure ? 'text-amber-100/60' : 'text-sky-100/60'}`}>{sub}</div>
    </div>
  );
}

/** チャンスの3パターン(非表示 / chance? / chance!)と、その理由 */
function ChancePanel({ tc, highDiff, bj, bjBase }: { tc: number; highDiff: number; bj: number; bjBase: number }) {
  const level = chanceLevel(tc);
  if (level === 0) {
    return (
      <div className="rounded-xl bg-white/5 px-3 py-2 text-center text-xs text-neutral-400 ring-1 ring-white/10">
        いまはチャンスではありません(トゥルーカウント <b className="text-sky-300">+{MAYBE_CHANCE_TC}</b> で chance?、
        <b className="text-amber-300">+{CHANCE_TC}</b> で chance!)
      </div>
    );
  }
  const sure = level === 2;
  return (
    <div className={`${sure ? 'chance-panel' : 'chance-panel-maybe'} rounded-2xl p-4`}>
      <div className="flex items-center justify-center gap-2">
        <ChanceIcon kind={sure ? 'sure' : 'maybe'} size={40} />
        <span className={`${sure ? 'chance-text' : 'chance-text-maybe'} text-4xl font-black italic tracking-wide`}>{sure ? 'chance!' : 'chance?'}</span>
      </div>
      <p className={`mt-1 text-center text-xs font-semibold ${sure ? 'text-amber-100/90' : 'text-sky-100/90'}`}>
        {sure
          ? 'いまは、プレイヤーに有利なカードが多く残っています'
          : `チャンスが近づいています。トゥルーカウントが +${CHANCE_TC} になれば chance!`}
      </p>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-3 sm:gap-2">
        <ChanceStat sure={sure} label="トゥルーカウント" value={signed(tc, 1)} sub={sure ? `+${CHANCE_TC} 以上で chance!` : `あと ${(CHANCE_TC - tc).toFixed(1)} で chance!`} />
        <ChanceStat sure={sure} label="大きいカード(10〜A)" value={`${signed(highDiff, 1)}%`} sub="シャッフル直後とくらべて" />
        <ChanceStat sure={sure} label="ブラックジャックになる確率" value={`${bj.toFixed(1)}%`} sub={`ふだんは ${bjBase.toFixed(1)}%`} />
      </div>
      <p className={`mt-3 text-xs leading-relaxed ${sure ? 'text-amber-50/90' : 'text-sky-50/90'}`}>
        <b>なぜチャンス?</b> 大きいカードが多いと、①ブラックジャック(1.5倍もらえる)が出やすくなり、②ディーラーは16以下なら必ず引くので、10点札を引いてバーストしやすくなるからです。
      </p>
    </div>
  );
}

function SectionTitle({ children, help, label }: { children: React.ReactNode; help?: () => void; label?: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
      {children}
      {help && <HelpButton onClick={help} label={label ?? ''} />}
    </h3>
  );
}

export function CountModal({ onClose, showChance = true }: { onClose: () => void; showChance?: boolean }) {
  const s = useGameStore();
  const [help, setHelp] = useState<HelpTopic | null>(null);
  const [grid, setGrid] = useState(false);
  const unseen = unseenCards(s);
  const total = s.deckCount * CARDS_PER_DECK;
  const tc = trueCountOf(s.runningCount, unseen.length);
  const decks = remainingDecks(unseen.length);
  const untilShuffle = Math.max(0, s.shoe.length - Math.round(total * (1 - PENETRATION)));
  const remaining = countByGroup(unseen);
  const prob = probabilityByGroup(unseen);
  const hl = hiLoBreakdown(unseen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (help) setHelp(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, help]);

  const bands = [
    { key: 'low', label: '小さい 2〜6', now: hl.low, base: 5 / 13, color: 'bg-emerald-400' },
    { key: 'neutral', label: 'まん中 7〜9', now: hl.neutral, base: 3 / 13, color: 'bg-slate-300' },
    { key: 'high', label: '大きい 10〜A', now: hl.high, base: 5 / 13, color: 'bg-rose-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="カウント"
        className="max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 text-neutral-100 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">カウント</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            閉じる
          </button>
        </div>

        {showChance && (
        <div className="mb-3">
          <ChancePanel
            tc={tc}
            highDiff={hl.total ? (hl.high / hl.total) * 100 - (5 / 13) * 100 : 0}
            bj={blackjackChance(unseen)}
            bjBase={freshBlackjackChance(s.deckCount)}
          />
        </div>
        )}

        {/* カウント */}
        <div className="grid grid-cols-2 gap-2">
          <BigStat label="ランニングカウント" value={signed(s.runningCount)} color={countColor(s.runningCount)} help={() => setHelp('rc')} sub={`出たカード ${s.seen.length}枚の合計`} />
          <BigStat label="トゥルーカウント" value={signed(tc, 1)} color={countColor(tc)} help={() => setHelp('tc')} sub={`のこり 約${decks.toFixed(1)}デッキでわった数`} />
        </div>
        <p className="mt-2 text-center text-xs text-neutral-400">
          のこり <b className="text-neutral-200">{unseen.length}</b> / {total}枚 ・ シャッフルまで あと約 {untilShuffle}枚
        </p>
        <button
          type="button"
          onClick={() => setGrid(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700/60 px-3 py-2.5 text-sm font-bold ring-1 ring-sky-300/40 transition hover:bg-sky-600/70"
        >
          <span className="flex" aria-hidden>
            {(['A', '7', 'K'] as const).map((r, i) => (
              <span key={r} className={`flex h-[22px] w-4 items-center justify-center rounded-[2px] bg-white text-[9px] font-black ${i === 1 ? 'text-red-600' : 'text-neutral-900'} ${i ? '-ml-1' : ''}`}>
                {r}
              </span>
            ))}
          </span>
          のこりのカードを一覧で見る(七並べ)
        </button>

        {/* 出たカード */}
        <section className="mt-5">
          <SectionTitle>出たカード(新しい順)</SectionTitle>
          {s.seen.length === 0 ? (
            <p className="text-xs text-neutral-500">まだカードは出ていません。</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {[...s.seen].reverse().map((c) => {
                const v = hiLoValue(c.rank);
                return (
                  <div key={c.id} className="flex flex-col items-center">
                    <PlayingCard card={c} size="xs" />
                    <span className={`text-[10px] font-bold leading-tight ${pointColor(v)}`}>{signed(v)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 残りカードの構成 */}
        <section className="mt-5">
          <SectionTitle help={() => setHelp('mix')} label="残りカードの構成">
            残りカードの構成
          </SectionTitle>
          <div className="space-y-2">
            {bands.map((b) => {
              const pct = hl.total ? (b.now / hl.total) * 100 : 0;
              return (
                <div key={b.key} className="grid grid-cols-[84px_1fr_48px] items-center gap-2 text-xs">
                  <span className="text-neutral-300">{b.label}</span>
                  <div className="relative h-4 rounded bg-white/10">
                    <div className={`h-full rounded ${b.color} transition-[width]`} style={{ width: `${pct}%` }} />
                    <div className="absolute -top-0.5 h-5 w-0.5 bg-white" style={{ left: `${b.base * 100}%` }} />
                  </div>
                  <span className="text-right font-semibold tabular-nums">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">白い線 = シャッフルしたばかりのときの割合</p>
        </section>

        {/* 次に出る確率 */}
        <section className="mt-5">
          <SectionTitle help={() => setHelp('prob')} label="次に出る確率">
            次に出る確率
          </SectionTitle>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {RANK_GROUPS.map((g) => (
              <div key={g} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 p-2 ring-1 ring-white/5">
                <PlayingCard card={sample(g)} size="sm" />
                {g === 'JQK' && <span className="-mt-0.5 text-[10px] text-neutral-400">J・Q・K</span>}
                <span className="text-base font-extrabold tabular-nums">{prob[g].toFixed(1)}%</span>
                <span className="text-[10px] text-neutral-400">のこり {remaining[g]}枚</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {grid && (
        <div onClick={(e) => e.stopPropagation()}>
          <CardGridModal onClose={() => setGrid(false)} />
        </div>
      )}
      {help && (
        <div onClick={(e) => e.stopPropagation()}>
          <HelpModal topic={help} onClose={() => setHelp(null)} />
        </div>
      )}
    </div>
  );
}