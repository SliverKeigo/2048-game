'use client';

import React, { useEffect, useState } from 'react';
import { GameState, Grid, Direction } from '../types/game';

const GRID_SIZE = 4;
const WINNING_NUMBER = 2048;

const getInitialGrid = (): Grid => {
    const grid: Grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    return addRandomCell(addRandomCell(grid));
};

const addRandomCell = (grid: Grid): Grid => {
    const emptyCells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (grid[i][j] === null) {
                emptyCells.push({ i, j });
            }
        }
    }
    if (emptyCells.length === 0) return grid;

    const { i, j } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = grid.map(row => [...row]);
    newGrid[i][j] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
};

const Game2048 = () => {
    const [gameState, setGameState] = useState<GameState>({
        grid: getInitialGrid(),
        score: 0,
        highScore: typeof window !== 'undefined' ? Number(localStorage.getItem('highScore')) || 0 : 0,
        gameOver: false,
        won: false
    });

    const [lastMove, setLastMove] = useState<Direction | null>(null);
    const [mergedCells, setMergedCells] = useState<Set<string>>(new Set());
    const [newCells, setNewCells] = useState<Set<string>>(new Set());
    const [positions, setPositions] = useState<{ [key: string]: { x: number, y: number } }>({});
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

    const moveGrid = (direction: Direction) => {
        setLastMove(direction);
        setMergedCells(new Set());
        setNewCells(new Set());
        let newGrid = gameState.grid.map(row => [...row]);
        let newScore = gameState.score;
        let moved = false;
        let mergedPositions = new Set<string>();

        // 获取一行或一列的数字（去除空值）
        const getLine = (index: number, isRow: boolean): number[] => {
            const line: number[] = [];
            for (let i = 0; i < GRID_SIZE; i++) {
                const value = isRow ? newGrid[index][i] : newGrid[i][index];
                if (value !== null) {
                    line.push(value);
                }
            }
            return line;
        };

        // 设置一行或一列的值
        const setLine = (index: number, line: number[], isRow: boolean) => {
            const newLine = Array(GRID_SIZE).fill(null);
            line.forEach((value, i) => {
                if (isRow) {
                    newGrid[index][i] = value;
                } else {
                    newGrid[i][index] = value;
                }
            });
        };

        // 处理一行或一列
        const processLine = (index: number, isRow: boolean, isReverse: boolean) => {
            // 获取非空值
            let line = getLine(index, isRow);
            if (line.length === 0) return;

            // 如果需要反转（向右或向下移动）
            if (isReverse) {
                line = line.reverse();
            }

            // 合并相同的数字
            const merged: number[] = [];
            let skipNext = false;

            for (let i = 0; i < line.length; i++) {
                if (skipNext) {
                    skipNext = false;
                    continue;
                }

                if (i < line.length - 1 && line[i] === line[i + 1]) {
                    const mergedValue = line[i] * 2;
                    merged.push(mergedValue);
                    newScore += mergedValue;
                    
                    // 计算合并后的位置
                    let mergePos;
                    const targetPos = merged.length - 1;
                    if (isRow) {
                        mergePos = `${index}-${isReverse ? GRID_SIZE - 1 - targetPos : targetPos}`;
                    } else {
                        mergePos = `${isReverse ? GRID_SIZE - 1 - targetPos : targetPos}-${index}`;
                    }
                    mergedPositions.add(mergePos);
                    
                    skipNext = true;
                    moved = true;
                } else {
                    merged.push(line[i]);
                }
            }

            // 获取当前行/列的原始数据（包括null）
            const originalLine = Array(GRID_SIZE).fill(null).map((_, i) => 
                isRow ? newGrid[index][i] : newGrid[i][index]
            );

            // 准备新的行/列数据
            const finalLine = merged.concat(Array(GRID_SIZE - merged.length).fill(null));
            if (isReverse) {
                finalLine.reverse();
            }

            // 检查是否有变化
            const hasChanged = originalLine.some((val, i) => val !== finalLine[i]);
            if (hasChanged) {
                moved = true;
                setLine(index, finalLine, isRow);
            }
        };

        // 根据方向处理每一行或列
        if (direction === 'left' || direction === 'right') {
            for (let row = 0; row < GRID_SIZE; row++) {
                processLine(row, true, direction === 'right');
            }
        } else {
            for (let col = 0; col < GRID_SIZE; col++) {
                processLine(col, false, direction === 'down');
            }
        }

        if (moved) {
            const oldGrid = newGrid.map(row => [...row]);
            newGrid = addRandomCell(newGrid);
            
            // 找出新添加的单元格位置
            const newCellPositions = new Set<string>();
            newGrid.forEach((row, i) => {
                row.forEach((cell, j) => {
                    if (cell !== null && oldGrid[i][j] === null) {
                        newCellPositions.add(`${i}-${j}`);
                    }
                });
            });

            setMergedCells(mergedPositions);
            setNewCells(newCellPositions);

            const newHighScore = Math.max(newScore, gameState.highScore);
            if (newHighScore > gameState.highScore) {
                localStorage.setItem('highScore', newHighScore.toString());
            }

            setGameState(prev => ({
                ...prev,
                grid: newGrid,
                score: newScore,
                highScore: newHighScore,
                won: newGrid.some(row => row.some(cell => cell === WINNING_NUMBER)),
                gameOver: isGameOver(newGrid)
            }));
        }
    };

    const isGameOver = (grid: Grid): boolean => {
        // 检查是否还有空格
        if (grid.some(row => row.some(cell => cell === null))) return false;

        // 检查是否还能合并
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                const current = grid[i][j];
                // 检查右边
                if (j < GRID_SIZE - 1 && grid[i][j + 1] === current) return false;
                // 检查下边
                if (i < GRID_SIZE - 1 && grid[i + 1][j] === current) return false;
            }
        }
        return true;
    };

    const resetGame = () => {
        setGameState({
            grid: getInitialGrid(),
            score: 0,
            highScore: gameState.highScore,
            gameOver: false,
            won: false
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setTouchStart({ x: touch.clientX, y: touch.clientY });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        const minSwipeDistance = 50; // 最小滑动距离

        if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
            return;
        }

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // 水平滑动
            if (deltaX > 0) {
                moveGrid('right');
            } else {
                moveGrid('left');
            }
        } else {
            // 垂直滑动
            if (deltaY > 0) {
                moveGrid('down');
            } else {
                moveGrid('up');
            }
        }

        setTouchStart(null);
    };

    const handleTouchCancel = () => {
        setTouchStart(null);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (gameState.gameOver) return;

            switch (event.key) {
                case 'ArrowUp':
                    moveGrid('up');
                    break;
                case 'ArrowDown':
                    moveGrid('down');
                    break;
                case 'ArrowLeft':
                    moveGrid('left');
                    break;
                case 'ArrowRight':
                    moveGrid('right');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    useEffect(() => {
        // 初始化位置
        const newPositions: { [key: string]: { x: number, y: number } } = {};
        gameState.grid.forEach((row, i) => {
            row.forEach((cell, j) => {
                if (cell) {
                    newPositions[`${i}-${j}`] = { x: j, y: i };
                }
            });
        });
        setPositions(newPositions);
    }, [gameState.grid]);

    const getTransform = (i: number, j: number) => {
        const key = `${i}-${j}`;
        const pos = positions[key];
        if (!pos) return 'translate(0, 0)';
        const x = (j - pos.x) * 100;
        const y = (i - pos.y) * 100;
        return `translate(${x}%, ${y}%)`;
    };

    const getCellColor = (value: number | null): string => {
        if (!value) return 'bg-gray-200';
        const colors: { [key: number]: string } = {
            2: 'bg-[#eee4da] text-[#776e65]',
            4: 'bg-[#ede0c8] text-[#776e65]',
            8: 'bg-[#f2b179] text-[#f9f6f2]',
            16: 'bg-[#f59563] text-[#f9f6f2]',
            32: 'bg-[#f67c5f] text-[#f9f6f2]',
            64: 'bg-[#f65e3b] text-[#f9f6f2]',
            128: 'bg-[#edcf72] text-[#f9f6f2] text-[1.75rem]',
            256: 'bg-[#edcc61] text-[#f9f6f2] text-[1.75rem]',
            512: 'bg-[#edc850] text-[#f9f6f2] text-[1.75rem]',
            1024: 'bg-[#edc53f] text-[#f9f6f2] text-[1.5rem]',
            2048: 'bg-[#edc22e] text-[#f9f6f2] text-[1.5rem]'
        };
        return colors[value] || 'bg-[#3c3a32] text-[#f9f6f2]';
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="game-title">2048</h1>
            
            <div className="flex gap-4 mb-4">
                <div className="score-container">
                    <div className="score-title">分数</div>
                    <div className="score-number">{gameState.score}</div>
                </div>
                <div className="score-container">
                    <div className="score-title">最高分</div>
                    <div className="score-number">{gameState.highScore}</div>
                </div>
            </div>

            <div 
                className="game-container touch-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
            >
                <div className="game-grid">
                    {/* 背景网格 */}
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={`bg-${i}`} className="grid-cell"></div>
                    ))}
                </div>
                
                {/* 数字方块 */}
                <div className="absolute inset-[0.75rem]">
                    {gameState.grid.map((row, i) => (
                        row.map((cell, j) => (
                            <div
                                key={`${i}-${j}`}
                                className="absolute"
                                style={{
                                    top: `calc(${i} * (var(--cell-size) + var(--cell-gap)))`,
                                    left: `calc(${j} * (var(--cell-size) + var(--cell-gap)))`,
                                }}
                            >
                                {cell && (
                                    <div
                                        style={{
                                            transform: getTransform(i, j),
                                        }}
                                        className={`cell
                                            ${getCellColor(cell)}
                                            ${mergedCells.has(`${i}-${j}`) ? 'merged-cell' : ''}
                                            ${newCells.has(`${i}-${j}`) ? 'new-cell' : ''}`}
                                    >
                                        {cell}
                                    </div>
                                )}
                            </div>
                        ))
                    ))}
                </div>
            </div>

            <div className="mt-8">
                <button onClick={resetGame} className="restart-button">
                    重新开始
                </button>
            </div>

            {(gameState.gameOver || gameState.won) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg text-center">
                        <h3 className="text-2xl font-bold mb-4">
                            {gameState.won ? '恭喜你赢了！' : '游戏结束！'}
                        </h3>
                        <button onClick={resetGame} className="restart-button">
                            再玩一次
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Game2048; 