'use client';

import { useState } from 'react';
import Game2048 from './components/Game2048';

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);

  if (gameStarted) {
    return (
      <main className="app-background">
        <div className="ambient-orb orb-a" aria-hidden="true" />
        <div className="ambient-orb orb-b" aria-hidden="true" />
        <Game2048 onExit={() => setGameStarted(false)} />
      </main>
    );
  }

  return (
    <main className="app-background">
      <div className="ambient-orb orb-a" aria-hidden="true" />
      <div className="ambient-orb orb-b" aria-hidden="true" />
      <div className="hero-shell">
        <section className="hero-card">
          <p className="hero-eyebrow">Number Fusion</p>
          <h1 className="hero-title">2048</h1>
          <p className="hero-description">
            滑动方块，连续合成更大的数字。每一次移动都要预判下一步，尽量保持棋盘空间。
          </p>
          <button type="button" onClick={() => setGameStarted(true)} className="hero-cta">
            开始挑战
          </button>
        </section>
        <section className="hero-sidecard" aria-label="玩法提示">
          <h2>玩法规则</h2>
          <ul>
            <li>方向键或滑动控制所有方块移动</li>
            <li>相同数字碰撞会自动合并并得分</li>
            <li>每回合会随机出现 2 或 4</li>
            <li>合成到 2048 即达成目标</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
