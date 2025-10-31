import {Link} from 'react-router-dom'

function HUD({score}) {
    return (
        <div className="hud">

            <Link to="/end"
                className="end-button"
                aria-label="End Game"
            >
                <span className="end-icon">🏁</span>
                <span className="end-text">End</span>
            </Link>
        </div>
    )
}

export default HUD