import { useState, useCallback } from 'react';
import { RacketType } from '../types/game';
import { Ball } from '../types/ball';
import { Racket } from '../types/racket'; // 型定義からインポート
import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_RADIUS, RACKET_BASE_WIDTH, RACKET_BASE_HEIGHT } from '../utils/constants';

export function useCollision() {
  // プレイヤーラケットの初期状態
  const [playerRacket] = useState<Racket>({
    x: 50,
    y: CANVAS_HEIGHT / 2,
    width: RACKET_BASE_WIDTH,
    height: RACKET_BASE_HEIGHT,
    stats: { hitBoxWidth: 20, hitBoxHeight: 80, moveSpeed: 5, smashSpeed: 1.0 },
    isRightHanded: true,
    effectMultiplier: 1
  });

  // CPUラケットの初期状態
  const [cpuRacket] = useState<Racket>({
    x: CANVAS_WIDTH - 70,
    y: CANVAS_HEIGHT / 2,
    width: RACKET_BASE_WIDTH,
    height: RACKET_BASE_HEIGHT,
    stats: { hitBoxWidth: 20, hitBoxHeight: 80, moveSpeed: 5, smashSpeed: 1.0 },
    isRightHanded: false,
    effectMultiplier: 1
  });

  // ボールの初期状態
  const [ball] = useState<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: 5,
    vy: 2,
    radius: BALL_RADIUS,
    type: 'normal',
    isReal: true,
    effectRemainingRallies: 0, 
  });

  const updatePhysics = useCallback((ball: Ball, player: Racket, cpu: Racket, deltaTime: number) => {
    // ボールの移動
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 上下の壁でのバウンド
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > CANVAS_HEIGHT) {
      ball.vy *= -1;
    }

    // プレイヤーラケットとの衝突判定 (AABB)
    if (
      ball.x - ball.radius < player.x + player.width &&
      ball.y > player.y - player.height / 2 &&
      ball.y < player.y + player.height / 2
    ) {
      // 反射角の計算：当たった位置によって角度を変える
      const relativeIntersectY = (player.y - ball.y) / (player.height / 2);
      ball.vx = Math.abs(ball.vx); // 右方向へ飛ばす
      ball.vy = -relativeIntersectY * 5;
      return 'player';
    }

    // CPUラケットとの衝突判定
    if (
      ball.x + ball.radius > cpu.x &&
      ball.y > cpu.y - cpu.height / 2 &&
      ball.y < cpu.y + cpu.height / 2
    ) {
      ball.vx = -Math.abs(ball.vx); // 左方向へ飛ばす
      return 'cpu';
    }

    return 'none';
  }, []);

  return { playerRacket, cpuRacket, ball, updatePhysics };
}