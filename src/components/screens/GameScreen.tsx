import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import ScoreBoard from '../ui/ScoreBoard';
import GameCanvas from '../game/GameCanvas';
import MessageDisplay from '../ui/MessageDisplay';
import './GameScreen.css';

function GameScreen() {
  const { gameState } = useGame();

  return (
    <div className="game-screen">
      <ScoreBoard 
        playerScore={gameState.playerScore} 
        cpuScore={gameState.cpuScore} 
      />
      <GameCanvas />
      <MessageDisplay />
    </div>
  );
}

export default GameScreen;
