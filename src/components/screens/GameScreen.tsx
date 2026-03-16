import React, { useEffect, useState } from 'react';
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

  // 得点時のポジティブなフィードバック演出用
  useEffect(() => {
    if (gameState.playerScore > 0 && gameState.isGameActive) {
      const positiveMessages = ['やったね！', 'すごい！', 'そのちょうし！'];
      const randomMsg = positiveMessages[Math.floor(Math.random() * positiveMessages.length)];
      setActiveMessage(randomMsg);
      
      const timer = setTimeout(() => setActiveMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.playerScore]);

  return (
    <div className="game-screen-container">
      {/* 背景の装飾要素（パステルドットなど） */}
      <div className="game-background-decoration" />

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
          「← →」で いどう ／ 「スペース」で スマッシュ！
        </p>
      </footer>
    </div>
  );
}

export default GameScreen;