import React from 'react'

interface HUDProps {
  score: number
  onEnd: () => void
}

function HUD({ score, onEnd }: HUDProps) {
  return (
    <div className="hud">
      {/* Score Counter - Bottom Center */}
      <div className="score-counter">
        <span className="score-icon">👻</span>
        <span className="score-text">Score: {score}</span>
      </div>
      
      {/* End Button - Top Right */}
      <button 
        className="end-button"
        onClick={onEnd}
        aria-label="End Game"
      >
        <span className="end-icon">🏁</span>
        <span className="end-text">End</span>
      </button>
    </div>
  )
}

export default HUD
