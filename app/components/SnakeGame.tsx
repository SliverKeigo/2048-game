"use client"

import React, { useState, useEffect, useRef } from "react"
import GameScreen from "./GameScreen"
import ControlPanel from "./ControlPanel"
import ScoreBoard from "./ScoreBoard"
import type { GameState, Direction } from "../types/game"

export default function SnakeGame() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    gameStarted: false,
    gameOver: false,
    food: { x: 10, y: 5 },
    snake: [
      { x: 10, y: 12 },
      { x: 10, y: 13 },
      { x: 10, y: 14 },
      { x: 10, y: 15 },
      { x: 10, y: 16 },
      { x: 10, y: 17 },
      { x: 10, y: 18 },
      { x: 11, y: 18 },
      { x: 12, y: 18 },
      { x: 13, y: 18 },
      { x: 14, y: 18 },
      { x: 15, y: 18 },
      { x: 15, y: 19 },
      { x: 15, y: 20 },
      { x: 15, y: 21 },
      { x: 15, y: 22 },
      { x: 15, y: 23 },
      { x: 15, y: 24 },
    ],
    direction: "up" as Direction,
    totalFood: 25,
  })

  const gameInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameState.gameStarted) {
        switch (event.key) {
          case "ArrowLeft":
          case "a":
            if (gameState.direction !== "right") setGameState((prev) => ({ ...prev, direction: "left" }))
            break
          case "ArrowUp":
          case "w":
            if (gameState.direction !== "down") setGameState((prev) => ({ ...prev, direction: "up" }))
            break
          case "ArrowRight":
          case "d":
            if (gameState.direction !== "left") setGameState((prev) => ({ ...prev, direction: "right" }))
            break
          case "ArrowDown":
          case "s":
            if (gameState.direction !== "up") setGameState((prev) => ({ ...prev, direction: "down" }))
            break
        }
      } else if (event.key === " ") {
        gameState.gameOver ? startAgain() : startGame()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameState.gameStarted, gameState.direction, gameState.gameOver])

  const startGame = () => {
    setGameState((prev) => ({ ...prev, gameStarted: true }))
    gameInterval.current = setInterval(moveSnake, 70)
  }

  const startAgain = () => {
    setGameState({
      score: 0,
      gameStarted: false,
      gameOver: false,
      food: { x: 10, y: 5 },
      snake: [
        { x: 10, y: 12 },
        { x: 10, y: 13 },
        { x: 10, y: 14 },
        { x: 10, y: 15 },
        { x: 10, y: 16 },
        { x: 10, y: 17 },
        { x: 10, y: 18 },
        { x: 11, y: 18 },
        { x: 12, y: 18 },
        { x: 13, y: 18 },
        { x: 14, y: 18 },
        { x: 15, y: 18 },
        { x: 15, y: 19 },
        { x: 15, y: 20 },
        { x: 15, y: 21 },
        { x: 15, y: 22 },
        { x: 15, y: 23 },
        { x: 15, y: 24 },
      ],
      direction: "up" as Direction,
      totalFood: 25,
    })
    if (gameInterval.current) clearInterval(gameInterval.current)
  }

  const moveSnake = () => {
    setGameState((prev: any) => {
        const newSnake = [...prev.snake];
        const head = { ...newSnake[0] };

        switch (prev.direction) {
            case "up":
                head.y--;
                break;
            case "down":
                head.y++;
                break;
            case "left":
                head.x--;
                break;
            case "right":
                head.x++;
                break;
        }

        if (
            head.x >= 0 &&
            head.x < 24 &&
            head.y >= 0 &&
            head.y < 40 &&
            !newSnake.find((segment) => segment.x === head.x && segment.y === head.y)
        ) {
            newSnake.unshift(head);

            if (head.x === prev.food.x && head.y === prev.food.y) {
                const newScore = prev.score + 1;
                if (newScore === prev.totalFood) {
                    if (gameInterval.current) clearInterval(gameInterval.current);
                    return {
                        ...prev,
                        snake: newSnake,
                        score: newScore,
                        food: { x: null, y: null },
                        gameOver: true,
                        gameStarted: false,
                    };
                } else {
                    return {
                        ...prev,
                        snake: newSnake,
                        score: newScore,
                        food: { x: Math.floor(Math.random() * 24), y: Math.floor(Math.random() * 40) },
                    };
                }
            } else {
                newSnake.pop();
                return { ...prev, snake: newSnake };
            }
        } else {
            if (gameInterval.current) clearInterval(gameInterval.current);
            return { ...prev, gameStarted: false, gameOver: true };
        }
    });
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-teal-900 to-teal-400/20">
      <div className="w-[630px] h-[575px] border border-black flex items-center justify-between bg-gradient-to-b from-teal-800 to-teal-400/20 rounded-lg p-8 relative lg:w-[530px] lg:h-[475px] lg:p-6">
        <img
          src="/icons/console/bolt-up-left.svg"
          alt=""
          className="absolute top-2 left-2 opacity-70 w-8 h-8 lg:w-6 lg:h-6"
        />
        <img
          src="/icons/console/bolt-up-right.svg"
          alt=""
          className="absolute top-2 right-2 opacity-70 w-8 h-8 lg:w-6 lg:h-6"
        />
        <img
          src="/icons/console/bolt-down-left.svg"
          alt=""
          className="absolute bottom-2 left-2 opacity-70 w-8 h-8 lg:w-6 lg:h-6"
        />
        <img
          src="/icons/console/bolt-down-right.svg"
          alt=""
          className="absolute bottom-2 right-2 opacity-70 w-8 h-8 lg:w-6 lg:h-6"
        />

        <GameScreen gameState={gameState} />

        <div className="h-full flex flex-col items-end justify-between">
          <div>
            <ControlPanel onMove={(direction) => setGameState((prev) => ({ ...prev, direction }))} />
            <ScoreBoard score={gameState.score} />
          </div>
        </div>

        {!gameState.gameStarted && !gameState.gameOver && (
          <button
            onClick={startGame}
            className="absolute bottom-[15%] left-[17%] bg-[#FEA55F] text-black rounded-lg px-6 py-3 text-base hover:bg-[#ffb277] lg:text-sm lg:px-4 lg:py-2 lg:rounded-md"
          >
            start-game
          </button>
        )}

        {gameState.gameOver && (
          <div className="absolute bottom-[12%] text-[#43D9AD] w-72 lg:w-60 lg:bottom-[10%]">
            <span className="font-fira_retina bg-[#011627] h-16 flex items-center justify-center text-3xl lg:text-2xl lg:h-12">
              {gameState.score === gameState.totalFood ? "WELL DONE!" : "GAME OVER!"}
            </span>
            <button
              onClick={startAgain}
              className="font-fira_retina text-[#607B96] text-base flex items-center justify-center w-full py-8 hover:text-white lg:text-sm lg:py-6"
            >
              {gameState.score === gameState.totalFood ? "play-again" : "start-again"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

