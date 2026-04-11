import { useEffect, useRef, useState } from 'react';
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

  const [showMessage, setShowMessage] = useState(false);
  const positiveMessages = ['やったね！', 'すごい！', 'そのちょうし！'];
  const scoreMsgRef = useRef({ score: -1, text: '' });
  if (gameState.playerScore !== scoreMsgRef.current.score) {
    scoreMsgRef.current = {
      score: gameState.playerScore,
      text: positiveMessages[Math.floor(Math.random() * positiveMessages.length)],
    };
  }

  // プレイヤー得点時のみメッセージを表示
  useEffect(() => {
    if (gameState.playerScore > 0) {
      setShowMessage(true);
    }
  }, [gameState.playerScore]);

  // CPU得点時は必ずメッセージを非表示
  useEffect(() => {
    setShowMessage(false);
  }, [gameState.cpuScore]);

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
      lastScorer: null,
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
            
            {/* ゲームオーバーレイメッセージ（プレイヤー得点時のみ表示） */}
            {showMessage && (
              <div key={gameState.playerScore} className="game-popup-message">
                {scoreMsgRef.current.text}
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