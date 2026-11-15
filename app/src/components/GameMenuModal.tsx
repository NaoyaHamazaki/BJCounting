import { useEffect } from 'react';
import { MAX_CPUS, useGameStore } from '../store/useGameStore';
import { useSettings } from '../store/useSettings';

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-lg text-sm font-bold ring-1 transition ${on ? 'bg-amber-400 text-amber-950 ring-amber-300' : 'bg-neutral-800 text-white ring-white/15 hover:bg-neutral-700'}`}
    >
      {children}
    </button>
  );
}

/** ゲーム画面(スマホ)のスパナから開く設定。ヘッダーを散らかさないように、デッキ数・CPU・効果音・リセットをまとめる */
export function GameMenuModal({ onClose, onDecks, onReset }: { onClose: () => void; onDecks: (n: number) => void; onReset: () => void }) {
  const deckCount = useGameStore((s) => s.deckCount);
  const cpuCount = useGameStore((s) => s.cpuCount);
  const setCpuCount = useGameStore((s) => s.setCpuCount);
  const { sound, update } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ゲームの設定"
        className="max-h-[92svh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 text-neutral-100 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <span aria-hidden>🔧</span> ゲームの設定
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            とじる
          </button>
        </div>

        <div className="text-sm font-bold">デッキ数</div>
        <div className="mb-1 text-[11px] text-neutral-400">★ = 確率の学習におすすめ。変えるとシャッフルし直します</div>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <Choice key={n} on={n === deckCount} onClick={() => onDecks(n)}>
              {n}
              {n <= 2 ? '★' : ''}
            </Choice>
          ))}
        </div>

        <div className="mt-4 text-sm font-bold">CPU の人数</div>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {Array.from({ length: MAX_CPUS + 1 }, (_, i) => i).map((n) => (
            <Choice
              key={n}
              on={n === cpuCount}
              onClick={() => {
                update({ cpuCount: n });
                setCpuCount(n);
              }}
            >
              {n}人
            </Choice>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ sound: !sound })}
            className="min-h-12 rounded-xl bg-neutral-800 text-sm font-bold ring-1 ring-white/15 hover:bg-neutral-700"
          >
            効果音:{sound ? '🔊 オン' : '🔇 オフ'}
          </button>
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="min-h-12 rounded-xl bg-neutral-800 text-sm font-bold ring-1 ring-white/15 hover:bg-neutral-700"
          >
            リセット(シャッフル)
          </button>
        </div>
        <p className="mt-3 text-[11px] text-neutral-500">※ ラウンドの途中で変えると、そのラウンドは中止になり、賭けたチップは戻ります。ほかの設定はトップの「設定」から。</p>
      </div>
    </div>
  );
}
