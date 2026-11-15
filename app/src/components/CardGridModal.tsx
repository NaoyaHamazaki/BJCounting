import { useEffect } from 'react';
import { countBySuitRank, remainLevel, SEVENS_ORDER } from '../game/count';
import { SUITS, type Rank, type Suit } from '../game/types';
import { unseenCards, useGameStore } from '../store/useGameStore';

const SUIT_SYMBOL: Record<Suit, string> = { Spades: '♠', Hearts: '♥', Diamonds: '♦', Clubs: '♣' };
const SUIT_NAME: Record<Suit, string> = { Spades: 'スペード', Hearts: 'ハート', Diamonds: 'ダイヤ', Clubs: 'クラブ' };
const isRed = (s: Suit) => s === 'Hearts' || s === 'Diamonds';

/** 残り枚数の色(段階 1〜6)。たくさん残っている = 緑、少ない = 赤 */
const LEVEL_STYLE: Record<number, string> = {
  6: 'bg-emerald-500 text-white',
  5: 'bg-lime-400 text-lime-950',
  4: 'bg-yellow-300 text-yellow-950',
  3: 'bg-amber-500 text-amber-950',
  2: 'bg-orange-600 text-white',
  1: 'bg-rose-600 text-white',
};

function Badge({ n, level }: { n: number; level: number }) {
  return (
    <span
      className={`absolute -right-1.5 -top-1.5 z-10 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-0.5 text-[9px] font-black leading-none shadow ring-1 ring-black/30 sm:h-5 sm:min-w-5 sm:text-[11px] ${LEVEL_STYLE[level]}`}
    >
      {n}
    </span>
  );
}

/** 一覧の1マス。残りがなければ点線の空きマス(七並べの「まだ置かれていない場所」のイメージ) */
function Cell({ suit, rank, remaining, deckCount, recent }: { suit: Suit; rank: Rank; remaining: number; deckCount: number; recent: boolean }) {
  const level = remainLevel(remaining, deckCount);
  const label = `${SUIT_NAME[suit]}の${rank} のこり${remaining}枚`;
  if (level === 0) {
    return (
      <div
        aria-label={label}
        className={`relative flex aspect-[5/7] items-center justify-center rounded-[3px] border border-dashed border-white/25 text-[9px] font-bold text-white/25 sm:rounded-md sm:text-xs ${recent ? 'ring-2 ring-amber-300' : ''}`}
      >
        {rank}
      </div>
    );
  }
  return (
    <div
      aria-label={label}
      className={`relative aspect-[5/7] rounded-[3px] border border-neutral-300 bg-white font-bold shadow sm:rounded-md ${isRed(suit) ? 'text-red-600' : 'text-neutral-900'} ${recent ? 'ring-2 ring-amber-300' : ''}`}
    >
      <span className="absolute left-[2px] top-0 text-[9px] leading-tight sm:left-1 sm:text-xs">{rank}</span>
      <span className="absolute inset-0 flex items-center justify-center pt-1.5 text-[11px] sm:pt-2 sm:text-lg">{SUIT_SYMBOL[suit]}</span>
      {deckCount > 1 && <Badge n={remaining} level={level} />}
    </div>
  );
}

/** 七並べのように、マークごとに A〜K を並べて、残っているカードを見せる */
export function CardGridModal({ onClose }: { onClose: () => void }) {
  const s = useGameStore();
  const unseen = unseenCards(s);
  const counts = countBySuitRank(unseen);
  const deckCount = s.deckCount;
  // このラウンドで出たカード(金のわくで目立たせる)
  const recent = new Set(s.roundLog.map((e) => `${e.card.suit}-${e.card.rank}`));
  const rankTotal = (r: Rank) => SUITS.reduce((sum, su) => sum + (counts[`${su}-${r}`] ?? 0), 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    // COUNT モーダルより先に受け取って、こちらだけ閉じる
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="カード一覧"
        className="max-h-[94svh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-neutral-900 p-3 text-neutral-100 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold sm:text-lg">のこりのカード一覧</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            もどる
          </button>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-neutral-300">
          まだ出ていないカードを、マークごとに 1(A)〜13(K) の順に並べました。カードが出るとその場所の枚数が減ります。
          減ったカードは出にくくなり、<b className="text-amber-200">ほかのカードは少しずつ出やすく</b>なります。
        </p>

        {/* 一覧: 左にマーク、上に数字、いちばん下にその数字の合計と確率 */}
        <div className="grid grid-cols-[18px_repeat(13,minmax(0,1fr))] gap-x-[3px] gap-y-2 pr-1.5 pt-1.5 sm:grid-cols-[28px_repeat(13,minmax(0,1fr))] sm:gap-x-1.5 sm:gap-y-3">
          <span />
          {SEVENS_ORDER.map((r, i) => (
            <span key={r} className="text-center text-[9px] font-bold text-neutral-400 sm:text-[11px]">
              {i + 1}
            </span>
          ))}
          {SUITS.map((su) => (
            <Row key={su} suit={su}>
              {SEVENS_ORDER.map((r) => (
                <Cell key={r} suit={su} rank={r} remaining={counts[`${su}-${r}`] ?? 0} deckCount={deckCount} recent={recent.has(`${su}-${r}`)} />
              ))}
            </Row>
          ))}
          <span className="self-center text-[9px] leading-tight text-neutral-400 sm:text-[10px]">合計</span>
          {SEVENS_ORDER.map((r) => {
            const n = rankTotal(r);
            const pct = unseen.length ? (n / unseen.length) * 100 : 0;
            return (
              <div key={r} className="flex flex-col items-center rounded bg-white/5 py-0.5 tabular-nums">
                <span className="text-[10px] font-extrabold sm:text-sm">{n}</span>
                <span className="text-[8px] text-sky-200 sm:text-[10px]">{pct.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-right text-[10px] text-neutral-500">合計 = その数字の残り枚数 / 下の数字 = 次に出る確率(%)</p>

        {/* 凡例 */}
        <div className="mt-3 space-y-2 rounded-xl bg-white/5 p-3 text-[11px] text-neutral-300">
          {deckCount > 1 ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>カード右上の数字 = のこり枚数({deckCount}デッキなので最初は各{deckCount}枚)</span>
              <span className="flex items-center gap-1">
                <span className="text-neutral-400">たくさん</span>
                {[6, 5, 4, 3, 2, 1].map((lv) => (
                  <span key={lv} className={`h-3.5 w-5 rounded-full ${LEVEL_STYLE[lv]}`} />
                ))}
                <span className="text-neutral-400">すこし</span>
              </span>
            </div>
          ) : (
            <div>1デッキなので、各カードは1枚ずつ。表向き = まだ残っている</div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-3 rounded-[2px] border border-dashed border-white/40" /> = もう残っていない
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-3 rounded-[2px] bg-white ring-2 ring-amber-300" /> = このラウンドで出たカード
            </span>
          </div>
          <div className="text-neutral-400">
            のこり <b className="text-neutral-200">{unseen.length}</b> / {deckCount * 52}枚(ディーラーの伏せたカードは、まだ見えていないので「残り」に入れています)
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ suit, children }: { suit: Suit; children: React.ReactNode }) {
  return (
    <>
      <span className={`self-center text-center text-sm font-bold sm:text-xl ${isRed(suit) ? 'text-red-400' : 'text-neutral-200'}`} aria-label={SUIT_NAME[suit]}>
        {SUIT_SYMBOL[suit]}
      </span>
      {children}
    </>
  );
}
