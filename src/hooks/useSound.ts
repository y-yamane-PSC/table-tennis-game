import { useRef, useCallback, useEffect } from 'react';

export interface SoundSystem {
  playHit: () => void;
  playButton: () => void;
  playScore: (isPlayer: boolean) => void;
  playSmash: () => void;
  playGameOver: (isWin: boolean) => void;
  playCountdownTick: () => void;
  playCountdownGo: () => void;
  playWhistle: () => void;
  startBGM: () => void;
  stopBGM: () => void;
}

export const useSound = (enabled: boolean): SoundSystem => {
  const ctxRef = useRef<AudioContext | null>(null);
  const bgmTimerRef = useRef<number | null>(null);
  const bgmNoteIdxRef = useRef(0);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const tone = useCallback((
    freq: number,
    dur: number,
    vol: number = 0.3,
    type: OscillatorType = 'sine',
    at?: number,
  ) => {
    if (!enabled || freq <= 0) return;
    try {
      const ctx = getCtx();
      const t = at ?? ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    } catch {
      // audio context errors are silent
    }
  }, [enabled, getCtx]);

  const playHit = useCallback(() => {
    tone(520, 0.07, 0.22, 'triangle');
  }, [tone]);

  const playButton = useCallback(() => {
    tone(660, 0.08, 0.2, 'sine');
  }, [tone]);

  const playScore = useCallback((isPlayer: boolean) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      if (isPlayer) {
        // 上昇アルペジオ（プレイヤー得点）
        [523, 659, 784, 1047].forEach((f, i) =>
          tone(f, 0.15, 0.38, 'sine', now + i * 0.09)
        );
      } else {
        // 下降音（CPU得点）
        [440, 370, 294].forEach((f, i) =>
          tone(f, 0.18, 0.32, 'sine', now + i * 0.1)
        );
      }
    } catch { /* ignore */ }
  }, [enabled, getCtx, tone]);

  const playSmash = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      tone(420, 0.12, 0.35, 'sine', now);
      tone(280, 0.22, 0.28, 'triangle', now);
      tone(560, 0.08, 0.18, 'sine', now + 0.05);
    } catch { /* ignore */ }
  }, [enabled, getCtx, tone]);

  const playGameOver = useCallback((isWin: boolean) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      if (isWin) {
        // 勝利ファンファーレ
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
          tone(f, 0.18, 0.4, 'sine', now + i * 0.13)
        );
      } else {
        // 敗北（下降）
        [440, 392, 349, 294, 262].forEach((f, i) =>
          tone(f, 0.22, 0.38, 'sine', now + i * 0.16)
        );
      }
    } catch { /* ignore */ }
  }, [enabled, getCtx, tone]);

  const playCountdownTick = useCallback(() => {
    tone(880, 0.1, 0.32, 'sine');
  }, [tone]);

  const playCountdownGo = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      [880, 1047, 1319].forEach((f, i) =>
        tone(f, 0.13, 0.42, 'sine', now + i * 0.07)
      );
    } catch { /* ignore */ }
  }, [enabled, getCtx, tone]);

  const playWhistle = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      // 笛のような音: 高音・短いビブラート
      tone(1760, 0.08, 0.35, 'sine', now);
      tone(1976, 0.12, 0.40, 'sine', now + 0.07);
      tone(1760, 0.10, 0.30, 'sine', now + 0.18);
    } catch { /* ignore */ }
  }, [enabled, getCtx, tone]);

  // BGM: シンプルなループメロディ（Cメジャー）
  // f=周波数(Hz), d=拍数(0=休符)
  const BGM_MELODY: { f: number; d: number }[] = [
    { f: 523, d: 1 }, { f: 659, d: 1 }, { f: 784, d: 1 }, { f: 659, d: 1 },
    { f: 523, d: 2 }, { f: 0,   d: 1 }, { f: 392, d: 1 },
    { f: 523, d: 1 }, { f: 659, d: 1 }, { f: 784, d: 1 }, { f: 880, d: 1 },
    { f: 784, d: 1 }, { f: 659, d: 1 }, { f: 587, d: 1 }, { f: 523, d: 2 },
    { f: 0,   d: 2 },
  ];
  const BGM_BEAT_MS = 290;

  const stopBGM = useCallback(() => {
    if (bgmTimerRef.current !== null) {
      clearTimeout(bgmTimerRef.current);
      bgmTimerRef.current = null;
    }
  }, []);

  const startBGM = useCallback(() => {
    if (!enabled) return;
    stopBGM();
    bgmNoteIdxRef.current = 0;

    const scheduleNext = () => {
      const note = BGM_MELODY[bgmNoteIdxRef.current % BGM_MELODY.length];
      bgmNoteIdxRef.current++;
      if (note.f > 0) {
        tone(note.f, (note.d * BGM_BEAT_MS / 1000) * 0.82, 0.1, 'sine');
      }
      bgmTimerRef.current = window.setTimeout(scheduleNext, note.d * BGM_BEAT_MS);
    };
    scheduleNext();
  }, [enabled, tone, stopBGM]);

  useEffect(() => () => stopBGM(), [stopBGM]);

  return {
    playHit,
    playButton,
    playScore,
    playSmash,
    playGameOver,
    playCountdownTick,
    playCountdownGo,
    playWhistle,
    startBGM,
    stopBGM,
  };
};
