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
import { DECK_TIP_MIN_ROUNDS } from '../store/profile';
import { useProfile } from '../store/useProfile';
import { useSettings } from '../store/useSettings';

// デッキ数のおすすめは、1回の起動で1度だけ
let deckTipShown = false;
import { ScreenHeader } from './ScreenHeader';

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));

export function GameScreen({ onHome, onOutOfChips }: { onHome: () => void; onOutOfChips: () => void }) {
  const s = useGameStore();
  const showChance = useSettings((x) => x.showChance);
  const updateSettings = useSettings((x) => x.update);
  // 3デッキ以上で、5ラウンド以上遊んだ人に、1〜2デッキをすすめる(はじめての人には出さない。1回の起動で1度だけ。「次回以降表示しない」で出さない)
  const rounds = useProfile((p) => p.stats.rounds);
  const hideDeckTip = useSettings((x) => x.hideDeckTip);
  const [deckTip, setDeckTip] = useState(false);
  const betweenRounds = s.phase === 'betting' || s.phase === 'roundOver';
  useEffect(() => {
    if (deckTipShown || hideDeckTip || s.deckCount < 3 || rounds < DECK_TIP_MIN_ROUNDS || !betweenRounds) return;
    // 勝敗の演出を見せてから出す
    const t = setTimeout(() => {
      deckTipShown = true;
      setDeckTip(true);
    }, s.phase === 'roundOver' ? 1800 : 300);
    return () => clearTimeout(t);
  }, [hideDeckTip, s.deckCount, rounds, betweenRounds, s.phase]);
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
            className="rounded-md bg-neutral-800 px-1.5 py-1 text-base font-bold text-white ring-1 ring-white/15"
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

      {/* スマホでは、所持チップ・解説・COUNT をテーブルの上に置き、画面の下は操作ボタンだけにする(PC ではテーブルの下) */}
      <div className="flex flex-col">
        <div className="mx-auto mb-2 flex w-full max-w-[1000px] items-center justify-between gap-2 sm:order-2 sm:mb-0 sm:mt-3">
          <div className="flex items-baseline gap-1.5 rounded-full bg-black/40 px-3 py-1 ring-1 ring-white/10">
            <span className="text-[11px] text-neutral-400">所持チップ</span>
            <span className="text-base font-extrabold tabular-nums text-amber-300 sm:text-lg">{fmt(s.bankroll)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {chance > 0 && (
              <span
                className={`${chance === 2 ? 'chance-badge-inline' : 'chance-badge-maybe'} pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-full py-0.5 pl-1 pr-2 text-[11px] font-black italic tracking-wide`}
              >
                <ChanceIcon kind={chance === 2 ? 'sure' : 'maybe'} size={16} />
                {chance === 2 ? 'chance!' : 'chance?'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setModal('explain')}
              disabled={s.roundLog.length === 0}
              className="rounded-lg bg-neutral-700 px-3 py-2 text-sm font-extrabold tracking-wide shadow-lg ring-1 ring-white/15 hover:bg-neutral-600 disabled:opacity-35 sm:py-2.5"
              title="このラウンドのカウントの手順を、1枚ずつ解説します"
            >
              解説
            </button>
            <button
              type="button"
              onClick={() => setModal('count')}
              className={`rounded-lg bg-gradient-to-b from-sky-500 to-sky-700 px-4 py-2 text-sm font-extrabold tracking-widest shadow-lg ring-1 ring-sky-300/40 hover:from-sky-400 sm:py-2.5 ${chance === 2 ? 'chance-glow' : ''}`}
            >
              COUNT
            </button>
          </div>
        </div>

        <div className="sm:order-1">
          <Table />
        </div>

        <p className="order-3 mx-auto mt-1.5 min-h-[2.5em] max-w-[1000px] text-center text-xs leading-snug text-emerald-50/90 sm:mt-2 sm:min-h-0 sm:text-sm" aria-live="polite">
          {s.justShuffled && s.phase === 'betting' && <span className="mr-1 rounded bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold">SHUFFLED</span>}
          {s.message}
        </p>

        <div className="order-4 mx-auto mt-1 w-full max-w-[1000px] sm:mt-3">
          <Controls onNeedChips={() => setShowOut(true)} />
        </div>
        {/* 画面のいちばん下(約1cm)には、よく押すボタンを置かない */}
        <div className="order-5 h-5 sm:hidden" aria-hidden />
      </div>

      {modal === 'count' && <CountModal onClose={close} showChance={showChance} />}
      {modal === 'explain' && <ExplainModal onClose={close} />}
      {deckTip && !showOut && <DeckTipModal deckCount={s.deckCount} onChoose={chooseDeck} />}
      {showOut && <OutOfChipsModal onChips={onOutOfChips} onHome={onHome} />}
    </>
  );
}
