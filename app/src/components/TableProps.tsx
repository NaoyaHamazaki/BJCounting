import { CHIPS } from './Chips';

/** ディーラー前のチップトレイ。チップを横から見た柱として並べる(装飾) */
export function ChipTray() {
  const cols = [...CHIPS].reverse().flatMap((c) => [c, c]);
  return (
    <div
      className="flex items-end gap-[3px] rounded-b-lg border-x-4 border-b-4 border-[#3b2412] bg-[#1b120b] px-2 pb-1 pt-2 shadow-[inset_0_6px_10px_rgba(0,0,0,.7)]"
      aria-hidden
    >
      {cols.map((c, i) => (
        <div key={i} className="flex flex-col-reverse">
          {Array.from({ length: 9 - (i % 3) }).map((_, j) => (
            <div
              key={j}
              className="h-[3px] w-[14px] sm:h-[4px] sm:w-[22px] rounded-[1px]"
              style={{ background: j % 2 ? c.face : `linear-gradient(90deg, ${c.face} 0 30%, ${c.edge} 30% 45%, ${c.face} 45% 70%, ${c.edge} 70% 85%, ${c.face} 85%)` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 未使用カードの入ったシュー。残り枚数に応じてカードの束が短くなる */
export function Shoe({ remaining, total }: { remaining: number; total: number }) {
  const ratio = total ? remaining / total : 0;
  return (
    <div className="flex flex-col items-center gap-1" title="シュー(未使用カード)">
      <div className="relative h-[54px] w-[62px] sm:h-[70px] sm:w-[84px] -rotate-6">
        <div className="absolute inset-0 rounded-md bg-gradient-to-b from-neutral-700 to-neutral-900 shadow-lg ring-1 ring-black/50" />
        <div className="absolute bottom-[6px] left-[6px] top-[6px] right-[6px] overflow-hidden rounded-sm bg-black/50">
          <div
            className="card-back absolute bottom-0 left-0 top-0 transition-[width] duration-500"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] font-semibold tracking-widest text-emerald-100/70">SHOE</span>
    </div>
  );
}

/** 使用済みカードのトレイ。溜まった枚数に応じて束が高くなる */
export function DiscardTray({ count, total }: { count: number; total: number }) {
  const ratio = total ? count / total : 0;
  return (
    <div className="flex flex-col items-center gap-1" title="ディスカードトレイ(使用済みカード)">
      <div className="relative h-[54px] w-[44px] sm:h-[70px] sm:w-[56px] rotate-3 rounded-sm border-2 border-white/25 bg-black/25 shadow-inner">
        <div
          className="card-back absolute bottom-[3px] left-[3px] right-[3px] rounded-[2px] transition-[height] duration-500"
          style={{ height: `calc(${ratio * 100}% - 6px)`, minHeight: count ? 3 : 0 }}
        />
      </div>
      <span className="text-[10px] font-semibold tracking-widest text-emerald-100/70">DISCARD</span>
    </div>
  );
}

/** テーブル印字(アーチ状の文字と、ディーラールール) */
export function TableText() {
  return (
    <svg viewBox="0 0 700 150" className="pointer-events-none w-full max-w-[720px] select-none" aria-hidden>
      <defs>
        <path id="arc-outer" d="M 50 22 Q 350 92 650 22" />
        <path id="arc-inner" d="M 90 58 Q 350 138 610 58" />
      </defs>
      <text className="fill-amber-200/85" fontSize="22" fontWeight="700" letterSpacing="5">
        <textPath href="#arc-outer" startOffset="50%" textAnchor="middle">
          BLACKJACK PAYS 3 TO 2
        </textPath>
      </text>
      {/* インシュランスの帯(上下の線の間に文字) */}
      <path d="M 90 42 Q 350 122 610 42" fill="none" stroke="rgba(253,230,138,.45)" strokeWidth="1.5" />
      <path d="M 90 64 Q 350 144 610 64" fill="none" stroke="rgba(253,230,138,.45)" strokeWidth="1.5" />
      <text className="fill-amber-100/75" fontSize="13" fontWeight="600" letterSpacing="3">
        <textPath href="#arc-inner" startOffset="50%" textAnchor="middle">
          INSURANCE PAYS 2 TO 1
        </textPath>
      </text>
      <text x="350" y="134" textAnchor="middle" className="fill-emerald-50/60" fontSize="11" fontStyle="italic" letterSpacing="1">
        Dealer must draw to 16 and stand on all 17s
      </text>
    </svg>
  );
}
