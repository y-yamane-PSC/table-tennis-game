import { useEffect, useRef } from 'react';
import { Racket } from '../types/game';

/**
 * ゲームループを管理するフック
 * @param callback 毎フレーム実行される処理 (deltaTime: 前のフレームからの経過時間)
 */
export function useGameLoop(callback: (deltaTime: number) => void) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      // 経過時間を計算（秒単位）
      const deltaTime = (time - previousTimeRef.current) / 1000;
      // 極端に長いブランク（タブ移動等）対策として上限を設定
      callback(Math.min(deltaTime, 0.1));
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []); // 初回マウント時に開始
}

// utils/physics.ts または hooks/useGameLoop.ts 内で定義
export function updateRacketPosition(
  racket: Racket, 
  targetY: number, 
  speed: number
): Racket {
  return {
    ...racket,
    y: racket.y + (targetY - racket.y) * speed // 追従ロジック
  };
}

