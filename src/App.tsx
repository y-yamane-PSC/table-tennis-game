import { useState, useCallback } from 'react';
import { ScreenContext } from './contexts/ScreenContext';
import { GameContext } from './contexts/GameContext';
import { SoundProvider, useSoundContext } from './contexts/SoundContext';
import HomeScreen from './components/screens/HomeScreen';
import DifficultyScreen from './components/screens/DifficultyScreen'
import RacketSelectScreen from './components/screens/RacketSelectScreen';
import GameScreen from './components/screens/GameScreen';
import ResultScreen from './components/screens/ResultScreen';
import ChangelogScreen from './components/screens/ChangelogScreen';
import TutorialScreen from './components/screens/TutorialScreen';
import { Screen, GameState, GameConfig } from './types/game';
import './styles/app.css';

// グローバルサウンドボタン（全画面共通）
function GlobalSoundButton() {
  const { soundEnabled, toggleSound } = useSoundContext();
  return (
    <button
      className={`global-sound-btn ${soundEnabled ? 'sound-on' : 'sound-off'}`}
      onClick={toggleSound}
      aria-label={soundEnabled ? 'サウンドをオフにする' : 'サウンドをオンにする'}
    >
      {soundEnabled ? '♪ ON' : '♪ OFF'}
    </button>
  );
}

function AppInner() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const [config, setConfig] = useState<GameConfig>({
    difficulty: 'normal',
    racketType: 'normal',
  });

  const [gameState, setGameState] = useState<GameState>({
    playerScore: 0,
    cpuScore: 0,
    rallyCount: 0,
    isGameActive: false,
    isPaused: false,
    config: config,
    isInputFrozen: false,
    lastScorer: null,
    pointScoredBy: null,
  });

  // navigateTo を useCallback でメモ化（毎レンダーで再生成されないようにする）
  const navigateTo = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
  }, []);

  const handleSetConfig = useCallback((newConfig: GameConfig) => {
    setConfig(newConfig);
    setGameState((prev) => ({ ...prev, config: newConfig }));
  }, []);

  return (
    <ScreenContext.Provider value={{ currentScreen, navigateTo }}>
      <GameContext.Provider value={{
        gameState,
        setGameState,
        config,
        setConfig: handleSetConfig,
      }}>
        {/* 全画面共通のサウンドボタン */}
        <GlobalSoundButton />

        {currentScreen === 'home'         && <HomeScreen />}
        {currentScreen === 'difficulty'   && <DifficultyScreen />}
        {currentScreen === 'racketSelect' && <RacketSelectScreen />}
        {currentScreen === 'game'         && <GameScreen />}
        {currentScreen === 'result'       && <ResultScreen />}
        {currentScreen === 'changelog'    && <ChangelogScreen />}
        {currentScreen === 'tutorial'     && <TutorialScreen />}
      </GameContext.Provider>
    </ScreenContext.Provider>
  );
}

function App() {
  return (
    <SoundProvider>
      <AppInner />
    </SoundProvider>
  );
}

export default App;
