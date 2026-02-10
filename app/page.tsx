'use client';

import { useCallback, useEffect, useState } from 'react';
import Game2048 from './components/Game2048';
import type { DailyChallenge, GameMode } from './types/leaderboard';

type GameSession = {
  mode: GameMode;
  challenge: DailyChallenge | null;
};

export default function Home() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [isChallengeLoading, setIsChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState('');

  const loadDailyChallenge = useCallback(async () => {
    setIsChallengeLoading(true);
    setChallengeError('');

    try {
      const response = await fetch('/api/challenge/today', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load challenge');
      }

      const data = (await response.json()) as DailyChallenge;
      setDailyChallenge(data);
      return data;
    } catch {
      setChallengeError('每日挑战暂时不可用，请稍后再试。');
      return null;
    } finally {
      setIsChallengeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDailyChallenge();
  }, [loadDailyChallenge]);

  if (session) {
    return (
      <main className="app-background">
        <div className="ambient-orb orb-a" aria-hidden="true" />
        <div className="ambient-orb orb-b" aria-hidden="true" />
        <Game2048
          onExit={() => setSession(null)}
          mode={session.mode}
          challenge={session.challenge}
        />
      </main>
    );
  }

  const startClassic = () => {
    setSession({
      mode: 'classic',
      challenge: null,
    });
  };

  const startDailyChallenge = async () => {
    const challenge = dailyChallenge ?? (await loadDailyChallenge());
    if (!challenge) return;

    setSession({
      mode: 'daily',
      challenge,
    });
  };

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
          <div className="hero-actions">
            <button type="button" onClick={startClassic} className="hero-cta">
              经典模式
            </button>
            <button
              type="button"
              onClick={() => {
                void startDailyChallenge();
              }}
              className="hero-cta secondary"
              disabled={isChallengeLoading}
            >
              {isChallengeLoading ? '加载中...' : '每日挑战'}
            </button>
          </div>
          {dailyChallenge && (
            <p className="hero-meta">
              今日挑战: {dailyChallenge.date} (UTC) | 所有玩家使用同一随机种子开局
            </p>
          )}
          {challengeError && <p className="hero-error">{challengeError}</p>}
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
