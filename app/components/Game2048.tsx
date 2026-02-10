'use client';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Home,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DailyChallenge,
  GameMode,
  LeaderboardScope,
  LeaderboardSnapshot,
} from '../types/leaderboard';
import { Direction, GameState, Grid } from '../types/game';

const GRID_SIZE = 4;
const WINNING_NUMBER = 2048;
const HIGH_SCORE_KEY = 'highScore';
const SOUND_KEY = 'soundEnabled';
const PLAYER_ID_KEY = 'playerId';
const PLAYER_NAME_KEY = 'playerName';
const SWIPE_THRESHOLD = 40;

type MoveResult = {
  grid: Grid;
  moved: boolean;
  scoreGain: number;
  mergedCells: Set<string>;
};

type AddRandomCellResult = {
  grid: Grid;
  newCell: string | null;
};

type RandomFn = () => number;

type Game2048Props = {
  onExit?: () => void;
  mode?: GameMode;
  challenge?: DailyChallenge | null;
};

const cloneGrid = (grid: Grid): Grid => grid.map((row) => [...row]);

const createEmptyGrid = (): Grid =>
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

const getStoredHighScore = (): number => {
  if (typeof window === 'undefined') return 0;
  const value = Number(window.localStorage.getItem(HIGH_SCORE_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const buildPlayerId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

const getStoredPlayerId = (): string => {
  if (typeof window === 'undefined') return 'server-player';

  const current = window.localStorage.getItem(PLAYER_ID_KEY);
  if (current && current.length >= 6) {
    return current;
  }

  const next = buildPlayerId();
  window.localStorage.setItem(PLAYER_ID_KEY, next);
  return next;
};

const getStoredPlayerName = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(PLAYER_NAME_KEY) ?? '';
};

const defaultPlayerName = (playerId: string): string => `Player-${playerId.slice(-4).toUpperCase()}`;

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: string): RandomFn => {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const addRandomCell = (grid: Grid, randomFn: RandomFn): AddRandomCellResult => {
  const emptyCells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (grid[row][col] === null) {
        emptyCells.push({ row, col });
      }
    }
  }

  if (emptyCells.length === 0) {
    return { grid, newCell: null };
  }

  const pick = emptyCells[Math.floor(randomFn() * emptyCells.length)];
  const nextGrid = cloneGrid(grid);
  nextGrid[pick.row][pick.col] = randomFn() < 0.9 ? 2 : 4;

  return {
    grid: nextGrid,
    newCell: `${pick.row}-${pick.col}`,
  };
};

const createInitialGrid = (randomFn: RandomFn): Grid => {
  const first = addRandomCell(createEmptyGrid(), randomFn);
  const second = addRandomCell(first.grid, randomFn);
  return second.grid;
};

const isGameOver = (grid: Grid): boolean => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const current = grid[row][col];
      if (current === null) return false;
      if (col < GRID_SIZE - 1 && grid[row][col + 1] === current) return false;
      if (row < GRID_SIZE - 1 && grid[row + 1][col] === current) return false;
    }
  }
  return true;
};

const computeMove = (grid: Grid, direction: Direction): MoveResult => {
  const nextGrid = cloneGrid(grid);
  const mergedCells = new Set<string>();
  const isHorizontal = direction === 'left' || direction === 'right';
  const isReverse = direction === 'right' || direction === 'down';

  let moved = false;
  let scoreGain = 0;

  const getLine = (index: number): Array<{ value: number; row: number; col: number }> => {
    const items: Array<{ value: number; row: number; col: number }> = [];
    for (let offset = 0; offset < GRID_SIZE; offset += 1) {
      const row = isHorizontal ? index : offset;
      const col = isHorizontal ? offset : index;
      const value = nextGrid[row][col];
      if (value !== null) {
        items.push({ value, row, col });
      }
    }
    return items;
  };

  const setLine = (index: number, values: Array<number | null>) => {
    for (let offset = 0; offset < GRID_SIZE; offset += 1) {
      const row = isHorizontal ? index : offset;
      const col = isHorizontal ? offset : index;
      nextGrid[row][col] = values[offset];
    }
  };

  for (let index = 0; index < GRID_SIZE; index += 1) {
    let items = getLine(index);
    if (isReverse) items = items.reverse();
    if (items.length === 0) continue;

    const mergedValues: number[] = [];
    let writeIndex = 0;

    for (let pointer = 0; pointer < items.length; pointer += 1) {
      const current = items[pointer];
      const next = items[pointer + 1];
      if (next && next.value === current.value) {
        const merged = current.value * 2;
        mergedValues.push(merged);
        scoreGain += merged;

        const targetIndex = isReverse ? GRID_SIZE - 1 - writeIndex : writeIndex;
        const row = isHorizontal ? index : targetIndex;
        const col = isHorizontal ? targetIndex : index;
        mergedCells.add(`${row}-${col}`);

        writeIndex += 1;
        pointer += 1;
      } else {
        mergedValues.push(current.value);
        writeIndex += 1;
      }
    }

    const filledLine: Array<number | null> = mergedValues.concat(
      Array(GRID_SIZE - mergedValues.length).fill(null),
    );
    const finalLine = isReverse ? [...filledLine].reverse() : filledLine;

    const previousLine = Array.from({ length: GRID_SIZE }, (_, offset) => {
      const row = isHorizontal ? index : offset;
      const col = isHorizontal ? offset : index;
      return grid[row][col];
    });

    if (previousLine.some((value, offset) => value !== finalLine[offset])) {
      moved = true;
    }

    setLine(index, finalLine);
  }

  return { grid: nextGrid, moved, scoreGain, mergedCells };
};

const getTileClassName = (value: number): string => {
  if (value <= 2048) return `tile-${value}`;
  return 'tile-super';
};

const getTileScaleClass = (value: number): string => {
  if (value >= 1024) return 'tile-sm';
  if (value >= 128) return 'tile-md';
  return '';
};

const Game2048 = ({ onExit, mode = 'classic', challenge = null }: Game2048Props) => {
  const challengeSeed = mode === 'daily' ? challenge?.seed ?? '' : '';
  const isDailyMode = mode === 'daily' && Boolean(challengeSeed);

  const randomRef = useRef<RandomFn>(Math.random);

  const resetRandomSource = useCallback(() => {
    randomRef.current = isDailyMode ? createSeededRandom(challengeSeed) : Math.random;
  }, [challengeSeed, isDailyMode]);

  const createFreshGameState = useCallback(
    (highScore: number): GameState => {
      resetRandomSource();
      return {
        grid: createInitialGrid(randomRef.current),
        score: 0,
        highScore,
        gameOver: false,
        won: false,
      };
    },
    [resetRandomSource],
  );

  const [gameState, setGameState] = useState<GameState>(() => createFreshGameState(getStoredHighScore()));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SOUND_KEY) !== 'false';
  });
  const [moves, setMoves] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    isDailyMode ? '每日挑战已开始，使用方向键或滑动合成' : '使用方向键或滑动开始合成',
  );
  const [newCells, setNewCells] = useState<Set<string>>(new Set());
  const [mergedCells, setMergedCells] = useState<Set<string>>(new Set());
  const [boardPulse, setBoardPulse] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [lastDirection, setLastDirection] = useState<Direction | null>(null);
  const [submittedCurrentRound, setSubmittedCurrentRound] = useState(false);

  const [playerId] = useState<string>(() => getStoredPlayerId());
  const [playerName, setPlayerName] = useState<string>(() => getStoredPlayerName());

  const [leaderboard, setLeaderboard] = useState<LeaderboardSnapshot | null>(null);
  const [activeScope, setActiveScope] = useState<LeaderboardScope>(isDailyMode ? 'challenge' : 'all');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardMessage, setLeaderboardMessage] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);

  const gameStateRef = useRef(gameState);
  const mergeSoundRef = useRef<HTMLAudioElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActiveScope(isDailyMode ? 'challenge' : 'all');
  }, [isDailyMode]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HIGH_SCORE_KEY, String(gameState.highScore));
  }, [gameState.highScore]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SOUND_KEY, String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PLAYER_NAME_KEY, playerName.trim());
  }, [playerName]);

  useEffect(() => {
    const sound = new Audio('/sounds/merge-confirmation.wav');
    sound.preload = 'auto';
    sound.volume = 0.14;
    mergeSoundRef.current = sound;
    sound.load();

    return () => {
      sound.pause();
      mergeSoundRef.current = null;
    };
  }, []);

  const displayPlayerName = useMemo(
    () => (playerName.trim() ? playerName.trim() : defaultPlayerName(playerId)),
    [playerId, playerName],
  );

  const refreshLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardMessage('');

    try {
      const query = new URLSearchParams();
      query.set('limit', '8');
      if (challenge?.id) {
        query.set('challengeId', challenge.id);
      }

      const response = await fetch(`/api/leaderboard?${query.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load leaderboard');
      }

      const payload = (await response.json()) as LeaderboardSnapshot;
      setLeaderboard(payload);
    } catch {
      setLeaderboardMessage('排行榜加载失败，请稍后重试。');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [challenge?.id]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  const playMergeSound = useCallback(() => {
    if (!soundEnabled || !mergeSoundRef.current) return;
    if (!mergeSoundRef.current.paused) {
      mergeSoundRef.current.currentTime = 0;
    }
    mergeSoundRef.current.play().catch(() => {
      // Browser autoplay policies may block initial playback.
    });
  }, [soundEnabled]);

  const resetGame = useCallback(() => {
    const nextState = createFreshGameState(gameStateRef.current.highScore);
    gameStateRef.current = nextState;
    setGameState(nextState);
    setMoves(0);
    setStatusMessage(isDailyMode ? '每日挑战新局开始，祝你上榜' : '新局开始，祝你合成顺利');
    setNewCells(new Set());
    setMergedCells(new Set());
    setShowWinModal(false);
    setLastDirection(null);
    setSubmittedCurrentRound(false);
    setLeaderboardMessage('');
  }, [createFreshGameState, isDailyMode]);

  const submitScore = useCallback(async () => {
    if (submittedCurrentRound || gameStateRef.current.score <= 0) {
      return;
    }

    setSubmittingScore(true);

    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          name: displayPlayerName,
          score: gameStateRef.current.score,
          moves,
          mode: isDailyMode ? 'daily' : 'classic',
          challengeId: challenge?.id ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit score');
      }

      const payload = (await response.json()) as LeaderboardSnapshot;
      setLeaderboard(payload);
      setSubmittedCurrentRound(true);
      setLeaderboardMessage('成绩已提交，排行榜已更新。');
    } catch {
      setLeaderboardMessage('成绩提交失败，请稍后重试。');
    } finally {
      setSubmittingScore(false);
    }
  }, [challenge?.id, displayPlayerName, isDailyMode, moves, playerId, submittedCurrentRound]);

  useEffect(() => {
    if ((gameState.gameOver || showWinModal) && !submittedCurrentRound && gameState.score > 0) {
      void submitScore();
    }
  }, [gameState.gameOver, gameState.score, showWinModal, submitScore, submittedCurrentRound]);

  const moveGrid = useCallback(
    (direction: Direction) => {
      const current = gameStateRef.current;
      if (current.gameOver) return;

      const moveResult = computeMove(current.grid, direction);
      if (!moveResult.moved) {
        setStatusMessage('这个方向无法移动');
        return;
      }

      const randomResult = addRandomCell(moveResult.grid, randomRef.current);
      const nextScore = current.score + moveResult.scoreGain;
      const nextHighScore = Math.max(current.highScore, nextScore);
      const reached2048 = randomResult.grid.some((row) => row.some((cell) => cell === WINNING_NUMBER));
      const won = current.won || reached2048;
      const gameOver = isGameOver(randomResult.grid);

      const nextState: GameState = {
        grid: randomResult.grid,
        score: nextScore,
        highScore: nextHighScore,
        won,
        gameOver,
      };

      gameStateRef.current = nextState;
      setGameState(nextState);
      setMoves((value) => value + 1);
      setMergedCells(moveResult.mergedCells);
      setNewCells(randomResult.newCell ? new Set([randomResult.newCell]) : new Set());
      setLastDirection(direction);
      setBoardPulse((value) => value + 1);

      if (moveResult.scoreGain > 0) {
        playMergeSound();
      }

      if (reached2048 && !current.won) {
        setShowWinModal(true);
        setStatusMessage('已达成 2048，可以继续挑战更高分');
        return;
      }
      if (gameOver) {
        setStatusMessage('没有可移动方块了');
        return;
      }
      if (nextHighScore > current.highScore) {
        setStatusMessage(`新纪录 ${nextHighScore}`);
        return;
      }
      if (moveResult.scoreGain > 0) {
        setStatusMessage(`合并得分 +${moveResult.scoreGain}`);
        return;
      }
      setStatusMessage('移动成功');
    },
    [playMergeSound],
  );

  useEffect(() => {
    const keyToDirection: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = keyToDirection[event.key];
      if (!direction) return;
      event.preventDefault();
      moveGrid(direction);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveGrid]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!touchStartRef.current) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) return;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        moveGrid(deltaX > 0 ? 'right' : 'left');
      } else {
        moveGrid(deltaY > 0 ? 'down' : 'up');
      }
    },
    [moveGrid],
  );

  const directionLabel = useMemo(() => {
    if (!lastDirection) return '未操作';
    const labels: Record<Direction, string> = {
      up: '上',
      down: '下',
      left: '左',
      right: '右',
    };
    return labels[lastDirection];
  }, [lastDirection]);

  const scopeTabs = useMemo(
    () => [
      { key: 'all' as const, label: '总榜' },
      { key: 'daily' as const, label: '今日' },
      { key: 'weekly' as const, label: '本周' },
      ...(isDailyMode && challenge ? ([{ key: 'challenge' as const, label: '挑战榜' }] as const) : []),
    ],
    [challenge, isDailyMode],
  );

  const activeEntries = useMemo(() => {
    if (!leaderboard) return [];

    if (activeScope === 'all') return leaderboard.all;
    if (activeScope === 'daily') return leaderboard.daily;
    if (activeScope === 'weekly') return leaderboard.weekly;
    return leaderboard.challenge;
  }, [activeScope, leaderboard]);

  return (
    <section className="game-shell">
      <header className="game-header">
        <div>
          <p className="game-eyebrow">{isDailyMode ? 'DAILY CHALLENGE' : 'PUZZLE MODE'}</p>
          <h1 className="game-title">2048</h1>
          <p className="game-subtitle">
            {isDailyMode && challenge
              ? `每日挑战 ${challenge.date} (UTC)，与所有玩家同盘面开局`
              : '合并相同数字，冲击更高分'}
          </p>
          {isDailyMode && challenge && <p className="challenge-chip">挑战编号: {challenge.id}</p>}
        </div>
        <div className="score-grid">
          <article className="score-card">
            <p className="score-label">分数</p>
            <p className="score-value">{gameState.score}</p>
          </article>
          <article className="score-card">
            <p className="score-label">最高分</p>
            <p className="score-value">{gameState.highScore}</p>
          </article>
          <article className="score-card">
            <p className="score-label">步数</p>
            <p className="score-value">{moves}</p>
          </article>
        </div>
      </header>

      <div className="playfield-layout">
        <div className="playfield-main">
          <div className="control-row">
            <button type="button" className="control-btn primary" onClick={resetGame}>
              <RefreshCw size={16} />
              重新开始
            </button>
            <button
              type="button"
              className="control-btn"
              onClick={() => setSoundEnabled((enabled) => !enabled)}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {soundEnabled ? '音效开启' : '音效关闭'}
            </button>
            {onExit && (
              <button type="button" className="control-btn ghost" onClick={onExit}>
                <Home size={16} />
                返回首页
              </button>
            )}
          </div>

          <div className="status-row">
            <p className="status-chip" role="status" aria-live="polite">
              {statusMessage}
            </p>
            <p className="direction-chip">上次方向: {directionLabel}</p>
          </div>

          <div
            className={`game-container ${boardPulse % 2 === 0 ? '' : 'board-pulse'}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
              touchStartRef.current = null;
            }}
            aria-label="2048 游戏棋盘"
          >
            <div className="game-grid" aria-hidden="true">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => (
                <div key={index} className="grid-cell" />
              ))}
            </div>

            <div className="tile-layer">
              {gameState.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  if (cell === null) return null;
                  const key = `${rowIndex}-${colIndex}`;
                  return (
                    <div
                      key={key}
                      className="tile-slot"
                      style={{
                        top: `calc(${rowIndex} * (var(--cell-size) + var(--cell-gap)))`,
                        left: `calc(${colIndex} * (var(--cell-size) + var(--cell-gap)))`,
                      }}
                    >
                      <div
                        className={[
                          'tile',
                          getTileClassName(cell),
                          getTileScaleClass(cell),
                          newCells.has(key) ? 'new-cell' : '',
                          mergedCells.has(key) ? 'merged-cell' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {cell}
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        </div>

        <aside className="playfield-aside" aria-label="操作帮助与排行榜">
          <div className="help-panel">
            <p className="help-title">操作提示</p>
            <div className="help-grid">
              <span>
                <ArrowUp size={14} />
                <ArrowDown size={14} />
                <ArrowLeft size={14} />
                <ArrowRight size={14} />
                键盘方向键
              </span>
              <span>移动端可在棋盘区域滑动操作</span>
              <span>目标: 合成 2048，继续挑战更高数字</span>
            </div>
          </div>

          <div className="leaderboard-panel">
            <div className="leaderboard-head">
              <p className="help-title">排行榜</p>
              <button
                type="button"
                className="leaderboard-refresh"
                onClick={() => {
                  void refreshLeaderboard();
                }}
              >
                刷新
              </button>
            </div>

            <label className="leaderboard-name-field" htmlFor="player-name-input">
              昵称
            </label>
            <input
              id="player-name-input"
              className="leaderboard-name-input"
              type="text"
              value={playerName}
              maxLength={24}
              placeholder={defaultPlayerName(playerId)}
              onChange={(event) => setPlayerName(event.target.value)}
            />

            <div className="leaderboard-tabs" role="tablist" aria-label="排行榜范围">
              {scopeTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`leaderboard-tab ${activeScope === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveScope(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {leaderboardLoading ? (
              <p className="leaderboard-empty">排行榜加载中...</p>
            ) : activeEntries.length > 0 ? (
              <ol className="leaderboard-list">
                {activeEntries.map((entry) => (
                  <li key={`${activeScope}-${entry.playerId}`} className="leaderboard-item">
                    <span className="leaderboard-rank">#{entry.rank}</span>
                    <div className="leaderboard-player">
                      <span className="leaderboard-player-name">{entry.name}</span>
                      <span className="leaderboard-player-meta">{entry.moves} 步</span>
                    </div>
                    <span className="leaderboard-score">{entry.score}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="leaderboard-empty">暂无成绩，成为第一位上榜玩家。</p>
            )}

            {leaderboardMessage && <p className="leaderboard-note">{leaderboardMessage}</p>}
          </div>
        </aside>
      </div>

      {(gameState.gameOver || showWinModal) && (
        <div className="result-overlay">
          <div className="result-modal">
            <p className="result-tag">{gameState.gameOver ? '挑战结束' : '达成目标'}</p>
            <h2>{gameState.gameOver ? '没有可移动方块了' : '你已经合成 2048'}</h2>
            <p>当前分数 {gameState.score}</p>
            <div className="result-actions">
              <button type="button" className="control-btn primary" onClick={resetGame}>
                <RefreshCw size={16} />
                再来一局
              </button>
              {!gameState.gameOver && (
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => {
                    setShowWinModal(false);
                    setStatusMessage('继续冲击更高分');
                  }}
                >
                  继续挑战
                </button>
              )}
              <button
                type="button"
                className="control-btn"
                onClick={() => {
                  void submitScore();
                }}
                disabled={submittingScore || submittedCurrentRound}
              >
                {submittingScore ? '提交中...' : submittedCurrentRound ? '已提交成绩' : '提交成绩'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Game2048;
