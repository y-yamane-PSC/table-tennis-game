import './ScoreBoard.css';

interface ScoreBoardProps {
  playerScore: number;
  cpuScore: number;
}

function ScoreBoard({ playerScore, cpuScore }: ScoreBoardProps) {
  return (
    <div className="score-board">
      <div className="score-item">
        <span className="score-icon">💖</span>
        <span className="score-value">{playerScore}</span>
      </div>
      <div className="score-divider">　VS　</div>
      <div className="score-item">
        <span className="score-value">{cpuScore}</span>
        <span className="score-icon">💙</span>
      </div>
    </div>
  );
}

export default ScoreBoard;
