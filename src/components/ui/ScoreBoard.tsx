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
        <span
          key={`player-${playerScore}`}
          className={`score-value ${playerScore > 0 ? 'score-pop' : ''}`}
        >
          {playerScore}
        </span>
      </div>
      <div className="score-divider">　VS　</div>
      <div className="score-item">
        <span
          key={`cpu-${cpuScore}`}
          className={`score-value ${cpuScore > 0 ? 'score-pop' : ''}`}
        >
          {cpuScore}
        </span>
        <span className="score-icon">💙</span>
      </div>
    </div>
  );
}

export default ScoreBoard;
