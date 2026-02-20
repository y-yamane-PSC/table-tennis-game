import { useState, useEffect } from 'react';
import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import { RacketType } from '../../types/game';
import Button from '../ui/Button';
import './RacketSelectScreen.css';

function RacketSelectScreen() {
  const { navigateTo } = useScreen();
  const { gameState, setGameState } = useGame();
  const [selectedRacket, setSelectedRacket] = useState<RacketType>('normal');

  const handleRacketSelect = (racketType: RacketType) => {
    setSelectedRacket(racketType);
  };

  const handleConfirm = () => {
    setGameState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        racketType: selectedRacket,
      },
    }));
    navigateTo('game');
  };

  const handleBack = () => {
    setGameState(prev => ({
      ...prev,
      config: {
        ...prev.config,
      },
    }));
    navigateTo('difficulty');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const rackets: RacketType[] = ['normal', 'speed', 'wide'];
        const currentIndex = rackets.indexOf(selectedRacket);
        let newIndex = currentIndex;
        
        if (e.key === 'ArrowLeft') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : rackets.length - 1;
        } else {
          newIndex = currentIndex < rackets.length - 1 ? currentIndex + 1 : 0;
        }
        
        setSelectedRacket(rackets[newIndex]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRacket]);

  const racketDescriptions: Record<RacketType, string> = {
    normal: 'バランスの良い性能',
    speed: 'スマッシュの速度が1.2倍になるが当たり判定が20%低下',
    wide: '当たり判定が1.2倍になるが移動速度が20%低下',
  };

  return (
    <div className="racket-select-screen">
      <div className="racket-select-header">
        <h2>ラケットを えらんでね</h2>
      </div>
      
      <div className="racket-select-main">
        <div className="racket-cards">
          <div 
            className={`racket-card ${selectedRacket === 'normal' ? 'selected' : ''}`}
            onClick={() => handleRacketSelect('normal')}
          >
            <h3>ノーマルラケット</h3>
            <p>{racketDescriptions.normal}</p>
          </div>
          
          <div 
            className={`racket-card ${selectedRacket === 'speed' ? 'selected' : ''}`}
            onClick={() => handleRacketSelect('speed')}
          >
            <h3>スピードラケット</h3>
            <p>{racketDescriptions.speed}</p>
          </div>
          
          <div 
            className={`racket-card ${selectedRacket === 'wide' ? 'selected' : ''}`}
            onClick={() => handleRacketSelect('wide')}
          >
            <h3>ワイドラケット</h3>
            <p>{racketDescriptions.wide}</p>
          </div>
        </div>
        
        <Button
          variant="primary"
          onClick={handleConfirm}
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
  );
}

export default RacketSelectScreen;
