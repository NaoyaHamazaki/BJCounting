import { useCallback, useEffect, useState } from 'react';
import { Controls } from '../components/Controls';
import { CountModal } from '../components/CountModal';
import { DeckTipModal } from '../components/DeckTipModal';
import { OutOfChipsModal } from '../components/OutOfChipsModal';
import { ExplainModal } from '../components/ExplainModal';
import { ChanceIcon } from '../components/Icons';
import { Table } from '../components/Table';
import { chanceLevel, trueCountOf } from '../game/count';
import { useSoundEffects } from '../sound/useSoundEffects';
import { unseenCards, useGameStore } from '../store/useGameStore';
import { useSettings } from '../store/useSettings';
import { ScreenHeader } from './ScreenHeader';

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));

export function GameScreen({ onHome, onOutOfChips }: { onHome: () => void; onOutOfChips: () => void }) {
  const s = useGameStore();
  const showChance = useSettings((x) => x.showChance);
  const updateSettings = useSettings((x) => x.update);
  // 3デッキ以上で始めたら、1〜2デッキをすすめる(「次回以降表示しない」で出さない)
  const [deckTip, setDeckTip] = useState(() => useGameStore.getState().deckCount >= 3 && !useSettings.getState().hideDeckTip);
  const changeDecks = useCallback(
    (n: number) => {
      updateSettings({ deckCount: n });
      useGameStore.getState().setDeckCount(n);
    },
    [updateSettings],
  );
  const chooseDeck = useCallback(
    (n: number | null, hideNext: boolean) => {
      if (hideNext) updateSettings({ hideDeckTip: true });
      if (n !== null) changeDecks(n);
      setDeckTip(false);
    },
    [changeDecks, updateSettings],
  );

  // チップがなくなったら、少し待って(負けの演出を見せてから)案内を出す。ゲーム画面では交換させず、別の画面へ移ってもらう
  const outOfChips = (s.phase === 'betting' || s.phase === 'roundOver') && s.bankroll + s.bet < 1;
  const [showOut, setShowOut] = useState(false);
  useEffect(() => {
    if (!outOfChips) return;
    const t = setTimeout(() => setShowOut(true), s.phase === 'roundOver' ? 2400 : 600);
    return () => {
      clearTimeout(t);
      setShowOut(false);
    };
  }, [outOfChips, s.phase]);
  const [modal, setModal] = useState<'count' | 'explain' | null>(null);
  const close = useCallback(() => setModal(null), []);
  useSoundEffects();
  const chance = showChance ? chanceLevel(trueCountOf(s.runningCount, unseenCards(s).length)) : 0;

  return (
    <>
      <ScreenHeader title="ゲーム" onHome={onHome}>
        <label className="flex items-center gap-1 text-xs text-neutral-400">
          <span className="hidden sm:inline">デッキ</span>
          <select
            value={s.deckCount}
            onChange={(e) => changeDecks(Number(e.target.value))}
            aria-label="デッキ数"
            className="rounded-md bg-neutral-800 px-1.5 py-1.5 text-sm font-bold text-white ring-1 ring-white/15"
          >
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}デッキ{n <= 2 ? ' ★' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            const mid = s.phase !== 'betting' && s.phase !== 'roundOver';
            if (window.confirm(`シャッフルして、カウントを0に戻します(チップはそのまま)。${mid ? 'このラウンドは中止になり、賭けたチップは戻ります。' : ''}よろしいですか?`)) s.reset();
          }}
          className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-neutral-700"
        >
          リセット
        </button>
      </ScreenHeader>

      <Table />

      {/* 所持チップ・メッセージ・解説・COUNT */}
      <div className="mx-auto mt-3 flex max-w-[1000px] items-center justify-between gap-2">
        <div className="text-sm">
          <div className="text-[11px] text-neutral-400">所持チップ</div>
          <div className="text-lg font-extrabold tabular-nums text-amber-300">{fmt(s.bankroll)}</div>
        </div>
        <p className="flex-1 text-center text-xs text-emerald-50/90 sm:text-sm" aria-live="polite">
          {s.justShuffled && s.phase === 'betting' && <span className="mr-1 rounded bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold">SHUFFLED</span>}
          {s.message}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModal('explain')}
            disabled={s.roundLog.length === 0}
            className="rounded-lg bg-neutral-700 px-3 py-2.5 text-sm font-extrabold tracking-wide shadow-lg ring-1 ring-white/15 hover:bg-neutral-600 disabled:opacity-35"
            title="このラウンドのカウントの手順を、1枚ずつ解説します"
          >
            解説
          </button>
          <div className="relative">
            {chance > 0 && (
              <span
                className={`${chance === 2 ? 'chance-badge' : 'chance-badge-maybe'} pointer-events-none absolute -top-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full py-0.5 pl-1 pr-2.5 text-xs font-black italic tracking-wide`}
              >
                <ChanceIcon kind={chance === 2 ? 'sure' : 'maybe'} size={18} />
                {chance === 2 ? 'chance!' : 'chance?'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setModal('count')}
              className={`rounded-lg bg-gradient-to-b from-sky-500 to-sky-700 px-4 py-2.5 text-sm font-extrabold tracking-widest shadow-lg ring-1 ring-sky-300/40 hover:from-sky-400 ${chance === 2 ? 'chance-glow' : ''}`}
            >
              COUNT
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-3 max-w-[1000px]">
        <Controls onNeedChips={() => setShowOut(true)} />
      </div>

      {modal === 'count' && <CountModal onClose={close} showChance={showChance} />}
      {modal === 'explain' && <ExplainModal onClose={close} />}
      {deckTip && !showOut && <DeckTipModal deckCount={s.deckCount} onChoose={chooseDeck} />}
      {showOut && <OutOfChipsModal onChips={onOutOfChips} onHome={onHome} />}
    </>
  );
}
