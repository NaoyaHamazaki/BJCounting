import { AppIcon } from '../components/Icons';
import { useSettings } from '../store/useSettings';

/** ゲーム・クイズ・設定の画面で共通のヘッダー(トップへ戻る、効果音のオン/オフ) */
export function ScreenHeader({ title, onHome, children, hideSoundOnMobile }: { title: string; onHome: () => void; children?: React.ReactNode; hideSoundOnMobile?: boolean }) {
  const sound = useSettings((s) => s.sound);
  const update = useSettings((s) => s.update);
  return (
    <header className="mx-auto mb-2 flex sm:mb-3 max-w-[1000px] items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg py-1 pl-1 pr-2.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/10"
          aria-label="トップへもどる"
        >
          <AppIcon size={28} />
          <span>トップ</span>
        </button>
        <h1 className="whitespace-nowrap text-base font-extrabold tracking-wide">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={() => update({ sound: !sound })}
          className={`rounded-md bg-neutral-800 px-2.5 py-1.5 ring-1 ring-white/15 hover:bg-neutral-700 ${hideSoundOnMobile ? 'hidden sm:block' : ''}`}
          aria-label={sound ? '効果音をオフにする' : '効果音をオンにする'}
          title={sound ? '効果音:オン' : '効果音:オフ'}
        >
          {sound ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  );
}
