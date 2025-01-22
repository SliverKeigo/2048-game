export type Direction = "up" | "down" | "left" | "right"

export interface Position {
  x: number
  y: number
}

export interface GameState {
  score: number
  gameStarted: boolean
  gameOver: boolean
  food: Position
  snake: Position[]
  direction: Direction
  totalFood: number
}

