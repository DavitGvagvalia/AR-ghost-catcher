// AR Ghost Catcher JavaScript

class ARGhostCatcher {
    constructor() {
        this.score = 0;
        this.isARActive = false;
        this.audioContext = null;
        this.ghostSound = null;
        this.ambientSound = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupAudio();
        this.simulateLoading();
    }
    
    setupEventListeners() {
        // Start AR button
        document.getElementById('start-ar').addEventListener('click', () => {
            this.startAR();
        });
        
        // Reset scene button
        document.getElementById('reset-scene').addEventListener('click', () => {
            this.resetScene();
        });
        
        // AR scene events
        const arScene = document.getElementById('ar-scene');
        
        // When AR is ready
        arScene.addEventListener('arjs-video-loaded', () => {
            console.log('AR video loaded');
            this.hideLoadingScreen();
        });
        
        // When marker is found
        arScene.addEventListener('markerFound', (event) => {
            console.log('Marker found:', event.detail);
            this.onMarkerFound();
        });
        
        // When marker is lost
        arScene.addEventListener('markerLost', (event) => {
            console.log('Marker lost:', event.detail);
            this.onMarkerLost();
        });
        
        // 3D model click events
        this.setup3DModelInteractions();
    }
    
    setup3DModelInteractions() {
        const arScene = document.getElementById('ar-scene');
        
        // Add click listeners to all clickable entities
        arScene.addEventListener('click', (event) => {
            const clickedEntity = event.detail.intersectedEl;
            if (clickedEntity && clickedEntity.classList.contains('clickable')) {
                this.onEntityClicked(clickedEntity);
            }
        });
        
        // Alternative: Use raycaster for better mobile support
        arScene.addEventListener('touchstart', (event) => {
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                const raycaster = new THREE.Raycaster();
                const mouse = new THREE.Vector2();
                
                mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                
                raycaster.setFromCamera(mouse, arScene.camera);
                
                const entities = arScene.querySelectorAll('.clickable');
                const intersects = raycaster.intersectObjects(
                    entities.map(el => el.object3D)
                );
                
                if (intersects.length > 0) {
                    const clickedEntity = entities[intersects[0].object.userData.entityIndex];
                    this.onEntityClicked(clickedEntity);
                }
            }
        });
    }
    
    onEntityClicked(entity) {
        if (entity.classList.contains('disappearing')) return;
        
        // Add disappearing animation
        entity.classList.add('disappearing');
        
        // Play sound effect
        this.playGhostSound();
        
        // Update score
        this.updateScore();
        
        // Remove entity after animation
        setTimeout(() => {
            entity.style.display = 'none';
        }, 1000);
        
        // Add particle effect (optional)
        this.createParticleEffect(entity);
    }
    
    createParticleEffect(entity) {
        // Simple particle effect using CSS
        const effect = document.createElement('div');
        effect.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, #ff6b6b, transparent);
            border-radius: 50%;
            pointer-events: none;
            animation: particle-explosion 1s ease-out forwards;
        `;
        
        // Add particle animation CSS if not exists
        if (!document.getElementById('particle-styles')) {
            const style = document.createElement('style');
            style.id = 'particle-styles';
            style.textContent = `
                @keyframes particle-explosion {
                    0% {
                        transform: scale(0);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.5);
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(3);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(effect);
        
        // Position effect near the entity (approximate)
        const rect = entity.getBoundingClientRect();
        effect.style.left = rect.left + 'px';
        effect.style.top = rect.top + 'px';
        
        // Remove effect after animation
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1000);
    }
    
    onMarkerFound() {
        console.log('Spooky creatures detected!');
        this.playAmbientSound();
    }
    
    onMarkerLost() {
        console.log('Spooky creatures disappeared...');
        this.pauseAmbientSound();
    }
    
    startAR() {
        this.isARActive = true;
        document.body.classList.add('ar-active');
        
        // Request camera permission
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => {
                console.log('Camera access granted');
                this.showARScene();
            })
            .catch((error) => {
                console.error('Camera access denied:', error);
                alert('Camera access is required for AR functionality. Please allow camera access and try again.');
            });
    }
    
    showARScene() {
        const arScene = document.getElementById('ar-scene');
        arScene.style.display = 'block';
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
    
    resetScene() {
        // Reset score
        this.score = 0;
        this.updateScore();
        
        // Reset all entities
        const entities = document.querySelectorAll('.clickable');
        entities.forEach(entity => {
            entity.style.display = 'block';
            entity.classList.remove('disappearing');
        });
        
        // Reset animations
        this.resetAnimations();
    }
    
    resetAnimations() {
        const entities = document.querySelectorAll('.clickable');
        entities.forEach(entity => {
            // Restart floating animations
            entity.setAttribute('animation__float', 'property: position; to: 0 0.5 0; dir: alternate; dur: 2000; loop: true;');
            entity.setAttribute('animation__rotate', 'property: rotation; to: 0 360 0; dur: 10000; loop: true;');
        });
    }
    
    updateScore() {
        this.score++;
        document.getElementById('score').textContent = this.score;
        
        // Add score animation
        const scoreElement = document.getElementById('score');
        scoreElement.style.transform = 'scale(1.2)';
        scoreElement.style.color = '#ffd93d';
        
        setTimeout(() => {
            scoreElement.style.transform = 'scale(1)';
            scoreElement.style.color = '#ffd93d';
        }, 200);
    }
    
    setupAudio() {
        // Initialize audio context
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.ghostSound = document.getElementById('ghost-sound');
            this.ambientSound = document.getElementById('ambient-sound');
        } catch (error) {
            console.warn('Audio not supported:', error);
        }
    }
    
    playGhostSound() {
        if (this.ghostSound && this.audioContext) {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            this.ghostSound.currentTime = 0;
            this.ghostSound.play().catch(error => {
                console.warn('Could not play ghost sound:', error);
            });
        }
    }
    
    playAmbientSound() {
        if (this.ambientSound && this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            this.ambientSound.play().catch(error => {
                console.warn('Could not play ambient sound:', error);
            });
        }
    }
    
    pauseAmbientSound() {
        if (this.ambientSound) {
            this.ambientSound.pause();
        }
    }
    
    simulateLoading() {
        // Simulate loading progress
        let progress = 0;
        const progressBar = document.querySelector('.loading-progress');
        
        const loadingInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(loadingInterval);
                
                // Show start button after loading
                setTimeout(() => {
                    document.getElementById('start-ar').style.display = 'block';
                }, 500);
            }
            
            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
        }, 200);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ARGhostCatcher();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause audio when page is hidden
        const ambientSound = document.getElementById('ambient-sound');
        if (ambientSound) {
            ambientSound.pause();
        }
    }
});

// Handle orientation changes
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        // Refresh AR scene after orientation change
        const arScene = document.getElementById('ar-scene');
        if (arScene && arScene.style.display !== 'none') {
            arScene.emit('resize');
        }
    }, 100);
});
