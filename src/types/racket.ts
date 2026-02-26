import { RacketType } from './game';

export interface RacketStats {
  hitBoxWidth: number;      // 当たり判定の幅
  hitBoxHeight: number;     // 当たり判定の高さ
  moveSpeed: number;        // 移動速度
  smashSpeed: number;       // スマッシュ速度倍率
}

export interface Racket {
  x: number;                // X座標
  y: number;                // Y座標
  width: number;            // 表示幅
  height: number;           // 表示高さ
  stats: RacketStats;       // ステータス
  isRightHanded: boolean;   // 右持ちか左持ちか
  effectMultiplier: number; // 効果による倍率（イチゴ/キャンディ用）
  
}

export const RACKET_TYPES: Record<RacketType, RacketStats> = {
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
    smashSpeed: 1.2,
  },
  wide: {
    hitBoxWidth: 24,        // 20%増加
    hitBoxHeight: 80,
    moveSpeed: 4,           // 20%低下
    smashSpeed: 1.0,
  },
};
