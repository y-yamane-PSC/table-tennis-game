import { useCallback } from 'react';
import { Ball, Racket, BallType } from '../types/game';
import { useGame } from '../contexts/GameContext';

export function useBallEffects() {
  const { gameState } = useGame();

  const processBallEffects = useCallback((ball: Ball, player: Racket, cpu: Racket) => {
    // 5の倍数のラリーでボールをランダムに変化させる
    if (gameState.rallyCount > 0 && gameState.rallyCount % 5 === 0) {
      const types: BallType[] = ['strawberry', 'heart', 'star', 'candy', 'ribbon'];
      ball.type = types[Math.floor(Math.random() * types.length)];
    }

    // 各ボールの効果適用
    switch (ball.type) {
      case 'strawberry':
        // 打ったプレイヤーの当たり判定を1.2倍にする
        // 画面に「ボールがうちやすくなったよ！」と表示（MessageDisplayと連動）
        break;
      case 'heart':
        // 3つに分身させるロジック（本物のみ当たり判定あり）
        break;
      case 'star':
        // スマッシュ速度が1.5倍になる
        break;
      case 'candy':
        // 相手の当たり判定を0.8倍に狭くする
        break;
      case 'ribbon':
        // バウンド時に左右斜め45度にランダム変化
        break;
    }
  }, [gameState.rallyCount]);

  return { processBallEffects };
}