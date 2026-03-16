import { Racket } from '../types/racket';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

/**
 * プレイヤーラケットの新しい状態を計算する
 */
export const updatePlayerRacket = (
  current: Racket,
  input: { left: boolean; right: boolean; up?: boolean; down?: boolean },
  deltaTime: number
): Racket => {
  const { moveSpeed } = current.stats;
  let nextX = current.x;
  let nextIsRightHanded = current.isRightHanded;

  // 左右移動の計算
  if (input.left) {
    nextX -= moveSpeed * deltaTime;
    nextIsRightHanded = false; // 左に動くときは左持ち
  }
  if (input.right) {
    nextX += moveSpeed * deltaTime;
    nextIsRightHanded = true; // 右に動くときは右持ち
  }

  // 上下移動の計算
  let nextY = current.y;
  if (input.up) {
    nextY -= moveSpeed * deltaTime;
  }
  if (input.down) {
    nextY += moveSpeed * deltaTime;
  }

  // 画面端の衝突判定（Canvasサイズ 1280px x 720px）
  const minX = 0;
  const maxX = CANVAS_WIDTH - current.width;
  nextX = Math.max(minX, Math.min(maxX, nextX));

  const minY = 0;
  const maxY = CANVAS_HEIGHT - current.height;
  nextY = Math.max(minY, Math.min(maxY, nextY));

  return {
    ...current,
    x: nextX,
    y: nextY,
    isRightHanded: nextIsRightHanded,
  };
};

/**
 * CPUラケットの新しい状態を計算する（追従ロジック）
 */
export const updateCpuRacket = (
  current: Racket,
  ballY: number,
  followSpeed: number,
  deltaTime: number
): Racket => {
  // ボールのY座標にラケットの中心を合わせるように移動
  const targetY = ballY - current.height / 2;
  const diffY = targetY - current.y;
  
  // 難易度に応じた追従速度で更新
  const nextY = current.y + diffY * followSpeed * deltaTime;

  return {
    ...current,
    y: nextY,
  };
};