import { CARDS_PER_DECK } from '../game/deck';
import { handTotal } from '../game/hand';
import type { Card, CpuSeat, HandResult, PlayerHand } from '../game/types';
import { useGameStore } from '../store/useGameStore';
import { ChipStack } from './Chips';
import { PlayingCard } from './PlayingCard';
import { ChipTray, DiscardTray, Shoe, TableText } from './TableProps';

function totalLabel(cards: Card[]) {
  if (cards.length === 0) return '';
  const { total, soft } = handTotal(cards);
  if (cards.length === 2 && total === 21) return 'BJ';
  return soft && total < 21 ? `${total - 10}/${total}` : String(total);
}

const RESULT_STYLE: Record<HandResult, string> = {
  blackjack: 'bg-amber-400 text-amber-950',
  win: 'bg-emerald-400 text-emerald-950',
  push: 'bg-slate-300 text-slate-900',
  lose: 'bg-rose-500 text-white',
  bust: 'bg-rose-600 text-white',
};
const RESULT_TEXT: Record<HandResult, string> = { blackjack: 'BLACKJACK', win: 'WIN', push: 'PUSH', lose: 'LOSE', bust: 'BUST' };

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold shadow ${className}`}>{children}</span>;
}

function CardRow({ cards, hideSecond, size = 'md' }: { cards: Card[]; hideSecond?: boolean; size?: 'md' | 'sm' }) {
  const overlap = size === 'md' ? '-ml-6 sm:-ml-8' : '-ml-5';
  return (
    <div className="flex">
      {cards.map((c, i) => (
        <PlayingCard key={c.id} card={c} size={size} animate faceDown={hideSecond && i === 1} className={i > 0 ? overlap : ''} />
      ))}
    </div>
  );
}

/** 勝敗を大きく表示する演出(勝ちは金色に光って弾ける、負けは赤く揺れる) */
function ResultBanner({ result, net, big }: { result: HandResult; net?: number; big: boolean }) {
  const good = result === 'win' || result === 'blackjack';
  const tone = result === 'blackjack' ? 'result-gold' : result === 'win' ? 'result-green' : result === 'push' ? 'result-silver' : 'result-red';
  return (
    // スマホでは自分のカードの上に重ねる(上に出すとディーラーのカードを隠すため)。PC では合計の数字の上
    <div className="pointer-events-none absolute left-1/2 top-8 z-20 flex -translate-x-1/2 flex-col items-center sm:bottom-full sm:top-auto sm:mb-1">
      <div className={`relative ${good ? 'result-pop' : result === 'push' ? 'result-pop' : 'result-shake'}`}>
        {good && (
          <div className="absolute left-1/2 top-1/2" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="sparkle" style={{ '--a': `${i * 30}deg`, '--d': `${big ? 70 : 45}px`, animationDelay: `${(i % 3) * 60}ms` } as React.CSSProperties} />
            ))}
          </div>
        )}
        <div className={`result-plate result-plate-${result} rounded-2xl ${big ? 'px-3 py-0.5 sm:px-7 sm:py-1' : 'px-3 py-0.5'}`}>
          <div className={`${tone} whitespace-nowrap font-black italic tracking-wider ${big ? 'text-2xl sm:text-5xl' : 'text-xl sm:text-2xl'}`}>
            {RESULT_TEXT[result]}
            {result === 'blackjack' || result === 'win' ? '!' : ''}
          </div>
        </div>
      </div>
      {net !== undefined && net !== 0 && (
        <div className={`result-pop mt-0.5 rounded-full bg-black/60 px-2.5 py-0.5 text-sm font-extrabold tabular-nums ${net > 0 ? 'text-amber-300' : 'text-rose-300'}`}>
          {net > 0 ? '+' : ''}
          {net}
        </div>
      )}
    </div>
  );
}

function UserHand({ hand, active, single }: { hand: PlayerHand; active: boolean; single: boolean }) {
  const net = hand.payout !== undefined ? hand.payout - hand.bet : undefined;
  return (
    <div className={`relative flex flex-col items-center gap-1 rounded-xl px-1.5 pb-1 pt-1.5 transition ${active ? 'bg-amber-300/15 ring-2 ring-amber-300' : ''}`}>
      {hand.result && <ResultBanner result={hand.result} net={net} big={single} />}
      <div className="flex min-h-[22px] items-center gap-1">
        <Badge className="bg-black/60 text-white">{totalLabel(hand.cards)}</Badge>
        {hand.doubled && <Badge className="bg-sky-400 text-sky-950">x2</Badge>}
      </div>
      <CardRow cards={hand.cards} />
      {!single && <ChipStack amount={hand.bet} size={24} />}
    </div>
  );
}

function BetCircle({ amount, label, small }: { amount: number; label: string; small?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 border-amber-100/55 shadow-[inset_0_0_14px_rgba(0,0,0,.35)] ${
        small ? 'h-[42px] w-[42px] sm:h-[58px] sm:w-[58px]' : 'h-[56px] w-[56px] sm:h-[92px] sm:w-[92px]'
      }`}
    >
      {amount > 0 ? (
        <ChipStack amount={amount} size={small ? 20 : 28} />
      ) : (
        <span className="text-[9px] font-semibold tracking-widest text-amber-100/50">{label}</span>
      )}
    </div>
  );
}

function CpuSeatView({ cpu, active }: { cpu: CpuSeat; active: boolean }) {
  return (
    <div className={`flex w-[78px] flex-col items-center gap-1 rounded-xl px-1 py-1 transition sm:w-[110px] ${active ? 'bg-sky-300/15 ring-2 ring-sky-300' : ''}`}>
      <div className="flex min-h-[20px] items-center gap-1">
        {cpu.cards.length > 0 && <Badge className="bg-black/60 text-white">{totalLabel(cpu.cards)}</Badge>}
        {cpu.result && <Badge className={RESULT_STYLE[cpu.result]}>{RESULT_TEXT[cpu.result]}</Badge>}
      </div>
      <div className="flex min-h-[50px] items-end sm:min-h-[54px]">
        <CardRow cards={cpu.cards} size="sm" />
      </div>
      <BetCircle amount={cpu.bet} label="CPU" small />
      <span className="rounded bg-black/40 px-1.5 text-[10px] font-bold tracking-wider text-sky-100">{cpu.name}</span>
    </div>
  );
}

export function Table() {
  const s = useGameStore();
  const total = s.deckCount * CARDS_PER_DECK;
  const single = s.hands.length <= 1;
  const circleAmount = s.phase === 'betting' ? s.bet : single ? (s.hands[0]?.bet ?? s.bet) : 0;
  // 画面の左右に並べる。右側の CPU は自分より先に行動する(いちばん右が最初)
  const indexed = s.cpus.map((c, i) => ({ c, i }));
  const leftSeats = indexed.filter((x) => x.c.side === 'left').reverse();
  const rightSeats = indexed.filter((x) => x.c.side === 'right').reverse();
  const seat = (x: { c: CpuSeat; i: number }) => <CpuSeatView key={x.i} cpu={x.c} active={s.activeCpu === x.i} />;

  return (
    <div className="felt relative mx-auto w-full max-w-[1000px] overflow-hidden border-[10px] border-t-0 sm:border-[14px] sm:border-t-0 border-[#5a3418] shadow-[0_20px_40px_rgba(0,0,0,.6)] rounded-b-[46%_30%] sm:rounded-b-[50%_42%]">
      {/* シュー(左上)とディスカードトレイ(右上) */}
      <div className="absolute left-2 top-2 sm:left-5 sm:top-3">
        <Shoe remaining={s.shoe.length} total={total} />
      </div>
      <div className="absolute right-2 top-2 sm:right-6 sm:top-3">
        <DiscardTray count={s.discard.length} total={total} />
      </div>

      <div className="flex flex-col items-center px-1 pb-1 sm:px-2 sm:pb-20 [@media(max-height:620px)]:pb-1">
        {/* ディーラー側のチップトレイは飾りなので、スマホでは出さない(操作ボタンを画面の上の方へ寄せるため) */}
        <div className="hidden sm:block">
          <ChipTray />
        </div>

        {/* ディーラーエリア */}
        <div className="mt-1 flex min-h-[92px] flex-col items-center gap-0.5 sm:mt-3 sm:min-h-[130px] [@media(max-height:620px)]:mb-2">
          <div className="flex min-h-[22px] items-center gap-1">
            {s.dealer.length > 0 && (
              <Badge className="bg-black/60 text-white">
                {s.holeRevealed ? totalLabel(s.dealer) : totalLabel(s.dealer.slice(0, 1))}
              </Badge>
            )}
            {s.holeRevealed && handTotal(s.dealer).total > 21 && <Badge className={RESULT_STYLE.bust}>BUST</Badge>}
          </div>
          <CardRow cards={s.dealer} hideSecond={!s.holeRevealed} />
        </div>

        {/* 印字は、スマホではディーラーとプレイヤーの間の背景に敷く(高さを取らない) */}
        <div className="relative h-7 w-full sm:h-auto [@media(max-height:620px)]:hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 opacity-80 sm:static sm:translate-y-0 sm:opacity-100">
            <TableText />
          </div>
        </div>

        {/* 座席: 左の CPU / 自分 / 右の CPU */}
        <div className="mt-1 flex w-full items-end justify-center gap-0.5 sm:mt-2 sm:gap-4">
          <div className="flex items-end gap-0.5 sm:gap-3">{leftSeats.map(seat)}</div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex min-h-[110px] sm:min-h-[140px] [@media(max-height:620px)]:min-h-[98px] flex-wrap items-end justify-center gap-1 sm:gap-2">
              {s.hands.map((h, i) => (
                <UserHand key={i} hand={h} single={single} active={s.phase === 'playerTurn' && i === s.active && !single} />
              ))}
            </div>
            <div className={`rounded-full transition ${s.phase === 'playerTurn' ? 'ring-4 ring-amber-300/70' : ''}`}>
              <BetCircle amount={circleAmount} label={single ? 'BET' : 'SPLIT'} />
            </div>
            {s.insurance > 0 && <span className="text-[10px] font-bold text-amber-100/80">INSURANCE {s.insurance}</span>}
            <span className="rounded bg-amber-400 px-2 text-[10px] font-extrabold tracking-wider text-amber-950">YOU</span>
          </div>

          <div className="flex items-end gap-0.5 sm:gap-3">{rightSeats.map(seat)}</div>
        </div>
      </div>
    </div>
  );
}
