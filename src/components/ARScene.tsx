import React, { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAudio } from '../lib/audio'
import { createGhostSpawnData, generateGhostId } from '../lib/arHelpers'
import { getRarityConfig, getRarityForMarker } from '../lib/rarity'

interface ARSceneProps {
    onGhostCaught: (markerId: number, points: number) => void
    caughtMarkers: Set<number>
}

interface GhostData {
    id: string
    markerId: number
    clicksRemaining: number
    totalClicks: number
    points: number
    entity: HTMLElement
}

function ARScene({ onGhostCaught, caughtMarkers }: ARSceneProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const sceneInstanceRef = useRef<any>(null)
    const ghostsRef = useRef<Map<string, GhostData>>(new Map())
    const isInitializedRef = useRef(false)
    const [isLoading, setIsLoading] = useState(true)
    const { playClickSound, playCatchSound } = useAudio()

    const handleMarkerFound = useCallback((markerId: number) => {
        console.log(`🎯 MARKER DETECTED! Marker ID: ${markerId}`)
        
        // Check if marker already caught
        if (caughtMarkers.has(markerId)) {
            console.log(`Marker ${markerId} already caught, skipping`)
            return
        }

        // Check if ghost already exists for this marker
        const existingGhost = Array.from(ghostsRef.current.values())
            .find(ghost => ghost.markerId === markerId)

        if (existingGhost) {
            console.log(`Ghost already exists for marker ${markerId}`)
            return
        }

        // Create ghost spawn data
        const spawnData = createGhostSpawnData(markerId)
        const ghostId = generateGhostId(markerId)

        // Create ghost entity in A-Frame
        const scene = sceneInstanceRef.current
        if (!scene) {
            console.log('No scene found for ghost creation')
            return
        }

        const markerEntity = scene.querySelector(`[mindar-image-target="targetIndex: ${markerId - 1}"]`)
        if (!markerEntity) {
            console.log(`Marker entity ${markerId} not found`)
            return
        }

        console.log(`Creating ghost for marker ${markerId}`)

        // Create ghost entity (using a simple box for now since models don't exist)
        const ghostEntity = document.createElement('a-entity')
        ghostEntity.setAttribute('id', ghostId)
        
        // Position the ghost at the marker level initially, then rise up
        ghostEntity.setAttribute('position', '0 0.1 0')
        ghostEntity.setAttribute('scale', '0.5 0.5 0.5')
        
        // Use a simple sphere with ghost-like appearance instead of GLTF model
        ghostEntity.setAttribute('geometry', 'primitive: sphere; radius: 0.5')
        ghostEntity.setAttribute('material', 'color: #8b5cf6; transparent: true; opacity: 0.9; emissive: #8b5cf6; emissiveIntensity: 0.5')
        
        // Add rise animation first, then hover
        ghostEntity.setAttribute('animation__rise', createRiseAnimation())
        
        // Add hover animation after rise completes
        setTimeout(() => {
            ghostEntity.setAttribute('animation__hover', createHoverAnimation())
        }, 1000)
        
        ghostEntity.setAttribute('animation__glow', 'property: material.emissiveIntensity; to: 0.8; dur: 1000; loop: true; dir: alternate')
        
        // Add a simple rotation animation to make it more visible
        ghostEntity.setAttribute('animation__rotate', 'property: rotation; to: 0 360 0; dur: 4000; loop: true')

        // Add click handler
        ghostEntity.addEventListener('click', () => {
            console.log(`Ghost ${ghostId} clicked!`)
            handleGhostClick(ghostId)
        })

        // Add to marker
        markerEntity.appendChild(ghostEntity)
        console.log(`Ghost added to marker ${markerId}`)
        
        // Debug: Check if ghost is visible in the scene
        setTimeout(() => {
            const ghostInScene = scene.querySelector(`#${ghostId}`)
            if (ghostInScene) {
                console.log(`✅ Ghost ${ghostId} found in scene!`)
                console.log('Ghost position:', ghostInScene.getAttribute('position'))
                console.log('Ghost scale:', ghostInScene.getAttribute('scale'))
                console.log('Ghost material:', ghostInScene.getAttribute('material'))
            } else {
                console.log(`❌ Ghost ${ghostId} not found in scene!`)
            }
        }, 100)

        // Store ghost data
        const rarity = getRarityForMarker(markerId)
        const config = getRarityConfig(rarity)

        ghostsRef.current.set(ghostId, {
            id: ghostId,
            markerId,
            clicksRemaining: config.clicks,
            totalClicks: config.clicks,
            points: config.points,
            entity: ghostEntity
        })
        
        console.log(`Ghost created successfully! Rarity: ${rarity}, Clicks needed: ${config.clicks}, Points: ${config.points}`)
    }, [caughtMarkers])

    const handleMarkerLost = useCallback((markerId: number) => {
        // Find and remove ghost for this marker
        const ghostToRemove = Array.from(ghostsRef.current.values())
            .find((ghost: GhostData) => ghost.markerId === markerId)

        if (ghostToRemove && ghostToRemove.entity) {
            try {
                if (ghostToRemove.entity.parentNode) {
                    ghostToRemove.entity.parentNode.removeChild(ghostToRemove.entity)
                }
            } catch (error) {
                console.warn('Error removing ghost on marker lost:', error)
            }
            ghostsRef.current.delete(ghostToRemove.id)
        }
    }, [])

    const handleGhostClick = useCallback(async (ghostId: string) => {
        const ghost = ghostsRef.current.get(ghostId)
        if (!ghost || !ghost.entity) return

        try {
            // Play click sound
            await playClickSound()

            // Decrement clicks
            ghost.clicksRemaining--

            // Visual feedback
            if (ghost.entity.setAttribute) {
                ghost.entity.setAttribute('animation__tap', createTapAnimation())
            }

            // Check if caught
            if (ghost.clicksRemaining <= 0) {
                // Play catch sound
                await playCatchSound()

                // Catch animation
                if (ghost.entity.setAttribute) {
                    ghost.entity.setAttribute('animation__catch', createCatchAnimation())
                }

                // Remove after animation
                setTimeout(() => {
                    try {
                        if (ghost.entity && ghost.entity.parentNode) {
                            ghost.entity.parentNode.removeChild(ghost.entity)
                        }
                    } catch (error) {
                        console.warn('Error removing ghost entity:', error)
                    }
                    ghostsRef.current.delete(ghostId)
                }, 500)

                // Notify parent
                onGhostCaught(ghost.markerId, ghost.points)
            }
        } catch (error) {
            console.warn('Error in ghost click handler:', error)
        }
    }, [playClickSound, playCatchSound, onGhostCaught])

    const createRiseAnimation = () => {
        return 'property: position; to: 0 0.4 0; dur: 1000; easing: easeOutQuad; loop: false;'
    }

    const createHoverAnimation = () => {
        return 'property: position; to: 0 0.5 0; dur: 2000; easing: easeInOutSine; loop: true; dir: alternate;'
    }

    const createTapAnimation = () => {
        return 'property: scale; to: 1.2 1.2 1.2; dur: 200; easing: easeOutQuad; loop: false; dir: alternate;'
    }

    const createCatchAnimation = () => {
        return 'property: scale, opacity; to: 0 0 0, 0; dur: 500; easing: easeInQuad; loop: false;'
    }

    useEffect(() => {
        if (!containerRef.current || isInitializedRef.current) return

        let scene: any = null
        let cleanupTimeout: number

        const initializeScene = () => {
            isInitializedRef.current = true

            // Create a separate container for A-Frame that React won't manage
            const aframeContainer = document.createElement('div')
            aframeContainer.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; left: 0;'
            aframeContainer.id = 'aframe-container'

      // Create A-Frame scene
      const sceneHTML = `
        <a-scene 
          mindar-image="imageTargetSrc: /markers/targets.mind; autoStart: true; uiScanning: no; uiLoading: no; uiError: no; debugUI: false; maxTrack: 1;"
          color-space="sRGB"
          renderer="colorManagement: true, physicallyCorrectLights"
          vr-mode-ui="enabled: false"
          device-orientation-permission-ui="enabled: false"
          embedded
          style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
          
          <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
          
          <!-- Lighting -->
          <a-light type="ambient" color="#404040"></a-light>
          <a-light type="directional" position="0 1 0" color="#ffffff" intensity="0.8"></a-light>
          
          <!-- 5 marker targets -->
          <a-entity mindar-image-target="targetIndex: 0"></a-entity>
          <a-entity mindar-image-target="targetIndex: 1"></a-entity>
          <a-entity mindar-image-target="targetIndex: 2"></a-entity>
          <a-entity mindar-image-target="targetIndex: 3"></a-entity>
          <a-entity mindar-image-target="targetIndex: 4"></a-entity>
        </a-scene>
      `

      aframeContainer.innerHTML = sceneHTML
      if (containerRef.current) {
        containerRef.current.appendChild(aframeContainer)
      }

            // Wait for scene to load
            scene = aframeContainer.querySelector('a-scene')
            if (scene) {
                sceneInstanceRef.current = scene

        const onSceneLoaded = () => {
          console.log('A-Frame scene loaded')
          
          // Check if MindAR component is working
          const mindarComponent = scene.components['mindar-image']
          if (mindarComponent) {
            console.log('MindAR component found:', mindarComponent)
            
            // Check if MindAR is tracking
            if (mindarComponent.el) {
              console.log('MindAR element:', mindarComponent.el)
              
              // Listen for MindAR events
              mindarComponent.el.addEventListener('mindarReady', () => {
                console.log('MindAR is ready for tracking!')
              })
              
              mindarComponent.el.addEventListener('mindarError', (e: any) => {
                console.error('MindAR error:', e)
              })
            }
            
            // Check if video is being processed
            setTimeout(() => {
              const video = scene.querySelector('video')
              if (video) {
                console.log('Video element found:', video)
                console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight)
                console.log('Video ready state:', video.readyState)
                
                // Make sure video is visible
                video.style.cssText = 'width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 1;'
              } else {
                console.log('No video element found - checking for canvas')
                const canvas = scene.querySelector('canvas')
                if (canvas) {
                  console.log('Canvas element found:', canvas)
                  canvas.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 2;'
                }
              }
            }, 1000)
          } else {
            console.log('MindAR component not found')
          }
          
          setIsLoading(false)
          
          // Wait a bit for MindAR to fully initialize before adding event listeners
          setTimeout(() => {
            console.log('Setting up marker detection...')
            
            // First, let's test if we can find any MindAR-related elements
            const allEntities = scene.querySelectorAll('a-entity')
            console.log('All entities in scene:', allEntities.length)
            
            // Look for MindAR-specific elements
            const mindarElements = scene.querySelectorAll('[mindar-image-target]')
            console.log('MindAR target elements found:', mindarElements.length)
            
            // Test: Create a simple visible object to verify rendering works
            const testEntity = document.createElement('a-entity')
            testEntity.setAttribute('id', 'test-ghost')
            testEntity.setAttribute('position', '0 0 -1')
            testEntity.setAttribute('geometry', 'primitive: sphere; radius: 0.2')
            testEntity.setAttribute('material', 'color: #ff0000; emissive: #ff0000; emissiveIntensity: 0.5')
            scene.appendChild(testEntity)
            console.log('Test ghost created at position 0 0 -1')
            
            // Add event listeners for marker detection
            for (let i = 0; i < 5; i++) {
              const markerEntity = scene.querySelector(`[mindar-image-target="targetIndex: ${i}"]`)
              if (markerEntity) {
                console.log(`Setting up marker ${i + 1} detection`)
                
                // Try different event names that MindAR might use
                const eventNames = ['targetFound', 'markerFound', 'found', 'targetUpdate']
                eventNames.forEach(eventName => {
                  markerEntity.addEventListener(eventName, (e: any) => {
                    console.log(`Marker ${i + 1} found (event: ${eventName})`, e)
                    handleMarkerFound(i + 1)
                  })
                })
                
                const lostEventNames = ['targetLost', 'markerLost', 'lost']
                lostEventNames.forEach(eventName => {
                  markerEntity.addEventListener(eventName, (e: any) => {
                    console.log(`Marker ${i + 1} lost (event: ${eventName})`, e)
                    handleMarkerLost(i + 1)
                  })
                })
                
                // Also try listening on the scene itself for MindAR events
                scene.addEventListener(`markerFound${i}`, () => {
                  console.log(`Scene-level marker ${i + 1} found`)
                  handleMarkerFound(i + 1)
                })
              } else {
                console.log(`Marker entity ${i + 1} not found`)
              }
            }
            
            // Add a general event listener to catch any MindAR events
            scene.addEventListener('markerFound', (e: any) => {
              console.log('General marker found event:', e)
            })
            
            scene.addEventListener('markerLost', (e: any) => {
              console.log('General marker lost event:', e)
            })
          }, 2000) // Wait 2 seconds for MindAR to initialize
        }

                scene.addEventListener('loaded', onSceneLoaded)

                // Fallback timeout
                cleanupTimeout = setTimeout(() => {
                    console.log('Fallback: Hiding loading indicator')
                    setIsLoading(false)
                }, 5000)
            }
        }

        initializeScene()

        // Cleanup function
        return () => {
            if (cleanupTimeout) {
                clearTimeout(cleanupTimeout)
            }

            // Clean up ghosts
            ghostsRef.current.clear()

            // Clean up scene
            if (scene) {
                try {
                    // Stop MindAR properly
                    if (scene.components && scene.components['mindar-image']) {
                        const mindarComponent = scene.components['mindar-image']
                        if (mindarComponent.el && mindarComponent.el.components) {
                            const videoComponent = mindarComponent.el.components['mindar-video']
                            if (videoComponent && videoComponent.stopProcessVideo) {
                                videoComponent.stopProcessVideo()
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Error stopping MindAR:', error)
                }
            }

            // Remove the entire A-Frame container
            const aframeContainer = document.getElementById('aframe-container')
            if (aframeContainer && aframeContainer.parentNode) {
                aframeContainer.parentNode.removeChild(aframeContainer)
            }

            sceneInstanceRef.current = null
            isInitializedRef.current = false
        }
    }, [handleMarkerFound, handleMarkerLost])

    return (
        <div className="ar-scene" ref={containerRef}>
            {/* Loading indicator - only show when loading */}
            {isLoading && (
                <div className="ar-loading">
                    <div className="loading-spinner">👻</div>
                    <p>Initializing AR...</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '1rem', opacity: 0.7 }}>
                        Make sure camera permissions are enabled
                    </p>
                </div>
            )}
        </div>
    )
}

export default ARScene
