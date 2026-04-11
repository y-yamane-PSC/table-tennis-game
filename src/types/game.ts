export type Difficulty = 'easy' | 'normal' | 'hard';

export type RacketType = 'normal' | 'power' | 'wide';

export type BallType = 'normal' | 'strawberry' | 'heart' | 'star' | 'candy' | 'ribbon';

export type Screen = 'home' | 'difficulty' | 'racketSelect' | 'game' | 'result';


export interface GameConfig {
  difficulty: Difficulty;
  racketType: RacketType;
}

export interface GameState {
  playerScore: number;
  cpuScore: number;
  rallyCount: number;
  isGameActive: boolean;
  isPaused: boolean;
  config: GameConfig;
  lastScorer: 'player' | 'cpu' | null;
}


export interface GameSettings {
  ballSpeed: number;
  paddleSize: number;
  cpuFollowSpeed: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, GameSettings> = {
  easy: {
    ballSpeed: 0.7,
    paddleSize: 1.5,
    cpuFollowSpeed: 0.5,
  },
  normal: {
    ballSpeed: 1.0,
    paddleSize: 1.0,
    cpuFollowSpeed: 0.8,
  },
  hard: {
    ballSpeed: 1.3,
    paddleSize: 0.8,
    cpuFollowSpeed: 1.0,
  },
};

export type GameAction =
  | { type: 'INCREMENT_PLAYER_SCORE' }
  | { type: 'INCREMENT_CPU_SCORE' }
  | { type: 'INCREMENT_RALLY' }
  | { type: 'RESET_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'END_GAME' }
  | { type: 'SET_CONFIG'; payload: GameConfig };
