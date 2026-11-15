import { MAX_CPUS, useGameStore } from '../store/useGameStore';
import { useSettings, type QuizSpeed } from '../store/useSettings';
import { ScreenHeader } from './ScreenHeader';

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3 last:border-0">
      <div>
        <div className="text-sm font-bold">{label}</div>
        {sub && <div className="text-[11px] text-neutral-400">{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** ボタンを並べた選択(セグメント) */
function Segment<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={`min-w-[38px] rounded-md px-2 py-1.5 text-sm font-bold ring-1 transition ${
            o.v === value ? 'bg-amber-400 text-amber-950 ring-amber-300' : 'bg-neutral-800 text-white ring-white/15 hover:bg-neutral-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-neutral-600'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export function SettingsScreen({ onHome }: { onHome: () => void }) {
  const st = useSettings();
  const game = useGameStore();
  const midRound = game.phase !== 'betting' && game.phase !== 'roundOver';

  return (
    <>
      <ScreenHeader title="設定" onHome={onHome} />
      <div className="mx-auto max-w-xl space-y-4">
        <section className="rounded-2xl bg-neutral-900/80 px-4 py-1 ring-1 ring-white/10">
          <h2 className="pt-3 text-xs font-bold tracking-widest text-amber-300">ゲーム</h2>
          <Row label="デッキ数" sub="確率の学習には 1〜2デッキがおすすめ。変えると、シャッフルし直してカウントは0に戻ります">
            <select
              value={st.deckCount}
              onChange={(e) => {
                const n = Number(e.target.value);
                st.update({ deckCount: n });
                game.setDeckCount(n);
              }}
              className="rounded-md bg-neutral-800 px-3 py-1.5 font-bold ring-1 ring-white/15"
            >
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}デッキ({n * 52}枚)
                </option>
              ))}
            </select>
          </Row>
          <Row label="CPU の人数" sub="CPU のカードも数える練習になります">
            <Segment
              value={st.cpuCount}
              options={Array.from({ length: MAX_CPUS + 1 }, (_, i) => ({ v: i, label: `${i}人` }))}
              onChange={(n) => {
                st.update({ cpuCount: n });
                game.setCpuCount(n);
              }}
            />
          </Row>
          <Row label="chance? / chance! の表示" sub="オフにすると、自分の力だけで判断する練習になります">
            <Toggle on={st.showChance} onChange={(v) => st.update({ showChance: v })} label="チャンスの表示" />
          </Row>
          <Row label="デッキ数のおすすめを表示" sub="3デッキ以上でゲームを始めたときに、1〜2デッキをすすめるメッセージ">
            <Toggle on={!st.hideDeckTip} onChange={(v) => st.update({ hideDeckTip: !v })} label="デッキ数のおすすめ" />
          </Row>
          {midRound && <p className="pb-3 text-[11px] text-amber-200/80">※ ラウンドの途中で変えると、そのラウンドは中止になり、賭けたチップは戻ります。</p>}
        </section>

        <section className="rounded-2xl bg-neutral-900/80 px-4 py-1 ring-1 ring-white/10">
          <h2 className="pt-3 text-xs font-bold tracking-widest text-amber-300">クイズ</h2>
          <Row label="問題数">
            <Segment value={st.quizCount} options={[5, 10, 20].map((n) => ({ v: n, label: `${n}問` }))} onChange={(n) => st.update({ quizCount: n })} />
          </Row>
          <Row label="カウントクイズの速さ" sub="カードを1枚ずつ見せる速さ">
            <Segment<QuizSpeed>
              value={st.quizSpeed}
              options={[
                { v: 'slow', label: 'ゆっくり' },
                { v: 'normal', label: 'ふつう' },
                { v: 'fast', label: 'はやい' },
              ]}
              onChange={(v) => st.update({ quizSpeed: v })}
            />
          </Row>
        </section>

        <section className="rounded-2xl bg-neutral-900/80 px-4 py-1 ring-1 ring-white/10">
          <h2 className="pt-3 text-xs font-bold tracking-widest text-amber-300">サウンド</h2>
          <Row label="効果音">
            <Toggle on={st.sound} onChange={(v) => st.update({ sound: v })} label="効果音" />
          </Row>
        </section>

        <p className="text-center text-[11px] text-neutral-500">設定は、このブラウザに保存されます。</p>
      </div>
    </>
  );
}
