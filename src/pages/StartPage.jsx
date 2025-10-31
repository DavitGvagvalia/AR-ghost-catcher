import { Link } from 'react-router-dom'
import HalloweenBackground from '../components/Halloween_background'
import './StartPage.css'
function StartPage() {
  return (
    <div className="idle-screen">
        <HalloweenBackground />
        <div className="start-container">
          <h1 className="game-title">👻 AR Ghost Catcher</h1>
          <p className="game-subtitle">Find AR markers and catch ghosts!</p>
          <Link to="/game" className="start-button">
            Start Hunting
          </Link>
        </div>
      </div>
  )
}

export default StartPage