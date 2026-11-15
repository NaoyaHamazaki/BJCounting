import { rankValue } from '../game/deck';
import type { Card, Rank } from '../game/types';
import { PlayingCard } from './PlayingCard';

export type HelpTopic = 'rc' | 'tc' | 'mix' | 'prob';

const ex = (rank: Rank, i: number): Card => ({ id: `ex${i}`, suit: i % 2 ? 'Hearts' : 'Spades', rank, value: rankValue(rank) });

/** 点数の早見表。highlight に点数(+1/0/-1)を渡すと、そのなかまを光らせ、ほかを暗くする */
export function PointRow({ highlight }: { highlight?: number }) {
  const groups: { ranks: Rank[]; label: string; value: number; color: string }[] = [
    { ranks: ['2', '3', '4', '5', '6'], label: '+1', value: 1, color: 'bg-emerald-500' },
    { ranks: ['7', '8', '9'], label: '0', value: 0, color: 'bg-slate-500' },
    { ranks: ['10', 'K', 'A'], label: '−1', value: -1, color: 'bg-rose-500' },
  ];
  return (
    <div className="my-3 grid gap-2 sm:grid-cols-3">
      {groups.map((g) => (
        <div
          key={g.label}
          className={`flex items-center gap-2 rounded-lg p-2 transition ${
            highlight === undefined ? 'bg-white/5' : highlight === g.value ? 'bg-white/15 ring-2 ring-amber-300' : 'bg-white/5 opacity-35'
          }`}
        >
          <div className="flex">
            {g.ranks.map((r, i) => (
              <PlayingCard key={r} card={ex(r, i)} size="xs" className={i ? '-ml-2' : ''} />
            ))}
          </div>
          <span className={`rounded-full px-2 py-0.5 text-sm font-extrabold ${g.color}`}>{g.label}</span>
        </div>
      ))}
    </div>
  );
}

const CONTENT: Record<HelpTopic, { title: string; body: React.ReactNode }> = {
  rc: {
    title: 'ランニングカウントって?',
    body: (
      <>
        <p>出たカードに点数をつけて、<b>たし算していった合計</b>です。</p>
        <PointRow />
        <p className="rounded-lg bg-white/5 p-3">
          例:<b>5</b>、<b>K</b>、<b>3</b>、<b>2</b> が出たら<br />
          (+1) + (−1) + (+1) + (+1) = <b className="text-emerald-300">+2</b>
        </p>
        <p className="mt-3">
          小さいカード(2〜6)がたくさん出ると、プラスになります。プラスが大きいほど、<b>まだ出ていない大きいカード(10・絵札・A)がたくさん残っている</b>ということです。
        </p>
        <p className="mt-2 text-neutral-400">自分のカードだけでなく、CPU やディーラーのカードも、見えたものは全部数えます。伏せてあるカードは、表になってから数えます。</p>
      </>
    ),
  },
  tc: {
    title: 'トゥルーカウントって?',
    body: (
      <>
        <p>
          ランニングカウントを、<b>のこりのデッキ数(52枚=1デッキ)でわった数</b>です。
        </p>
        <p className="my-3 rounded-lg bg-white/5 p-3 text-center text-base font-bold">トゥルーカウント = ランニングカウント ÷ のこりのデッキ数</p>
        <p>同じ +6 でも、のこりの量でぜんぜん意味がちがいます。</p>
        <ul className="my-3 space-y-1.5 rounded-lg bg-white/5 p-3">
          <li>のこり 6デッキ → 6 ÷ 6 = <b className="text-emerald-300">+1</b>(少しだけ大きいカードが多い)</li>
          <li>のこり 2デッキ → 6 ÷ 2 = <b className="text-emerald-300">+3</b>(大きいカードがかなり多い)</li>
        </ul>
        <p>
          ジュースに入れた砂糖と同じです。砂糖の量(ランニングカウント)が同じでも、水(のこりのカード)が少ないほど<b>こく</b>なります。トゥルーカウントは、その「こさ」を表します。
        </p>
      </>
    ),
  },
  mix: {
    title: '残りカードの構成って?',
    body: (
      <>
        <p>まだ出ていないカードを、小さい(2〜6)・まん中(7〜9)・大きい(10〜A)の3つに分けた割合です。</p>
        <p className="mt-2">
          シャッフルしたばかりのときは、13種類のうち 小さい5種類・まん中3種類・大きい5種類なので、<b>約38% : 23% : 38%</b> です(白い線)。
        </p>
        <p className="mt-2">
          大きいカードの割合が白い線より多いと、ブラックジャック(A と 10)が出やすく、ディーラーもバーストしやすくなります。
        </p>
      </>
    ),
  },
  prob: {
    title: '次に出る確率の計算',
    body: (
      <>
        <p className="my-2 rounded-lg bg-white/5 p-3 text-center text-base font-bold">確率(%) = そのカードののこり枚数 ÷ のこり全部の枚数 × 100</p>
        <p>
          例:のこりが 100枚で、そのうち A が 8枚なら、8 ÷ 100 × 100 = <b>8%</b>。
        </p>
        <p className="mt-2">
          シャッフル直後は、2〜10 と A はそれぞれ <b>4 ÷ 52 ≒ 7.7%</b>、絵札(J・Q・K)は3種類あるので <b>12 ÷ 52 ≒ 23.1%</b> です。カードが出るたびに、この数字が少しずつ変わっていきます。
        </p>
      </>
    ),
  },
};

export function HelpButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}の説明`}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-black text-white shadow hover:bg-sky-400"
    >
      ?
    </button>
  );
}

export function HelpModal({ topic, onClose }: { topic: HelpTopic; onClose: () => void }) {
  const c = CONTENT[topic];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={c.title}
        className="max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-2xl bg-neutral-800 p-5 text-sm leading-relaxed text-neutral-100 shadow-2xl ring-1 ring-sky-400/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-sky-300">{c.title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-sm font-semibold hover:bg-white/20">
            とじる
          </button>
        </div>
        {c.body}
      </div>
    </div>
  );
}
