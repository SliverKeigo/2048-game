import React from "react"

interface ScoreBoardProps {
  score: number
}

export default function ScoreBoard({ score }: ScoreBoardProps) {
  return (
    <div className="w-full flex flex-col pl-5 lg:pl-4">
      <p className="font-fira_retina text-white pt-5 lg:text-sm">// food left</p>
      <div className="grid grid-cols-5 gap-3 justify-items-center pt-5 w-fit">
        {Array.from({ length: 25 }, (_, i) => (
          <div
            key={i}
            className={`bg-[#43D9AD] rounded-full shadow-[0_0_10px_#43D9AD] w-2 h-2 lg:w-1.5 lg:h-1.5 ${i < score ? "opacity-100" : "opacity-30"}`}
          />
        ))}
      </div>
    </div>
  )
}

