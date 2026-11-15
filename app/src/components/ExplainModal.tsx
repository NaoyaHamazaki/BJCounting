import { useEffect, useState } from 'react';
import { hiLoValue } from '../game/count';
import { useGameStore } from '../store/useGameStore';
import { CardSteps } from './CardSteps';
import { PlayingCard } from './PlayingCard';

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

/** このラウンドで出たカードを1枚ずつめくって、カウンティングの手順を解説する */
export function ExplainModal({ onClose }: { onClose: () => void }) {
  const log = useGameStore((s) => s.roundLog);
  const finished = useGameStore((s) => s.phase === 'roundOver');
  // 最後のページ(index === log.length)はまとめ
  const [index, setIndex] = useState(0);
  const pages = log.length + 1;
  const i = Math.min(index, pages - 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((x) => Math.min(x + 1, pages - 1));
      if (e.key === 'ArrowLeft') setIndex((x) => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pages]);

  const first = log[0];
  const last = log[log.length - 1];
  const rcStart = first?.rcBefore ?? 0;
  const rcEnd = last ? last.rcBefore + hiLoValue(last.card.rank) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="カウンティングの解説"
        className="flex max-h-[94svh] w-full max-w-2xl flex-col rounded-t-2xl bg-neutral-900 text-neutral-100 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-bold">カウンティングの解説</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            閉じる
          </button>
        </div>

        {/* このラウンドのカード(押すとそのカードへ) */}
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-4 pb-3 pt-2">
          {log.map((e, k) => (
            <button key={e.card.id} type="button" onClick={() => setIndex(k)} className={`shrink-0 rounded transition ${k === i ? 'ring-2 ring-amber-300' : 'opacity-60 hover:opacity-100'}`}>
              <PlayingCard card={e.card} size="xs" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIndex(log.length)}
            className={`shrink-0 rounded px-2 text-[11px] font-bold ${i === log.length ? 'bg-amber-400 text-amber-950' : 'bg-white/10'}`}
          >
            まとめ
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {log.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">このラウンドでは、まだカードが出ていません。</p>
          ) : i < log.length ? (
            <CardSteps key={log[i].card.id} entry={log[i]} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                このラウンドで表になったカードは <b>{log.length}枚</b>{finished ? '' : '(ラウンドはまだ続いています)'}。
              </p>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="mb-2 text-xs text-neutral-400">点数をたしていくと…</div>
                <div className="flex flex-wrap items-center gap-1 text-sm tabular-nums">
                  <span className="rounded bg-black/40 px-2 py-0.5 font-bold">{signed(rcStart)}</span>
                  {log.map((e) => {
                    const v = hiLoValue(e.card.rank);
                    return (
                      <span key={e.card.id} className="flex items-center gap-0.5">
                        <PlayingCard card={e.card} size="xs" />
                        <span className={`font-bold ${v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-neutral-400'}`}>{signed(v)}</span>
                      </span>
                    );
                  })}
                  <span className="mx-1">=</span>
                  <span className="rounded bg-amber-400 px-2 py-0.5 font-black text-amber-950">{signed(rcEnd)}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-400">ランニングカウントは、シャッフルしてから出たカード全部の合計です。ラウンドをまたいでも、シャッフルするまで続けて数えます。</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={() => setIndex(Math.max(i - 1, 0))} disabled={i === 0} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-30">
            ◀ まえ
          </button>
          <span className="text-xs tabular-nums text-neutral-400">
            {i < log.length ? `${i + 1} / ${log.length}枚目` : 'まとめ'}
          </span>
          <button
            type="button"
            onClick={() => setIndex(Math.min(i + 1, pages - 1))}
            disabled={i >= pages - 1}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold disabled:opacity-30"
          >
            つぎ ▶
          </button>
        </div>
      </div>
    </div>
  );
}
