import type { Ball } from '../types/ball';
import type { BallType, Difficulty } from '../types/game';
import type { Racket } from '../types/racket';
import { CANVAS_WIDTH } from '../utils/constants';
import { TABLE_CENTER_X, GRAVITY_Z, BOUNCE_Z } from '../utils/tableGeometry';

// ボールの着地X座標を物理シミュレーションで予測する
function predictBallLandingX(ball: Ball, targetY: number): number {
  let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
  let z = ball.z ?? 0, vz = ball.vz ?? 0;
  for (let i = 0; i < 120; i++) {
    x += vx; y += vy;
    vz += GRAVITY_Z; z += vz;
    if (z < 0) { z = 0; vz = Math.abs(vz) * BOUNCE_Z; }
    if (y <= targetY) return x;
    if (x < 0) { x = -x; vx = -vx; }
    if (x > CANVAS_WIDTH) { x = 2 * CANVAS_WIDTH - x; vx = -vx; }
  }
  return x;
}

export const updateSmartCpuRacket = (
  current: Racket,
  ball: Ball,
  ballType: BallType,
  difficulty: Difficulty,
  deltaTime: number,
): Racket => {
  const followSpeed: Record<Difficulty, number> = { easy: 0.5, normal: 0.8, hard: 1.0 };
  const speed = followSpeed[difficulty];

  let targetX: number;

  if (ballType === 'ribbon') {
    // リボンはバウンド後に予測不能なので中央で待機
    targetX = TABLE_CENTER_X - current.width / 2;
  } else if (ball.vy >= 0) {
    // ボールが自コートへ向かっていない間は中央寄りに戻る
    const centerX = TABLE_CENTER_X - current.width / 2;
    const returnStrength = { easy: 0.3, normal: 0.5, hard: 0.7 }[difficulty];
    targetX = current.x + (centerX - current.x) * returnStrength;
  } else {
    // ボールが向かってくる → 着地点を予測
    const cpuCenterY = current.y + current.height / 2;
    const predictedX = predictBallLandingX(ball, cpuCenterY);

    if (ballType === 'star') {
      // スターボール（スマッシュが強い）は中央気味に守備的に
      const centerBias = { easy: 0.2, normal: 0.4, hard: 0.6 }[difficulty];
      targetX = predictedX * (1 - centerBias) + TABLE_CENTER_X * centerBias - current.width / 2;
    } else {
      targetX = predictedX - current.width / 2;
    }
  }

  const diffX = targetX - current.x;
  const maxSpeed = current.stats.moveSpeed * speed;
  const maxStep = maxSpeed * deltaTime;
  const step = Math.max(-maxStep, Math.min(maxStep, diffX));
  const nextX = Math.max(-60, Math.min(CANVAS_WIDTH - current.width + 60, current.x + step));

  return { ...current, x: nextX };
};
