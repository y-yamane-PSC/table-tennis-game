import { useState, useCallback } from 'react';
import { ScreenContext } from './contexts/ScreenContext';
import { GameContext } from './contexts/GameContext';
import HomeScreen from './components/screens/HomeScreen';
import RacketSelectScreen from './components/screens/RacketSelectScreen';
import GameScreen from './components/screens/GameScreen';
import ResultScreen from './components/screens/ResultScreen';
import { Screen, GameState, GameConfig } from './types/game';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  // configのstate
  const [config, setConfig] = useState<GameConfig>({
    difficulty: 'normal',
    racketType: 'normal',
  });

  // gameStateのstate。必ず最新のconfigを参照するようにする
  const [gameState, setGameState] = useState<GameState>({
    playerScore: 0,
    cpuScore: 0,
    rallyCount: 0,
    isGameActive: false,
    isPaused: false,
    config: config,
  });

  // config更新時にgameState内のconfigも同期させる
  const handleSetConfig = useCallback((newConfig: GameConfig) => {
    setConfig(newConfig);
    // configだけ更新したい場合は上書き、それ以外のstateは維持
    setGameState((prev) => ({
      ...prev,
      config: newConfig,
    }));
  }, []);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  return (
    <ScreenContext.Provider value={{ currentScreen, navigateTo }}>
      <GameContext.Provider value={{
        gameState,
        setGameState,
        config,
        setConfig: handleSetConfig
      }}>
        {currentScreen === 'home' && <HomeScreen />}
        {currentScreen === 'racketSelect' && <RacketSelectScreen />}
        {currentScreen === 'game' && <GameScreen />}
        {currentScreen === 'result' && <ResultScreen />}
      </GameContext.Provider>
    </ScreenContext.Provider>
  );
}

export default App;
