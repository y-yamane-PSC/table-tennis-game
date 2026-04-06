import React, { useRef, useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useInput } from '../../hooks/useInput';
import { useParticles } from '../../hooks/useParticles';
import { BallType } from '../../types/game';
// physics.ts から更新関数をインポート
import { updatePlayerRacket, updateCpuRacketX } from '../../utils/physics';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_RADIUS, SMASH_SPEED_MULTIPLIER } from '../../utils/constants';
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

interface HeartClone {
  x: number; y: number; vx: number; vy: number;
  z: number; vz: number;
  active: boolean; isBurst: boolean; burstTimer: number;
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, setGameState } = useGame();
  const input = useInput();
  const { particles, createHitParticles, updateParticles } = useParticles();
  const lastSpaceDownRef = useRef(false);
  const smashBufferRef = useRef(0); // スマッシュ判定のタイミング猶予
  const smashEffectRef = useRef({ active: false, x: 0, y: 0, timer: 0 }); // スマッシュ演出用
  const scoreLockRef = useRef(false); // 1得点=1点を保証（開発時の二重実行対策）

  // ボール変化用カウンタ・エフェクト管理
  const shotCountRef = useRef(0);          // 総ショット数（5の倍数でボール変化）
  const playerSBRemRef = useRef(0);        // イチゴ効果: プレイヤー当たり判定1.2倍の残りショット数
  const playerCandyRemRef = useRef(0);     // キャンディ被弾: プレイヤー当たり判定0.8倍の残りショット数
  const cpuSBRemRef = useRef(0);           // イチゴ効果: CPU当たり判定1.2倍の残りショット数
  const cpuCandyRemRef = useRef(0);        // キャンディ被弾: CPU当たり判定0.8倍の残りショット数
  const ballEffectRemRef = useRef(0);      // 現在のボールタイプが続く残りショット数
  const heartClonesRef = useRef<HeartClone[]>([]);  // ハート分身ボール
  const ballSparkleRef = useRef({ active: false, x: 0, y: 0, timer: 0 }); // キラリ演出
  const ballMsgRef = useRef<{ text: string; timer: number } | null>(null); // 画面中央メッセージ

  // 疑似3D（高さ）用のパラメータ
  const GRAVITY_Z = -0.38; // 1フレームあたりの重力（z方向）
  const BOUNCE_Z = 0.62;   // 卓球台バウンドの反発係数
  const HIT_LIFT_Z = 7.5;  // 打球時に持ち上がる量
  const HITTABLE_Z = 80;   // 触れたら打ち返す（空中でも返せるように緩める）
  const MAX_Z = 140;       // 描画上の上限（暴れ防止）
  const Z_TO_SCREEN = 0.9; // z -> 画面上の持ち上げ係数

  // ラケット画像のプリロード
  const racketImages = useRef<Record<string, HTMLImageElement>>({}).current;
  useEffect(() => {
    if (!racketImages['normal']) {
      const normalImg = new Image(); normalImg.src = './images/normal.png'; racketImages['normal'] = normalImg;
      const speedImg = new Image(); speedImg.src = './images/power.png'; racketImages['power'] = speedImg;
      const wideImg = new Image(); wideImg.src = './images/wide.png'; racketImages['wide'] = wideImg;
    }
  }, [racketImages]);

  // ---- ボールエフェクト ヘルパー関数 ----
  const resetBallEffects = () => {
    shotCountRef.current = 0;
    playerSBRemRef.current = 0;
    playerCandyRemRef.current = 0;
    cpuSBRemRef.current = 0;
    cpuCandyRemRef.current = 0;
    ballEffectRemRef.current = 0;
    heartClonesRef.current = [];
    ballSparkleRef.current = { active: false, x: 0, y: 0, timer: 0 };
    ballMsgRef.current = null;
  };
  const getPlayerHitboxMult = () => {
    const sb = playerSBRemRef.current > 0 ? 1.2 : 1.0;
    const candy = playerCandyRemRef.current > 0 ? 0.8 : 1.0;
    return sb * candy;
  };
  const getCpuHitboxMult = () => {
    const sb = cpuSBRemRef.current > 0 ? 1.2 : 1.0;
    const candy = cpuCandyRemRef.current > 0 ? 0.8 : 1.0;
    return sb * candy;
  };
  /** 全エフェクトのショットカウンタを1デクリメント */
  const onShotDecrement = () => {
    if (playerSBRemRef.current > 0) playerSBRemRef.current--;
    if (playerCandyRemRef.current > 0) playerCandyRemRef.current--;
    if (cpuSBRemRef.current > 0) cpuSBRemRef.current--;
    if (cpuCandyRemRef.current > 0) cpuCandyRemRef.current--;
  };
  /** 5の倍数ショットでボールタイプをランダム変化し、エフェクトを設定する */
  const applyBallTypeChange = (nextBall: Ball, hitter: 'player' | 'cpu') => {
    shotCountRef.current++;
    if (shotCountRef.current % 5 !== 0) {
      onShotDecrement();
      if (ballEffectRemRef.current > 0) {
        ballEffectRemRef.current--;
        if (ballEffectRemRef.current === 0 && nextBall.type !== 'normal') {
          nextBall.type = 'normal';
        }
      }
      return;
    }
    // 5の倍数: ランダムにボール変化
    const types: BallType[] = ['strawberry', 'heart', 'star', 'candy', 'ribbon'];
    const newType = types[Math.floor(Math.random() * types.length)];
    nextBall.type = newType;
    // 2往復(4ショット)か1往復(2ショット)を"残り5 or 3"で管理
    // (このショット自体をカウントした後デクリメントするため+1)
    const remBase = (newType === 'strawberry' || newType === 'candy') ? 5 : 3;
    ballEffectRemRef.current = remBase;

    switch (newType) {
      case 'strawberry':
        if (hitter === 'player') {
          playerSBRemRef.current = remBase;
          ballMsgRef.current = { text: 'ボールがうちやすくなったよ！', timer: 150 };
        } else {
          cpuSBRemRef.current = remBase;
        }
        break;
      case 'candy':
        if (hitter === 'player') {
          // プレイヤーが打つ → 相手(CPU)の当たり判定0.8倍
          cpuCandyRemRef.current = remBase;
        } else {
          // CPUが打つ → 相手(プレイヤー)の当たり判定0.8倍
          playerCandyRemRef.current = remBase;
          ballMsgRef.current = { text: 'ボールがうちにくくなったよ！', timer: 150 };
        }
        break;
      // heart は呼び出し元でクローン生成が必要なので個別対応
      // star / ribbon は特別な事前セットアップ不要
      default:
        break;
    }
    onShotDecrement();
    if (ballEffectRemRef.current > 0) {
      ballEffectRemRef.current--;
      if (ballEffectRemRef.current === 0 && nextBall.type !== 'normal') {
        nextBall.type = 'normal';
      }
    }
  };
  // ---- ここまでヘルパー ----

  const awardPoint = (winner: 'player' | 'cpu') => {
    if (scoreLockRef.current) return;
    scoreLockRef.current = true;
    resetBallEffects();
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
  const pickLandingY = (side: 'cpu' | 'player', vy: number = 0) => {
    // 相手コート内の着地点。スピードが速いほど、より奥（ベースライン寄り）を狙う
    const speed = Math.abs(vy);
    const depthRatio = Math.max(0.15, 0.62 - (speed / 25) * 0.47); 
    if (side === 'cpu') return TABLE_TOP_Y + (NET_Y - TABLE_TOP_Y) * depthRatio;
    return NET_Y + (TABLE_BOTTOM_Y - NET_Y) * (1 - depthRatio);
  };
  const computeVzToLandOnOpponentCourt = (fromY: number, vy: number, opponent: 'cpu' | 'player') => {
    const targetY = pickLandingY(opponent, vy);
    const rawT = (targetY - fromY) / vy;
    const t = Number.isFinite(rawT) ? Math.max(MIN_LAND_TIME, Math.min(MAX_LAND_TIME, rawT)) : 0;
    if (t <= 0) return HIT_LIFT_Z;
    
    let vz = landVzForTime(t);
    
    // ネットを越える高度(z>=13)を確実に保証する
    const tNet = (NET_Y - fromY) / vy;
    if (tNet > 0) {
      // z(t) = vz * t + 0.5 * GRAVITY_Z * t^2 >= 13
      const minVz = (13 / tNet) - 0.5 * GRAVITY_Z * tNet;
      if (vz < minVz) vz = minVz;
    }
    return vz;
  };

  // 選択されたラケットのタイプとステータスを取得
  const currentRacketType = gameState.config?.racketType || 'normal';
  const currentRacketStats = RACKET_TYPES[currentRacketType];

  // 卓球のプレイヤー視点（下=プレイヤー、上=CPU）に合わせて直感的なサイズに変更しました
  const PADDLE_WIDTH = currentRacketStats.hitBoxWidth; // 横幅(長さ)
  const PADDLE_HEIGHT = currentRacketStats.hitBoxHeight; // 厚み

  // --- 1. 状態(State)の定義 ---
  const [playerRacket, setPlayerRacket] = useState<Racket>({
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    // 卓球台の内側（手前側）に配置してCPUと同じ距離感にする
    y: TABLE_BOTTOM_Y - 30 - PADDLE_HEIGHT,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    stats: currentRacketStats,
    isRightHanded: true,
    effectMultiplier: 1.0,
  });

  const CPU_PADDLE_WIDTH = RACKET_TYPES.normal.hitBoxWidth;
  const CPU_PADDLE_HEIGHT = RACKET_TYPES.normal.hitBoxHeight;

  const [cpuRacket, setCpuRacket] = useState<Racket>({
    x: CANVAS_WIDTH / 2 - CPU_PADDLE_WIDTH / 2,
    // 卓球台の内側（奥側）に配置してラリーが成立するようにする
    y: TABLE_TOP_Y + 30,
    width: CPU_PADDLE_WIDTH,
    height: CPU_PADDLE_HEIGHT,
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
    y: playerRacket.y + playerRacket.height * 0.4,
    vx: 0,
    vy: 0,
    z: 0,
    vz: 0,
    lastHitBy: 'player',
    bounceCount: 0,
    lastBounceSide: null,
    isNetFault: false,
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

    // スペースキーが押された瞬間から15フレーム（約250ms）だけスマッシュ可能にする（タイミング判定）
    if (spaceJustPressed && !isServe) {
      smashBufferRef.current = 15;
    }
    if (smashBufferRef.current > 0) {
      smashBufferRef.current--;
    }

    // サーブ中: ボールをラケットに付けたまま表示し、スペースで発射
    if (isServe) {
      setBall((prev) => ({
        ...prev,
        x: playerRacket.x + playerRacket.width / 2,
        y: playerRacket.y + playerRacket.height * 0.4,
        vx: 0,
        vy: 0,
        z: 0,
        vz: 0,
        lastHitBy: 'player',
        bounceCount: 0,
        lastBounceSide: null,
        isNetFault: false,
      }));

      if (spaceJustPressed) {
        // サーブ開始（奥方向へ）
        setIsServe(false);
        // 次のラリー開始 = 得点ロック解除
        scoreLockRef.current = false;
        setBall((prev) => {
          const serveVy = -6.2;
          const serveVx = (Math.random() - 0.5) * 3.2;
          const startY = playerRacket.y + playerRacket.height * 0.4;
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
            isNetFault: false,
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
      nextBall.isNetFault = nextBall.isNetFault ?? false;
      
      // ボールの移動
      nextBall.x += nextBall.vx;
      nextBall.y += nextBall.vy;
      // z方向（高さ）の移動（重力 + バウンド）
      nextBall.vz += GRAVITY_Z;
      nextBall.z += nextBall.vz;

      // --- ネット衝突判定 ---
      // 今回のフレームで、ボールがネット(NET_Y)をまたいだかどうか
      const crossedNet = (prevBall.y <= NET_Y && nextBall.y > NET_Y) || 
                         (prevBall.y >= NET_Y && nextBall.y < NET_Y);
      
      // ネットの横幅の判定
      const tableWidthAtNet = (TABLE_TOP_WIDTH + TABLE_BOTTOM_WIDTH) / 2;
      const netLeftBound = TABLE_CENTER_X - (tableWidthAtNet / 2) + 6;
      const netRightBound = TABLE_CENTER_X + (tableWidthAtNet / 2) - 6;

      // 見た目のネットは高いまま、ボールの当たり判定（z座標）だけを下げてシビアさを緩和する（38 -> 12）
      if (crossedNet && nextBall.x >= netLeftBound && nextBall.x <= netRightBound && nextBall.z < 12 && !nextBall.isNetFault) {
        // ネット衝突！
        nextBall.isNetFault = true;
        // 大きく減速して手前のコート内にポトリと落ちて転がる動作
        nextBall.vy = -nextBall.vy * 0.15; // 少しだけ跳ね返る
        nextBall.vx *= 0.15;               // 横方向の勢いも殺す
        nextBall.vz *= 0.3;                // 上下方向の勢いも殺す
      }
      // ----------------------
      if (nextBall.z < 0) {
        // --- 卓球台にバウンド ---
        nextBall.z = 0;
        nextBall.vz = Math.abs(nextBall.vz) * BOUNCE_Z;

        const bounceSide: 'cpu' | 'player' = nextBall.y < NET_Y ? 'cpu' : 'player';
        const isOpponentCourt = bounceSide !== (nextBall.lastHitBy ?? 'player');

        // リボン: 相手コートバウンド時に左右45度にランダム変化
        if (nextBall.type === 'ribbon' && isOpponentCourt) {
          const deflectDir = Math.random() < 0.5 ? 1 : -1;
          nextBall.vx = deflectDir * Math.abs(nextBall.vy);
        }

        // ハート: 相手コートバウンド時に「キラリ」演出（本物のみ）
        if (nextBall.type === 'heart' && isOpponentCourt) {
          ballSparkleRef.current = { active: true, x: nextBall.x, y: nextBall.y, timer: 25 };
        }

        nextBall.lastBounceSide = bounceSide;
        const nextBounceCount = (nextBall.bounceCount ?? 0) + 1;
        nextBall.bounceCount = nextBounceCount;

        // 卓球ルール:
        // 相手が打った球を打ち返す前にコート内で2回バウンドした場合、その時点で「打った側」の得点
        if (nextBounceCount >= 2) {
          const hitter = nextBall.lastHitBy ?? 'player';
          if (nextBall.isNetFault) {
            // ネットフォルト（＝自分のコートに引っかかった等）の場合は相手の得点
            awardPoint(opponentOf(hitter));
          } else {
            awardPoint(hitter);
          }
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
        // - 1度バウンドしたのちコート外に出た => 最後に触れた側(hitter)の得点
        // - 1度もバウンドする前にコート外に直接出た => hitterの失点（＝相手の得点）
        let winner = bounces >= 1 ? hitter : opponentOf(hitter);
        
        // もしネットフォルトの状態で外に転がり出た場合は、相手の得点で上書きする
        if (nextBall.isNetFault) {
          winner = opponentOf(hitter);
        }

        awardPoint(winner);
        startServe();
        return resetBallToPlayerServe(); // setBallのreturn値としても返す（即時反映）
      }

      // 2. プレイヤーラケット（手前・下）との衝突判定
      // 当たり判定エフェクト倍率を考慮した実効ラケット幅でAABB判定
      {
        const pMult = getPlayerHitboxMult();
        const pEffW = playerRacket.width * pMult;
        const effPlayer: Racket = {
          ...playerRacket,
          x: playerRacket.x - (pEffW - playerRacket.width) / 2,
          width: pEffW,
        };
        if ((nextBall.z ?? 0) <= HITTABLE_Z && nextBall.vy > 0 && checkRacketCollision(nextBall, effPlayer)) {
          // タイミングよくスペースを直近で押していればスマッシュ発動！
          let isSmashing = false;
          if (smashBufferRef.current > 0) {
            isSmashing = true;
            smashBufferRef.current = 0;
            smashEffectRef.current = { active: true, x: nextBall.x, y: nextBall.y, timer: 45 };
          }

          // 星ボールのスマッシュ: 速度1.5倍ボーナス
          const starMult = (nextBall.type === 'star' && isSmashing) ? 1.5 : 1.0;

          // スマッシュの速度計算（リモートの速度調整を採用: -9倍率、上限-14）
          let nextVy = 0;
          if (isSmashing) {
            const baseSmashVelocity = -9 * SMASH_SPEED_MULTIPLIER;
            nextVy = baseSmashVelocity * playerRacket.stats.smashSpeed * starMult;
          } else {
            nextVy = -Math.abs(nextBall.vy) * 1.05;
          }

          nextBall.vy = Math.max(nextVy, -14);
          nextBall.y = effPlayer.y - nextBall.radius;
          applyRacketAngle(nextBall, playerRacket);
          nextBall.z = 0;
          nextBall.vz = computeVzToLandOnOpponentCourt(nextBall.y, nextBall.vy, 'cpu');
          nextBall.lastHitBy = 'player';
          nextBall.bounceCount = 0;
          nextBall.lastBounceSide = null;
          nextBall.isNetFault = false;

          setGameState(prev => ({ ...prev, rallyCount: prev.rallyCount + 1 }));
          createHitParticles(nextBall.x, nextBall.y, isSmashing ? 'star' : 'normal');

          // ハート: 分身クローンを生成（ボールタイプ変化前に現在の速度を使う）
          const prevType = nextBall.type;
          applyBallTypeChange(nextBall, 'player');

          if (nextBall.type === 'heart' && prevType !== 'heart') {
            // 打った直後の速度で±30度に分身
            const ang = 30 * Math.PI / 180;
            const c30 = Math.cos(ang), s30 = Math.sin(ang);
            heartClonesRef.current = [
              {
                x: nextBall.x, y: nextBall.y, z: nextBall.z ?? 0, vz: nextBall.vz ?? 0,
                vx: nextBall.vx * c30 + nextBall.vy * s30,
                vy: -nextBall.vx * s30 + nextBall.vy * c30,
                active: true, isBurst: false, burstTimer: 0,
              },
              {
                x: nextBall.x, y: nextBall.y, z: nextBall.z ?? 0, vz: nextBall.vz ?? 0,
                vx: nextBall.vx * c30 - nextBall.vy * s30,
                vy: nextBall.vx * s30 + nextBall.vy * c30,
                active: true, isBurst: false, burstTimer: 0,
              },
            ];
          }
        }
      }

      // 3. CPUラケット（奥・上）との衝突判定
      {
        const cMult = getCpuHitboxMult();
        const cEffW = cpuRacket.width * cMult;
        const effCpu: Racket = {
          ...cpuRacket,
          x: cpuRacket.x - (cEffW - cpuRacket.width) / 2,
          width: cEffW,
        };
        if ((nextBall.z ?? 0) <= HITTABLE_Z && nextBall.vy < 0 && checkRacketCollision(nextBall, effCpu)) {
          nextBall.vy = Math.abs(nextBall.vy) * 1.05;
          nextBall.y = cpuRacket.y + cpuRacket.height + nextBall.radius;
          applyRacketAngle(nextBall, cpuRacket);
          nextBall.z = 0;
          nextBall.vz = computeVzToLandOnOpponentCourt(nextBall.y, nextBall.vy, 'player');
          nextBall.lastHitBy = 'cpu';
          nextBall.bounceCount = 0;
          nextBall.lastBounceSide = null;
          nextBall.isNetFault = false;
          createHitParticles(nextBall.x, nextBall.y, 'normal');

          setGameState(prev => ({ ...prev, rallyCount: prev.rallyCount + 1 }));

          const prevTypeCpu = nextBall.type;
          applyBallTypeChange(nextBall, 'cpu');

          if (nextBall.type === 'heart' && prevTypeCpu !== 'heart') {
            const ang = 30 * Math.PI / 180;
            const c30 = Math.cos(ang), s30 = Math.sin(ang);
            heartClonesRef.current = [
              {
                x: nextBall.x, y: nextBall.y, z: nextBall.z ?? 0, vz: nextBall.vz ?? 0,
                vx: nextBall.vx * c30 + nextBall.vy * s30,
                vy: -nextBall.vx * s30 + nextBall.vy * c30,
                active: true, isBurst: false, burstTimer: 0,
              },
              {
                x: nextBall.x, y: nextBall.y, z: nextBall.z ?? 0, vz: nextBall.vz ?? 0,
                vx: nextBall.vx * c30 - nextBall.vy * s30,
                vy: nextBall.vx * s30 + nextBall.vy * c30,
                active: true, isBurst: false, burstTimer: 0,
              },
            ];
          }
        }
      }

      return nextBall;
    });

    // ハートクローンの物理更新
    if (heartClonesRef.current.length > 0) {
      heartClonesRef.current = heartClonesRef.current.map(cl => {
        if (!cl.active) return cl;
        if (cl.isBurst) {
          const t = cl.burstTimer - 1;
          return { ...cl, burstTimer: t, active: t > 0 };
        }
        let c = { ...cl };
        c.x += c.vx;
        c.y += c.vy;
        c.vz = (c.vz ?? 0) + GRAVITY_Z;
        c.z = (c.z ?? 0) + c.vz;
        if (c.z < 0) { c.z = 0; c.vz = Math.abs(c.vz ?? 0) * BOUNCE_Z; }

        // テーブル外に出たら消去
        if (c.y < TABLE_TOP_Y - 100 || c.y > TABLE_BOTTOM_Y + 100) return { ...c, active: false };

        // ラケットにぶつかったらはじける演出
        const colCpu = c.vy < 0 && (c.z ?? 0) <= HITTABLE_Z &&
          c.x + BALL_RADIUS > cpuRacket.x && c.x - BALL_RADIUS < cpuRacket.x + cpuRacket.width &&
          c.y + BALL_RADIUS > cpuRacket.y && c.y - BALL_RADIUS < cpuRacket.y + cpuRacket.height;
        const colPlayer = c.vy > 0 && (c.z ?? 0) <= HITTABLE_Z &&
          c.x + BALL_RADIUS > playerRacket.x && c.x - BALL_RADIUS < playerRacket.x + playerRacket.width &&
          c.y + BALL_RADIUS > playerRacket.y && c.y - BALL_RADIUS < playerRacket.y + playerRacket.height;
        if (colCpu || colPlayer) return { ...c, isBurst: true, burstTimer: 20, vx: 0, vy: 0, vz: 0 };

        return c;
      });
    }

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
    drawRacket(ctx, cpuRacket, '#87CEEB', false); // 奥のCPUを手前に  
    
    drawBallTrajectory(ctx, ball);
    drawBall(ctx, ball);

    // プレイヤーラケットは一番手前に（ボールに被さる）
    if (isServe) {
      ctx.globalAlpha = 0.6; // サーブ時はボールが透けて見えるように
    }
    drawRacket(ctx, playerRacket, '#FFB6C1', true, currentRacketType); 
    ctx.globalAlpha = 1.0;
    
    // 4. パーティクル（キラキラ）の描画
    particles.forEach(p => drawParticle(ctx, p));

    // 5. スマッシュテキスト演出の描画
    if (smashEffectRef.current.active && smashEffectRef.current.timer > 0) {
      const effect = smashEffectRef.current;
      effect.timer--;
      ctx.save();
      
      // 経過時間に応じて上に浮かびながらフェードアウト・拡大
      const progress = 1 - (effect.timer / 45); // 0 から 1 に向かう
      const scale = 1 + progress * 0.7;         // 最大1.7倍に拡大
      const alpha = effect.timer > 15 ? 1 : effect.timer / 15; // 終盤で消える
      
      ctx.globalAlpha = alpha;
      ctx.translate(effect.x, effect.y - progress * 80); // 上に昇る
      ctx.scale(scale, scale);
      
      // テキスト描画スタイル（太めでインパクトを出す）
      ctx.font = '900 42px "Arial Black", impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 後ろの赤い光彩（グロー効果）
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 20;
      
      // 白い太めの縁取り
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.strokeText('SMASH!!', 0, 0);
      
      // 中身（燃えるようなオレンジ〜赤）
      ctx.shadowBlur = 0; // テキスト中身には影不要
      ctx.fillStyle = '#FF2400';
      ctx.fillText('SMASH!!', 0, 0);
      
      ctx.restore();
    }

    // 6. ハートクローンの描画
    for (const cl of heartClonesRef.current) {
      if (!cl.active) continue;
      const clZ = cl.z ?? 0;
      const clVisualY = cl.y - clZ * Z_TO_SCREEN;
      if (cl.isBurst) {
        // はじける演出: 外側に広がるハートの破片
        const prog = 1 - cl.burstTimer / 20;
        ctx.save();
        ctx.globalAlpha = Math.max(0, cl.burstTimer / 20);
        ctx.fillStyle = '#FFB6C1';
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const dist = prog * 28;
          ctx.beginPath();
          ctx.arc(cl.x + Math.cos(ang) * dist, clVisualY + Math.sin(ang) * dist, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        // 偽物のハートを半透明で描画
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#FFB6C1';
        const rd = BALL_RADIUS;
        ctx.beginPath();
        ctx.moveTo(cl.x, clVisualY + rd);
        ctx.bezierCurveTo(cl.x + rd, clVisualY - rd, cl.x + rd * 2, clVisualY + rd, cl.x, clVisualY + rd * 2);
        ctx.bezierCurveTo(cl.x - rd * 2, clVisualY + rd, cl.x - rd, clVisualY - rd, cl.x, clVisualY + rd);
        ctx.fill();
        ctx.restore();
      }
    }

    // 7. ハートのキラリ演出（本物ボール相手コートバウンド時）
    if (ballSparkleRef.current.active && ballSparkleRef.current.timer > 0) {
      const sp = ballSparkleRef.current;
      sp.timer--;
      if (sp.timer === 0) sp.active = false;
      const spAlpha = sp.timer / 25;
      ctx.save();
      ctx.globalAlpha = spAlpha;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const inner = 8;
        const outer = 8 + (1 - spAlpha) * 18;
        ctx.beginPath();
        ctx.moveTo(sp.x + Math.cos(ang) * inner, sp.y + Math.sin(ang) * inner);
        ctx.lineTo(sp.x + Math.cos(ang) * outer, sp.y + Math.sin(ang) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. ボール変化メッセージ（画面中央）
    if (ballMsgRef.current && ballMsgRef.current.timer > 0) {
      ballMsgRef.current.timer--;
      const msg = ballMsgRef.current;
      const fadeAlpha = Math.min(1.0, msg.timer / 30);
      const riseY = CANVAS_HEIGHT / 2 - (1 - msg.timer / 150) * 30;
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      ctx.font = '700 36px "Zen Maru Gothic", "M PLUS Rounded 1c", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.strokeText(msg.text, CANVAS_WIDTH / 2, riseY);
      ctx.fillStyle = '#FF69B4';
      ctx.fillText(msg.text, CANVAS_WIDTH / 2, riseY);
      ctx.restore();
      if (msg.timer === 0) ballMsgRef.current = null;
    }
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

    // --- 3Dネットの描画 ---
    const netY = NET_Y;
    // ネット位置（中央）における卓球台の全幅
    const tableWidthAtNet = (topWidth + bottomWidth) / 2;
    // はみ出さないよう、台の幅の半分より少し内側(-6px)に両端のポストを設置
    const netHalfWidth = (tableWidthAtNet / 2) - 6;
    const netHeight = 40; // 存在感が出るよう高さをアップ
    const netLeft = centerX - netHalfWidth;
    const netRight = centerX + netHalfWidth;

    // 1. ネットのベース（半透明の網部分）
    ctx.fillStyle = 'rgba(200, 200, 220, 0.25)';
    ctx.fillRect(netLeft, netY - netHeight, netRight - netLeft, netHeight);

    // 2. ネットの網目（縦と横のラインでクロスハッチ表現）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // 横糸（高さに応じて本数を自動調整）
    const numHorizontals = Math.floor(netHeight / 6);
    for (let i = 1; i < numHorizontals; i++) {
        const yLine = netY - netHeight + i * (netHeight / numHorizontals);
        ctx.moveTo(netLeft, yLine);
        ctx.lineTo(netRight, yLine);
    }
    // 縦糸
    const numVerticals = Math.floor((netRight - netLeft) / 8); 
    const stepX = (netRight - netLeft) / numVerticals;
    for (let i = 1; i < numVerticals; i++) {
        const xLine = netLeft + i * stepX;
        ctx.moveTo(xLine, netY - netHeight);
        ctx.lineTo(xLine, netY);
    }
    ctx.stroke();

    // 3. ネットの上の白いテープ（白帯）
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(netLeft, netY - netHeight + 2);
    ctx.lineTo(netRight, netY - netHeight + 2);
    ctx.stroke();

    // 4. ネットと卓球台の境界線
    ctx.strokeStyle = '#1B1B1B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(netLeft, netY);
    ctx.lineTo(netRight, netY);
    ctx.stroke();

    // 5. 左右の支柱（ポスト）
    ctx.fillStyle = '#444444'; // 濃いグレー
    ctx.fillRect(netLeft - 4, netY - netHeight - 3, 8, netHeight + 6);
    ctx.fillRect(netRight - 4, netY - netHeight - 3, 8, netHeight + 6);
    
    // 6. 支柱を台に固定する金具部分
    ctx.fillStyle = '#222222';
    ctx.fillRect(netLeft - 5, netY, 10, 8);
    ctx.fillRect(netRight - 5, netY, 10, 8);
  };

  const drawRacket = (ctx: CanvasRenderingContext2D, racket: Racket, color: string, isPlayer: boolean, racketType?: string) => {
    ctx.save();
    
    // 立体感を出すためのドロップシャドウを全てのラケットに追加
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 15;

    // 画像があればそれを描画（プレイヤーのみ）
    if (isPlayer && racketType && racketImages[racketType] && racketImages[racketType].complete) {
      ctx.drawImage(racketImages[racketType], racket.x, racket.y, racket.width, racket.height);
    } else {
      // ラケット本体（角丸の長方形）
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(racket.x, racket.y, racket.width, racket.height, 10);
      ctx.fill();
      
      // プレイヤー専用の装飾（リボン）- 画像がない場合のフォールバック
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
        
      case 'heart': {
        // ハートの描画（本物）
        ctx.fillStyle = '#FFB6C1';
        const dh = r;
        ctx.beginPath();
        ctx.moveTo(ball.x, visualY + dh);
        ctx.bezierCurveTo(ball.x + dh, visualY - dh, ball.x + dh * 2, visualY + dh, ball.x, visualY + dh * 2);
        ctx.bezierCurveTo(ball.x - dh * 2, visualY + dh, ball.x - dh, visualY - dh, ball.x, visualY + dh);
        ctx.fill();
        // ハイライト
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(ball.x - dh * 0.3, visualY + dh * 0.3, dh * 0.35, dh * 0.25, -0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'star': {
        // 星の描画（ゴールド）
        ctx.fillStyle = '#FFD700';
        ctx.save();
        ctx.translate(ball.x, visualY);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const oAng = (i * 4 * Math.PI / 5) - Math.PI / 2;
          const iAng = oAng + Math.PI / 5;
          if (i === 0) ctx.moveTo(Math.cos(oAng) * r, Math.sin(oAng) * r);
          else ctx.lineTo(Math.cos(oAng) * r, Math.sin(oAng) * r);
          ctx.lineTo(Math.cos(iAng) * r * 0.42, Math.sin(iAng) * r * 0.42);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'candy': {
        // キャンディの描画（水色の丸にストライプ）
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, visualY, r, 0, Math.PI * 2);
        ctx.fillStyle = '#87CEEB';
        ctx.fill();
        // ストライプ（クリッピング）
        ctx.clip();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(ball.x - r * 1.5, visualY - r * 0.4);
        ctx.lineTo(ball.x + r * 1.5, visualY + r * 0.8);
        ctx.moveTo(ball.x - r * 1.5, visualY + r * 0.4);
        ctx.lineTo(ball.x + r * 1.5, visualY + r * 1.6);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'ribbon': {
        // リボンの描画（パープル丸＋リボン形）
        ctx.fillStyle = '#DDA0DD';
        ctx.beginPath();
        ctx.arc(ball.x, visualY, r, 0, Math.PI * 2);
        ctx.fill();
        // リボン
        ctx.fillStyle = '#9932CC';
        ctx.save();
        ctx.translate(ball.x, visualY);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-r * 1.2, -r * 0.8, -r * 1.5, r * 0.3, 0, 0);
        ctx.bezierCurveTo(r * 1.5, -r * 0.3, r * 1.2, r * 0.8, 0, 0);
        ctx.fill();
        ctx.restore();
        break;
      }

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