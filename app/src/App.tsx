import { useState } from 'react';
import { ChipsScreen } from './screens/ChipsScreen';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen, type Screen } from './screens/HomeScreen';
import { QuizScreen } from './screens/QuizScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  // チップがなくなってゲームから移ってきたとき、換金画面に理由を出す
  const [chipsReason, setChipsReason] = useState<'empty' | undefined>();
  const go = (s: Screen) => {
    setChipsReason(undefined);
    setScreen(s);
  };
  const home = () => go('home');

  return (
    <div className="min-h-svh bg-[radial-gradient(ellipse_at_top,#1f2937,#030712)] px-2 pb-6 pt-2 text-white sm:px-4 sm:pb-8 sm:pt-3">
      {screen === 'home' && <HomeScreen go={go} />}
      {screen === 'game' && (
        <GameScreen
          onHome={home}
          onQuiz={() => go('quiz')}
          onOutOfChips={() => {
            setChipsReason('empty');
            setScreen('chips');
          }}
        />
      )}
      {screen === 'quiz' && <QuizScreen onHome={home} />}
      {screen === 'settings' && <SettingsScreen onHome={home} />}
      {screen === 'chips' && <ChipsScreen go={go} reason={chipsReason} />}
    </div>
  );
}
