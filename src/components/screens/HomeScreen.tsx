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
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="home-main screen-transition">
            <div className="home-overlay">
                <div className="title-container">
                    <h1 className="main-title">
                        <span className="title-line1">ミラクル・ラリー！</span>
                        <br />
                        <span className="title-line2">キャンディ・マジック<span className="title-sparkle">✨</span></span>
                    </h1>
                </div>

                <div className="start-button-wrapper">
                    <Button
                        variant="primary"
                        onClick={handleStart}
                        className="main-start-button"
                    >
                        スタート
                    </Button>
                    <p className="start-hint">「スペース」か「エンター」でも はじまるよ♪</p>
                </div>
            </div>
        </div>
    );
}

export default HomeScreen;
