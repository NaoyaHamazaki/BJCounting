import { useEffect, useState } from 'react';

/** 1デッキ・n デッキで、A が1枚出たときの確率の変化(説明用) */
const drop = (decks: number) => {
  const a = 4 * decks;
  const all = 52 * decks;
  return [((a / all) * 100).toFixed(1), (((a - 1) / (all - 1)) * 100).toFixed(1)];
};

/** 3デッキ以上でゲームを始めたときに、1〜2デッキをすすめる */
export function DeckTipModal({ deckCount, onChoose }: { deckCount: number; onChoose: (decks: number | null, hideNext: boolean) => void }) {
  const [hide, setHide] = useState(false);
  const [one0, one1] = drop(1);
  const [many0, many1] = drop(deckCount);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChoose(null, hide);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChoose, hide]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-label="デッキ数のおすすめ" className="w-full max-w-md rounded-2xl bg-neutral-900 p-5 text-sm leading-relaxed text-neutral-100 shadow-2xl ring-1 ring-amber-300/40">
        <h2 className="flex items-center gap-2 text-lg font-black text-amber-200">
          <span aria-hidden>💡</span> 確率の学習には 1〜2デッキがおすすめ
        </h2>
        <p className="mt-2">
          いまは <b>{deckCount}デッキ({deckCount * 52}枚)</b>です。カードが少ないほど、1枚出たときの確率の変化が大きく、目で見て分かりやすくなります。
        </p>
        <div className="my-3 space-y-1.5 rounded-xl bg-white/5 p-3 tabular-nums">
          <div className="text-xs text-neutral-400">A が1枚出たとき、次に A が出る確率は…</div>
          <div>
            1デッキ:{one0}% → <b className="text-rose-300">{one1}%</b>(大きく下がる)
          </div>
          <div>
            {deckCount}デッキ:{many0}% → <b className="text-neutral-300">{many1}%</b>(ほとんど変わらない)
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onChoose(1, hide)} className="rounded-xl bg-amber-400 py-2.5 font-black text-amber-950 hover:bg-amber-300">
            1デッキにする
          </button>
          <button type="button" onClick={() => onChoose(2, hide)} className="rounded-xl bg-amber-400 py-2.5 font-black text-amber-950 hover:bg-amber-300">
            2デッキにする
          </button>
        </div>
        <button type="button" onClick={() => onChoose(null, hide)} className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm font-bold hover:bg-white/20">
          このまま {deckCount}デッキで遊ぶ
        </button>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 text-xs text-neutral-300">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} className="h-4 w-4 accent-amber-400" />
          次回以降表示しない
        </label>
        <p className="mt-1 text-center text-[10px] text-neutral-500">デッキ数は、ゲーム画面の上や設定画面でいつでも変えられます</p>
      </div>
    </div>
  );
}
