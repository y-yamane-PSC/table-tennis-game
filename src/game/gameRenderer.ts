import type { Ball } from '../types/ball';
import type { BallType } from '../types/game';
import type { Racket } from '../types/racket';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_RADIUS } from '../utils/constants';
import {
  TABLE_MARGIN_TOP, TABLE_MARGIN_BOTTOM,
  TABLE_TOP_Y, TABLE_BOTTOM_Y, NET_Y,
  TABLE_TOP_WIDTH, TABLE_BOTTOM_WIDTH, TABLE_CENTER_X,
  TABLE_TOP_LEFT_X, TABLE_TOP_RIGHT_X,
  TABLE_BOTTOM_LEFT_X, TABLE_BOTTOM_RIGHT_X,
  GRAVITY_Z, BOUNCE_Z, Z_TO_SCREEN,
} from '../utils/tableGeometry';

export const BALL_EFFECT_INFO: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  strawberry: { icon: '🍓', label: 'うちやすい！',      color: '#c0001a', bg: 'rgba(255,220,220,0.95)', border: '#FF3B3B' },
  heart:      { icon: '💗', label: 'ハート！',          color: '#c2185b', bg: 'rgba(255,220,240,0.95)', border: '#FF69B4' },
  star:       { icon: '⭐', label: 'スマッシュ強化！',  color: '#7a5000', bg: 'rgba(255,252,200,0.95)', border: '#FFD700' },
  candy:      { icon: '🍬', label: 'あたりにくい！',    color: '#1a3a8a', bg: 'rgba(200,220,255,0.95)', border: '#4169E1' },
  ribbon:     { icon: '🎀', label: 'ランダムバウンド！', color: '#6a006a', bg: 'rgba(240,210,255,0.95)', border: '#9932CC' },
};

export interface HeartClone {
  x: number; y: number; vx: number; vy: number;
  z: number; vz: number;
  active: boolean; isBurst: boolean; burstTimer: number;
}

export interface DrawFrameParams {
  ctx: CanvasRenderingContext2D;
  ball: Ball;
  playerRacket: Racket;
  cpuRacket: Racket;
  particles: readonly { x: number; y: number; size?: number; color?: string; opacity?: number }[];
  currentBallType: BallType;
  playerHitboxMult: number;
  cpuHitboxMult: number;
  currentRacketType: string;
  racketImages: Record<string, HTMLImageElement>;
  isServe: boolean;
  isGameActive: boolean;
  ballChangeSizeRef: { current: number };
  smashEffectRef: { current: { active: boolean; x: number; y: number; timer: number } };
  ballSparkleRef: { current: { active: boolean; x: number; y: number; timer: number } };
  ballMsgRef: { current: { text: string; timer: number; ballType: string } | null };
  heartClones: HeartClone[];
  ballEffectRem: number;
}

function drawTable(ctx: CanvasRenderingContext2D) {
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

  ctx.fillStyle = '#2F6FB6';
  ctx.beginPath();
  ctx.moveTo(topLeftX, topY);
  ctx.lineTo(topRightX, topY);
  ctx.lineTo(bottomRightX, bottomY);
  ctx.lineTo(bottomLeftX, bottomY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX, topY);
  ctx.lineTo(centerX, bottomY);
  ctx.stroke();

  const netY = NET_Y;
  const tableWidthAtNet = (topWidth + bottomWidth) / 2;
  const netHalfWidth = (tableWidthAtNet / 2) - 6;
  const netHeight = 40;
  const netLeft = centerX - netHalfWidth;
  const netRight = centerX + netHalfWidth;

  ctx.fillStyle = 'rgba(200, 200, 220, 0.25)';
  ctx.fillRect(netLeft, netY - netHeight, netRight - netLeft, netHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const numHorizontals = Math.floor(netHeight / 6);
  for (let i = 1; i < numHorizontals; i++) {
    const yLine = netY - netHeight + i * (netHeight / numHorizontals);
    ctx.moveTo(netLeft, yLine);
    ctx.lineTo(netRight, yLine);
  }
  const numVerticals = Math.floor((netRight - netLeft) / 8);
  const stepX = (netRight - netLeft) / numVerticals;
  for (let i = 1; i < numVerticals; i++) {
    const xLine = netLeft + i * stepX;
    ctx.moveTo(xLine, netY - netHeight);
    ctx.lineTo(xLine, netY);
  }
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(netLeft, netY - netHeight + 2);
  ctx.lineTo(netRight, netY - netHeight + 2);
  ctx.stroke();

  ctx.strokeStyle = '#1B1B1B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(netLeft, netY);
  ctx.lineTo(netRight, netY);
  ctx.stroke();

  ctx.fillStyle = '#444444';
  ctx.fillRect(netLeft - 4, netY - netHeight - 3, 8, netHeight + 6);
  ctx.fillRect(netRight - 4, netY - netHeight - 3, 8, netHeight + 6);

  ctx.fillStyle = '#222222';
  ctx.fillRect(netLeft - 5, netY, 10, 8);
  ctx.fillRect(netRight - 5, netY, 10, 8);
}

function drawRacket(
  ctx: CanvasRenderingContext2D,
  racket: Racket,
  color: string,
  isPlayer: boolean,
  racketType?: string,
  racketImages?: Record<string, HTMLImageElement>,
) {
  ctx.save();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 15;

  if (isPlayer && racketType && racketImages && racketImages[racketType] && racketImages[racketType].complete) {
    ctx.drawImage(racketImages[racketType], racket.x, racket.y, racket.width, racket.height);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(racket.x, racket.y, racket.width, racket.height, 10);
    ctx.fill();

    if (isPlayer) {
      ctx.fillStyle = '#FF69B4';
      const ribbonX = racket.isRightHanded ? racket.x + racket.width : racket.x;
      ctx.beginPath();
      ctx.arc(ribbonX, racket.y + racket.height / 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ribbonX - 3, racket.y + racket.height / 2 - 3, 6, 6);
    }
  }

  ctx.restore();
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  displayType: BallType,
  ballChangeSizeRef: { current: number },
) {
  ctx.save();

  const z = ball.z ?? 0;
  const visualY = ball.y - z * Z_TO_SCREEN;
  const scale = 1 + z / 180;
  if (ballChangeSizeRef.current > 0) ballChangeSizeRef.current--;
  const changeSizeBonus = ballChangeSizeRef.current > 0 ? 0.5 * (ballChangeSizeRef.current / 50) : 0;
  const r = ball.radius * (scale + changeSizeBonus);

  const shadowAlpha = Math.max(0.15, 0.55 - z / 220);
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + ball.radius * 0.6, r * 1.05, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (displayType) {
    case 'strawberry': {
      ctx.save();
      ctx.translate(ball.x, visualY);
      ctx.fillStyle = '#FF3B3B';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 1.2, -r * 0.8, r * 1.2, r * 0.8, 0, r * 1.2);
      ctx.bezierCurveTo(-r * 1.2, r * 0.8, -r * 1.2, -r * 0.8, 0, -r);
      ctx.fill();
      ctx.fillStyle = '#FFE975';
      const seeds = [
        {x: -r*0.4, y: -r*0.3}, {x: r*0.4, y: -r*0.3},
        {x: 0, y: 0},
        {x: -r*0.5, y: r*0.4}, {x: r*0.5, y: r*0.4},
        {x: 0, y: r*0.7}
      ];
      seeds.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.moveTo(0, -r*0.5);
      ctx.lineTo(-r*0.8, -r*1.1);
      ctx.lineTo(-r*0.2, -r*0.9);
      ctx.lineTo(0, -r*1.3);
      ctx.lineTo(r*0.2, -r*0.9);
      ctx.lineTo(r*0.8, -r*1.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }

    case 'heart': {
      ctx.fillStyle = '#FFB6C1';
      const dh = r;
      ctx.beginPath();
      ctx.moveTo(ball.x, visualY + dh);
      ctx.bezierCurveTo(ball.x + dh, visualY - dh, ball.x + dh * 2, visualY + dh, ball.x, visualY + dh * 2);
      ctx.bezierCurveTo(ball.x - dh * 2, visualY + dh, ball.x - dh, visualY - dh, ball.x, visualY + dh);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(ball.x - dh * 0.3, visualY + dh * 0.3, dh * 0.35, dh * 0.25, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'star': {
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
      ctx.save();
      ctx.translate(ball.x, visualY);
      const rotationAngle = (ball.x + ball.y) * 0.05;
      ctx.rotate(rotationAngle);
      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.moveTo(-r*0.8, 0); ctx.lineTo(-r*2.0, -r*0.8);
      ctx.lineTo(-r*1.8, 0); ctx.lineTo(-r*2.0, r*0.8);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r*0.8, 0); ctx.lineTo(r*2.0, -r*0.8);
      ctx.lineTo(r*1.8, 0); ctx.lineTo(r*2.0, r*0.8);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.strokeStyle = '#87CEEB';
      ctx.lineWidth = r * 0.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, r*0.5, Math.PI, Math.PI * 2.5);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'ribbon': {
      ctx.save();
      ctx.translate(ball.x, visualY);
      const bgColor = '#DDA0DD';
      const ribbonColor = '#9932CC';
      const lightRibbonColor = '#BA55D3';
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ribbonColor;
      ctx.beginPath();
      ctx.moveTo(-r*0.2, r*0.5); ctx.lineTo(-r*0.8, r*1.5);
      ctx.lineTo(-r*0.1, r*1.2); ctx.lineTo(0, r*0.8);
      ctx.lineTo(r*0.1, r*1.2); ctx.lineTo(r*0.8, r*1.5);
      ctx.lineTo(r*0.2, r*0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lightRibbonColor;
      ctx.beginPath(); ctx.ellipse(-r*0.6, 0, r*0.7, r*0.4, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r*0.6, 0, r*0.7, r*0.4, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ribbonColor;
      ctx.beginPath(); ctx.arc(0, 0, r*0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }

    default:
      ctx.fillStyle = '#FFE5B4';
      ctx.beginPath();
      ctx.arc(ball.x, visualY, r, 0, Math.PI * 2);
      ctx.fill();
  }

  ctx.restore();
}

function drawBallTrajectory(ctx: CanvasRenderingContext2D, ball: Ball, isGameActive: boolean) {
  if (!isGameActive) return;

  const steps = 26;
  const stepDt = 1;

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
}

function drawParticle(ctx: CanvasRenderingContext2D, p: { x: number; y: number; size?: number; color?: string; opacity?: number }) {
  ctx.save();
  ctx.globalAlpha = p.opacity || 1;
  ctx.fillStyle = p.color || '#FFF';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBallEffectHUD(ctx: CanvasRenderingContext2D, type: string, remaining: number) {
  const info = BALL_EFFECT_INFO[type];
  if (!info) return;

  const hudW = 240;
  const hudH = 64;
  const hudX = CANVAS_WIDTH - hudW - 14;
  const hudY = CANVAS_HEIGHT - hudH - 12;

  ctx.save();
  ctx.fillStyle = info.bg;
  ctx.beginPath();
  ctx.roundRect(hudX, hudY, hudW, hudH, 14);
  ctx.fill();
  ctx.strokeStyle = info.border;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.icon, hudX + 28, hudY + hudH / 2 - 6);

  ctx.fillStyle = info.color;
  ctx.font = 'bold 17px "Zen Maru Gothic", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(info.label, hudX + 52, hudY + hudH / 2 - 8);

  const maxDots = 5;
  const dots = Math.min(remaining, maxDots);
  for (let i = 0; i < maxDots; i++) {
    ctx.beginPath();
    ctx.arc(hudX + 52 + i * 16, hudY + hudH - 14, 5, 0, Math.PI * 2);
    ctx.fillStyle = i < dots ? info.border : 'rgba(0,0,0,0.12)';
    ctx.fill();
  }

  ctx.fillStyle = info.color;
  ctx.font = '600 12px "Zen Maru Gothic", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('のこり', hudX + 138, hudY + hudH - 14);

  ctx.restore();
}

function drawSmashEffect(
  ctx: CanvasRenderingContext2D,
  smashEffectRef: { current: { active: boolean; x: number; y: number; timer: number } },
) {
  if (smashEffectRef.current.active && smashEffectRef.current.timer > 0) {
    const effect = smashEffectRef.current;
    effect.timer--;
    ctx.save();

    const progress = 1 - (effect.timer / 45);
    const scale = 1 + progress * 0.7;
    const alpha = effect.timer > 15 ? 1 : effect.timer / 15;

    ctx.globalAlpha = alpha;
    ctx.translate(effect.x, effect.y - progress * 80);
    ctx.scale(scale, scale);

    ctx.font = '900 42px "Arial Black", impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.strokeText('SMASH!!', 0, 0);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF2400';
    ctx.fillText('SMASH!!', 0, 0);

    ctx.restore();

    if (effect.timer === 0) {
      smashEffectRef.current.active = false;
    }
  }
}

function drawHeartClones(ctx: CanvasRenderingContext2D, heartClones: HeartClone[]) {
  for (const cl of heartClones) {
    if (!cl.active) continue;
    const clZ = cl.z ?? 0;
    const clVisualY = cl.y - clZ * Z_TO_SCREEN;
    if (cl.isBurst) {
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
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  ballSparkleRef: { current: { active: boolean; x: number; y: number; timer: number } },
) {
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
}

function drawBallChangeAnnounce(
  ctx: CanvasRenderingContext2D,
  ballMsgRef: { current: { text: string; timer: number; ballType: string } | null },
) {
  if (ballMsgRef.current && ballMsgRef.current.timer > 0) {
    ballMsgRef.current.timer--;
    const msg = ballMsgRef.current;
    const TOTAL = 120;
    const t = msg.timer;
    const fadeAlpha = t > TOTAL - 15 ? (TOTAL - t) / 15 : t < 25 ? t / 25 : 1.0;

    const BALL_ICONS: Record<string, string> = {
      strawberry: '🍓', heart: '💗', star: '⭐', candy: '🍬', ribbon: '🎀',
    };
    const BALL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
      strawberry: { bg: 'rgba(255,80,80,0.88)',   border: '#FF3B3B', text: '#fff' },
      heart:      { bg: 'rgba(255,105,180,0.88)', border: '#FF69B4', text: '#fff' },
      star:       { bg: 'rgba(200,160,0,0.88)',   border: '#FFD700', text: '#fff' },
      candy:      { bg: 'rgba(65,105,225,0.88)',  border: '#87CEEB', text: '#fff' },
      ribbon:     { bg: 'rgba(130,0,160,0.88)',   border: '#DDA0DD', text: '#fff' },
    };
    const icon   = BALL_ICONS[msg.ballType] ?? '✨';
    const colors = BALL_COLORS[msg.ballType] ?? { bg: 'rgba(0,0,0,0.75)', border: '#fff', text: '#fff' };

    const panW = 360;
    const panH = 52;
    const panX = CANVAS_WIDTH / 2 - panW / 2;
    const panY = 10;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(panX, panY, panW, panH, 12);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, panX + 28, panY + panH / 2);

    ctx.font = 'bold 18px "Zen Maru Gothic", sans-serif';
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeText(msg.text, panX + 52, panY + panH / 2);
    ctx.fillText(msg.text, panX + 52, panY + panH / 2);

    ctx.restore();
    if (msg.timer === 0) ballMsgRef.current = null;
  }
}

export function drawFrame(params: DrawFrameParams): void {
  const {
    ctx, ball, playerRacket, cpuRacket, particles,
    currentBallType, playerHitboxMult, cpuHitboxMult,
    currentRacketType, racketImages, isServe, isGameActive,
    ballChangeSizeRef, smashEffectRef, ballSparkleRef, ballMsgRef,
    heartClones, ballEffectRem,
  } = params;

  // 1. Fill background
  ctx.fillStyle = '#FFF0F5';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Draw table
  drawTable(ctx);

  // 3. Draw CPU racket
  const cEffW = cpuRacket.width * cpuHitboxMult;
  const drawingCpuRacket: Racket = {
    ...cpuRacket,
    x: cpuRacket.x - (cEffW - cpuRacket.width) / 2,
    width: cEffW,
  };
  drawRacket(ctx, drawingCpuRacket, '#87CEEB', false);

  // 4. Draw ball trajectory
  drawBallTrajectory(ctx, ball, isGameActive);

  // 5. Draw ball
  drawBall(ctx, ball, currentBallType, ballChangeSizeRef);

  // 6. Draw player racket
  if (isServe) {
    ctx.globalAlpha = 0.6;
  }
  const pEffW = playerRacket.width * playerHitboxMult;
  const drawingPlayerRacket: Racket = {
    ...playerRacket,
    x: playerRacket.x - (pEffW - playerRacket.width) / 2,
    width: pEffW,
  };
  drawRacket(ctx, drawingPlayerRacket, '#FFB6C1', true, currentRacketType, racketImages);
  ctx.globalAlpha = 1.0;

  // 7. Draw particles
  particles.forEach(p => drawParticle(ctx, p));

  // 8. Draw smash effect
  drawSmashEffect(ctx, smashEffectRef);

  // 9. Draw heart clones
  drawHeartClones(ctx, heartClones);

  // 10. Draw sparkle
  drawSparkle(ctx, ballSparkleRef);

  // 11. Draw ball change announce
  drawBallChangeAnnounce(ctx, ballMsgRef);

  // 12. Draw ball effect HUD if not normal
  if (currentBallType !== 'normal') {
    drawBallEffectHUD(ctx, currentBallType, ballEffectRem);
  }
}
