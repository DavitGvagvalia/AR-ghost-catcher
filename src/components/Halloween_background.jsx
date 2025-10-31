import './components.css'
function halloween_background() {
  return (
    <div className="halloween-frame">
      {/* Floating Bats */}
      <div className="bat bat-1">🦇</div>
      <div className="bat bat-2">🦇</div>
      <div className="bat bat-3">🦇</div>
      
      {/* Glowing Pumpkins */}
      <div className="pumpkin pumpkin-1">🎃</div>
      <div className="pumpkin pumpkin-2">🎃</div>
      
      {/* Fog Overlay */}
      <div className="fog-overlay"></div>
      
      {/* Spooky Particles */}
      <div className="particles">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
        <div className="particle particle-5"></div>
      </div>
    </div>
  )
}

export default halloween_background