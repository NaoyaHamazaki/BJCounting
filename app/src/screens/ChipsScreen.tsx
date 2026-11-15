import { useState } from 'react';
import { Chip, CHIPS } from '../components/Chips';
import { sfx } from '../sound/sfx';
import { chipsAtStake, useGameStore } from '../store/useGameStore';
import { displayName } from '../store/profile';
import { useProfile } from '../store/useProfile';
import { bonusAvailable, useWallet } from '../store/useWallet';
import { EXCHANGE_STEP, exchangeRange, LOGIN_BONUS, MONEY_PER_CHIP } from '../store/wallet';
import type { Screen } from './HomeScreen';
import { ScreenHeader } from './ScreenHeader';

const fmt = (n: number) => n.toLocaleString();
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`;

function StatRow({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-white/5 py-2 last:border-0">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="text-right tabular-nums">
        <b className={`text-base ${tone ?? 'text-neutral-100'}`}>{value}</b>
        {sub && <span className="ml-1.5 text-[11px] text-neutral-500">{sub}</span>}
      </span>
    </div>
  );
}

/** これまでの記録(チップにかえた所持金、もどした所持金、ゲームの勝ち負け) */
function Records({ chips, money }: { chips: number; money: number }) {
  const p = useProfile();
  const st = p.stats;
  return (
    <section className="rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          📒
        </span>
        <div className="flex-1">
          <div className="font-bold">これまでの記録</div>
          <div className="text-xs text-neutral-400">
            {displayName(p)}(はじめて遊んだ日 {p.since})
          </div>
        </div>
      </div>
      <div className="mt-2">
        <StatRow label="チップにかえた所持金(投入)" value={fmt(st.invested)} />
        <StatRow label="チップからもどした所持金" value={fmt(st.cashedOut)} />
        <StatRow
          label="ゲームの勝ち負け"
          value={`${signed(st.net)} チップ`}
          sub={`所持金で ${signed(st.net * MONEY_PER_CHIP)}`}
          tone={st.net > 0 ? 'text-emerald-300' : st.net < 0 ? 'text-rose-300' : undefined}
        />
        <StatRow label="遊んだラウンド" value={`${fmt(st.rounds)}回`} sub={`勝ち ${st.wins} ・ 負け ${st.losses} ・ 引き分け ${st.pushes}`} />
        <StatRow label="1回でいちばん多く勝ったチップ" value={fmt(st.bestWin)} />
        <StatRow label="受け取ったログインボーナス" value={fmt(st.bonusTotal)} />
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">いまの持ち物:チップ {fmt(chips)} ・ 所持金 {fmt(money)}</p>
    </section>
  );
}

/** チップを用意する画面(所持チップ・所持金・ログインボーナス・チップ交換) */
export function ChipsScreen({ go, reason }: { go: (s: Screen) => void; reason?: 'empty' }) {
  const chips = useGameStore((s) => s.bankroll);
  const atStake = useGameStore(chipsAtStake);
  const midRound = useGameStore((s) => s.phase !== 'betting' && s.phase !== 'roundOver');
  const { money, lastBonus, claimBonus, buyChips, sellChips } = useWallet();
  const canBonus = bonusAvailable(lastBonus);
  const [notice, setNotice] = useState<string | null>(null);

  // 交換したあとのチップ(スライダーの値)。null = 今のまま
  const [picked, setPicked] = useState<number | null>(null);
  const range = exchangeRange(chips, money);
  const target = Math.min(range.max, Math.max(range.min, picked ?? chips));
  const setTarget = (n: number) => setPicked(n);
  const delta = target - chips;
  const moneyAfter = money - delta * MONEY_PER_CHIP;
  // バーの境目の位置(スライダーの位置と同じ)
  const pos = range.max === range.min ? 0.5 : (target - range.min) / (range.max - range.min);
  const minBuy = EXCHANGE_STEP * MONEY_PER_CHIP;
  const broke = chips + atStake < 1 && money < minBuy && !canBonus;

  const doExchange = () => {
    const ok = delta > 0 ? buyChips(delta) : sellChips(-delta);
    if (!ok) return;
    sfx.chip();
    setNotice(
      delta > 0
        ? `所持金 ${fmt(delta * MONEY_PER_CHIP)} を、チップ ${fmt(delta)}枚 にかえました`
        : `チップ ${fmt(-delta)}枚 を、所持金 ${fmt(-delta * MONEY_PER_CHIP)} にもどしました`,
    );
    setPicked(null);
  };

  return (
    <>
      <ScreenHeader title="チップを用意する" onHome={() => go('home')} />
      <div className="mx-auto max-w-xl space-y-4">
        {reason === 'empty' && !broke && (
          <div className="rounded-2xl bg-rose-900/50 px-4 py-3 text-sm ring-1 ring-rose-300/30">
            <b>チップがなくなりました。</b>
            {money >= minBuy ? '所持金をチップにかえて、続けましょう。' : canBonus ? 'ログインボーナスを受け取って、チップにかえましょう。' : ''}
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

        {/* チップ交換: 1本のバーを、チップ(左)と所持金(右)に分ける。境目を動かして交換する */}
        <section className="rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-white/10">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🔄
            </span>
            <div className="flex-1">
              <div className="font-bold">チップ交換</div>
              <div className="text-xs text-neutral-400">
                1チップ = 所持金 {MONEY_PER_CHIP}。{EXCHANGE_STEP}チップ(所持金 {fmt(EXCHANGE_STEP * MONEY_PER_CHIP)})ずつ交換できます
              </div>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90 ring-1 ring-amber-300/20">
            🔥 もっていくチップを決めておくと、熱くなって所持金を使い切る心配がありません。
          </p>

          {/* 数字はバーの上に出す(つまみと重ならないように) */}
          <div className="mt-4 flex items-end justify-between tabular-nums">
            <div className="rounded-lg bg-[#fde0d6] px-3 py-1 text-neutral-800">
              <span className="text-[11px]">チップ </span>
              <b className="text-lg">{fmt(target)}</b>
            </div>
            <div className="rounded-lg bg-[#dcf3cf] px-3 py-1 text-right text-neutral-800">
              <span className="text-[11px]">所持金 </span>
              <b className="text-lg">{fmt(moneyAfter)}</b>
            </div>
          </div>
          <div className="relative mx-2.5 mt-2 h-12">
            <div className="absolute inset-0 overflow-hidden rounded-xl ring-1 ring-white/20">
              <div className="absolute inset-y-0 left-0 bg-[#fde0d6]" style={{ width: `${pos * 100}%` }} />
              <div className="absolute inset-y-0 right-0 bg-[#dcf3cf]" style={{ width: `${(1 - pos) * 100}%` }} />
            </div>
            {/* 境目のつまみ */}
            <div className="pointer-events-none absolute inset-y-0 w-0" style={{ left: `${pos * 100}%` }}>
              <div className="absolute inset-y-0 -left-[1.5px] w-[3px] bg-white shadow" />
              <div className="absolute left-1/2 top-1/2 flex h-8 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-white text-[10px] text-neutral-500 shadow ring-1 ring-black/10">
                ⇔
              </div>
            </div>
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={EXCHANGE_STEP}
              value={target}
              disabled={range.max === range.min}
              onChange={(e) => setTarget(Number(e.target.value))}
              aria-label="交換したあとのチップの枚数"
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0 disabled:cursor-not-allowed"
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-neutral-500">
            <span>← チップをへらす</span>
            <span>チップをふやす →</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <p className="flex-1 text-xs tabular-nums text-neutral-300">
              {range.max === range.min
                ? `交換できるのは ${EXCHANGE_STEP}チップ(所持金 ${fmt(EXCHANGE_STEP * MONEY_PER_CHIP)})からです`
                : delta === 0
                  ? '境目を左右に動かして、もっていくチップを決めよう'
                  : delta > 0
                    ? `所持金 ${fmt(delta * MONEY_PER_CHIP)} → チップ ${fmt(delta)}枚`
                    : `チップ ${fmt(-delta)}枚 → 所持金 ${fmt(-delta * MONEY_PER_CHIP)}`}
            </p>
            <button type="button" disabled={delta === 0} onClick={() => setTarget(chips)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-30">
              もどす
            </button>
            <button
              type="button"
              disabled={delta === 0}
              onClick={doExchange}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-amber-950 hover:bg-amber-300 disabled:opacity-30"
            >
              交換する
            </button>
          </div>
          {midRound && <p className="mt-2 text-[11px] text-neutral-500">※ ラウンド中に賭けているチップは、交換できません。</p>}
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

        <Records chips={chips + atStake} money={money} />

        <p className="text-center text-[11px] leading-relaxed text-neutral-500">
          チップも所持金も、このアプリの中だけのものです。ほんとうのお金とは関係ありません。
          <br />
          データは、このブラウザに保存されます。
        </p>
      </div>
    </>
  );
}
