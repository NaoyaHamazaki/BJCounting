import { useId } from 'react';

/**
 * アプリのアイコン。フェルト地に「21」と書いたカードと、「%」のチップ。
 * 21(ブラックジャック)と確率を表す。public/favicon.svg と同じ絵柄。
 */
export function AppIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={`felt${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f7a4d" />
          <stop offset="1" stopColor="#05361f" />
        </linearGradient>
        <linearGradient id={`gold${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#felt${id})`} stroke={`url(#gold${id})`} strokeWidth="3" />
      <g transform="rotate(-14 24 33)">
        <rect x="11" y="15" width="25" height="35" rx="4" fill="#b91c1c" stroke="#fff" strokeWidth="2" />
        <path d="M15 19 L32 46 M32 19 L15 46" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" />
      </g>
      <g transform="rotate(8 36 31)">
        <rect x="22" y="11" width="28" height="38" rx="4" fill="#fff" stroke="#d4d4d4" />
        <text x="25" y="20" fontSize="8" fill="#dc2626" fontFamily="Arial, sans-serif">♥</text>
        <text x="36" y="37" textAnchor="middle" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="17" fill="#111">
          21
        </text>
      </g>
      <circle cx="49" cy="49" r="11" fill={`url(#gold${id})`} stroke="#78350f" strokeWidth="1.5" />
      <circle cx="49" cy="49" r="7.6" fill="none" stroke="#fff" strokeWidth="1.3" strokeDasharray="2.6 2" />
      <text x="49" y="53" textAnchor="middle" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="11" fill="#451a03">
        %
      </text>
    </svg>
  );
}

/**
 * チャンスのアイコン。カード(? または !)と、右肩上がりの棒グラフ(確率が上がっている)。
 * maybe = chance?(青。棒の3本目は点線) / sure = chance!(金。棒が全部そろい、光る星つき)
 */
export function ChanceIcon({ kind, size = 20, className = '' }: { kind: 'maybe' | 'sure'; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const sure = kind === 'sure';
  const main = sure ? '#f59e0b' : '#0ea5e9';
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={`cg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="1" stopColor="#fcd34d" />
        </linearGradient>
      </defs>
      <g transform="rotate(-8 9 12)">
        <rect x="2.5" y="3" width="12" height="17" rx="2.4" fill={sure ? `url(#cg${id})` : '#fff'} stroke={main} strokeWidth="1.6" />
        <text x="8.5" y="16.3" textAnchor="middle" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="12" fill={sure ? '#b45309' : main}>
          {sure ? '!' : '?'}
        </text>
      </g>
      <rect x="16" y="15" width="2" height="6" rx=".6" fill={main} />
      <rect x="18.8" y="11.5" width="2" height="9.5" rx=".6" fill={main} />
      {sure ? (
        <rect x="21.6" y="7.5" width="2" height="13.5" rx=".6" fill={main} />
      ) : (
        <rect x="21.8" y="8" width="1.6" height="12.8" rx=".5" fill="none" stroke={main} strokeWidth=".8" strokeDasharray="1.4 1" />
      )}
      {sure && <path d="M20 1.2 L20.9 3.4 L23.1 4.3 L20.9 5.2 L20 7.4 L19.1 5.2 L16.9 4.3 L19.1 3.4 Z" fill="#fff" stroke="#f59e0b" strokeWidth=".6" />}
    </svg>
  );
}
