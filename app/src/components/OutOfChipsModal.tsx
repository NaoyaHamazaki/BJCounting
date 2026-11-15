import { useEffect, useState } from 'react';
import { useProfile } from '../store/useProfile';
import { bonusAvailable, useWallet } from '../store/useWallet';
import { EXCHANGE_STEP, MONEY_PER_CHIP } from '../store/wallet';

const COOL_DOWN_SEC = 5;
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`;

/**
 * チップがなくなったときの案内。ゲーム画面の中では交換させず、いったん画面を離れて冷静になってもらう。
 * 所持金かボーナスで用意できるなら「チップを用意する」画面へ、できなければトップへ案内する
 */
export function OutOfChipsModal({ onChips, onHome }: { onChips: () => void; onHome: () => void }) {
  const money = useWallet((w) => w.money);
  const canBonus = bonusAvailable(useWallet((w) => w.lastBonus));
  const stats = useProfile((p) => p.stats);
  const canPrepare = money >= EXCHANGE_STEP * MONEY_PER_CHIP || canBonus;
  const [left, setLeft] = useState(COOL_DOWN_SEC);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div role="alertdialog" aria-modal="true" aria-label="チップがなくなりました" className="w-full max-w-md rounded-2xl bg-neutral-900 p-5 text-center text-sm leading-relaxed text-neutral-100 shadow-2xl ring-1 ring-white/15">
        {canPrepare ? (
          <>
            <div className="text-4xl" aria-hidden>
              ☕
            </div>
            <h2 className="mt-1 text-xl font-black">チップがなくなりました</h2>
            <p className="mt-2 text-neutral-300">
              ここで一度、ひと休みしましょう。
              <br />
              負けを取り返そうと熱くなったまま続けると、所持金まで使い切ってしまうかもしれません。
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl" aria-hidden>
              😢
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-widest">とほほ…</h2>
            <p className="mt-2 text-neutral-300">
              チップも所持金も、なくなってしまいました。
              <br />
              ログインボーナスは<b className="text-amber-200">1日1回</b>。あした、また受け取れます。
            </p>
          </>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-3 tabular-nums">
          <div>
            <div className="text-[11px] text-neutral-400">これまでの勝ち負け</div>
            <div className={`text-lg font-black ${stats.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{signed(stats.net)} チップ</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-400">チップにかえた所持金</div>
            <div className="text-lg font-black text-neutral-200">{stats.invested.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {canPrepare && (
            <button
              type="button"
              disabled={left > 0}
              onClick={onChips}
              className="rounded-xl bg-amber-400 py-2.5 font-black text-amber-950 hover:bg-amber-300 disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {left > 0 ? `ひと休み中… ${left}` : 'チップを用意する画面へ'}
            </button>
          )}
          <button type="button" onClick={onHome} className={`rounded-xl py-2.5 font-bold ${canPrepare ? 'bg-white/10 hover:bg-white/20' : 'bg-sky-600 hover:bg-sky-500'}`}>
            トップへもどる{canPrepare ? '' : '(クイズで練習しよう)'}
          </button>
        </div>
      </div>
    </div>
  );
}
