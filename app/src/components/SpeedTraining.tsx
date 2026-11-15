import { useCallback, useEffect, useRef, useState } from 'react';
import { hiLoValue } from '../game/count';
import { randomCard } from '../quiz/questions';
import { ScreenHeader } from '../screens/ScreenHeader';
import { sfx } from '../sound/sfx';
import { useProfile } from '../store/useProfile';
import { studyLeftToday, useWallet } from '../store/useWallet';
import { SPEED_REWARD } from '../store/wallet';
import { PointRow } from './HelpModal';
import { PlayingCard } from './PlayingCard';
import type { Card } from '../game/types';

const DURATION_MS = 30_000;
const CHOICES = [
  { v: 1, label: '+1', cls: 'bg-emerald-600 hover:bg-emerald-500' },
  { v: 0, label: '0', cls: 'bg-slate-600 hover:bg-slate-500' },
  { v: -1, label: '−1', cls: 'bg-rose-600 hover:bg-rose-500' },
];

type Phase = 'ready' | 'play' | 'done';

/** トレーニング:30秒で、出てくるカードを +1・0・−1 にできるだけ多く分ける(点数付けを速くする練習) */
export function SpeedTraining({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [card, setCard] = useState<Card>(() => randomCard(Math.random));
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'ng' | null>(null);
  const [leftMs, setLeftMs] = useState(DURATION_MS);
  const [result, setResult] = useState<{ gained: number; newBest: boolean } | null>(null);
  const endAt = useRef(0);
  const scoreRef = useRef(0);
  const best = useProfile((p) => p.stats.bestSpeed);
  const left = studyLeftToday(useWallet());

  const finish = useCallback(() => {
    setPhase('done');
    sfx.finish();
    const s = scoreRef.current;
    const gained = useWallet.getState().earnStudy(s * SPEED_REWARD);
    const prevBest = useProfile.getState().stats.bestSpeed;
    const newBest = s > prevBest;
    if (newBest) useProfile.getState().record(() => ({ bestSpeed: s }));
    setResult({ gained, newBest });
  }, []);

  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => {
      const ms = Math.max(0, endAt.current - Date.now());
      setLeftMs(ms);
      if (ms <= 0) {
        clearInterval(t);
        finish();
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, finish]);

  const start = () => {
    sfx.chip();
    setScore(0);
    scoreRef.current = 0;
    setMiss(0);
    setCombo(0);
    setBestCombo(0);
    setResult(null);
    setCard(randomCard(Math.random));
    endAt.current = Date.now() + DURATION_MS;
    setLeftMs(DURATION_MS);
    setPhase('play');
  };

  const answer = (v: number) => {
    if (phase !== 'play') return;
    if (v === hiLoValue(card.rank)) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setCombo((c) => {
        const n = c + 1;
        setBestCombo((b) => Math.max(b, n));
        return n;
      });
      setFlash('ok');
      sfx.card();
    } else {
      setMiss((m) => m + 1);
      setCombo(0);
      setFlash('ng');
      sfx.wrong();
    }
    setCard(randomCard(Math.random));
  };

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 180);
    return () => clearTimeout(t);
  }, [flash]);

  // キーボードでも遊べる(← +1 / ↓ 0 / → −1)
  useEffect(() => {
    if (phase !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === '1') answer(1);
      if (e.key === 'ArrowDown' || e.key === '0') answer(0);
      if (e.key === 'ArrowRight' || e.key === '-') answer(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <ScreenHeader title="トレーニング" onHome={onHome} />
      <div className="mx-auto max-w-md">
        {phase === 'ready' && (
          <div className="space-y-3 text-center">
            <div className="text-4xl" aria-hidden>
              ⚡
            </div>
            <h2 className="text-xl font-black">30秒スピード点数</h2>
            <p className="text-sm leading-relaxed text-neutral-300">出てくるカードの点数を、できるだけ速く選ぼう。30秒で何枚できるかな?</p>
            <PointRow />
            <p className="text-xs text-emerald-200">
              💰 1枚正解するごとに所持金 +{SPEED_REWARD}(今日あと {left.toLocaleString()} まで) ・ 最高記録 {best}枚
            </p>
            <button type="button" onClick={start} className="w-full rounded-2xl bg-amber-400 py-3.5 text-lg font-black text-amber-950 shadow-xl hover:bg-amber-300">
              スタート!
            </button>
            <button type="button" onClick={onExit} className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold hover:bg-white/20">
              クイズをえらぶにもどる
            </button>
          </div>
        )}

        {phase === 'play' && (
          <div className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full transition-[width] duration-100 ${leftMs < 5000 ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ width: `${(leftMs / DURATION_MS) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm tabular-nums">
              <span>
                のこり <b className={`text-lg ${leftMs < 5000 ? 'text-rose-300' : ''}`}>{Math.ceil(leftMs / 1000)}</b> 秒
              </span>
              <span>
                <b className="text-2xl text-amber-300">{score}</b> 枚
              </span>
              <span className="text-xs text-neutral-400">{combo >= 3 ? `${combo} コンボ!` : ''}</span>
            </div>
            <div
              className={`felt flex h-44 items-center justify-center rounded-2xl ring-4 transition-colors ${
                flash === 'ok' ? 'ring-emerald-400' : flash === 'ng' ? 'ring-rose-500' : 'ring-[#5a3418]'
              }`}
            >
              <PlayingCard key={card.id} card={card} className="scale-[1.6]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CHOICES.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => answer(c.v)}
                  className={`min-h-16 rounded-2xl text-2xl font-black shadow-lg active:scale-95 ${c.cls}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-center text-[11px] text-neutral-500">2〜6 は +1、7〜9 は 0、10・J・Q・K・A は −1</p>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-3 text-center">
            <div className="text-sm text-neutral-400">30秒の結果</div>
            <div className="result-pop text-5xl font-black tabular-nums text-amber-300">
              {score}
              <span className="text-xl text-neutral-300"> 枚</span>
            </div>
            {result.newBest && <div className="text-sm font-black text-amber-200">🏆 最高記録をこえました!</div>}
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-3 text-xs tabular-nums">
              <div>
                <div className="text-neutral-400">正解率</div>
                <b className="text-base">{score + miss ? Math.round((score / (score + miss)) * 100) : 0}%</b>
              </div>
              <div>
                <div className="text-neutral-400">最大コンボ</div>
                <b className="text-base">{bestCombo}</b>
              </div>
              <div>
                <div className="text-neutral-400">最高記録</div>
                <b className="text-base">{Math.max(best, score)}枚</b>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-900/40 px-4 py-2 text-sm text-emerald-100 ring-1 ring-emerald-300/30">
              💰 かせいだ所持金 <b className="text-lg tabular-nums">+{result.gained.toLocaleString()}</b>
              <div className="text-[11px] text-emerald-100/70">今日あと {left.toLocaleString()} までかせげます</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={start} className="min-h-12 rounded-xl bg-amber-400 font-black text-amber-950 hover:bg-amber-300">
                もう一度
              </button>
              <button type="button" onClick={onExit} className="min-h-12 rounded-xl bg-neutral-700 font-bold hover:bg-neutral-600">
                クイズをえらぶ
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
