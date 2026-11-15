import type { Card, Suit } from '../game/types';

const SUIT_SYMBOL: Record<Suit, string> = { Spades: '♠', Hearts: '♥', Diamonds: '♦', Clubs: '♣' };
const isRed = (s: Suit) => s === 'Hearts' || s === 'Diamonds';

/** animate: 配られたときの、上からスッと出る演出(テーブルとクイズで使う) */
type Props = { card?: Card; faceDown?: boolean; size?: 'md' | 'sm' | 'xs'; className?: string; style?: React.CSSProperties; animate?: boolean };

const SIZE = {
  md: 'w-[50px] h-[72px] sm:w-[66px] sm:h-[94px] text-[13px] sm:text-base rounded-md',
  sm: 'w-[38px] h-[54px] text-[11px] rounded',
  xs: 'w-[26px] h-[36px] text-[10px] rounded-[3px]',
};

export function PlayingCard({ card, faceDown, size = 'md', className = '', style, animate = false }: Props) {
  if (faceDown || !card) {
    return (
      <div
        className={`${SIZE[size]} card-back shrink-0 border border-white/70 shadow-md ${className}`}
        style={style}
        aria-label="伏せたカード"
      />
    );
  }
  const sym = SUIT_SYMBOL[card.suit];
  const color = isRed(card.suit) ? 'text-red-600' : 'text-neutral-900';
  return (
    <div
      className={`${SIZE[size]} ${animate ? 'card-in' : ''} relative shrink-0 border border-neutral-300 bg-white font-bold shadow-md ${color} ${className}`}
      style={style}
      aria-label={`${card.suit} ${card.rank}`}
    >
      <div className="absolute left-[3px] top-[1px] leading-none">
        <div>{card.rank}</div>
        {size !== 'xs' && <div className="text-[0.85em]">{sym}</div>}
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center ${size === 'md' ? 'text-[1.9em]' : size === 'sm' ? 'text-[1.5em]' : 'pt-2 text-[1.2em]'}`}
      >
        {sym}
      </div>
    </div>
  );
}
