import { useEffect, useState, useRef } from 'react';
import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import ScoreBoard from '../ui/ScoreBoard';
import GameCanvas from '../game/GameCanvas';
import MessageDisplay from '../ui/MessageDisplay';
import './GameScreen.css';

/**
 * メインゲーム画面コンポーネント
 * 1280x720のCanvasを中心に、スコアやエフェクトメッセージを管理します。
 */
function GameScreen() {
  const { navigateTo } = useScreen();
  const { gameState, setGameState } = useGame();
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  // 中断 / 再開
  const handlePauseToggle = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  // 確認ダイアログで「おわる」
  const handleQuitConfirm = () => {
    setGameState(prev => ({ ...prev, isGameActive: false, isPaused: false }));
    navigateTo('home');
  };

  // 確認ダイアログで「ゲームにもどる」
  const handleResume = () => {
    setGameState(prev => ({ ...prev, isPaused: false }));
  };

  // Escキーでポーズ切り替え
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escキーでポーズ状態を切り替え
      if (e.key === 'Escape' && gameState.isGameActive) {
        handlePauseToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isGameActive, setGameState]);
  // マウント時にゲームを開始＆スコアを初期化する
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      playerScore: 0,
      cpuScore: 0,
      rallyCount: 0,
      isGameActive: true,
      isPaused: false,
    }));
  }, [setGameState]);

  // ゲーム終了判定（11点先取）
  useEffect(() => {
    if (gameState.playerScore >= 11 || gameState.cpuScore >= 11) {
      // 少し余韻を残してからリザルト画面へ
      const timer = setTimeout(() => {
        navigateTo('result');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.playerScore, gameState.cpuScore, navigateTo]);

  // 連続得点をトラッキングしてポジティブなフィードバックを表示
  const consecutiveWinsRef = useRef(0);
  const prevScoresRef = useRef({ player: gameState.playerScore, cpu: gameState.cpuScore });

  useEffect(() => {
    if (!gameState.isGameActive) return;

    const prev = prevScoresRef.current;
    let newConsecutiveWins = consecutiveWinsRef.current;
    let shouldShowMessage = false;

    // プレイヤーが得点したか判定
    if (gameState.playerScore > prev.player) {
      newConsecutiveWins += 1;
      // 2点以上連続得点した場合はメッセージを表示対象にする
      if (newConsecutiveWins >= 2) {
        shouldShowMessage = true;
      }
    } 
    // CPUが得点した場合は連続得点をリセット
    else if (gameState.cpuScore > prev.cpu) {
      newConsecutiveWins = 0;
    }

    // 状態を更新
    consecutiveWinsRef.current = newConsecutiveWins;
    prevScoresRef.current = { player: gameState.playerScore, cpu: gameState.cpuScore };

    // メッセージの表示処理を一度だけ行う
    if (shouldShowMessage) {
      const positiveMessages = ['やったね！', 'すごい！', 'そのちょうし！'];
      const randomMsg = positiveMessages[Math.floor(Math.random() * positiveMessages.length)];
      setActiveMessage(randomMsg);
      const timer = setTimeout(() => setActiveMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.playerScore, gameState.cpuScore, gameState.isGameActive]);

  return (
    <div className="game-screen-container">
      {/* 背景の装飾要素（パステルドットなど） */}
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
            <GameCanvas />
            
            {/* ゲームオーバーレイメッセージ */}
            {activeMessage && (
              <div className="game-popup-message">
                {activeMessage}
              </div>
            )}
            
            {/* ボール変化などのシステムメッセージ */}
            <MessageDisplay />
          </div>
        </main>

        <footer className="game-footer">
          <p className="controls-hint">
            「← →」で いどう ／ 「スペース」で サーブ・スマッシュ ／ 「Esc」で ポーズ
          </p>
          
        </footer>
      </div>

      {/* 共通ポーズダイアログ */}
      {gameState.isPaused && (
        <div className="quit-dialog-overlay">
          <div className="quit-dialog">
            <p className="quit-dialog-text">ゲームを ちゅうだん しています</p>
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