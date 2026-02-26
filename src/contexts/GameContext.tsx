import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, GameAction, GameConfig, RACKET_STATS } from '../types/game';

// 1. 初期状態の定義
const initialGameState: GameState = {
  playerScore: 0,
  cpuScore: 0,
  rallyCount: 0,
  isGameActive: false,
  isPaused: false,
  config: {
    difficulty: 'normal',
    racketType: 'normal',
  },
};
interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

// 2. Reducerの実装
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INCREMENT_PLAYER_SCORE':
      return { ...state, playerScore: state.playerScore + 1, rallyCount: 0 };
    case 'INCREMENT_CPU_SCORE':
      return { ...state, cpuScore: state.cpuScore + 1, rallyCount: 0 };
    case 'INCREMENT_RALLY':
      return { ...state, rallyCount: state.rallyCount + 1 };
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'RESET_GAME':
      return { ...initialGameState, config: state.config, isGameActive: true };
    case 'PAUSE_GAME':
      return { ...state, isPaused: true };
    case 'RESUME_GAME':
      return { ...state, isPaused: false };
    case 'END_GAME':
      return { ...state, isGameActive: false };
    default:
      return state;
  }
}

// Contextの作成
interface GameContextType {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {

  // GameContext.tsx 内でのイメージ
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);

}
  
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameContext');
  }
  return context;
};
