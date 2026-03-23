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
    normal: 'バランスの良い性能←初めての方にオススメ',
    speed: 'スマッシュの速度が1.2倍になるが当たり判定が20%低下',
    wide: '当たり判定が1.2倍になるが移動速度が20%低下',
  };

  return (
    <div className="racket-select-screen">
      <div className="racket-select-header">
        <h1>ラケットを えらんでね</h1>
      </div>
      
      <div className="racket-select-main">
        <div className="racket-cards">
          <div 
            className={`racket-card ${selectedRacket === 'normal' ? 'selected' : ''}`}
            onClick={() => handleRacketSelect('normal')}
          >
            <img
              src="./images/normal.png"
              alt="ノーマルラケット"
              className='racket-img'
            />
            <h3>ノーマルラケット</h3>
            <p>{racketDescriptions.normal}</p>
          </div>
          
          <div 
            className={`racket-card ${selectedRacket === 'speed' ? 'selected' : ''}`}
            onClick={() => handleRacketSelect('speed')}
          >
            <img
              src="./images/speed.png"
              alt="スピードラケット"
               className='racket-img'
            />
            <h3>スピードラケット</h3>
            <p>{racketDescriptions.speed}</p>
          </div>
          
          <div 
            className={`racket-card ${selectedRacket === 'wide' ? 'selected' : ''}`}
            onClick={() => handleRacketSelect('wide')}
          >
            <img
              src="./images/wide.png"
              alt="ワイドラケット"
              className='racket-img'
            />
            <h3>ワイドラケット</h3>
            <p>{racketDescriptions.wide}</p>
          </div>
        </div>
        
        <Button
          variant="primary"
          onClick={handleConfirm}
          className="decision-button"
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
