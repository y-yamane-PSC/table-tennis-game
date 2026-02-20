import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import Button from '../ui/Button';
import './ResultScreen.css';

function ResultScreen() {
  const { navigateTo } = useScreen();
  const { gameState } = useGame();
  const isWin = gameState.playerScore >= 11;

  const handlePlayAgain = () => {
    navigateTo('game');
  };

  const handleGoHome = () => {
    navigateTo('home');
  };

  return (
    <div className="result-screen">
      <div className="result-message">
        {isWin ? (
          <>
            <h1 className="result-title">かち！</h1>
            <p className="result-subtitle">すごいね！ おめでとう！</p>
            <div className="result-icon">👑</div>
            <p className="result-encouragement">よくがんばったね！</p>
          </>
        ) : (
          <>
            <h1 className="result-title">おしい！</h1>
            <p className="result-subtitle">つぎは かてるよ！</p>
            <div className="result-icon">💪</div>
          </>
        )}
      </div>
      
      <div className="result-actions">
        <Button variant="primary" onClick={handlePlayAgain}>
          もういちど あそぶ
        </Button>
        <Button variant="pink" onClick={handleGoHome}>
          はじめに もどる
        </Button>
      </div>
    </div>
  );
}

export default ResultScreen;
