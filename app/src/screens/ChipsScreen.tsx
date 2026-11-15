import { useState } from 'react';
import { Chip, CHIPS } from '../components/Chips';
import { sfx } from '../sound/sfx';
import { chipsAtStake, useGameStore } from '../store/useGameStore';
import { bonusAvailable, useWallet } from '../store/useWallet';
import { LOGIN_BONUS, maxChipsFor, MONEY_PER_CHIP } from '../store/wallet';
import type { Screen } from './HomeScreen';
import { ScreenHeader } from './ScreenHeader';

const fmt = (n: number) => n.toLocaleString();

type Mode = 'buy' | 'sell';

/** チップを用意する画面(所持チップ・所持金・ログインボーナス・銀行口座) */
export function ChipsScreen({ go, reason }: { go: (s: Screen) => void; reason?: 'empty' }) {
  const chips = useGameStore((s) => s.bankroll);
  const atStake = useGameStore(chipsAtStake);
  const midRound = useGameStore((s) => s.phase !== 'betting' && s.phase !== 'roundOver');
  const { money, lastBonus, claimBonus, buyChips, sellChips } = useWallet();
  const canBonus = bonusAvailable(lastBonus);
  const [mode, setMode] = useState<Mode>('buy');
  const [amount, setAmount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const max = mode === 'buy' ? maxChipsFor(money) : chips;
  const value = Math.min(amount, max);
  const broke = chips + atStake < 1 && money < MONEY_PER_CHIP && !canBonus;

  const doExchange = () => {
    const ok = mode === 'buy' ? buyChips(value) : sellChips(value);
    if (!ok) return;
    sfx.chip();
    setNotice(
      mode === 'buy'
        ? `所持金 ${fmt(value * MONEY_PER_CHIP)} を、チップ ${fmt(value)}枚 にかえました`
        : `チップ ${fmt(value)}枚 を、所持金 ${fmt(value * MONEY_PER_CHIP)} にもどしました`,
    );
    setAmount(0);
  };

  return (
    <>
      <ScreenHeader title="チップを用意する" onHome={() => go('home')} />
      <div className="mx-auto max-w-xl space-y-4">
        {reason === 'empty' && !broke && (
          <div className="rounded-2xl bg-rose-900/50 px-4 py-3 text-sm ring-1 ring-rose-300/30">
            <b>チップがなくなりました。</b>
            {money >= MONEY_PER_CHIP ? '所持金をチップにかえて、続けましょう。' : canBonus ? 'ログインボーナスを受け取って、チップにかえましょう。' : ''}
          </div>
        )}

        {broke && (
          <div className="rounded-2xl bg-neutral-800 px-4 py-5 text-center ring-1 ring-white/10">
            <div className="text-5xl" aria-hidden>
              😢
            </div>
            <div className="mt-1 text-2xl font-black tracking-widest text-neutral-200">とほほ…</div>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              チップも所持金も、なくなってしまいました。
              <br />
              ログインボーナスは<b className="text-amber-200">1日1回</b>。あした、また受け取れます。
            </p>
            <p className="mt-3 rounded-xl bg-black/30 px-3 py-2 text-xs leading-relaxed text-neutral-400">
              お金は、使えばなくなります。遊ぶ前に「今日はここまで」と決めておくのが大切です。
              <br />
              そのあいだに、クイズでカウントの練習をしておこう!
            </p>
            <button type="button" onClick={() => go('quiz')} className="mt-3 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold hover:bg-sky-500">
              クイズモードへ
            </button>
          </div>
        )}

        {/* 所持チップと所持金 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-white/10">
            <span className="text-xs text-neutral-400">所持チップ</span>
            <div className="flex h-9 items-center">
              <Chip chip={CHIPS[3]} size={34} />
            </div>
            <span className="text-3xl font-black tabular-nums text-amber-300">{fmt(chips)}</span>
            {atStake > 0 && <span className="text-[10px] text-neutral-500">ほかに テーブルに {fmt(atStake)}</span>}
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-white/10">
            <span className="text-xs text-neutral-400">所持金</span>
            <div className="flex h-9 items-center text-3xl" aria-hidden>
              👛
            </div>
            <span className="text-3xl font-black tabular-nums text-emerald-300">{fmt(money)}</span>
          </div>
        </div>

        {/* ログインボーナス */}
        <section className="flex items-center gap-3 rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-white/10">
          <span className="text-3xl" aria-hidden>
            🎁
          </span>
          <div className="flex-1">
            <div className="font-bold">ログインボーナス</div>
            <div className="text-xs text-neutral-400">1日1回、所持金 {fmt(LOGIN_BONUS)} を受け取れます</div>
          </div>
          <button
            type="button"
            disabled={!canBonus}
            onClick={() => {
              if (claimBonus()) {
                sfx.win();
                setNotice(`ログインボーナス! 所持金が ${fmt(LOGIN_BONUS)} ふえました`);
              }
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-black disabled:cursor-not-allowed ${
              canBonus ? 'chance-glow bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950' : 'bg-neutral-700 text-neutral-400'
            }`}
          >
            {canBonus ? '受け取る' : 'あしたまた'}
          </button>
        </section>

        {/* 銀行口座 */}
        <section className="rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-white/10">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🏦
            </span>
            <div className="flex-1">
              <div className="font-bold">銀行口座</div>
              <div className="text-xs text-neutral-400">
                1チップ = 所持金 {MONEY_PER_CHIP}。チップを所持金にもどすこともできます
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 text-sm font-bold">
            {(
              [
                ['buy', '所持金 → チップ'],
                ['sell', 'チップ → 所持金'],
              ] as [Mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setAmount(0);
                }}
                className={`rounded-lg py-2 transition ${mode === m ? 'bg-sky-600 text-white' : 'text-neutral-400 hover:bg-white/5'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-center tabular-nums">
            <div>
              <div className="text-[11px] text-neutral-400">{mode === 'buy' ? '所持金' : 'チップ'}</div>
              <div className={`text-2xl font-black ${mode === 'buy' ? 'text-emerald-300' : 'text-amber-300'}`}>
                {fmt(mode === 'buy' ? value * MONEY_PER_CHIP : value)}
              </div>
            </div>
            <span className="text-2xl text-neutral-500">→</span>
            <div>
              <div className="text-[11px] text-neutral-400">{mode === 'buy' ? 'チップ' : '所持金'}</div>
              <div className={`text-2xl font-black ${mode === 'buy' ? 'text-amber-300' : 'text-emerald-300'}`}>
                {fmt(mode === 'buy' ? value : value * MONEY_PER_CHIP)}
              </div>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={value}
            disabled={max === 0}
            onChange={(e) => setAmount(Number(e.target.value))}
            aria-label={mode === 'buy' ? 'チップにかえる枚数' : '所持金にもどすチップの枚数'}
            className="mt-3 w-full accent-sky-500 disabled:opacity-40"
          />
          <div className="flex justify-between text-[11px] text-neutral-500 tabular-nums">
            <span>0</span>
            <span>{max === 0 ? (mode === 'buy' ? '所持金がたりません' : 'チップがありません') : `最大 ${fmt(max)}枚`}</span>
          </div>

          <div className="mt-3 flex gap-2">
            {[
              ['半分', Math.floor(max / 2)],
              ['ぜんぶ', max],
            ].map(([label, n]) => (
              <button
                key={label}
                type="button"
                disabled={max === 0}
                onClick={() => setAmount(n as number)}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-30"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              disabled={value === 0}
              onClick={doExchange}
              className="flex-1 rounded-lg bg-amber-400 px-3 py-2 text-sm font-black text-amber-950 hover:bg-amber-300 disabled:opacity-30"
            >
              交換する
            </button>
          </div>
          {midRound && mode === 'sell' && <p className="mt-2 text-[11px] text-neutral-500">※ ラウンド中に賭けているチップは、交換できません。</p>}
        </section>

        {notice && (
          <p className="rounded-xl bg-emerald-900/40 px-4 py-2 text-center text-sm text-emerald-100 ring-1 ring-emerald-300/30" aria-live="polite">
            {notice}
          </p>
        )}

        {chips > 0 && (
          <button
            type="button"
            onClick={() => go('game')}
            className="w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-base font-black text-amber-950 shadow-xl"
          >
            ゲームへ ▶
          </button>
        )}

        <p className="text-center text-[11px] leading-relaxed text-neutral-500">
          チップも所持金も、このアプリの中だけのものです。ほんとうのお金とは関係ありません。
          <br />
          データは、このブラウザに保存されます。
        </p>
      </div>
    </>
  );
}
