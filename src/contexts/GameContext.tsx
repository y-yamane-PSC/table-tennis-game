import React, { createContext, useContext } from 'react';
import { GameState, GameConfig } from '../types/game';


export interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameContext');
  }
  return context;
};
