import { useRef, useCallback } from 'react'

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const clickSoundRef = useRef<HTMLAudioElement | null>(null)
  const catchSoundRef = useRef<HTMLAudioElement | null>(null)
  const isInitializedRef = useRef(false)

  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) return

    try {
      // Create audio context on user gesture
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create audio elements
      clickSoundRef.current = new Audio('/sounds/click.mp3')
      catchSoundRef.current = new Audio('/sounds/catch.mp3')
      
      // Preload sounds
      clickSoundRef.current.preload = 'auto'
      catchSoundRef.current.preload = 'auto'
      
      isInitializedRef.current = true
    } catch (error) {
      console.warn('Audio initialization failed:', error)
    }
  }, [])

  const playClickSound = useCallback(async () => {
    if (!isInitializedRef.current || !clickSoundRef.current) return
    
    try {
      // Reset audio to beginning and play
      clickSoundRef.current.currentTime = 0
      await clickSoundRef.current.play()
    } catch (error) {
      console.warn('Failed to play click sound:', error)
    }
  }, [])

  const playCatchSound = useCallback(async () => {
    if (!isInitializedRef.current || !catchSoundRef.current) return
    
    try {
      // Reset audio to beginning and play
      catchSoundRef.current.currentTime = 0
      await catchSoundRef.current.play()
    } catch (error) {
      console.warn('Failed to play catch sound:', error)
    }
  }, [])

  return {
    initializeAudio,
    playClickSound,
    playCatchSound
  }
}
