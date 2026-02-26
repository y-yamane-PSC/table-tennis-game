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
import { Ball } from '../../types/ball';

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
    const difficultySettings = { easy: 0.5, normal: 0.8, hard: 1.0 }; // 例
    const followSpeed = difficultySettings[gameState.config.difficulty];
    setCpuRacket((prev) => updateCpuRacket(prev, ball.y, followSpeed, deltaTime));

    // ※ ここに衝突判定ロジック(updatePhysics等)を記述
    
    updateParticles(deltaTime);
    draw();
  });

  // --- 3. 描画ロジック ---
  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawTable(ctx);

    // データ(State)を渡して描画関数を呼ぶ
    drawRacket(ctx, playerRacket, '#FFB6C1'); // プレイヤー用ピンク
    drawRacket(ctx, cpuRacket, '#87CEEB');    // CPU用水色
    drawBall(ctx, ball);
    
    // パーティクルの描画
    particles.forEach(p => drawParticle(ctx, p));
  };

  const drawTable = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#98FB98'; // パステルグリーン
    ctx.fillRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);
    ctx.strokeStyle = '#FFFFFF';
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);
    ctx.setLineDash([]);
  };

  const drawRacket = (ctx: CanvasRenderingContext2D, racket: Racket, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(racket.x, racket.y, racket.width, racket.height, 10); // 丸みのあるボタン風
    ctx.fill();
  };

  const drawBall = (ctx: CanvasRenderingContext2D, ball: Ball) => {
    ctx.fillStyle = '#FFE5B4'; // 通常時のオレンジ
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, p: any) => {
    // パーティクルの描画ロジック
  };

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="game-canvas" />;
};

export default GameCanvas;