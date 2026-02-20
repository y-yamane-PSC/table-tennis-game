import { useEffect } from 'react';
import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import Button from '../ui/Button';
import './HomeScreen.css';

function HomeScreen() {
    const { navigateTo } = useScreen();
    const { gameState, setGameState } = useGame();

    const handleStart = () => {
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
            if (e.key === 'Enter' || e.key === ' ') {
                handleStart();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        // クリーンアップ関数（画面から消える時にリスナーを削除）
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // 空の配列を渡して初回のみ実行
    
    return (
        <div className="home-main">
            <h1 className="main-title">ミラクル・ラリー！キャンディ・マジック✨</h1>

            <Button
            variant="primary"
            onClick={handleStart}
            className="main-start-button"
            >
            スタート
            </Button>
        </div>
    );
}

export default HomeScreen;

