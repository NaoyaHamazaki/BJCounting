import { useEffect, useState } from 'react';
import { useProfile } from '../store/useProfile';
import { bonusAvailable, studyLeftToday, useWallet } from '../store/useWallet';
import { EXCHANGE_STEP, MONEY_PER_CHIP, QUIZ_REWARD } from '../store/wallet';

const COOL_DOWN_SEC = 5;
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`;

/**
 * チップがなくなったときの案内。ゲーム画面の中では交換させず、いったん画面を離れて冷静になってもらう。
 * 所持金かボーナスで用意できるなら「チップを用意する」画面へ、できなければトップへ案内する
 */
export function OutOfChipsModal({ onChips, onHome, onQuiz }: { onChips: () => void; onHome: () => void; onQuiz: () => void }) {
  const money = useWallet((w) => w.money);
  const canBonus = bonusAvailable(useWallet((w) => w.lastBonus));
  const stats = useProfile((p) => p.stats);
  const studyLeft = studyLeftToday(useWallet());
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
              チップがなくなり、所持金もチップにかえられるほど残っていません。
              <br />
              ログインボーナスは<b className="text-amber-200">1日1回</b>。あした、また受け取れます。
            </p>
            {studyLeft > 0 ? (
              <p className="mt-3 rounded-xl bg-emerald-900/40 px-3 py-2 text-xs leading-relaxed text-emerald-100 ring-1 ring-emerald-300/30">
                💡 <b>クイズやトレーニングで所持金をかせげます!</b>
                <br />
                1問正解で +{QUIZ_REWARD}(今日あと {studyLeft.toLocaleString()} まで)
              </p>
            ) : (
              <p className="mt-3 text-xs text-neutral-400">今日クイズでかせげる所持金も、上限に達しました。また、あした!</p>
            )}
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
          {!canPrepare && studyLeft > 0 && (
            <button type="button" onClick={onQuiz} className="rounded-xl bg-emerald-600 py-2.5 font-black hover:bg-emerald-500">
              クイズで所持金をかせぐ
            </button>
          )}
          <button type="button" onClick={onHome} className="rounded-xl bg-white/10 py-2.5 font-bold hover:bg-white/20">
            トップへもどる
          </button>
        </div>
      </div>
    </div>
  );
}
