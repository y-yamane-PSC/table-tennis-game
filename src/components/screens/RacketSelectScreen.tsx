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
    // ラケット設定をstateに反映
    setGameState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        racketType: selectedRacket,
      },
    }));
    // 選択したラケット情報だけを渡して次画面へ
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
        const rackets: RacketType[] = ['normal', 'power', 'wide'];
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
    normal: 'とてもつかいやすいラケットだよ！',
    power: 'ボールがいつもよりはやくなるよ！',
    wide: 'あてるのがすごくかんたんだよ！',
  };

  return (
    <div className="racket-select-screen screen-transition">
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
            {selectedRacket === 'normal' && <p>{racketDescriptions.normal}</p>}
          </div>
          
          <div 
            className={`racket-card ${selectedRacket === 'power' ? 'selected' : ''}`}
            onClick={() => handleRacketSelect('power')}
          >
            <img
              src="./images/power.png"
              alt="パワーラケット"
               className='racket-img'
            />
            <h3>パワーラケット</h3>
            {selectedRacket === 'power' && <p>{racketDescriptions.power}</p>}
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
            {selectedRacket === 'wide' && <p>{racketDescriptions.wide}</p>}
          </div>
        </div>
        <div className="action-buttons-row">
          <Button
            variant="primary"
            onClick={handleConfirm}
          >
            けってい
          </Button>
          <Button
            variant='primary'
            onClick={handleBack}
          >
            もどる
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RacketSelectScreen;
