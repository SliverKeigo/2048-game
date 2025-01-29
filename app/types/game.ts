export type Cell = number | null;

export type Grid = Cell[][];

export interface GameState {
    grid: Grid;
    score: number;
    highScore: number;
    gameOver: boolean;
    won: boolean;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

