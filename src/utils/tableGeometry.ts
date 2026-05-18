import { CANVAS_WIDTH, CANVAS_HEIGHT, TABLE_TOP_WIDTH_PX, TABLE_BOTTOM_WIDTH_PX } from './constants';
import type { Racket } from '../types/racket';

// 物理定数
export const GRAVITY_Z = -0.38;
export const BOUNCE_Z = 0.62;
export const HIT_LIFT_Z = 7.5;
export const HITTABLE_Z = 80;
export const MAX_Z = 140;
export const Z_TO_SCREEN = 0.9;

// テーブル寸法
export const TABLE_MARGIN_TOP = 90;
export const TABLE_MARGIN_BOTTOM = 60;
export const TABLE_TOP_Y = TABLE_MARGIN_TOP;
export const TABLE_BOTTOM_Y = CANVAS_HEIGHT - TABLE_MARGIN_BOTTOM;
export const NET_Y = (TABLE_TOP_Y + TABLE_BOTTOM_Y) / 2;
export const TABLE_TOP_WIDTH = TABLE_TOP_WIDTH_PX;
export const TABLE_BOTTOM_WIDTH = TABLE_BOTTOM_WIDTH_PX;
export const TABLE_CENTER_X = CANVAS_WIDTH / 2;
export const TABLE_TOP_LEFT_X = TABLE_CENTER_X - TABLE_TOP_WIDTH / 2;
export const TABLE_TOP_RIGHT_X = TABLE_CENTER_X + TABLE_TOP_WIDTH / 2;
export const TABLE_BOTTOM_LEFT_X = TABLE_CENTER_X - TABLE_BOTTOM_WIDTH / 2;
export const TABLE_BOTTOM_RIGHT_X = TABLE_CENTER_X + TABLE_BOTTOM_WIDTH / 2;

// ユーティリティ
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const getTableXBoundsAtY = (y: number) => {
  const t = clamp01((y - TABLE_TOP_Y) / (TABLE_BOTTOM_Y - TABLE_TOP_Y));
  return {
    leftX: lerp(TABLE_TOP_LEFT_X, TABLE_BOTTOM_LEFT_X, t),
    rightX: lerp(TABLE_TOP_RIGHT_X, TABLE_BOTTOM_RIGHT_X, t),
  };
};

export const isBallOutOfTable = (ballX: number, ballY: number, radius: number): boolean => {
  if (ballY - radius < TABLE_TOP_Y || ballY + radius > TABLE_BOTTOM_Y) return true;
  const { leftX, rightX } = getTableXBoundsAtY(ballY);
  return ballX - radius < leftX || ballX + radius > rightX;
};

export const clampRacketToTable = (racket: Racket, side: 'player' | 'cpu'): Racket => {
  const NET_GAP = 10;
  const sideMinY = side === 'player' ? NET_Y + NET_GAP : 0;
  const sideMaxY = side === 'player' ? CANVAS_HEIGHT - racket.height : NET_Y - NET_GAP - racket.height;
  const nextY = clamp(racket.y, sideMinY, sideMaxY);
  const OVERHANG = 60;
  const nextX = clamp(racket.x, -OVERHANG, CANVAS_WIDTH - racket.width + OVERHANG);
  return { ...racket, x: nextX, y: nextY };
};
