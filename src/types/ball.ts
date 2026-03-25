import { BallType } from './game';

export interface Ball {
  x: number;
  y: number;
  vx: number;               // X方向の速度
  vy: number;               // Y方向の速度
  /**
   * 卓球の「高さ」表現用（2D Canvas上の疑似3D）
   * z: 卓球台（平面）からの高さ
   * vz: z方向の速度
   */
  z?: number;
  vz?: number;
  /**
   * 卓球ルール判定用
   * lastHitBy: 最後に打った側
   * bounceCount: 最後に打ってからのバウンド回数（台に接地した回数）
   * lastBounceSide: 直近のバウンドが起きたコート側
   */
  lastHitBy?: 'player' | 'cpu';
  bounceCount?: number;
  lastBounceSide?: 'player' | 'cpu' | null;
  isNetFault?: boolean; // ネットに衝突した状態かどうか
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
