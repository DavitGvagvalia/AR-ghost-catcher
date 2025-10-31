import { Link } from 'react-router-dom'
import HalloweenBackground from '../components/Halloween_background'
import './EndPage.css'


function EndPage({score}) {
  return (
    <div className="end-screen">
        <HalloweenBackground />

        <div className="end-actions">
          <Link
            to="/"
            className="restart-button"
          >
            <span className="restart-icon">🔄</span>
            Hunt Again
          </Link>
        </div>
      </div>

  )
}

export default EndPage