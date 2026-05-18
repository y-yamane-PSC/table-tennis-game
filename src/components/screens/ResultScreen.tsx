import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import { useSoundContext } from '../../contexts/SoundContext';
import Button from '../ui/Button';
import './ResultScreen.css';

function ResultScreen() {
  const { navigateTo } = useScreen();
  const { gameState } = useGame();
  const { sound } = useSoundContext();
  const isWin = gameState.playerScore >= 11;

  const totalWins  = Number.parseInt(localStorage.getItem('totalWins')     || '0', 10);
  const totalPlays = Number.parseInt(localStorage.getItem('totalPlays')    || '0', 10);
  const bestRally  = Number.parseInt(localStorage.getItem('bestRallyCount')|| '0', 10);

  const handlePlayAgain = () => { sound.playButton(); navigateTo('game'); };
  const handleGoHome    = () => { sound.playButton(); navigateTo('home'); };

  return (
    <div className="result-screen">
      {/* タイトル＋アイコン横並び */}
      <div className="result-message">
        <div className="result-icon">{isWin ? '👑' : '💪'}</div>
        <div className="result-text-block">
          <h1 className="result-title">{isWin ? 'かち！' : 'おしい！'}</h1>
          <p className="result-subtitle">
            {isWin ? 'すごいね！ おめでとう！' : 'つぎは かてるよ！'}
          </p>
          {isWin && <p className="result-encouragement">よくがんばったね！</p>}
        </div>
      </div>

      {/* ハイスコア・統計（横並び） */}
      <div className="result-stats">
        <div className="result-stat-card">
          <span className="result-stat-label">🏆 さいこうラリー</span>
          <span className="result-stat-value">{bestRally}<small> かい</small></span>
        </div>
        <div className="result-stat-divider" />
        <div className="result-stat-card">
          <span className="result-stat-label">🎮 あそんだ</span>
          <span className="result-stat-value">{totalPlays}<small> かい</small></span>
        </div>
        <div className="result-stat-divider" />
        <div className="result-stat-card">
          <span className="result-stat-label">🌟 かった</span>
          <span className="result-stat-value">{totalWins}<small> かい</small></span>
        </div>
      </div>

      {/* ボタン横並び */}
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
