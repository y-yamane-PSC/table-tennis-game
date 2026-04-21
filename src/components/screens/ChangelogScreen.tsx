import { useScreen } from '../../contexts/ScreenContext';
import Button from '../ui/Button';
import './ChangelogScreen.css';

interface ChangelogItem {
    date: string;
    version: string;
    changes: string[];
}

const CHANGELOG_DATA: ChangelogItem[] = [
    {
       date: '2026-04-21',
        version: '1.3.0',
        changes: [
            'あたりはんていによって ラケットのながさが かわるようになったよ',
            'たまが なにに へんしんしたのか わかりやすくしたよ！',
            'ラケットの せいのうを ちょうせいしたよ'
        ]
    },
    {
        date: '2026-04-20',
        version: '1.2.0',
        changes: [
            'へんこうりれき（このがめん）を みられるようになったよ！',
            'システムをつかいやすく ちょっぴり アップデートしたよ！'
        ]
    },
    {
        date: '2026-04-14',
        version: '1.1.0',
        changes: [
            'がめんの きりかわりが もっと スムーズになったよ！',
            'ラケットが ３Ｄで みえるようになったよ！',
            'スマッシュの はやさや アミ（ネット）の あたりはんていを ちょうせいしたよ！'
        ]
    },
    {
        date: '2026-04-03',
        version: '1.0.0',
        changes: [
            '「ミラクルラリー・キャンディーマジック！」が はじまったよ！',
            'かわいいラケットを えらんで あそんでね！'
        ]
    }
];

function ChangelogScreen() {
    const { navigateTo } = useScreen();

    return (
        <div className="changelog-main screen-transition">
            <div className="changelog-overlay">
                <h1 className="changelog-title">へんこう りれき <span className="changelog-sparkle">✨</span></h1>
                
                <div className="changelog-list-container">
                    {CHANGELOG_DATA.map((item, index) => (
                        <div key={index} className="changelog-item">
                            <h2 className="changelog-version">
                                バージョン {item.version} <span className="changelog-date">({item.date})</span>
                            </h2>
                            <ul className="changelog-changes">
                                {item.changes.map((change, i) => (
                                    <li key={i}>{change}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="changelog-footer">
                    <Button 
                        variant="pink" 
                        onClick={() => navigateTo('home')}
                        className="changelog-back-button"
                    >
                        ホームにもどる
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ChangelogScreen;
