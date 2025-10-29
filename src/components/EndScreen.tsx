import React from 'react'

interface EndScreenProps {
  score: number
  onRestart: () => void
}

function EndScreen({ score, onRestart }: EndScreenProps) {
  const getScoreMessage = (score: number) => {
    if (score === 0) return "No ghosts caught! Try again!"
    if (score < 10) return "A few ghosts escaped your grasp!"
    if (score < 30) return "Good hunting! You're getting the hang of it!"
    if (score < 50) return "Excellent work, ghost hunter!"
    return "Legendary ghost catcher! You're a master!"
  }

  const getScoreEmoji = (score: number) => {
    if (score === 0) return "😢"
    if (score < 10) return "👻"
    if (score < 30) return "🎃"
    if (score < 50) return "🧙‍♀️"
    return "🏆"
  }

  return (
    <div className="end-screen">
      <div className="end-content">
        <div className="final-score">
          <div className="score-emoji">{getScoreEmoji(score)}</div>
          <h2 className="score-title">Final Score</h2>
          <div className="score-value">{score}</div>
          <p className="score-message">{getScoreMessage(score)}</p>
        </div>
        
        <div className="end-actions">
          <button 
            className="restart-button"
            onClick={onRestart}
          >
            <span className="restart-icon">🔄</span>
            Hunt Again
          </button>
        </div>
      </div>
    </div>
  )
}

export default EndScreen
