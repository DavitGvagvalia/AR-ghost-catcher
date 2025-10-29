import React, { useState, useCallback } from 'react'
import ARScene from './components/ARScene.tsx'
import HUD from './components/HUD.tsx'
import EndScreen from './components/EndScreen.tsx'
import HalloweenFrame from './components/HalloweenFrame.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { useSession } from './lib/session.ts'
import { useAudio } from './lib/audio.ts'

type AppState = 'idle' | 'scanning' | 'ended'

function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const { score, caughtMarkers, resetSession } = useSession()
  const { initializeAudio } = useAudio()

  const handleStart = useCallback(async () => {
    try {
      setCameraError(null)
      // Request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true })
      
      // Initialize audio on first user gesture
      await initializeAudio()
      
      setAppState('scanning')
    } catch (error) {
      console.error('Camera access denied:', error)
      setCameraError('Camera access is required for the AR experience. Please enable camera permissions and try again.')
    }
  }, [initializeAudio])

  const handleEnd = useCallback(() => {
    setAppState('ended')
  }, [])

  const handleRestart = useCallback(() => {
    resetSession()
    setAppState('idle')
    setCameraError(null)
  }, [resetSession])

  const handleGhostCaught = useCallback((markerId: number, points: number) => {
    // This will be handled by the session hook
    console.log(`Ghost caught! Marker ${markerId}, Points: ${points}`)
  }, [])

  if (appState === 'idle') {
    return (
      <div className="app idle-screen">
        <HalloweenFrame />
        <div className="start-container">
          <h1 className="game-title">👻 AR Ghost Catcher</h1>
          <p className="game-subtitle">Find AR markers and catch ghosts!</p>
          {cameraError && (
            <div className="error-message">
              {cameraError}
            </div>
          )}
          <button 
            className="start-button"
            onClick={handleStart}
          >
            Start Hunting
          </button>
        </div>
      </div>
    )
  }

  if (appState === 'ended') {
    return (
      <div className="app end-screen">
        <HalloweenFrame />
        <EndScreen 
          score={score}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  return (
    <div className="app scanning-screen">
      <ErrorBoundary>
        <ARScene 
          onGhostCaught={handleGhostCaught}
          caughtMarkers={caughtMarkers}
        />
      </ErrorBoundary>
      <HUD 
        score={score}
        onEnd={handleEnd}
      />
    </div>
  )
}

export default App
