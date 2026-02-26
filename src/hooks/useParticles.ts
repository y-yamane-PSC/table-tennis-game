import { useState, useCallback } from 'react';
import { BallType } from '../types/game';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;     // 1.0 (生成) -> 0.0 (消滅)
  color: string;
  type: 'star' | 'heart';
}

export function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  const createHitParticles = useCallback((x: number, y: number, ballType: BallType) => {
    const newParticles: Particle[] = [];
    const count = 12; // 一度のヒットで出る数
    const colors = ['#FF69B4', '#FFB6C1', '#FFFACD', '#E6E6FA']; // パステルカラー

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: Math.random() > 0.5 ? 'star' : 'heart'
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);
  }, []);

  const updateParticles = useCallback((deltaTime: number) => {
    setParticles((prev) => 
      prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - deltaTime * 1.5 // 約0.6秒で消滅
        }))
        .filter(p => p.life > 0) // 寿命が尽きたら削除
    );
  }, []);

  return { particles, createHitParticles, updateParticles };
}