'use client';

import { useState } from 'react';
import Game2048 from './components/Game2048';

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);

  if (gameStarted) {
    return <Game2048 />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8 text-gray-800">2048</h1>
        <p className="text-xl text-gray-600 mb-8">
          使用方向键移动方块，相同数字的方块会合并。<br />
          达到2048就算胜利！
        </p>
        <button
          onClick={() => setGameStarted(true)}
          className="px-8 py-4 bg-blue-500 text-white text-xl rounded-lg hover:bg-blue-600 transition-colors"
        >
          开始游戏
        </button>
      </div>
    </div>
  );
}

