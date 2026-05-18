import { useEffect } from 'react';
import { useScreen } from '../../contexts/ScreenContext';
import { useGame } from '../../contexts/GameContext';
import { useSoundContext } from '../../contexts/SoundContext';
import Button from '../ui/Button';
import './HomeScreen.css';

function HomeScreen() {
    const { navigateTo } = useScreen();
    const { setGameState } = useGame();
    const { sound, soundEnabled } = useSoundContext();

    // ゲーム画面やリザルト画面でBGMが止まった後、ホームに戻ったときに再開する
    useEffect(() => {
        if (soundEnabled) sound.startBGM();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStart = () => {
        sound.playButton();
        setGameState(prev => ({ ...prev, config: { ...prev.config } }));
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
                    <Button
                        variant="primary"
                        onClick={() => { sound.playButton(); navigateTo('tutorial'); }}
                        className="main-changelog-button"
                    >
                        あそびかた
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => { sound.playButton(); navigateTo('changelog'); }}
                        className="main-changelog-button"
                    >
                        へんこう りれき
                    </Button>
                    <p className="start-hint">「スペース」か「エンター」でも はじまるよ♪</p>
                </div>
            </div>
        </div>
    );
}

export default HomeScreen;
