import { useEffect, useState } from 'react';
import { rankValue } from '../game/deck';
import type { Card, Rank, Suit } from '../game/types';
import { PointRow } from './HelpModal';
import { PlayingCard } from './PlayingCard';

const card = (rank: Rank, suit: Suit = 'Spades'): Card => ({ id: `guide-${rank}-${suit}`, rank, suit, value: rankValue(rank) });

function Row({ cards }: { cards: Card[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {cards.map((c) => (
        <PlayingCard key={c.id} card={c} size="sm" />
      ))}
    </div>
  );
}

const Box = ({ children }: { children: React.ReactNode }) => <div className="my-3 rounded-xl bg-white/5 p-3">{children}</div>;

type Page = { title: string; icon: string; body: React.ReactNode };

const PAGES: Page[] = [
  {
    title: 'カードカウンティングってなに?',
    icon: '🃏',
    body: (
      <>
        <p>
          トランプを1枚引いたら、そのカードは<b>山に戻しません</b>。だから、カードが出るたびに、山に残っているカードの中身が少しずつ変わります。
        </p>
        <Box>
          <p className="mb-2 text-center text-xs text-neutral-400">たとえば 52枚の山から A が出ると…</p>
          <p className="text-center text-base font-bold tabular-nums">
            A が出る確率 4 ÷ 52 ≒ <span className="text-sky-300">7.7%</span> → 3 ÷ 51 ≒ <span className="text-rose-300">5.9%</span>
          </p>
          <p className="mt-2 text-center text-xs text-neutral-400">出たカードは出にくくなり、ほかのカードは少し出やすくなる</p>
        </Box>
        <p>
          <b className="text-amber-200">カードカウンティング</b>は、出たカードを覚えて「残りの山に、どんなカードが多いか」を予想する考え方です。数学の<b>確率</b>そのものです。
        </p>
      </>
    ),
  },
  {
    title: '点数をつけて、たし算する',
    icon: '➕',
    body: (
      <>
        <p>
          52枚ぜんぶを覚えるのは大変です。そこで、カードを3つのなかまに分けて、<b>点数</b>をつけます(Hi-Lo という方法)。
        </p>
        <PointRow />
        <p>出たカードの点数を、どんどんたしていきます。この合計を「ランニングカウント」とよびます。</p>
        <Box>
          <Row cards={[card('5', 'Hearts'), card('K'), card('3', 'Diamonds'), card('2', 'Clubs')]} />
          <p className="mt-2 text-center text-base font-bold tabular-nums">
            (+1) + (−1) + (+1) + (+1) = <span className="text-emerald-300">+2</span>
          </p>
        </Box>
        <p className="text-neutral-400">自分のカードだけでなく、ほかの人やディーラーのカードも、見えたものは全部数えます。</p>
      </>
    ),
  },
  {
    title: 'プラスだと、なぜ有利なの?',
    icon: '📈',
    body: (
      <>
        <p>
          合計がプラス = 小さいカード(2〜6)がたくさん出た、ということ。つまり、<b>残りの山には大きいカード(10・絵札・A)が多く残っています</b>。
        </p>
        <Box>
          <ul className="space-y-2">
            <li>
              ① <b>ブラックジャック</b>(A と 10点のカード)が出やすくなる。ブラックジャックは、賭けたチップの1.5倍もらえます
            </li>
            <li>
              ② ディーラーは「16以下なら必ずもう1枚引く」ルール。大きいカードが多いと、引いて<b>21をこえる(バースト)</b>ことが増えます
            </li>
          </ul>
        </Box>
        <p>反対に、合計がマイナスのときは、小さいカードが多く残っていて、プレイヤーには少し不利です。</p>
      </>
    ),
  },
  {
    title: '残りの量でわる(トゥルーカウント)',
    icon: '➗',
    body: (
      <>
        <p>
          同じ「+6」でも、山がたくさん残っているときと、少ししか残っていないときでは、意味がちがいます。そこで、合計を<b>残りのデッキ数(52枚 = 1デッキ)</b>でわります。
        </p>
        <Box>
          <p className="text-center font-bold">トゥルーカウント = 合計 ÷ 残りのデッキ数</p>
          <ul className="mt-2 space-y-1 text-center tabular-nums">
            <li>
              +6 ÷ のこり6デッキ = <b className="text-emerald-300">+1</b>(少し有利)
            </li>
            <li>
              +6 ÷ のこり2デッキ = <b className="text-emerald-300">+3</b>(かなり有利)
            </li>
          </ul>
        </Box>
        <p>ジュースの砂糖と同じです。砂糖(合計)が同じでも、水(残りのカード)が少ないほど「こく」なります。</p>
      </>
    ),
  },
  {
    title: 'このアプリでの練習のしかた',
    icon: '🎓',
    body: (
      <>
        <ol className="space-y-2">
          <li>
            <b>① ゲーム</b>で遊びながら、出たカードを頭の中でたし算する
          </li>
          <li>
            <b>② COUNT</b> ボタンで答え合わせ。残りのカードの一覧や、次に出る確率も見られます
          </li>
          <li>
            <b>③ 解説</b> ボタンで、1枚ずつ「確率がどう変わったか」をふり返る
          </li>
          <li>
            <b>④ クイズ</b>で、点数・たし算・確率の計算を練習する
          </li>
        </ol>
        <Box>
          <p>
            はじめは <b className="text-amber-200">1デッキか2デッキ</b>がおすすめ。カードの枚数が少ないほど、1枚出たときの確率の変化が大きく、目で見て分かりやすくなります。
          </p>
        </Box>
        <p className="text-xs leading-relaxed text-neutral-400">
          このアプリは、確率を学ぶための教材です。チップや所持金はアプリの中だけのもので、ほんとうのお金を賭ける遊びをすすめるものではありません。
        </p>
      </>
    ),
  },
];

/** トップページから開く「カードカウンティングってなに?」(中学生向け、5ページ) */
export function GuideModal({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const last = PAGES.length - 1;
  const page = PAGES[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, last));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, last]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="カードカウンティングの説明"
        className="flex max-h-[94svh] w-full max-w-lg flex-col rounded-t-2xl bg-neutral-900 text-neutral-100 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <span aria-hidden>{page.icon}</span>
            {page.title}
          </h2>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            とじる
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm leading-relaxed">{page.body}</div>
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={() => setI(Math.max(i - 1, 0))} disabled={i === 0} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-30">
            ◀ まえ
          </button>
          <div className="flex gap-1.5" aria-label={`${i + 1} / ${PAGES.length}ページ`}>
            {PAGES.map((p, k) => (
              <button
                key={p.title}
                type="button"
                onClick={() => setI(k)}
                aria-label={`${k + 1}ページ目`}
                className={`h-2.5 rounded-full transition-all ${k === i ? 'w-6 bg-amber-300' : 'w-2.5 bg-white/25 hover:bg-white/50'}`}
              />
            ))}
          </div>
          {i < last ? (
            <button type="button" onClick={() => setI(i + 1)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold">
              つぎ ▶
            </button>
          ) : (
            <button type="button" onClick={onClose} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-amber-950">
              はじめる!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
