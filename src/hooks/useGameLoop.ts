import { useEffect, useRef } from 'react';
import { Racket } from '../types/racket';

/**
 * ゲームループを管理するフック
 * @param callback 毎フレーム実行される処理 (deltaTime: 前のフレームからの経過時間)
 */
export function useGameLoop(callback: (deltaTime: number) => void) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = (time - previousTimeRef.current) / 1000;
      // 直接呼び出す（setTimeoutを外すことで1フレームに1回だけ確実に呼ばれる）
      callbackRef.current(Math.min(deltaTime, 0.1));
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

