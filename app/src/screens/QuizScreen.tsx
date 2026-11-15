import { useEffect, useRef, useState } from 'react';
import { PointRow } from '../components/HelpModal';
import { PlayingCard } from '../components/PlayingCard';
import { hiLoValue } from '../game/count';
import { makeQuiz, signed, type ChangeQ, type CountQ, type ProbQ, type Question, type QuizMode, type TcQ } from '../quiz/questions';
import { sfx } from '../sound/sfx';
import { QUIZ_SPEED_MS, useSettings } from '../store/useSettings';
import { studyLeftToday, useWallet } from '../store/useWallet';
import { QUIZ_PERFECT_BONUS, QUIZ_REWARD, SPEED_REWARD, STUDY_DAILY_CAP } from '../store/wallet';
import { SpeedTraining } from '../components/SpeedTraining';
import { ScreenHeader } from './ScreenHeader';

const MODES: { mode: QuizMode; icon: string; label: string; sub: string }[] = [
  { mode: 'all', icon: '🎲', label: 'ぜんぶ', sub: 'いろいろな問題がまざって出ます' },
  { mode: 'point', icon: '🃏', label: '点数クイズ', sub: 'このカードは +1・0・−1 のどれ?' },
  { mode: 'count', icon: '🔢', label: 'カウントクイズ', sub: '次々に出るカードを数えて、合計を答えよう' },
  { mode: 'prob', icon: '📊', label: '確率クイズ', sub: '次にそのカードが出る確率は?' },
  { mode: 'tc', icon: '➗', label: 'トゥルーカウント', sub: 'ランニングカウント ÷ のこりデッキ数' },
];

const pctText = (k: number, n: number) => {
  const v = (k / n) * 100;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
};

// ---------- 問題文 ----------

function CountPrompt({ q, onReady }: { q: CountQ; onReady: () => void }) {
  const speed = QUIZ_SPEED_MS[useSettings((s) => s.quizSpeed)];
  const [shown, setShown] = useState(0);
  // 親が再描画しても、タイマーが巻き戻らないように ref で持つ
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  useEffect(() => {
    if (shown > q.cards.length) return;
    const t = setTimeout(() => {
      if (shown < q.cards.length) sfx.card();
      setShown((x) => x + 1);
      if (shown === q.cards.length) readyRef.current();
    }, shown === 0 ? 500 : speed);
    return () => clearTimeout(t);
  }, [shown, q.cards.length, speed]);

  const done = shown > q.cards.length;
  const current = q.cards[shown - 1];
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-center text-sm font-bold">
        {done ? `${q.cards.length}枚のカードのランニングカウントは?(0 からスタート)` : 'カードが1枚ずつ出ます。点数をたしていこう!'}
      </p>
      <div className="flex h-[110px] items-center justify-center">
        {!done && current && <PlayingCard key={current.id} card={current} animate className="scale-125" />}
        {done && (
          <div className="flex">
            {q.cards.map((c, i) => (
              <PlayingCard key={c.id} faceDown size="sm" className={i ? '-ml-4' : ''} />
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1" aria-hidden>
        {q.cards.map((c, i) => (
          <span key={c.id} className={`h-2 w-2 rounded-full ${i < shown ? 'bg-amber-300' : 'bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}

function ProbPrompt({ q, answered }: { q: ProbQ; answered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-center text-sm font-bold">
        のこりの {q.total}枚のうち、<span className="text-amber-300">{q.target}</span> は {q.count}枚。
        <br />
        次に {q.target} が出る確率は?
      </p>
      <div className="grid grid-cols-5 gap-1">
        {q.pile.map((c) => (
          <PlayingCard key={c.id} card={c} size="xs" className={answered && c.rank === q.target ? 'ring-2 ring-amber-300' : answered ? 'opacity-40' : ''} />
        ))}
      </div>
    </div>
  );
}

function ChangePrompt({ q }: { q: ChangeQ }) {
  return (
    <p className="text-center text-sm font-bold leading-relaxed">
      のこり {q.total}枚のカードから、<span className="text-rose-300">{q.drawn}</span> を1枚引きました。
      <br />
      次に <span className="text-amber-300">{q.target}</span> が出る確率は、引く前とくらべて?
    </p>
  );
}

function TcPrompt({ q }: { q: TcQ }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex gap-2">
        <div className="rounded-xl bg-white/5 px-4 py-2">
          <div className="text-[11px] text-neutral-400">ランニングカウント</div>
          <div className="text-2xl font-black">{signed(q.rc)}</div>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-2">
          <div className="text-[11px] text-neutral-400">のこりデッキ数</div>
          <div className="text-2xl font-black">{q.decks}</div>
        </div>
      </div>
      <p className="text-sm font-bold">トゥルーカウントは?</p>
    </div>
  );
}

// ---------- 解説 ----------

function Explain({ q }: { q: Question }) {
  switch (q.kind) {
    case 'point': {
      const v = hiLoValue(q.card.rank);
      return (
        <>
          <p>
            {q.card.rank} は {v > 0 ? '小さいカード(2〜6)' : v === 0 ? 'まん中のカード(7〜9)' : '大きいカード(10・絵札・A)'} なので <b>{signed(v)}</b> 点。
          </p>
          <PointRow highlight={v} />
        </>
      );
    }
    case 'count': {
      let sum = 0;
      return (
        <>
          <p className="mb-2">1枚ずつ、点数をたしていきます。</p>
          <div className="space-y-1">
            {q.cards.map((c, i) => {
              const v = hiLoValue(c.rank);
              const prev = sum;
              sum += v;
              return (
                <div key={c.id} className="flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1 tabular-nums">
                  <span className="w-12 text-[11px] text-neutral-400">{i + 1}枚目</span>
                  <PlayingCard card={c} size="xs" />
                  <span className={`w-8 font-bold ${v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-neutral-400'}`}>{signed(v)}</span>
                  <span className="text-neutral-400">
                    {signed(prev)} {v >= 0 ? '+' : '−'} {Math.abs(v)} =
                  </span>
                  <b>{signed(sum)}</b>
                </div>
              );
            })}
          </div>
        </>
      );
    }
    case 'prob':
      return (
        <p className="rounded-lg bg-black/25 p-2 text-center">
          {q.count}(のこりの {q.target}) ÷ {q.total}(のこり全部) × 100 = <b className="text-amber-300">{pctText(q.count, q.total)}</b>
        </p>
      );
    case 'change': {
      const same = q.drawn === q.target;
      const after = same ? q.targetCount - 1 : q.targetCount;
      return (
        <>
          <p className="mb-2">
            {q.target} が {q.targetCount}枚あったとします。
          </p>
          <div className="grid grid-cols-2 gap-2 text-center tabular-nums">
            <div className="rounded-lg bg-black/25 p-2">
              <div className="text-[11px] text-neutral-400">引く前</div>
              {q.targetCount} ÷ {q.total} = <b>{pctText(q.targetCount, q.total)}</b>
            </div>
            <div className="rounded-lg bg-black/25 p-2">
              <div className="text-[11px] text-neutral-400">引いた後</div>
              {after} ÷ {q.total - 1} = <b className={same ? 'text-rose-300' : 'text-emerald-300'}>{pctText(after, q.total - 1)}</b>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-300">
            {same
              ? `同じ ${q.target} を引くと、${q.target} の枚数がへるので確率は下がります。`
              : `ちがうカードを引くと、${q.target} の枚数はそのままで、ぜんぶの枚数だけへるので確率は上がります。`}
          </p>
        </>
      );
    }
    case 'tc':
      return (
        <>
          <p className="rounded-lg bg-black/25 p-2 text-center tabular-nums">
            {signed(q.rc)} ÷ {q.decks} = <b className="text-amber-300">{q.answer}</b>
          </p>
          <p className="mt-2 text-xs text-neutral-300">ランニングカウントを、のこりのデッキ数でわります。のこりが少ないほど、同じカウントでも大きな数になります。</p>
        </>
      );
  }
}

// ---------- 画面 ----------

export function QuizScreen({ onHome }: { onHome: () => void }) {
  const quizCount = useSettings((s) => s.quizCount);
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [ready, setReady] = useState(false);
  // このクイズでかせいだ所持金
  const [earned, setEarned] = useState(0);
  const [lastGain, setLastGain] = useState(0);
  const [perfectGain, setPerfectGain] = useState(0);
  const [training, setTraining] = useState(false);
  const earnStudy = useWallet((w) => w.earnStudy);
  const left = studyLeftToday(useWallet());

  const start = (m: QuizMode) => {
    setMode(m);
    setQuestions(makeQuiz(m, quizCount));
    setIdx(0);
    setPicked(null);
    setResults([]);
    setReady(false);
    setEarned(0);
    setPerfectGain(0);
  };

  const q = questions[idx];
  const finished = mode !== null && idx >= questions.length;

  useEffect(() => {
    if (!finished) return;
    sfx.finish();
    // 全問正解のボーナス
    if (results.length > 0 && results.every(Boolean)) {
      const g = useWallet.getState().earnStudy(QUIZ_PERFECT_BONUS);
      setPerfectGain(g);
      setEarned((e) => e + g);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const choose = (c: string) => {
    if (picked || !q) return;
    const ok = c === q.answer;
    setPicked(c);
    setResults((r) => [...r, ok]);
    if (ok) {
      sfx.correct();
      const g = earnStudy(QUIZ_REWARD);
      setLastGain(g);
      setEarned((e) => e + g);
    } else {
      setLastGain(0);
      sfx.wrong();
    }
  };

  const next = () => {
    setIdx((i) => i + 1);
    setPicked(null);
    setReady(false);
  };

  const score = results.filter(Boolean).length;

  if (training) return <SpeedTraining onExit={() => setTraining(false)} onHome={onHome} />;

  // モード選択
  if (mode === null) {
    return (
      <>
        <ScreenHeader title="クイズモード" onHome={onHome} />
        <div className="mx-auto max-w-xl">
          <div className="mb-3 rounded-xl bg-emerald-900/40 px-3 py-2 text-center text-xs leading-relaxed text-emerald-100 ring-1 ring-emerald-300/30">
            💰 正解すると所持金がもらえます(1問 +{QUIZ_REWARD}、全問正解で +{QUIZ_PERFECT_BONUS}、トレーニングは1回 +{SPEED_REWARD})
            <br />
            今日あと <b className="text-base tabular-nums">{left.toLocaleString()}</b> まで(1日 {STUDY_DAILY_CAP.toLocaleString()} まで)
          </div>
          <p className="mb-2 text-center text-sm text-neutral-300">どのクイズに挑戦する?({quizCount}問。問題数は設定で変えられます)</p>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => {
                  sfx.chip();
                  start(m.mode);
                }}
                className={`flex items-center gap-2 rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 sm:gap-3 sm:p-4 ${
                  m.mode === 'all' ? 'col-span-2 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 ring-amber-200' : 'bg-neutral-800 ring-white/15 hover:bg-neutral-700'
                }`}
              >
                <span className="text-2xl sm:text-3xl" aria-hidden>
                  {m.icon}
                </span>
                <span>
                  <span className="block text-sm font-black sm:text-base">{m.label}</span>
                  <span className={`block text-[10px] leading-snug sm:text-xs ${m.mode === 'all' ? 'text-amber-900/80' : 'text-neutral-400'}`}>{m.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <h2 className="mb-2 mt-3 text-xs font-bold tracking-widest text-sky-300 sm:mt-5">トレーニング</h2>
          <button
            type="button"
            onClick={() => {
              sfx.chip();
              setTraining(true);
            }}
            className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-b from-sky-600 to-sky-800 p-4 text-left ring-1 ring-sky-300/40 transition hover:-translate-y-0.5"
          >
            <span className="text-3xl" aria-hidden>
              ⚡
            </span>
            <span>
              <span className="block font-black">30秒スピード点数</span>
              <span className="block text-xs text-sky-100/80">出てくるカードを +1・0・−1 にすばやく分けよう。何枚できるかな?</span>
            </span>
          </button>
        </div>
      </>
    );
  }

  // 結果
  if (finished) {
    const rate = score / questions.length;
    const stars = rate >= 0.9 ? 3 : rate >= 0.6 ? 2 : 1;
    return (
      <>
        <ScreenHeader title="クイズモード" onHome={onHome} />
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-6 text-center">
          <div className="result-pop text-5xl tracking-widest" aria-label={`星${stars}つ`}>
            {'★'.repeat(stars)}
            <span className="text-white/20">{'★'.repeat(3 - stars)}</span>
          </div>
          <div className="text-4xl font-black tabular-nums">
            {score} <span className="text-xl text-neutral-400">/ {questions.length}問 せいかい</span>
          </div>
          <div className="rounded-xl bg-emerald-900/40 px-4 py-2 text-sm text-emerald-100 ring-1 ring-emerald-300/30">
            💰 かせいだ所持金 <b className="text-lg tabular-nums">+{earned.toLocaleString()}</b>
            {perfectGain > 0 && <span className="ml-1 text-xs">(全問正解ボーナス +{perfectGain} をふくむ)</span>}
            <div className="text-[11px] text-emerald-100/70">今日あと {left.toLocaleString()} までかせげます</div>
          </div>
          <p className="text-sm text-neutral-300">{stars === 3 ? 'すばらしい!カウントの達人です!' : stars === 2 ? 'いい調子!もう少しで満点!' : 'まちがえた問題の解説を見て、もう一度挑戦しよう!'}</p>
          <div className="flex flex-wrap justify-center gap-1">
            {results.map((ok, i) => (
              <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {ok ? '○' : '×'}
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => start(mode)} className="rounded-lg bg-amber-400 px-5 py-2.5 font-black text-amber-950">
              もう一度
            </button>
            <button type="button" onClick={() => setMode(null)} className="rounded-lg bg-neutral-700 px-5 py-2.5 font-bold">
              クイズをえらぶ
            </button>
            <button type="button" onClick={onHome} className="rounded-lg bg-neutral-700 px-5 py-2.5 font-bold">
              トップへ
            </button>
          </div>
        </div>
      </>
    );
  }

  // 出題中
  const canAnswer = q.kind !== 'count' || ready;
  const ok = picked !== null && picked === q.answer;
  return (
    <>
      <ScreenHeader title="クイズモード" onHome={onHome}>
        <span className="text-sm font-bold tabular-nums text-neutral-300">
          {idx + 1} / {questions.length}
        </span>
      </ScreenHeader>
      <div className="mx-auto max-w-xl">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-amber-400 transition-[width]" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>

        <div className="felt rounded-2xl p-3 shadow-xl ring-4 ring-[#5a3418] sm:p-4">
          <div className="min-h-[170px]">
            {q.kind === 'point' && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-bold">このカードは何点?</p>
                <PlayingCard key={q.card.id} card={q.card} animate className="scale-125" />
              </div>
            )}
            {q.kind === 'count' && <CountPrompt key={q.id} q={q} onReady={() => setReady(true)} />}
            {q.kind === 'prob' && <ProbPrompt q={q} answered={picked !== null} />}
            {q.kind === 'change' && <ChangePrompt q={q} />}
            {q.kind === 'tc' && <TcPrompt q={q} />}
          </div>
        </div>

        {/* 選択肢 */}
        <div className={`mt-3 grid gap-2 ${q.choices.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} ${canAnswer ? '' : 'pointer-events-none opacity-30'}`}>
          {q.choices.map((c) => {
            const isAnswer = c === q.answer;
            const state = picked === null ? '' : isAnswer ? 'bg-emerald-500 text-white ring-emerald-300' : c === picked ? 'bg-rose-600 text-white ring-rose-300' : 'opacity-40';
            return (
              <button
                key={c}
                type="button"
                onClick={() => choose(c)}
                disabled={picked !== null}
                className={`rounded-xl bg-neutral-800 py-2 text-lg font-black ring-1 sm:py-3 ring-white/15 transition hover:bg-neutral-700 ${state}`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* 正解・不正解と解説 */}
        {picked !== null && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-center">
              <div className={`result-plate result-plate-${ok ? 'win' : 'lose'} rounded-2xl px-6 py-1 ${ok ? 'result-pop' : 'result-shake'}`}>
                <span className={`${ok ? 'result-green' : 'result-red'} text-3xl font-black italic`}>{ok ? 'せいかい!' : 'ざんねん…'}</span>
              </div>
            </div>
            {ok && <p className="text-center text-sm text-emerald-200">{lastGain > 0 ? `💰 所持金 +${lastGain}` : '今日かせげる所持金は、上限に達しました'}</p>}
            {!ok && <p className="text-center text-sm">正解は <b className="text-emerald-300">{q.answer}</b></p>}
            <div className="rounded-2xl bg-neutral-900/80 p-4 text-sm leading-relaxed ring-1 ring-white/10">
              <div className="mb-2 text-xs font-bold tracking-widest text-sky-300">かいせつ</div>
              <Explain q={q} />
            </div>
          </div>
        )}
        {/* 「つぎの問題」は解説が長くても画面の下に残す(iPhone タテで画面外に出ないように) */}
        {picked !== null && (
          <div className="sticky bottom-0 z-10 -mx-2 mt-3 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent px-2 pb-3 pt-4">
            <button type="button" onClick={next} className="w-full rounded-xl bg-sky-600 py-3 font-black shadow-lg hover:bg-sky-500">
              {idx + 1 < questions.length ? 'つぎの問題 ▶' : '結果を見る ▶'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
