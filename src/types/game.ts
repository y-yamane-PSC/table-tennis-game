export type Difficulty = 'easy' | 'normal' | 'hard';

export type RacketType = 'normal' | 'power' | 'wide';

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
  /**
   * 卓球の「高さ」表現用（2D Canvas上の疑似3D）
   * z: 卓球台（平面）からの高さ
   * vz: z方向の速度
   */
  z?: number;
  vz?: number;
  /**
   * 卓球ルール判定用
   * lastHitBy: 最後に打った側
   * bounceCount: 最後に打ってからのバウンド回数（台に接地した回数）
   * lastBounceSide: 直近のバウンドが起きたコート側
   */
  lastHitBy?: 'player' | 'cpu';
  bounceCount?: number;
  lastBounceSide?: 'player' | 'cpu' | null;
  radius: number;
  type: BallType;
  isReal: boolean;          // ハートボールの本物判定用
  effectRemainingRallies: number; // 効果の残りラリー数
}

export const RACKET_STATS: Record<RacketType, RacketStats> = {
  normal: {
    hitBoxWidth: 80,
    hitBoxHeight: 20,
    moveSpeed: 5,
    smashSpeed: 1.0,
  },
  power: {
    hitBoxWidth: 64,
    hitBoxHeight: 16,
    moveSpeed: 5,
    smashSpeed: 1.2,
  },
  wide: {
    hitBoxWidth: 120,
    hitBoxHeight: 24,
    moveSpeed: 4,
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
