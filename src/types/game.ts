export type Difficulty = 'easy' | 'normal' | 'hard';

export type RacketType = 'normal' | 'speed' | 'wide';

export type BallType = 'normal' | 'strawberry' | 'heart' | 'star' | 'candy' | 'ribbon';

export type Screen = 'home' | 'difficulty' | 'racketSelect' | 'game' | 'result';

// --- ラケット（パドル）に関する型定義 ---
export interface RacketStats {
  hitBoxWidth: number;      // 当たり判定の幅
  hitBoxHeight: number;     // 当たり判定の高さ
  moveSpeed: number;        // 移動速度
  smashSpeed: number;       // スマッシュ速度倍率
}

export interface Racket {
  x: number;                // X座標 (中心)
  y: number;                // Y座標 (中心)
  width: number;            // 表示幅
  height: number;           // 表示高さ
  stats: RacketStats;       // 基本ステータス
  isRightHanded: boolean;   // キャラクターの向きによる持ち手
}

// --- 追加: ボールに関する型定義 ---
export interface Ball {
  x: number;
  y: number;
  vx: number;               // X方向の速度
  vy: number;               // Y方向の速度
  radius: number;
  type: BallType;
  isReal: boolean;          // ハートボールの本物判定用
}

export const RACKET_STATS: Record<RacketType, RacketStats> = {
  normal: {
    hitBoxWidth: 20,
    hitBoxHeight: 80,
    moveSpeed: 5,
    smashSpeed: 1.0,
  },
  speed: {
    hitBoxWidth: 16,        // 20%低下
    hitBoxHeight: 80,
    moveSpeed: 5,
    smashSpeed: 1.2,        // 1.2倍
  },
  wide: {
    hitBoxWidth: 24,        // 20%増加
    hitBoxHeight: 80,
    moveSpeed: 4,           // 20%低下
    smashSpeed: 1.0,
  },
};

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
