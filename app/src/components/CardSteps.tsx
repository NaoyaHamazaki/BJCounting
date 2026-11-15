import { chanceLevel, hiLoValue, trueCountOf } from '../game/count';
import { RANKS, type LogEntry, type Rank } from '../game/types';
import { PointRow } from './HelpModal';
import { ChanceIcon } from './Icons';
import { PlayingCard } from './PlayingCard';

const signed = (n: number, d = 0) => `${n > 0 ? '+' : ''}${n.toFixed(d)}`;
const pct = (k: number, n: number) => (n > 0 ? (k / n) * 100 : 0);
const countColor = (n: number) => (n > 0 ? 'text-emerald-300' : n < 0 ? 'text-rose-300' : 'text-white');

function groupName(rank: Rank) {
  const v = hiLoValue(rank);
  if (v > 0) return '小さいカード(2〜6)';
  if (v === 0) return 'まん中のカード(7〜9)';
  return '大きいカード(10・絵札・A)';
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-black">{n}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

function ChanceLabel({ tc }: { tc: number }) {
  const lv = chanceLevel(tc);
  if (lv === 0) return <span className="text-neutral-400">なし</span>;
  return (
    <span className={`inline-flex items-center gap-1 font-black italic ${lv === 2 ? 'text-amber-300' : 'text-sky-300'}`}>
      <ChanceIcon kind={lv === 2 ? 'sure' : 'maybe'} size={16} />
      {lv === 2 ? 'chance!' : 'chance?'}
    </span>
  );
}

/** 1枚のカードが出たときの、カウンティングの5ステップ */
export function CardSteps({ entry }: { entry: LogEntry }) {
  const { card, owner, rcBefore, before, totalBefore } = entry;
  const point = hiLoValue(card.rank);
  const rcAfter = rcBefore + point;
  const totalAfter = totalBefore - 1;
  const tcBefore = trueCountOf(rcBefore, totalBefore);
  const tcAfter = trueCountOf(rcAfter, totalAfter);
  const after = { ...before, [card.rank]: before[card.rank] - 1 } as Record<Rank, number>;

  return (
    <div className="space-y-2.5">
      <Step n={1} title="このカードが出ました">
        <div className="flex items-center gap-3">
          <PlayingCard card={card} />
          <div className="text-sm">
            <div className="text-neutral-400">{owner}のカード</div>
            <div className="text-xl font-black">{card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' ? `${card.rank}(絵札)` : card.rank}</div>
          </div>
        </div>
      </Step>

      <Step n={2} title="点数をつけます">
        <p className="text-sm">
          {card.rank} は <b>{groupName(card.rank)}</b> のなかまなので、<b className={`text-lg ${countColor(point)}`}>{signed(point)}</b> 点です。
        </p>
        <PointRow highlight={point} />
      </Step>

      <Step n={3} title="残りのカードの枚数が変わりました">
        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-lg bg-black/30 p-2">
            <div className="text-[11px] text-neutral-400">{card.rank} の残り</div>
            <div className="text-lg font-black tabular-nums">
              {before[card.rank]} → <span className="text-sky-300">{after[card.rank]}</span>枚
            </div>
          </div>
          <div className="rounded-lg bg-black/30 p-2">
            <div className="text-[11px] text-neutral-400">ぜんぶの残り</div>
            <div className="text-lg font-black tabular-nums">
              {totalBefore} → <span className="text-sky-300">{totalAfter}</span>枚
            </div>
          </div>
        </div>
      </Step>

      <Step n={4} title="次に出る確率が変わりました(引く前 → 引いた後)">
        <div className="grid grid-cols-2 gap-1 text-xs tabular-nums sm:grid-cols-3">
          {RANKS.map((r) => {
            const b = pct(before[r], totalBefore);
            const a = pct(after[r], totalAfter);
            const diff = a - b;
            const isDrawn = r === card.rank;
            return (
              <div key={r} className={`flex items-center justify-between rounded-md px-2 py-1 ${isDrawn ? 'bg-rose-500/20 ring-1 ring-rose-400' : 'bg-black/25'}`}>
                <span className="w-6 font-bold">{r}</span>
                <span className="text-neutral-400">{b.toFixed(2)}%</span>
                <span>→ {a.toFixed(2)}%</span>
                <span className={`w-10 text-right font-bold ${diff < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {diff < 0 ? '▼' : '▲'}
                  {Math.abs(diff).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-300">
          引いた <b>{card.rank}</b> は1枚へったので確率が<b className="text-rose-300">下がり</b>、ほかの12種類は、ぜんぶの枚数がへった分だけ少しずつ<b className="text-emerald-300">上がり</b>ます。13種類をぜんぶたすと、いつも100%です。
        </p>
      </Step>

      <Step n={5} title="カウントに反映しました">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-black/30 p-2">
            <div className="text-[11px] text-neutral-400">ランニングカウント</div>
            <div className="text-base font-black tabular-nums">
              <span className={countColor(rcBefore)}>{signed(rcBefore)}</span> → <span className={`text-xl ${countColor(rcAfter)}`}>{signed(rcAfter)}</span>
            </div>
            <div className="text-[10px] text-neutral-500">
              {signed(rcBefore)} {point >= 0 ? '+' : '−'} {Math.abs(point)}
            </div>
          </div>
          <div className="rounded-lg bg-black/30 p-2">
            <div className="text-[11px] text-neutral-400">トゥルーカウント</div>
            <div className="text-base font-black tabular-nums">
              <span className={countColor(tcBefore)}>{signed(tcBefore, 1)}</span> → <span className={`text-xl ${countColor(tcAfter)}`}>{signed(tcAfter, 1)}</span>
            </div>
            <div className="text-[10px] text-neutral-500">
              {signed(rcAfter)} ÷ {(totalAfter / 52).toFixed(1)}デッキ
            </div>
          </div>
          <div className="rounded-lg bg-black/30 p-2">
            <div className="text-[11px] text-neutral-400">チャンス</div>
            <div className="flex flex-col items-center text-xs">
              <ChanceLabel tc={tcBefore} />
              <span className="text-neutral-500">↓</span>
              <ChanceLabel tc={tcAfter} />
            </div>
          </div>
        </div>
      </Step>
    </div>
  );
}
