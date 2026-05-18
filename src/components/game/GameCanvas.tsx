import React, { useRef, useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useInput } from '../../hooks/useInput';
import { useParticles } from '../../hooks/useParticles';
import { BallType } from '../../types/game';
import { updatePlayerRacket } from '../../utils/physics';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_RADIUS, SMASH_SPEED_MULTIPLIER } from '../../utils/constants';
import { Racket, RACKET_TYPES } from '../../types/racket';
import { Ball } from '../../types/ball';
import {
  GRAVITY_Z, BOUNCE_Z, HIT_LIFT_Z, HITTABLE_Z, MAX_Z,
  TABLE_TOP_Y, TABLE_BOTTOM_Y, NET_Y,
  TABLE_TOP_WIDTH, TABLE_BOTTOM_WIDTH, TABLE_CENTER_X,
  clamp, clampRacketToTable, isBallOutOfTable,
} from '../../utils/tableGeometry';
import { HeartClone, drawFrame } from '../../game/gameRenderer';
import { updateSmartCpuRacket } from '../../game/cpuAI';

import normalImgSrc from '../../assets/images/normal.png';
import powerImgSrc from '../../assets/images/power.png';
import wideImgSrc from '../../assets/images/wide.png';

/**
 * ボールとラケットの衝突判定を行う
 */
export const checkRacketCollision = (ball: Ball, racket: Racket): boolean => {
  return (
    ball.x + ball.radius > racket.x &&
    ball.x - ball.radius < racket.x + racket.width &&
    ball.y + ball.radius > racket.y &&
    ball.y - ball.radius < racket.y + racket.height
  );
};

interface GameCanvasProps {
  soundEnabled?: boolean;
  onHit?: () => void;
  onSmash?: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ soundEnabled = true, onHit, onSmash }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, setGameState } = useGame();
  const input = useInput();
  const { particles, createHitParticles, updateParticles } = useParticles();
  const lastSpaceDownRef = useRef(false);
  const smashBufferRef = useRef(0);
  const smashEffectRef = useRef({ active: false, x: 0, y: 0, timer: 0 });
  const scoreLockRef = useRef(false);

  const shotCountRef = useRef(0);
  const playerSBRemRef = useRef(0);
  const playerCandyRemRef = useRef(0);
  const cpuSBRemRef = useRef(0);
  const cpuCandyRemRef = useRef(0);
  const ballEffectRemRef = useRef(0);
  const heartClonesRef = useRef<HeartClone[]>([]);
  const ballSparkleRef = useRef({ active: false, x: 0, y: 0, timer: 0 });
  const ballMsgRef = useRef<{ text: string; timer: number; ballType: string } | null>(null);
  const ballChangeSizeRef = useRef(0);
  const currentBallTypeRef = useRef<BallType>('normal');
  const prevRallyCountRef = useRef(0);

  const racketImages = useRef<Record<string, HTMLImageElement>>({}).current;
  useEffect(() => {
    if (!racketImages['normal']) {
      const normalImg = new Image(); normalImg.src = normalImgSrc; racketImages['normal'] = normalImg;
      const speedImg = new Image(); speedImg.src = powerImgSrc; racketImages['power'] = speedImg;
      const wideImg = new Image(); wideImg.src = wideImgSrc; racketImages['wide'] = wideImg;
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
    ballChangeSizeRef.current = 0;
    currentBallTypeRef.current = 'normal';
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
  const onShotDecrement = () => {
    if (playerSBRemRef.current > 0) playerSBRemRef.current--;
    if (playerCandyRemRef.current > 0) playerCandyRemRef.current--;
    if (cpuSBRemRef.current > 0) cpuSBRemRef.current--;
    if (cpuCandyRemRef.current > 0) cpuCandyRemRef.current--;
  };
  const applyBallTypeChange = (nextBall: Ball, hitter: 'player' | 'cpu') => {
    onShotDecrement();

    if (ballEffectRemRef.current > 0) {
      ballEffectRemRef.current--;
      if (ballEffectRemRef.current === 0) {
        nextBall.type = 'normal';
        currentBallTypeRef.current = 'normal';
        shotCountRef.current = 0;
      }
      return;
    }

    shotCountRef.current++;
    if (shotCountRef.current < 5) return;

    shotCountRef.current = 0;
    const types: BallType[] = ['strawberry', 'heart', 'star', 'candy', 'ribbon'];
    const newType = types[Math.floor(Math.random() * types.length)];
    nextBall.type = newType;
    currentBallTypeRef.current = newType;

    const remBase = (newType === 'strawberry' || newType === 'candy') ? 5 : 3;
    ballEffectRemRef.current = remBase;

    const BALL_MSG: Record<string, string> = {
      strawberry: hitter === 'player' ? 'うちやすく なる！' : 'あいてがうちやすく なる！',
      heart:      'ボールが 3つに なる！',
      star:       hitter === 'player' ? 'スマッシュが つよく なる！' : 'あいてのスマッシュが つよく なる！',
      candy:      hitter === 'player' ? 'あいてに ハンデ！' : 'うちにくく なる！',
      ribbon:     'バウンドが ランダムに なる！',
    };
    ballMsgRef.current = { text: BALL_MSG[newType] ?? '', timer: 120, ballType: newType };
    ballChangeSizeRef.current = 50;

    switch (newType) {
      case 'strawberry':
        if (hitter === 'player') playerSBRemRef.current = remBase;
        else                     cpuSBRemRef.current = remBase;
        break;
      case 'candy':
        if (hitter === 'player') cpuCandyRemRef.current = remBase;
        else                     playerCandyRemRef.current = remBase;
        break;
      default:
        break;
    }
  };
  // ---- ここまでヘルパー ----

  const awardPoint = (winner: 'player' | 'cpu') => {
    if (scoreLockRef.current) return;
    scoreLockRef.current = true;
    resetBallEffects();
    setGameState(prev => ({
      ...prev,
      rallyCount: 0,
      lastScorer: winner,
      pointScoredBy: winner,
      isInputFrozen: true,
    }));
  };
  const opponentOf = (side: 'player' | 'cpu') => (side === 'player' ? 'cpu' : 'player');

  const startServe = () => {
    lastSpaceDownRef.current = false;
    setIsServe(true);
    setBall(resetBallToPlayerServe());
    setPlayerRacket(prev => ({ ...prev, x: CANVAS_WIDTH / 2 - prev.width / 2 }));
    setCpuRacket(prev => ({ ...prev, x: CANVAS_WIDTH / 2 - prev.width / 2 }));
  };

  const applyRacketAngle = (ball: Ball, racket: Racket) => {
    const racketCenterX = racket.x + racket.width / 2;
    const offset = (ball.x - racketCenterX) / (racket.width / 2);
    const normalized = clamp(offset, -1, 1);
    const MAX_VX = 9.5;
    const desiredVx = normalized * MAX_VX;
    ball.vx = ball.vx * 0.35 + desiredVx * 0.65;
  };

  const MIN_LAND_TIME = 10;
  const MAX_LAND_TIME = 60;
  const landVzForTime = (t: number) => Math.max(1, (-0.5 * GRAVITY_Z) * t);
  const pickLandingY = (side: 'cpu' | 'player', vy: number = 0) => {
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

    const tNet = (NET_Y - fromY) / vy;
    if (tNet > 0) {
      const minVz = (13 / tNet) - 0.5 * GRAVITY_Z * tNet;
      if (vz < minVz) vz = minVz;
    }
    return vz;
  };

  const currentRacketType = gameState.config?.racketType || 'normal';
  const currentRacketStats = RACKET_TYPES[currentRacketType];

  const PADDLE_WIDTH = currentRacketStats.hitBoxWidth;
  const PADDLE_HEIGHT = currentRacketStats.hitBoxHeight;

  const [playerRacket, setPlayerRacket] = useState<Racket>({
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
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
    y: TABLE_TOP_Y + 30,
    width: CPU_PADDLE_WIDTH,
    height: CPU_PADDLE_HEIGHT,
    stats: RACKET_TYPES.normal,
    isRightHanded: false,
    effectMultiplier: 1.0,
  });

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
    y: playerRacket.y - BALL_RADIUS,
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

  useEffect(() => {
    if (soundEnabled && gameState.rallyCount > prevRallyCountRef.current) {
      onHit?.();
    }
    prevRallyCountRef.current = gameState.rallyCount;
  }, [gameState.rallyCount, soundEnabled, onHit]);

  // --- ゲームループ ---
  useGameLoop((deltaTime) => {
    if (!gameState.isGameActive || gameState.isPaused) {
      // カウントダウン中などでもボールをラケット上に追従させる
      if (isServe) {
        setBall(prev => ({
          ...prev,
          x: playerRacket.x + playerRacket.width / 2,
          y: playerRacket.y - prev.radius,
          vx: 0, vy: 0, z: 0, vz: 0,
        }));
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        drawFrame({
          ctx, ball, playerRacket, cpuRacket, particles,
          currentBallType: currentBallTypeRef.current,
          playerHitboxMult: getPlayerHitboxMult(),
          cpuHitboxMult: getCpuHitboxMult(),
          currentRacketType, racketImages, isServe,
          isGameActive: gameState.isGameActive,
          ballChangeSizeRef, smashEffectRef, ballSparkleRef, ballMsgRef,
          heartClones: heartClonesRef.current,
          ballEffectRem: ballEffectRemRef.current,
        });
      }
      return;
    }

    const frozen = gameState.isInputFrozen;

    const currentInput = frozen ? { left: false, right: false, up: false, down: false } : {
      left: input.current['ArrowLeft'] || false,
      right: input.current['ArrowRight'] || false,
      up: input.current['ArrowUp'] || false,
      down: input.current['ArrowDown'] || false,
    };
    setPlayerRacket((prev) => clampRacketToTable(updatePlayerRacket(prev, currentInput, deltaTime), 'player'));

    const spaceDown = !frozen && (input.current[' '] || input.current['Space'] || input.current['Spacebar'] || false);
    const spaceJustPressed = spaceDown && !lastSpaceDownRef.current;
    lastSpaceDownRef.current = !!spaceDown;

    if (spaceJustPressed && !isServe) {
      smashBufferRef.current = 15;
    }
    if (smashBufferRef.current > 0) {
      smashBufferRef.current--;
    }

    if (isServe) {
      setBall((prev) => ({
        ...prev,
        x: playerRacket.x + playerRacket.width / 2,
        y: playerRacket.y - prev.radius,
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
        setIsServe(false);
        scoreLockRef.current = false;
        setGameState(prev => ({ ...prev, lastScorer: null }));
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
            bounceCount: 0,
            lastBounceSide: null,
            isNetFault: false,
          };
        });
      }

      updateParticles(deltaTime);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        drawFrame({
          ctx, ball, playerRacket, cpuRacket, particles,
          currentBallType: currentBallTypeRef.current,
          playerHitboxMult: getPlayerHitboxMult(),
          cpuHitboxMult: getCpuHitboxMult(),
          currentRacketType, racketImages, isServe,
          isGameActive: gameState.isGameActive,
          ballChangeSizeRef, smashEffectRef, ballSparkleRef, ballMsgRef,
          heartClones: heartClonesRef.current,
          ballEffectRem: ballEffectRemRef.current,
        });
      }
      return;
    }

    // CPU AI update
    setCpuRacket((prev) => clampRacketToTable(
      updateSmartCpuRacket(prev, ball, currentBallTypeRef.current, gameState.config.difficulty, deltaTime),
      'cpu'
    ));

    // ボールの物理演算
    setBall((prevBall) => {
      let nextBall = { ...prevBall };
      nextBall.z = nextBall.z ?? 0;
      nextBall.vz = nextBall.vz ?? 0;
      nextBall.lastHitBy = nextBall.lastHitBy ?? 'player';
      nextBall.bounceCount = nextBall.bounceCount ?? 0;
      nextBall.lastBounceSide = nextBall.lastBounceSide ?? null;
      nextBall.isNetFault = nextBall.isNetFault ?? false;

      nextBall.x += nextBall.vx;
      nextBall.y += nextBall.vy;
      nextBall.vz += GRAVITY_Z;
      nextBall.z += nextBall.vz;

      const crossedNet = (prevBall.y <= NET_Y && nextBall.y > NET_Y) ||
                         (prevBall.y >= NET_Y && nextBall.y < NET_Y);

      const tableWidthAtNet = (TABLE_TOP_WIDTH + TABLE_BOTTOM_WIDTH) / 2;
      const netLeftBound = TABLE_CENTER_X - (tableWidthAtNet / 2) + 6;
      const netRightBound = TABLE_CENTER_X + (tableWidthAtNet / 2) - 6;

      if (crossedNet && nextBall.x >= netLeftBound && nextBall.x <= netRightBound && nextBall.z < 12 && !nextBall.isNetFault) {
        nextBall.isNetFault = true;
        nextBall.vy = -nextBall.vy * 0.15;
        nextBall.vx *= 0.15;
        nextBall.vz *= 0.3;
      }

      if (nextBall.z < 0) {
        if (isBallOutOfTable(nextBall.x, nextBall.y, nextBall.radius)) {
          const hitter = nextBall.lastHitBy ?? 'player';
          const bounces = nextBall.bounceCount ?? 0;
          let winner = bounces >= 1 ? hitter : opponentOf(hitter);
          if (nextBall.isNetFault) {
            winner = opponentOf(hitter);
          }
          awardPoint(winner);
          startServe();
          return resetBallToPlayerServe();
        }

        nextBall.z = 0;
        nextBall.vz = Math.abs(nextBall.vz) * BOUNCE_Z;

        const bounceSide: 'cpu' | 'player' = nextBall.y < NET_Y ? 'cpu' : 'player';
        const isOpponentCourt = bounceSide !== (nextBall.lastHitBy ?? 'player');

        if (currentBallTypeRef.current === 'ribbon' && isOpponentCourt) {
          const deflectDir = Math.random() < 0.5 ? 1 : -1;
          nextBall.vx = deflectDir * Math.abs(nextBall.vy) * 0.45;
        }

        if (currentBallTypeRef.current === 'heart' && isOpponentCourt) {
          ballSparkleRef.current = { active: true, x: nextBall.x, y: nextBall.y, timer: 25 };
        }

        nextBall.lastBounceSide = bounceSide;
        const nextBounceCount = (nextBall.bounceCount ?? 0) + 1;
        nextBall.bounceCount = nextBounceCount;

        if (nextBounceCount >= 2) {
          const hitter = nextBall.lastHitBy ?? 'player';
          if (nextBall.isNetFault) {
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

      // プレイヤーラケットとの衝突判定
      {
        const pMult = getPlayerHitboxMult();
        const pEffW = playerRacket.width * pMult;
        const effPlayer: Racket = {
          ...playerRacket,
          x: playerRacket.x - (pEffW - playerRacket.width) / 2,
          width: pEffW,
        };
        if ((nextBall.z ?? 0) <= HITTABLE_Z && nextBall.vy > 0 && checkRacketCollision(nextBall, effPlayer)) {
          let isSmashing = false;
          if (smashBufferRef.current > 0) {
            isSmashing = true;
            smashBufferRef.current = 0;
            smashEffectRef.current = { active: true, x: nextBall.x, y: nextBall.y, timer: 45 };
            if (soundEnabled) onSmash?.();
          }

          const starMult = (currentBallTypeRef.current === 'star' && isSmashing) ? 1.5 : 1.0;

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

          const prevType = nextBall.type;
          applyBallTypeChange(nextBall, 'player');

          if (nextBall.type === 'heart' && prevType !== 'heart') {
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

      // CPUラケットとの衝突判定
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

        if (c.y < TABLE_TOP_Y - 100 || c.y > TABLE_BOTTOM_Y + 100) return { ...c, active: false };

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

    updateParticles(deltaTime);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      drawFrame({
        ctx, ball, playerRacket, cpuRacket, particles,
        currentBallType: currentBallTypeRef.current,
        playerHitboxMult: getPlayerHitboxMult(),
        cpuHitboxMult: getCpuHitboxMult(),
        currentRacketType, racketImages, isServe,
        isGameActive: gameState.isGameActive,
        ballChangeSizeRef, smashEffectRef, ballSparkleRef, ballMsgRef,
        heartClones: heartClonesRef.current,
        ballEffectRem: ballEffectRemRef.current,
      });
    }
  });

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="game-canvas" />;
};

export default GameCanvas;
