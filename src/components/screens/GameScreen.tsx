import { useEffect, useRef, useState } from 'react';
import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import { useSoundContext } from '../../contexts/SoundContext';
import ScoreBoard from '../ui/ScoreBoard';
import GameCanvas from '../game/GameCanvas';
import MessageDisplay from '../ui/MessageDisplay';
import './GameScreen.css';

type CountdownValue = 3 | 2 | 1 | 'GO!' | null;

function GameScreen() {
  const { navigateTo } = useScreen();
  const { gameState, setGameState } = useGame();
  const { soundEnabled, sound } = useSoundContext();

  const [showMessage, setShowMessage] = useState(false);
  const [messageKey, setMessageKey] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [countdown, setCountdown] = useState<CountdownValue>(3);
  const [isPointSmog, setIsPointSmog] = useState(false);
  const [showPointGo, setShowPointGo] = useState(false);

  const maxRallyRef = useRef(0);
  const gameOverFiredRef = useRef(true);
  const pointTimerRefs = useRef<number[]>([]);

  const positiveMessages = ['やったね！', 'すごい！', 'そのちょうし！'];
  const messageTextRef = useRef('');

  // マウント時: スコアリセット・カウントダウン開始
  useEffect(() => {
    maxRallyRef.current = 0;
    setGameState(prev => ({
      ...prev,
      playerScore: 0,
      cpuScore: 0,
      rallyCount: 0,
      isGameActive: false,
      isPaused: false,
      isInputFrozen: false,
      lastScorer: null,
      pointScoredBy: null,
    }));
    setCountdown(3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // カウントダウン制御（3→2→1→GO!→ゲーム開始）
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 'GO!') {
      sound.playCountdownGo();
      const t = setTimeout(() => {
        setCountdown(null);
        setGameState(prev => ({ ...prev, isGameActive: true }));
      }, 700);
      return () => clearTimeout(t);
    }
    sound.playCountdownTick();
    const next = countdown > 1 ? (countdown - 1) as CountdownValue : 'GO!';
    const t = setTimeout(() => setCountdown(next), 900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // ゲームが開始された瞬間にゲーム終了検知を有効化
  useEffect(() => {
    if (gameState.isGameActive) {
      gameOverFiredRef.current = false;
    }
  }, [gameState.isGameActive]);

  // BGM管理：ゲームアクティブかつ非ポーズ・非入力凍結中のみ再生
  useEffect(() => {
    if (soundEnabled && gameState.isGameActive && !gameState.isPaused && !gameState.isInputFrozen) {
      sound.startBGM();
    } else {
      sound.stopBGM();
    }
  }, [soundEnabled, gameState.isGameActive, gameState.isPaused, gameState.isInputFrozen]);

  // 最大ラリー追跡
  useEffect(() => {
    if (gameState.rallyCount > maxRallyRef.current) {
      maxRallyRef.current = gameState.rallyCount;
    }
  }, [gameState.rallyCount]);

  // 得点後の演出シーケンス
  // 即時: 得失点SE
  // 1秒後: スコアボード加点 + スモッグ表示
  // 2秒後: 笛 + スモッグ消去 + GO!表示
  // 2.7秒後: GO!消去 + ゲーム再開
  // ※ タイマーをrefで管理することで、t1内のstate更新がt2/t3をキャンセルしないようにする
  useEffect(() => {
    const winner = gameState.pointScoredBy;
    if (!winner) return;

    pointTimerRefs.current.forEach(clearTimeout);
    pointTimerRefs.current = [];

    // 得点後のスコアが11以上になるか（= ゲーム終了か）を事前に計算
    const nextPlayerScore = winner === 'player' ? gameState.playerScore + 1 : gameState.playerScore;
    const nextCpuScore = winner === 'cpu' ? gameState.cpuScore + 1 : gameState.cpuScore;
    const willBeGameOver = nextPlayerScore >= 11 || nextCpuScore >= 11;

    sound.playScore(winner === 'player');
    if (winner === 'player') {
      messageTextRef.current = positiveMessages[Math.floor(Math.random() * positiveMessages.length)];
      setMessageKey(k => k + 1);
      setShowMessage(true);
    }
    setIsPointSmog(true);

    pointTimerRefs.current.push(window.setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        playerScore: winner === 'player' ? prev.playerScore + 1 : prev.playerScore,
        cpuScore: winner === 'cpu' ? prev.cpuScore + 1 : prev.cpuScore,
      }));
    }, 1000));

    pointTimerRefs.current.push(window.setTimeout(() => {
      setIsPointSmog(false);
      setShowMessage(false);
      if (!willBeGameOver) {
        sound.playWhistle();
        setShowPointGo(true);
      }
    }, 2000));

    pointTimerRefs.current.push(window.setTimeout(() => {
      setShowPointGo(false);
      setGameState(prev => ({
        ...prev,
        pointScoredBy: null as typeof prev.pointScoredBy,
        isInputFrozen: false,
      }));
    }, 2700));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.pointScoredBy]);

  const handlePauseToggle = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleQuitConfirm = () => {
    sound.stopBGM();
    setGameState(prev => ({ ...prev, isGameActive: false, isPaused: false }));
    setIsExiting(true);
    setTimeout(() => navigateTo('home'), 500);
  };

  const handleResume = () => {
    setGameState(prev => ({ ...prev, isPaused: false }));
  };

  // Escキーでポーズ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState.isGameActive) {
        handlePauseToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isGameActive]);

  // ゲーム終了判定（11点先取）
  useEffect(() => {
    if (gameOverFiredRef.current) return;
    if (gameState.playerScore < 11 && gameState.cpuScore < 11) return;

    gameOverFiredRef.current = true;
    const isWin = gameState.playerScore >= 11;

    // 即座にゲームを停止してプレイ不可にする
    setGameState(prev => ({ ...prev, isGameActive: false, isPaused: false }));

    // ハイスコア保存
    const prevWins  = Number.parseInt(localStorage.getItem('totalWins')     || '0', 10);
    const prevPlays = Number.parseInt(localStorage.getItem('totalPlays')    || '0', 10);
    const prevBest  = Number.parseInt(localStorage.getItem('bestRallyCount')|| '0', 10);
    localStorage.setItem('totalPlays', String(prevPlays + 1));
    if (isWin) localStorage.setItem('totalWins', String(prevWins + 1));
    if (maxRallyRef.current > prevBest) {
      localStorage.setItem('bestRallyCount', String(maxRallyRef.current));
    }

    sound.stopBGM();
    sound.playGameOver(isWin);

    // ゲームオーバー音が鳴り終わる頃にリザルト画面へ遷移
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => navigateTo('result'), 500);
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameState.playerScore, gameState.cpuScore, navigateTo]);

  return (
    <div className={`game-screen-container ${isExiting ? 'fade-out' : 'fade-in'}`}>
      <div className="game-background-decoration" />

      <div className="game-content-wrapper">
        <header className="game-header">
          <ScoreBoard
            playerScore={gameState.playerScore}
            cpuScore={gameState.cpuScore}
          />
        </header>

        <main className="game-main">
          <div className="canvas-wrapper">
            <GameCanvas
              soundEnabled={soundEnabled}
              onHit={sound.playHit}
              onSmash={sound.playSmash}
            />

            {/* 得点後スモッグオーバーレイ */}
            {isPointSmog && (
              <div className="countdown-overlay" />
            )}

            {/* 得点後 GO! */}
            {showPointGo && (
              <div className="countdown-overlay">
                <div className="countdown-number countdown-go">
                  GO!
                </div>
              </div>
            )}

            {/* カウントダウンオーバーレイ */}
            {countdown !== null && (
              <div className="countdown-overlay">
                <div
                  key={String(countdown)}
                  className={`countdown-number ${countdown === 'GO!' ? 'countdown-go' : ''}`}
                >
                  {countdown}
                </div>
              </div>
            )}

            {showMessage && (
              <div key={messageKey} className="game-popup-message">
                {messageTextRef.current}
              </div>
            )}

            <MessageDisplay />
          </div>
        </main>

        <footer className="game-footer">
          <p className="controls-hint">
            「← →」で いどう ／ 「スペース」で サーブ・スマッシュ ／ 「Esc」で ポーズ
          </p>
        </footer>
      </div>

      {/* ポーズダイアログ */}
      {gameState.isPaused && (
        <div className="quit-dialog-overlay">
          <div className="quit-dialog">
            <p className="quit-dialog-text">⏸ ポーズ中</p>
            <p className="quit-dialog-subtext">「Esc」か ボタンで もどれるよ</p>
            <div className="quit-dialog-buttons">
              <button
                id="btn-quit-cancel"
                className="quit-btn quit-btn-no"
                onClick={handleResume}
              >
                ▶ ゲームにもどる
              </button>
              <button
                id="btn-quit-confirm"
                className="quit-btn quit-btn-yes"
                onClick={handleQuitConfirm}
              >
                ✕ おわる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
