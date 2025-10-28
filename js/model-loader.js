// Dynamic 3D Model Loader for AR Ghost Catcher
class ModelLoader {
    constructor() {
        this.models = [];
        this.loadedModels = new Map();
        this.modelConfig = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) {
            console.log('ℹ️ Model loader already initialized, skipping...');
            return this.models;
        }
        
        try {
            // Load model configuration
            await this.loadModelConfig();
            
            // Auto-discover models from folders
            await this.discoverModels();
            
            // Load all discovered models
            await this.loadAllModels();
            
            this.isInitialized = true;
            console.log(`✅ Loaded ${this.models.length} 3D models dynamically`);
            return this.models;
        } catch (error) {
            console.error('❌ Error loading models:', error);
            return [];
        }
    }

    async loadModelConfig() {
        try {
            const response = await fetch('models/model-config.json');
            this.modelConfig = await response.json();
            console.log('📋 Model configuration loaded');
        } catch (error) {
            console.warn('⚠️ No model config found, using defaults');
            this.modelConfig = { models: [], defaults: {} };
        }
    }

    async discoverModels() {
        // This is a simplified discovery - in a real implementation,
        // you'd scan the models directory server-side
        const knownModels = [
            'silly-ghost',
            // Add more model folders here as you create them
        ];

        for (const modelId of knownModels) {
            const modelPath = `models/${modelId}`;
            const config = this.getModelConfig(modelId);
            
            // Try to find the model file using the config
            const modelFile = await this.findModelFile(modelPath, config.file);
            
            if (modelFile) {
                this.models.push({
                    id: modelId,
                    path: modelPath,
                    file: modelFile,
                    config: config
                });
                console.log(`🔍 Discovered model: ${modelId} (${modelFile})`);
            } else {
                console.warn(`⚠️ Model file not found for: ${modelId}`);
            }
        }
    }

    async findModelFile(modelPath, preferredFile = null) {
        const possibleFiles = preferredFile ? 
            [preferredFile, 'model.glb', 'model.gltf', 'ghost.glb', 'ghost.gltf'] :
            ['model.glb', 'model.gltf', 'ghost.glb', 'ghost.gltf'];
        
        for (const file of possibleFiles) {
            try {
                const response = await fetch(`${modelPath}/${file}`, { method: 'HEAD' });
                if (response.ok) {
                    return file;
                }
            } catch (error) {
                // File doesn't exist, try next
            }
        }
        return null;
    }

    getModelConfig(modelId) {
        // Find config for this model
        const modelConfig = this.modelConfig.models.find(m => m.id === modelId);
        
        if (modelConfig) {
            return {
                ...this.modelConfig.defaults,
                ...modelConfig,
                file: modelConfig.modelFile || modelConfig.file || 'model.glb' // Use modelFile from config
            };
        }

        // Return default config
        return {
            ...this.modelConfig.defaults,
            id: modelId,
            name: modelId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            emoji: '🎭',
            file: 'model.glb'
        };
    }

    async loadAllModels() {
        const arScene = document.getElementById('ar-scene');
        if (!arScene) {
            console.error('❌ AR scene not found');
            return;
        }

        // Clear existing entities and assets to prevent duplicates
        this.clearExistingModels(arScene);

        // Add assets to AR scene
        const assetsContainer = arScene.querySelector('a-assets') || this.createAssetsContainer(arScene);
        
        // Add model entities to marker
        const marker = arScene.querySelector('a-marker');
        if (!marker) {
            console.error('❌ AR marker not found');
            return;
        }

        for (const model of this.models) {
            // Add asset
            this.addModelAsset(assetsContainer, model);
            
            // Add entity
            this.addModelEntity(marker, model);
        }
    }

    clearExistingModels(arScene) {
        // Clear existing model entities
        const existingEntities = arScene.querySelectorAll('[id$="-1"]');
        existingEntities.forEach(entity => entity.remove());
        
        // Clear existing model assets
        const existingAssets = arScene.querySelectorAll('a-asset-item[id$="-model"]');
        existingAssets.forEach(asset => asset.remove());
        
        console.log(`🧹 Cleared ${existingEntities.length} existing entities and ${existingAssets.length} assets`);
    }

    createAssetsContainer(arScene) {
        const assets = document.createElement('a-assets');
        arScene.appendChild(assets);
        return assets;
    }

    addModelAsset(assetsContainer, model) {
        // Check if asset already exists
        const existingAsset = assetsContainer.querySelector(`#${model.id}-model`);
        if (existingAsset) {
            console.log(`ℹ️ Asset ${model.id}-model already exists, skipping...`);
            return;
        }
        
        try {
            // Create proper A-Frame asset element
            const asset = document.createElement('a-asset-item');
            asset.id = `${model.id}-model`;
            asset.src = `${model.path}/${model.file}`;
            
            // Add error handling for asset loading
            asset.addEventListener('error', (e) => {
                console.error(`❌ Failed to load asset ${model.id}-model:`, e);
            });
            
            asset.addEventListener('loaded', () => {
                console.log(`✅ Asset ${model.id}-model loaded successfully`);
            });
            
            assetsContainer.appendChild(asset);
            console.log(`📦 Added asset: ${model.id}-model (${model.path}/${model.file})`);
        } catch (error) {
            console.error(`❌ Error creating asset for ${model.id}:`, error);
        }
    }

    addModelEntity(marker, model) {
        // Check if entity already exists
        const existingEntity = marker.querySelector(`#${model.id}-1`);
        if (existingEntity) {
            console.log(`ℹ️ Entity ${model.id}-1 already exists, skipping...`);
            return;
        }
        
        const entity = document.createElement('a-entity');
        entity.id = `${model.id}-1`;
        entity.className = `clickable ${model.id}-entity`;
        entity.setAttribute('gltf-model', `#${model.id}-model`);
        entity.setAttribute('scale', model.config.scale);
        entity.setAttribute('position', model.config.position);
        entity.setAttribute('rotation', model.config.rotation);

        // Add animations
        if (model.config.animations) {
            Object.keys(model.config.animations).forEach(animName => {
                const anim = model.config.animations[animName];
                const animAttr = `animation__${animName}`;
                const animValue = this.buildAnimationString(anim);
                entity.setAttribute(animAttr, animValue);
            });
        }

        marker.appendChild(entity);
        console.log(`🎭 Added entity: ${model.id}-1`);
    }

    buildAnimationString(anim) {
        return Object.keys(anim)
            .map(key => `${key}: ${anim[key]}`)
            .join('; ');
    }

    // Get model info for demo mode
    getModelInfo() {
        return this.models.map(model => ({
            id: model.id,
            name: model.config.name,
            emoji: model.config.emoji,
            className: `${model.id}-entity`
        }));
    }

    // Get all model classes for event handling
    getModelClasses() {
        return this.models.map(model => `.${model.id}-entity`).join(', ');
    }
}

// Global model loader instance - will be initialized when needed
window.modelLoader = null;
