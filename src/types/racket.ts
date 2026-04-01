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
    hitBoxWidth: 120,     // 横幅
    hitBoxHeight: 20,     // 厚み
    moveSpeed: 500,
    smashSpeed: 2.0,
  },
  power: {
    hitBoxWidth: 90,      // 横幅
    hitBoxHeight: 16,     // 厚み
    moveSpeed: 700,
    smashSpeed: 3.0,
  },
  wide: {
    hitBoxWidth: 180,     // 横幅
    hitBoxHeight: 24,     // 厚み
    moveSpeed: 250,
    smashSpeed: 1.0,
  },
};
