import { isPair } from '../game/hand';
import { MAX_HANDS, useGameStore } from '../store/useGameStore';
import { Chip, CHIPS } from './Chips';

function Btn({
  children,
  onClick,
  disabled,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'primary' | 'danger' | 'info';
}) {
  const tones = {
    neutral: 'bg-neutral-700 hover:bg-neutral-600 text-white',
    primary: 'bg-amber-400 hover:bg-amber-300 text-amber-950',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    info: 'bg-sky-600 hover:bg-sky-500 text-white',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[76px] rounded-lg px-3 py-2.5 text-sm font-bold tracking-wide shadow transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));

export function Controls({ onNeedChips }: { onNeedChips: () => void }) {
  const s = useGameStore();
  const hand = s.hands[s.active];

  const chipRow = (
    <div className="flex flex-wrap justify-center gap-2">
      {CHIPS.map((c) => (
        <Chip key={c.value} chip={c} size={46} onClick={() => s.addChip(c.value)} disabled={s.bankroll < c.value} />
      ))}
    </div>
  );

  let body: React.ReactNode = null;
  if (s.phase === 'betting') {
    body = (
      <>
        {chipRow}
        <div className="flex flex-wrap justify-center gap-2">
          <Btn onClick={s.clearBet} disabled={s.bet === 0}>CLEAR</Btn>
          <Btn onClick={s.rebet} disabled={s.lastBet === 0 || s.bankroll + s.bet < s.lastBet}>
            REBET {s.lastBet > 0 ? fmt(s.lastBet) : ''}
          </Btn>
          <Btn tone="primary" onClick={s.deal} disabled={s.bet === 0}>DEAL</Btn>
          {s.bankroll < 1 && s.bet === 0 && <Btn tone="info" onClick={onNeedChips}>チップを用意する</Btn>}
        </div>
      </>
    );
  } else if (s.phase === 'insurance') {
    const cost = (s.hands[0]?.bet ?? 0) / 2;
    body = (
      <div className="flex flex-wrap justify-center gap-2">
        <Btn tone="info" onClick={() => s.takeInsurance(true)}>INSURANCE ({fmt(cost)})</Btn>
        <Btn onClick={() => s.takeInsurance(false)}>NO</Btn>
      </div>
    );
  } else if (s.phase === 'playerTurn' && hand) {
    const canDouble = hand.cards.length === 2 && !hand.splitAces && s.bankroll >= hand.bet;
    const canSplit = isPair(hand.cards) && !hand.splitAces && s.hands.length < MAX_HANDS && s.bankroll >= hand.bet;
    body = (
      <div className="flex flex-wrap justify-center gap-2">
        <Btn tone="primary" onClick={s.hit}>HIT</Btn>
        <Btn tone="danger" onClick={s.stand}>STAND</Btn>
        <Btn tone="info" onClick={s.double} disabled={!canDouble}>DOUBLE</Btn>
        <Btn tone="info" onClick={s.split} disabled={!canSplit}>SPLIT</Btn>
      </div>
    );
  } else if (s.phase === 'dealerTurn' || s.phase === 'cpuTurn') {
    const who = s.phase === 'cpuTurn' ? (s.cpus[s.activeCpu]?.name ?? 'CPU') : 'ディーラー';
    body = <p className="py-2.5 text-sm text-emerald-100/80">{who}がプレイしています… 出たカードを数えておこう</p>;
  } else if (s.phase === 'roundOver') {
    body = (
      <>
        {chipRow}
        <div className="flex flex-wrap justify-center gap-2">
          <Btn onClick={s.nextRound}>NEXT</Btn>
          <Btn
            tone="primary"
            onClick={() => {
              s.rebet();
              s.deal();
            }}
            disabled={s.lastBet === 0 || s.bankroll < s.lastBet}
          >
            REBET &amp; DEAL {fmt(s.lastBet)}
          </Btn>
          {s.bankroll < 1 && <Btn tone="info" onClick={onNeedChips}>チップを用意する</Btn>}
        </div>
      </>
    );
  }

  return <div className="flex flex-col items-center gap-3">{body}</div>;
}
