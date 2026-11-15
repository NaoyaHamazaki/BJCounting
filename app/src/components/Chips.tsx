export type ChipDef = { value: number; face: string; edge: string; text: string };

/** チップの色分け(カジノの一般的な配色) */
export const CHIPS: ChipDef[] = [
  { value: 1, face: '#f5f5f4', edge: '#2563eb', text: '#1e3a8a' },
  { value: 5, face: '#dc2626', edge: '#fef2f2', text: '#ffffff' },
  { value: 25, face: '#16a34a', edge: '#f0fdf4', text: '#ffffff' },
  { value: 100, face: '#171717', edge: '#e5e5e5', text: '#ffffff' },
  { value: 500, face: '#7c3aed', edge: '#fde68a', text: '#ffffff' },
];

/** 額を、大きいチップから順に分解する(0.5 の端数は 1 のチップの半分として扱わず切り捨て表示) */
export function breakdown(amount: number): ChipDef[] {
  const chips: ChipDef[] = [];
  let rest = Math.floor(amount);
  for (const c of [...CHIPS].reverse()) {
    while (rest >= c.value) {
      chips.push(c);
      rest -= c.value;
    }
  }
  return chips;
}

export function Chip({ chip, size = 44, onClick, disabled }: { chip: ChipDef; size?: number; onClick?: () => void; disabled?: boolean }) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    background: `radial-gradient(circle, ${chip.face} 0 52%, transparent 53%), repeating-conic-gradient(${chip.edge} 0 15deg, ${chip.face} 15deg 45deg)`,
    color: chip.text,
    fontSize: size * 0.3,
  };
  const cls =
    'relative flex shrink-0 items-center justify-center rounded-full font-extrabold shadow-[0_2px_0_rgba(0,0,0,.45),0_3px_6px_rgba(0,0,0,.4)] ring-1 ring-black/30';
  if (onClick) {
    return (
      <button
        type="button"
        className={`${cls} transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35`}
        style={style}
        onClick={onClick}
        disabled={disabled}
        aria-label={`${chip.value} のチップを置く`}
      >
        {chip.value}
      </button>
    );
  }
  return (
    <div className={cls} style={style}>
      {chip.value}
    </div>
  );
}

/** ベット額を、チップの重なり(スタック)で立体的に表示する。種類ごとに柱を分ける */
export function ChipStack({ amount, size = 40 }: { amount: number; size?: number }) {
  const chips = breakdown(amount);
  if (chips.length === 0) return null;
  const columns = CHIPS.slice()
    .reverse()
    .map((def) => chips.filter((c) => c === def))
    .filter((col) => col.length > 0);
  const step = Math.max(3, size * 0.1);
  return (
    <div className="flex items-end justify-center gap-0.5">
      {columns.map((col) => {
        const shown = col.slice(0, 12);
        return (
          <div key={col[0].value} className="relative" style={{ width: size, height: size + step * (shown.length - 1) }}>
            {shown.map((c, i) => (
              <div key={i} className="absolute left-0" style={{ bottom: i * step }}>
                <Chip chip={c} size={size} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
