import React from "react"
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"
import type { Direction } from "../types/game"

interface ControlPanelProps {
  onMove: (direction: Direction) => void
}

export default function ControlPanel({ onMove }: ControlPanelProps) {
  return (
    <div className="font-fira_retina text-base text-white bg-[#01142366] rounded-lg p-4 lg:text-sm lg:p-2.5">
      <p>// use your keyboard</p>
      <p>// arrows to play</p>

      <div className="w-full flex flex-col items-center gap-2 pt-6 lg:pt-5 lg:gap-1">
        <button
          onClick={() => onMove("up")}
          className="bg-[#010C15] rounded-lg flex justify-center items-center w-16 h-10 hover:bg-[#010c15d8] hover:shadow-[0_0_10px_#43D9AD] lg:w-[50px] lg:h-[30px]"
        >
          <ArrowUp size={24} className="lg:w-5 lg:h-5" />
        </button>

        <div className="grid grid-cols-3 gap-2 lg:gap-1">
          <button
            onClick={() => onMove("left")}
            className="bg-[#010C15] rounded-lg flex justify-center items-center w-16 h-10 hover:bg-[#010c15d8] hover:shadow-[0_0_10px_#43D9AD] lg:w-[50px] lg:h-[30px]"
          >
            <ArrowLeft size={24} className="lg:w-5 lg:h-5" />
          </button>
          <button
            onClick={() => onMove("down")}
            className="bg-[#010C15] rounded-lg flex justify-center items-center w-16 h-10 hover:bg-[#010c15d8] hover:shadow-[0_0_10px_#43D9AD] lg:w-[50px] lg:h-[30px]"
          >
            <ArrowDown size={24} className="lg:w-5 lg:h-5" />
          </button>
          <button
            onClick={() => onMove("right")}
            className="bg-[#010C15] rounded-lg flex justify-center items-center w-16 h-10 hover:bg-[#010c15d8] hover:shadow-[0_0_10px_#43D9AD] lg:w-[50px] lg:h-[30px]"
          >
            <ArrowRight size={24} className="lg:w-5 lg:h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

