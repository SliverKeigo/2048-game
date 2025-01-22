import React from "react"

interface ScoreBoardProps {
  score: number
}

export default function ScoreBoard({ score }: ScoreBoardProps) {
  return (
    <div className="w-full flex flex-col pl-6 lg:pl-5">
      <p className="font-fira_retina text-white pt-6 text-lg lg:pt-5 lg:text-sm">// food left</p>
      <div className="grid grid-cols-5 gap-4 justify-items-center pt-6 w-fit lg:gap-3 lg:pt-5">
        {Array.from({ length: 25 }, (_, i) => (
          <div
            key={i}
            className={`bg-[#43D9AD] rounded-full shadow-[0_0_10px_#43D9AD] w-3 h-3 lg:w-2 lg:h-2 ${i < score ? "opacity-100" : "opacity-30"}`}
          />
        ))}
      </div>
    </div>
  )
}

