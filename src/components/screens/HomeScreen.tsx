import { useState, useEffect } from 'react';
import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import { Difficulty } from '../../types/game';
import Button from '../ui/Button';
import './HomeScreen.css';

function HomeScreen() {
  const { navigateTo } = useScreen();
  const { gameState, setGameState } = useGame();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
  };

  const handleStart = () => {
    setGameState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        difficulty: selectedDifficulty,
      },
    }));
    navigateTo('racketSelect');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];
        const currentIndex = difficulties.indexOf(selectedDifficulty);
        let newIndex = currentIndex;
        
        if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : difficulties.length - 1;
        } else {
          newIndex = currentIndex < difficulties.length - 1 ? currentIndex + 1 : 0;
        }
        
        setSelectedDifficulty(difficulties[newIndex]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        handleStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDifficulty]);

  return (
    <div className="home-screen">
      <div className="home-header">
        <h1 className="title">どきどきピンポン✨</h1>
      </div>
      
      <div className="home-main">
        <div className="difficulty-buttons">
          <Button
            variant="pink"
            onClick={() => handleDifficultySelect('easy')}
            isSelected={selectedDifficulty === 'easy'}
            icon="🌸"
            className='topButton'
          >
            やさしい
          </Button>
          <Button
            variant="blue"
            onClick={() => handleDifficultySelect('normal')}
            isSelected={selectedDifficulty === 'normal'}
            icon="⭐"
            className='topButton'
          >
            ふつう
          </Button>
          <Button
            variant="purple"
            onClick={() => handleDifficultySelect('hard')}
            isSelected={selectedDifficulty === 'hard'}
            icon="⚡"
            
          >
            むずかしい
          </Button>
        </div>
        
        <Button
          variant="primary"
          onClick={handleStart}
          className="start-button"
        >
          スタート
        </Button>
      </div>
      
      <div className="home-footer">
        <p>あそびかた：方向キーでえらんで、スペースキーでけってい</p>
      </div>
    </div>
  );
}

export default HomeScreen;
