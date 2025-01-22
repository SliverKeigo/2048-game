import React from "react"
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"
import type { Direction } from "../types/game"

interface ControlPanelProps {
  onMove: (direction: Direction) => void
}

export default function ControlPanel({ onMove }: ControlPanelProps) {
  return (
    <div className="font-fira_retina text-sm text-white bg-[#01142366] rounded-lg p-2.5 lg:text-xs">
      <p>// use your keyboard</p>
      <p>// arrows to play</p>

      <div className="w-full flex flex-col items-center gap-1 pt-5">
        <button
          onClick={() => onMove("up")}
          className="bg-[#010C15] rounded-lg flex justify-center items-center w-[50px] h-[30px] hover:bg-[#010c15d8] hover:shadow-[0_0_10px_#43D9AD] lg:w-10 lg:h-6"
        >
          <ArrowUp size={20} />
        </button>

        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onMove("left")}
            className="bg-[#010C15] rounded-lg flex justify-center items-center w-[50px] h-[30px] hover:bg-[#010c15d8] hover:shadow-[0_0_10px_#43D9AD] lg:w-10 lg:h-6"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => onMove("down")}
            className="bg-[#010C15] rounded-lg flex justify-center items-center w-[50px] h-[30px] hover:bg-[#010c15d8] hover:shadow-[0_0_10px_#43D9AD] lg:w-10 lg:h-6"
          >
            <ArrowDown size={20} />
          </button>
          <button
            onClick={() => onMove("right")}
            className="bg-[#010C15] rounded-lg flex justify-center items-center w-[50px] h-[30px] hover:bg-[#010c15d8] hover:shadow-[0_0_10px_#43D9AD] lg:w-10 lg:h-6"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

