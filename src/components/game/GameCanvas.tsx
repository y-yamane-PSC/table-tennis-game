import React, { useRef, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useInput } from '../../hooks/useInput';
import { useParticles } from '../../hooks/useParticles';
import { useBallEffects } from '../../hooks/useBallEffects';
// physics.ts から更新関数をインポート
import { updatePlayerRacket, updateCpuRacket } from '../../utils/physics';
import { CANVAS_WIDTH, CANVAS_HEIGHT, RACKET_BASE_WIDTH, RACKET_BASE_HEIGHT, BALL_RADIUS } from '../../utils/constants';
import { Racket, RACKET_TYPES } from '../../types/racket';
import { Ball, BALL_TYPES } from '../../types/ball';

/**
 * ボールとラケットの衝突判定を行う
 * @param ball 現在のボールの状態
 * @param racket 判定対象のラケット
 * @returns 衝突している場合は true
 */
export const checkRacketCollision = (ball: Ball, racket: Racket): boolean => {
  // AABB (Axis-Aligned Bounding Box) 判定
  // ボールの中心座標と半径、ラケットの座標とサイズから計算
  return (
    ball.x + ball.radius > racket.x &&
    ball.x - ball.radius < racket.x + racket.width &&
    ball.y + ball.radius > racket.y &&
    ball.y - ball.radius < racket.y + racket.height
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, dispatch } = useGame();
  const input = useInput();
  const { particles, createHitParticles, updateParticles } = useParticles();
  const { processBallEffects } = useBallEffects();

  // --- 1. 状態(State)の定義 ---
  const [playerRacket, setPlayerRacket] = useState<Racket>({
    x: 50,
    y: CANVAS_HEIGHT / 2 - RACKET_BASE_HEIGHT / 2,
    width: RACKET_BASE_WIDTH,
    height: RACKET_BASE_HEIGHT,
    stats: RACKET_TYPES.normal,
    isRightHanded: true,
    effectMultiplier: 1.0,
  });

  const [cpuRacket, setCpuRacket] = useState<Racket>({
    x: CANVAS_WIDTH - 50 - RACKET_BASE_WIDTH,
    y: CANVAS_HEIGHT / 2 - RACKET_BASE_HEIGHT / 2,
    width: RACKET_BASE_WIDTH,
    height: RACKET_BASE_HEIGHT,
    stats: RACKET_TYPES.normal,
    isRightHanded: false,
    effectMultiplier: 1.0,
  });

  const [ball, setBall] = useState<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: 5,
    vy: 5,
    radius: BALL_RADIUS,
    type: 'normal',
    isReal: true,
    effectRemainingRallies: 0,
  });

  // --- 2. ゲームループ ---
  useGameLoop((deltaTime) => {
    if (!gameState.isGameActive || gameState.isPaused) return;

    // プレイヤーの移動
    setPlayerRacket((prev) => updatePlayerRacket(prev, input, deltaTime));

    // CPUの自動追従
    const difficultySettings = { easy: 0.5, normal: 0.8, hard: 1.0 };
    const followSpeed = difficultySettings[gameState.config.difficulty];
    setCpuRacket((prev) => updateCpuRacket(prev, ball.y, followSpeed, deltaTime));

    // --- ボールの物理演算実行 ---
    setBall((prevBall) => {
      let nextBall = { ...prevBall };
      nextBall.x += nextBall.vx;
      nextBall.y += nextBall.vy;

      // 1. 上下の壁バウンド
      if (nextBall.y - nextBall.radius < 0 || nextBall.y + nextBall.radius > CANVAS_HEIGHT) {
        nextBall.vy *= -1;
      }

      // 2. プレイヤーラケットとの衝突判定
      if (checkRacketCollision(nextBall, playerRacket)) {
        nextBall.x = playerRacket.x + playerRacket.width + nextBall.radius; // めり込み防止
        nextBall.vx = Math.abs(nextBall.vx) * 1.05; // 少し加速して右方向へ
        
        dispatch({ type: 'INCREMENT_RALLY' });
        createHitParticles(nextBall.x, nextBall.y, 'star');
        
        if ((gameState.rallyCount + 1) % 5 === 0) {
          nextBall = processBallEffects(nextBall);
        }
      }

      // 3. CPUラケットとの衝突判定 
      if (checkRacketCollision(nextBall, cpuRacket)) {
        nextBall.x = cpuRacket.x - nextBall.radius; // めり込み防止
        nextBall.vx = -Math.abs(nextBall.vx) * 1.05; // 左方向へ
        createHitParticles(nextBall.x, nextBall.y, 'normal');
      }

      // 4. 得点判定 
      if (nextBall.x < 0) {
        dispatch({ type: 'INCREMENT_CPU_SCORE' });
        return resetBall('player'); // 次はプレイヤーから
      } else if (nextBall.x > CANVAS_WIDTH) {
        dispatch({ type: 'INCREMENT_PLAYER_SCORE' });
        return resetBall('cpu');
      }

      return nextBall;
    });

    updateParticles(deltaTime);
    draw();
  });

  // ボールのリセット関数 (追加)
  const resetBall = (serveTo: 'player' | 'cpu'): Ball => ({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: serveTo === 'player' ? 5 : -5,
    vy: (Math.random() - 0.5) * 10,
    radius: BALL_RADIUS,
    type: 'normal',
    isReal: true,
    effectRemainingRallies: 0,
  });

  // --- 3. 描画ロジック ---
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
  
    // 1. 画面全体をクリア（真っ暗を防ぐために白やパステルカラーで塗る）
    ctx.fillStyle = '#FFF0F5'; // ラベンダーピンクの背景
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
    // 2. 卓球台を描画
    drawTable(ctx);
  
    // 3. ラケットとボールを描画
    drawRacket(ctx, playerRacket, '#FFB6C1', true); 
    drawRacket(ctx, cpuRacket, '#87CEEB', false);   
    drawBall(ctx, ball);
    
    // 4. パーティクル（キラキラ）の描画
    particles.forEach(p => drawParticle(ctx, p));
  };

  const drawTable = (ctx: CanvasRenderingContext2D) => {
    // 台の本体（ミントグリーン）
    ctx.fillStyle = '#98FB98'; 
    ctx.fillRect(100, 100, CANVAS_WIDTH - 200, CANVAS_HEIGHT - 200);
  
    // 外枠の白線
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(100, 100, CANVAS_WIDTH - 200, CANVAS_HEIGHT - 200);
  
    // センターネット（点線）
    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.moveTo(CANVAS_WIDTH / 2, 100);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100);
    ctx.stroke();
    ctx.setLineDash([]); // 点線を解除
  };

  const drawRacket = (ctx: CanvasRenderingContext2D, racket: Racket, color: string, isPlayer: boolean) => {
    ctx.save();
    // ラケット本体（角丸の長方形）
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(racket.x, racket.y, racket.width, racket.height, 10);
    ctx.fill();
    
    // プレイヤー専用の装飾（リボン）
  if (isPlayer) {
    ctx.fillStyle = '#FF69B4'; // リボン用の濃いピンク
    // 右持ちか左持ちかでリボンの位置を調整
    const ribbonX = racket.isRightHanded ? racket.x + racket.width : racket.x;
    
    // 簡易的なリボンの形状
    ctx.beginPath();
    ctx.arc(ribbonX, racket.y + 10, 8, 0, Math.PI * 2); // 上の輪
    ctx.arc(ribbonX, racket.y + 25, 8, 0, Math.PI * 2); // 下の輪
    ctx.fill();
    
    // 中央の結び目
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ribbonX - 3, racket.y + 15, 6, 6);
  }
  
  ctx.restore();
  };

  const drawBall = (ctx: CanvasRenderingContext2D, ball: Ball) => {
    ctx.save();
    
    // ボールの種類（type）によって見た目を変える
    switch (ball.type) {
      case 'strawberry':
        // イチゴの描画（赤くて種があるイメージ）
        ctx.fillStyle = '#FF6B9D';
        ctx.beginPath();
        ctx.ellipse(ball.x, ball.y, ball.radius, ball.radius * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'heart':
        // ハートの描画
        ctx.fillStyle = '#FFB6C1';
        const d = ball.radius;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y + d);
        ctx.bezierCurveTo(ball.x + d, ball.y - d, ball.x + d * 2, ball.y + d, ball.x, ball.y + d * 2);
        ctx.bezierCurveTo(ball.x - d * 2, ball.y + d, ball.x - d, ball.y - d, ball.x, ball.y + d);
        ctx.fill();
        break;
  
      default:
        // 通常のピンポン玉
        ctx.fillStyle = '#FFE5B4';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, p: any) => {
    ctx.save();
    ctx.globalAlpha = p.opacity || 1; // 透明度を適用
    ctx.fillStyle = p.color || '#FFF';
    
    // 星型または円形の描画
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="game-canvas" />;
};

export default GameCanvas;