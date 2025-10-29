import { useState, useCallback } from 'react'
import { getRarityConfig, getRarityForMarker } from './rarity'

export function useSession() {
  const [score, setScore] = useState(0)
  const [caughtMarkers, setCaughtMarkers] = useState<Set<number>>(new Set())

  const catchGhost = useCallback((markerId: number) => {
    if (caughtMarkers.has(markerId)) {
      return false // Already caught this marker
    }

    const rarity = getRarityForMarker(markerId)
    const config = getRarityConfig(rarity)
    
    // Add points and mark as caught
    setScore(prev => prev + config.points)
    setCaughtMarkers(prev => new Set([...prev, markerId]))
    
    return true
  }, [caughtMarkers])

  const resetSession = useCallback(() => {
    setScore(0)
    setCaughtMarkers(new Set())
  }, [])

  const isMarkerCaught = useCallback((markerId: number) => {
    return caughtMarkers.has(markerId)
  }, [caughtMarkers])

  return {
    score,
    caughtMarkers,
    catchGhost,
    resetSession,
    isMarkerCaught
  }
}
