import { useState, useEffect } from 'react';
import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import { Difficulty } from '../../types/game';
import Button from '../ui/Button';
import './DifficultyScreen.css';

function DifficultyScreen() {
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

  const handleBack = () => {
    setGameState(prev => ({
      ...prev,
      config: {
        ...prev.config,
      },
    }));
    navigateTo('home');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];
        const currentIndex = difficulties.indexOf(selectedDifficulty);
        let newIndex = currentIndex;

        if (e.key === 'ArrowLeft') {
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
    <div className="home-screen screen-transition">
      <div className="home-header">
        <h1 className="title">むずかしさを えらんでね
        </h1>
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

        <div className="action-buttons-row">
          <Button
            variant="primary"
            onClick={handleStart}
            className="start-button"
          >
            けってい
          </Button>
          <Button
            variant='primary'
            onClick={handleBack}
            className="back-button"
          >
            もどる
          </Button>
        </div>
      </div>


      <div className="home-footer">
        <p>あそびかた：← →でえらんで、スペースキーでけってい</p>
      </div>
    </div>
  );
}

export default DifficultyScreen;
