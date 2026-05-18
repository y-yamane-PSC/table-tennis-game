import { useScreen } from '../../contexts/ScreenContext';
import Button from '../ui/Button';
import './TutorialScreen.css';

const CONTROLS = [
  { key: '← →', desc: '左右に うごく' },
  { key: '↑ ↓', desc: '前後に うごく' },
  { key: 'スペース', desc: 'サーブ ／ スマッシュ' },
  { key: 'Esc', desc: 'ポーズ（ちゅうだん）' },
];

const BALLS = [
  {
    icon: '🍓', name: 'ストロベリー',
    effect: 'じぶんの ラケットが おおきくなる！ うちやすくなるよ！',
    duration: '5ラリー',
    color: '#FF3B3B', bgColor: 'rgba(255,80,80,0.1)', borderColor: '#FF3B3B',
    tag: 'じぶんに ゆうり！', tagColor: '#c0001a',
  },
  {
    icon: '💗', name: 'ハート',
    effect: 'ボールが 3つに ふえる！ どれが ほんものか わからないよ！',
    duration: '3ラリー',
    color: '#FF69B4', bgColor: 'rgba(255,105,180,0.1)', borderColor: '#FF69B4',
    tag: 'じぶんに ゆうり！', tagColor: '#c2185b',
  },
  {
    icon: '⭐', name: 'スター',
    effect: 'スマッシュが もっと はやくなる！ チャンスのとき ねらおう！',
    duration: '3ラリー',
    color: '#FFA000', bgColor: 'rgba(255,214,0,0.12)', borderColor: '#FFD700',
    tag: 'スマッシュ で つかおう！', tagColor: '#7a5000',
  },
  {
    icon: '🍬', name: 'キャンディ',
    effect: 'あいての ラケットが ちいさくなる！ てんすう の チャンス！',
    duration: '5ラリー',
    color: '#4169E1', bgColor: 'rgba(65,105,225,0.1)', borderColor: '#87CEEB',
    tag: 'あいてに ふり！', tagColor: '#1a3a8a',
  },
  {
    icon: '🎀', name: 'リボン',
    effect: 'バウンドのとき むきが ランダムにかわる！ よそくしにくいよ！',
    duration: '3ラリー',
    color: '#9932CC', bgColor: 'rgba(153,50,204,0.1)', borderColor: '#DDA0DD',
    tag: 'よそくが むずかしい！', tagColor: '#6a006a',
  },
];

function TutorialScreen() {
  const { navigateTo } = useScreen();

  return (
    <div className="tutorial-screen">
      <div className="tutorial-container">
        <h1 className="tutorial-title">あそびかた</h1>

        {/* ルール */}
        <section className="tutorial-section">
          <h2 className="tutorial-section-title">🏓 ルール</h2>
          <div className="tutorial-rule-box">
            <p>さきに <strong>11てん</strong> とったほうが かち！</p>
            <p>スペースキーで サーブして、<br />ボールが かえってきたら また スペースで スマッシュ！</p>
            <p>5かい うつごとに ボールが とくしゅな ボールに へんかするよ！</p>
          </div>
        </section>

        {/* 操作 */}
        <section className="tutorial-section">
          <h2 className="tutorial-section-title">🎮 そうさ</h2>
          <div className="tutorial-controls-grid">
            {CONTROLS.map(c => (
              <div key={c.key} className="tutorial-control-row">
                <span className="tutorial-key">{c.key}</span>
                <span className="tutorial-key-desc">{c.desc}</span>
              </div>
            ))}
          </div>
          <p className="tutorial-smash-hint">
            💡 スマッシュのコツ：ボールが くるとき に スペースを おすと スマッシュ！ スターボールの ときが チャンス！
          </p>
        </section>

        {/* 特殊ボール */}
        <section className="tutorial-section">
          <h2 className="tutorial-section-title">✨ とくしゅボール（5かいごとに でてくる）</h2>
          <div className="tutorial-balls-grid">
            {BALLS.map(b => (
              <div
                key={b.name}
                className="tutorial-ball-card"
                style={{ background: b.bgColor, borderColor: b.borderColor }}
              >
                <div className="tutorial-ball-icon">{b.icon}</div>
                <div className="tutorial-ball-info">
                  <div className="tutorial-ball-name" style={{ color: b.color }}>{b.name}</div>
                  <div className="tutorial-ball-effect">{b.effect}</div>
                  <div className="tutorial-ball-footer">
                    <span className="tutorial-ball-duration">⏱ {b.duration}</span>
                    <span
                      className="tutorial-ball-tag"
                      style={{ backgroundColor: b.borderColor, color: b.tagColor }}
                    >
                      {b.tag}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="tutorial-back-btn">
          <Button variant="primary" onClick={() => navigateTo('home')}>
            もどる
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TutorialScreen;
