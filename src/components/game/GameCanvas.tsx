import React, { useRef, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useInput } from '../../hooks/useInput';
import { useParticles } from '../../hooks/useParticles';
import { useBallEffects } from '../../hooks/useBallEffects';
// physics.ts から更新関数をインポート
import { updatePlayerRacket, updateCpuRacketX } from '../../utils/physics';
import { CANVAS_WIDTH, CANVAS_HEIGHT, RACKET_BASE_WIDTH, RACKET_BASE_HEIGHT, BALL_RADIUS } from '../../utils/constants';
import { Racket, RACKET_TYPES } from '../../types/racket';
import { Ball } from '../../types/ball';

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
  const { gameState, setGameState } = useGame();
  const input = useInput();
  const { particles, createHitParticles, updateParticles } = useParticles();
  const { processBallEffects } = useBallEffects();
  const lastSpaceDownRef = useRef(false);
  const scoreLockRef = useRef(false); // 1得点=1点を保証（開発時の二重実行対策）

  // 卓球のプレイヤー視点（下=プレイヤー、上=CPU）用に横長ラケットにする
  const PADDLE_WIDTH = RACKET_BASE_HEIGHT; // 80
  const PADDLE_HEIGHT = RACKET_BASE_WIDTH; // 20

  // 疑似3D（高さ）用のパラメータ
  const GRAVITY_Z = -0.38; // 1フレームあたりの重力（z方向）
  const BOUNCE_Z = 0.62;   // 卓球台バウンドの反発係数
  const HIT_LIFT_Z = 7.5;  // 打球時に持ち上がる量
  const HITTABLE_Z = 80;   // 触れたら打ち返す（空中でも返せるように緩める）
  const MAX_Z = 140;       // 描画上の上限（暴れ防止）
  const Z_TO_SCREEN = 0.9; // z -> 画面上の持ち上げ係数

  const awardPoint = (winner: 'player' | 'cpu') => {
    if (scoreLockRef.current) return;
    scoreLockRef.current = true;
    setGameState(prev => ({
      ...prev,
      playerScore: winner === 'player' ? prev.playerScore + 1 : prev.playerScore,
      cpuScore: winner === 'cpu' ? prev.cpuScore + 1 : prev.cpuScore,
      rallyCount: 0,
    }));
  };
  const opponentOf = (side: 'player' | 'cpu') => (side === 'player' ? 'cpu' : 'player');

  const startServe = () => {
    // 次のサーブを確実に打てるように入力状態もリセット
    lastSpaceDownRef.current = false;
    setIsServe(true);
    setBall(resetBallToPlayerServe());
  };

  // 台（描画/物理で共通に使う）
  const TABLE_MARGIN_TOP = 90;
  const TABLE_MARGIN_BOTTOM = 60;
  const TABLE_TOP_Y = TABLE_MARGIN_TOP;
  const TABLE_BOTTOM_Y = CANVAS_HEIGHT - TABLE_MARGIN_BOTTOM;
  const NET_Y = (TABLE_TOP_Y + TABLE_BOTTOM_Y) / 2;
  const TABLE_TOP_WIDTH = CANVAS_WIDTH * 0.55;
  const TABLE_BOTTOM_WIDTH = CANVAS_WIDTH * 0.92;
  const TABLE_CENTER_X = CANVAS_WIDTH / 2;
  const TABLE_TOP_LEFT_X = TABLE_CENTER_X - TABLE_TOP_WIDTH / 2;
  const TABLE_TOP_RIGHT_X = TABLE_CENTER_X + TABLE_TOP_WIDTH / 2;
  const TABLE_BOTTOM_LEFT_X = TABLE_CENTER_X - TABLE_BOTTOM_WIDTH / 2;
  const TABLE_BOTTOM_RIGHT_X = TABLE_CENTER_X + TABLE_BOTTOM_WIDTH / 2;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const getTableXBoundsAtY = (y: number) => {
    const t = clamp01((y - TABLE_TOP_Y) / (TABLE_BOTTOM_Y - TABLE_TOP_Y));
    const leftX = lerp(TABLE_TOP_LEFT_X, TABLE_BOTTOM_LEFT_X, t);
    const rightX = lerp(TABLE_TOP_RIGHT_X, TABLE_BOTTOM_RIGHT_X, t);
    return { leftX, rightX };
  };
  const clampRacketToTable = (racket: Racket, side: 'player' | 'cpu') => {
    // ネットを跨いで相手コートに侵入できないようにする
    const NET_GAP = 10;

    // ラケットのYを台の範囲 + 自コート範囲に収める
    const tableMinY = TABLE_TOP_Y;
    const tableMaxY = TABLE_BOTTOM_Y - racket.height;

    const sideMinY = side === 'player' ? NET_Y + NET_GAP : tableMinY;
    const sideMaxY = side === 'player' ? tableMaxY : NET_Y - NET_GAP - racket.height;

    const minY = Math.max(tableMinY, sideMinY);
    const maxY = Math.min(tableMaxY, sideMaxY);
    const nextY = clamp(racket.y, minY, maxY);

    // そのY位置での台の左右境界に沿ってXをクランプ
    const { leftX, rightX } = getTableXBoundsAtY(nextY + racket.height / 2);
    const minX = leftX;
    const maxX = rightX - racket.width;
    const nextX = clamp(racket.x, minX, maxX);

    return { ...racket, x: nextX, y: nextY };
  };
  const isBallOutOfTable = (ballX: number, ballY: number, radius: number) => {
    // yが台の範囲外
    if (ballY - radius < TABLE_TOP_Y || ballY + radius > TABLE_BOTTOM_Y) return true;
    const { leftX, rightX } = getTableXBoundsAtY(ballY);
    // xが台の範囲外
    if (ballX - radius < leftX || ballX + radius > rightX) return true;
    return false;
  };

  const applyRacketAngle = (ball: Ball, racket: Racket) => {
    // ラケット中心からの相対位置で返球角度（vx）を決める
    const racketCenterX = racket.x + racket.width / 2;
    const offset = (ball.x - racketCenterX) / (racket.width / 2); // -1 .. 1
    const normalized = clamp(offset, -1, 1);

    // 端に当たるほど横方向が強くなる
    const MAX_VX = 9.5;
    const desiredVx = normalized * MAX_VX;

    // 今のvxも少し残して自然に
    ball.vx = ball.vx * 0.35 + desiredVx * 0.65;
  };

  // 「相手コートでバウンド」させるための着地点調整用
  const MIN_LAND_TIME = 10;
  const MAX_LAND_TIME = 60;
  const landVzForTime = (t: number) => Math.max(1, (-0.5 * GRAVITY_Z) * t);
  const pickLandingY = (side: 'cpu' | 'player') => {
    // それぞれのコート内（ネットから少し離れた位置）に着地点を置く
    if (side === 'cpu') return TABLE_TOP_Y + (NET_Y - TABLE_TOP_Y) * 0.62;
    return NET_Y + (TABLE_BOTTOM_Y - NET_Y) * 0.62;
  };
  const computeVzToLandOnOpponentCourt = (fromY: number, vy: number, opponent: 'cpu' | 'player') => {
    const targetY = pickLandingY(opponent);
    const rawT = (targetY - fromY) / vy;
    const t = Number.isFinite(rawT) ? Math.max(MIN_LAND_TIME, Math.min(MAX_LAND_TIME, rawT)) : 0;
    if (t <= 0) return HIT_LIFT_Z;
    return landVzForTime(t);
  };

  // --- 1. 状態(State)の定義 ---
  const [playerRacket, setPlayerRacket] = useState<Racket>({
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    // 卓球台の内側（手前側）に配置してCPUと同じ距離感にする
    y: TABLE_BOTTOM_Y - 30 - PADDLE_HEIGHT,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    stats: RACKET_TYPES.normal,
    isRightHanded: true,
    effectMultiplier: 1.0,
  });

  const [cpuRacket, setCpuRacket] = useState<Racket>({
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    // 卓球台の内側（奥側）に配置してラリーが成立するようにする
    y: TABLE_TOP_Y + 30,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    stats: RACKET_TYPES.normal,
    isRightHanded: false,
    effectMultiplier: 1.0,
  });

  // サーブ状態（プレイヤーサーブで開始）
  const [isServe, setIsServe] = useState(true);

  const [ball, setBall] = useState<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 60 - BALL_RADIUS - 6,
    vx: 0,
    vy: 0,
    z: 0,
    vz: 0,
    lastHitBy: 'player',
    bounceCount: 0,
    lastBounceSide: null,
    radius: BALL_RADIUS,
    type: 'normal',
    isReal: true,
    effectRemainingRallies: 0,
  });

  const resetBallToPlayerServe = (): Ball => ({
    x: playerRacket.x + playerRacket.width / 2,
    y: playerRacket.y - BALL_RADIUS - 6,
    vx: 0,
    vy: 0,
    z: 0,
    vz: 0,
    lastHitBy: 'player',
    bounceCount: 0,
    lastBounceSide: null,
    radius: BALL_RADIUS,
    type: 'normal',
    isReal: true,
    effectRemainingRallies: 0,
  });

  // --- 2. ゲームループ ---
  useGameLoop((deltaTime) => {
    if (!gameState.isGameActive || gameState.isPaused) {
      draw();
      return;
    }

    // プレイヤーの移動（左右のみを基本にする）
    const currentInput = {
      left: input.current['ArrowLeft'] || false,
      right: input.current['ArrowRight'] || false,
      up: input.current['ArrowUp'] || false,
      down: input.current['ArrowDown'] || false,
    };
    setPlayerRacket((prev) => clampRacketToTable(updatePlayerRacket(prev, currentInput, deltaTime), 'player'));

    // スペースキーの「押した瞬間」を検出
    const spaceDown = input.current[' '] || input.current['Space'] || input.current['Spacebar'] || false;
    const spaceJustPressed = spaceDown && !lastSpaceDownRef.current;
    lastSpaceDownRef.current = !!spaceDown;

    // サーブ中: ボールをラケットに付けたまま表示し、スペースで発射
    if (isServe) {
      setBall((prev) => ({
        ...prev,
        x: playerRacket.x + playerRacket.width / 2,
        y: playerRacket.y - prev.radius - 6,
        vx: 0,
        vy: 0,
        z: 0,
        vz: 0,
        lastHitBy: 'player',
        bounceCount: 0,
        lastBounceSide: null,
      }));

      if (spaceJustPressed) {
        // サーブ開始（奥方向へ）
        setIsServe(false);
        // 次のラリー開始 = 得点ロック解除
        scoreLockRef.current = false;
        setBall((prev) => {
          const serveVy = -6.2;
          const serveVx = (Math.random() - 0.5) * 3.2;
          const startY = playerRacket.y - prev.radius - 6;
          return {
            ...prev,
            x: playerRacket.x + playerRacket.width / 2,
            y: startY,
            vx: serveVx,
            vy: serveVy,
            z: 0,
            vz: computeVzToLandOnOpponentCourt(startY, serveVy, 'cpu'),
            lastHitBy: 'player',
            // 卓球: 打ち返した瞬間はバウンド回数をリセット（=0）
            bounceCount: 0,
            lastBounceSide: null,
          };
        });
      }

      updateParticles(deltaTime);
      draw();
      return;
    }

    // CPUの自動追従（X方向にボールを追う）
    const difficultySettings = { easy: 0.5, normal: 0.8, hard: 1.0 };
    const followSpeed = difficultySettings[gameState.config.difficulty];
    setCpuRacket((prev) => clampRacketToTable(updateCpuRacketX(prev, ball.x, followSpeed, deltaTime), 'cpu'));

    // --- ボールの物理演算 (ここが updatePhysics の中身になります) ---
    setBall((prevBall) => {
      let nextBall = { ...prevBall };
      nextBall.z = nextBall.z ?? 0;
      nextBall.vz = nextBall.vz ?? 0;
      nextBall.lastHitBy = nextBall.lastHitBy ?? 'player';
      nextBall.bounceCount = nextBall.bounceCount ?? 0;
      nextBall.lastBounceSide = nextBall.lastBounceSide ?? null;
      
      // ボールの移動
      nextBall.x += nextBall.vx;
      nextBall.y += nextBall.vy;
      // z方向（高さ）の移動（重力 + バウンド）
      nextBall.vz += GRAVITY_Z;
      nextBall.z += nextBall.vz;
      if (nextBall.z < 0) {
        // --- 卓球台にバウンド ---
        nextBall.z = 0;
        nextBall.vz = Math.abs(nextBall.vz) * BOUNCE_Z;

        const bounceSide: 'cpu' | 'player' = nextBall.y < NET_Y ? 'cpu' : 'player';
        nextBall.lastBounceSide = bounceSide;
        const nextBounceCount = (nextBall.bounceCount ?? 0) + 1;
        nextBall.bounceCount = nextBounceCount;

        // 卓球ルール:
        // 相手が打った球を打ち返す前にコート内で2回バウンドした場合、その時点で「打った側」の得点
        if (nextBounceCount >= 2) {
          const hitter = nextBall.lastHitBy ?? 'player';
          awardPoint(hitter);
          startServe();
          return resetBallToPlayerServe();
        }
      }
      if (nextBall.z > MAX_Z) {
        nextBall.z = MAX_Z;
        nextBall.vz *= 0.5;
      }

      // 1. アウト判定（卓球ルール反映）
      if (isBallOutOfTable(nextBall.x, nextBall.y, nextBall.radius)) {
        const hitter = nextBall.lastHitBy ?? 'player';
        const bounces = nextBall.bounceCount ?? 0;

        // 卓球ルール:
        // - 1度バウンドしたのちコート外に出て、相手が打ち返せなかった => 相手の失点（=打った側の得点）
        // - 1度もバウンドする前にコート外に出た => 最後に触れた側の失点（=反対側の得点）
        const winner = bounces >= 1 ? hitter : opponentOf(hitter);
        awardPoint(winner);
        startServe();
        return resetBallToPlayerServe(); // setBallのreturn値としても返す（即時反映）
      }

      // 2. プレイヤーラケット（手前・下）との衝突判定
      // 下方向に落ちてきた球だけを打てる（連続ヒット/めり込みによる逆反射を防ぐ）
      if ((nextBall.z ?? 0) <= HITTABLE_Z && nextBall.vy > 0 && checkRacketCollision(nextBall, playerRacket)) {
        nextBall.vy = -Math.abs(nextBall.vy) * 1.05; // 奥へ返して加速
        nextBall.y = playerRacket.y - nextBall.radius; // めり込み防止
        applyRacketAngle(nextBall, playerRacket);
        // 相手（CPU）コート側でバウンドするように高さ初速を調整
        nextBall.z = 0;
        nextBall.vz = computeVzToLandOnOpponentCourt(nextBall.y, nextBall.vy, 'cpu');
        nextBall.lastHitBy = 'player';
        // 卓球: 打ち返した瞬間はバウンド回数をリセット（=0）
        nextBall.bounceCount = 0;
        nextBall.lastBounceSide = null;
        
        // ラリー加算とボール変化判定
        setGameState(prev => ({ ...prev, rallyCount: prev.rallyCount + 1 }));
        createHitParticles(nextBall.x, nextBall.y, 'star');
        
        if ((gameState.rallyCount + 1) % 5 === 0) {
          nextBall = processBallEffects(nextBall);
        }
      }

      // 3. CPUラケット（奥・上）との衝突判定
      // 上方向に飛んできた球だけを打てる（連続ヒット/めり込みによる逆反射を防ぐ）
      if ((nextBall.z ?? 0) <= HITTABLE_Z && nextBall.vy < 0 && checkRacketCollision(nextBall, cpuRacket)) {
        // 相手（プレイヤー/赤）側に必ず打ち返す
        nextBall.vy = Math.abs(nextBall.vy) * 1.05; // 手前へ返して加速
        nextBall.y = cpuRacket.y + cpuRacket.height + nextBall.radius; // めり込み防止
        applyRacketAngle(nextBall, cpuRacket);
        // 相手（プレイヤー）コート側でバウンドするように高さ初速を調整
        nextBall.z = 0;
        nextBall.vz = computeVzToLandOnOpponentCourt(nextBall.y, nextBall.vy, 'player');
        nextBall.lastHitBy = 'cpu';
        // 卓球: 打ち返した瞬間はバウンド回数をリセット（=0）
        nextBall.bounceCount = 0;
        nextBall.lastBounceSide = null;
        createHitParticles(nextBall.x, nextBall.y, 'normal');
      }

      return nextBall;
    });

    // パーティクル更新と描画
    updateParticles(deltaTime);
    draw(); 
  });

  // NOTE: サーブ仕様（プレイヤーサーブ固定）に合わせ、リセットは resetBallToPlayerServe を使用する

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
    drawBallTrajectory(ctx, ball);
    drawBall(ctx, ball);
    
    // 4. パーティクル（キラキラ）の描画
    particles.forEach(p => drawParticle(ctx, p));
  };

  const drawTable = (ctx: CanvasRenderingContext2D) => {
    // 卓球台を「プレイヤー視点」っぽく見せるために台形で描く
    const marginTop = TABLE_MARGIN_TOP;
    const marginBottom = TABLE_MARGIN_BOTTOM;
    const topWidth = TABLE_TOP_WIDTH;
    const bottomWidth = TABLE_BOTTOM_WIDTH;
    const centerX = TABLE_CENTER_X;
    const topY = marginTop;
    const bottomY = CANVAS_HEIGHT - marginBottom;
    const topLeftX = TABLE_TOP_LEFT_X;
    const topRightX = TABLE_TOP_RIGHT_X;
    const bottomLeftX = TABLE_BOTTOM_LEFT_X;
    const bottomRightX = TABLE_BOTTOM_RIGHT_X;

    // 台の本体（卓球台っぽいブルー）
    ctx.fillStyle = '#2F6FB6';
    ctx.beginPath();
    ctx.moveTo(topLeftX, topY);
    ctx.lineTo(topRightX, topY);
    ctx.lineTo(bottomRightX, bottomY);
    ctx.lineTo(bottomLeftX, bottomY);
    ctx.closePath();
    ctx.fill();

    // 外枠の白線
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    // センターライン（奥行き方向）
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, topY);
    ctx.lineTo(centerX, bottomY);
    ctx.stroke();

    // ネット（横方向・中央）
    const netY = NET_Y;
    const netHalfWidth = ((topWidth + bottomWidth) / 2) * 0.52;
    ctx.strokeStyle = '#1B1B1B';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(centerX - netHalfWidth, netY);
    ctx.lineTo(centerX + netHalfWidth, netY);
    ctx.stroke();

    // ネットの網（点線）
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(centerX - netHalfWidth, netY + 2);
    ctx.lineTo(centerX + netHalfWidth, netY + 2);
    ctx.stroke();
    ctx.setLineDash([]);
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
      
      // 簡易的なリボンの形状 (racket.yに追従するよう修正)
      ctx.beginPath();
      // 横長ラケットなので、リボンは端に小さく付ける
      ctx.arc(ribbonX, racket.y + racket.height / 2, 7, 0, Math.PI * 2);
      ctx.fill();
      
      // 中央の結び目
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ribbonX - 3, racket.y + racket.height / 2 - 3, 6, 6);
    }
  
    ctx.restore();
  };

  const drawBall = (ctx: CanvasRenderingContext2D, ball: Ball) => {
    ctx.save();

    const z = ball.z ?? 0;
    const visualY = ball.y - z * Z_TO_SCREEN;
    const scale = 1 + z / 180;
    const r = ball.radius * scale;

    // 影（台の平面上）
    const shadowAlpha = Math.max(0.15, 0.55 - z / 220);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + ball.radius * 0.6, r * 1.05, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // ボールの種類（type）によって見た目を変える
    switch (ball.type) {
      case 'strawberry':
        // イチゴの描画（赤くて種があるイメージ）
        ctx.fillStyle = '#FF6B9D';
        ctx.beginPath();
        ctx.ellipse(ball.x, visualY, r, r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'heart':
        // ハートの描画
        ctx.fillStyle = '#FFB6C1';
        const d = r;
        ctx.beginPath();
        ctx.moveTo(ball.x, visualY + d);
        ctx.bezierCurveTo(ball.x + d, visualY - d, ball.x + d * 2, visualY + d, ball.x, visualY + d * 2);
        ctx.bezierCurveTo(ball.x - d * 2, visualY + d, ball.x - d, visualY - d, ball.x, visualY + d);
        ctx.fill();
        break;
  
      default:
        // 通常のピンポン玉
        ctx.fillStyle = '#FFE5B4';
        ctx.beginPath();
        ctx.arc(ball.x, visualY, r, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
  };

  /**
   * 放物線の「軌道」を点線で描画（視認性のため）
   * 未来の数フレームを簡易シミュレーションして、zを含めた位置を描く
   */
  const drawBallTrajectory = (ctx: CanvasRenderingContext2D, ball: Ball) => {
    if (!gameState.isGameActive) return;

    const steps = 26;
    const stepDt = 1; // 現状の実装はdeltaTimeをボール移動に使っていないので、1固定で合わせる

    let x = ball.x;
    let y = ball.y;
    let vx = ball.vx;
    let vy = ball.vy;
    let z = ball.z ?? 0;
    let vz = ball.vz ?? 0;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();

    for (let i = 0; i < steps; i++) {
      x += vx * stepDt;
      y += vy * stepDt;
      vz += GRAVITY_Z * stepDt;
      z += vz * stepDt;
      if (z < 0) {
        z = 0;
        vz = Math.abs(vz) * BOUNCE_Z;
      }
      if (x < BALL_RADIUS) {
        x = BALL_RADIUS;
        vx *= -1;
      } else if (x > CANVAS_WIDTH - BALL_RADIUS) {
        x = CANVAS_WIDTH - BALL_RADIUS;
        vx *= -1;
      }

      const visualY = y - z * Z_TO_SCREEN;
      if (i === 0) ctx.moveTo(x, visualY);
      else ctx.lineTo(x, visualY);
    }

    ctx.stroke();
    ctx.setLineDash([]);
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