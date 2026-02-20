import { BallType } from './game';

export interface Ball {
  x: number;
  y: number;
  vx: number;               // X方向の速度
  vy: number;               // Y方向の速度
  radius: number;
  type: BallType;
  isReal: boolean;         // ハートボールの本物判定用
  effectRemainingRallies: number; // 効果の残りラリー数
}

export interface HeartBall extends Ball {
  type: 'heart';
  clones: Array<{ x: number; y: number; vx: number; vy: number }>; // 分身
}

export const BALL_TYPES: Record<BallType, {
  color: string;
  icon?: string;
  effect: string;
}> = {
  normal: { color: '#FFE5B4', effect: 'なし' },
  strawberry: { color: '#FF6B9D', effect: '当たり判定1.2倍（2ラリー）' },
  heart: { color: '#FFB6C1', effect: '3つに分身' },
  star: { color: '#FFD700', effect: 'スマッシュ速度1.5倍' },
  candy: { color: '#87CEEB', effect: '相手の当たり判定0.8倍（2ラリー）' },
  ribbon: { color: '#DDA0DD', effect: '変化球' },
};
