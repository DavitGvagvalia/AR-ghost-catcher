// Dynamic 3D Model Loader for AR Ghost Catcher
class ModelLoader {
    constructor() {
        this.models = [];
        this.loadedModels = new Map();
        this.modelConfig = null;
    }

    async init() {
        try {
            // Load model configuration
            await this.loadModelConfig();
            
            // Auto-discover models from folders
            await this.discoverModels();
            
            // Load all discovered models
            await this.loadAllModels();
            
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
            const modelFile = await this.findModelFile(modelPath);
            
            if (modelFile) {
                const config = this.getModelConfig(modelId);
                this.models.push({
                    id: modelId,
                    path: modelPath,
                    file: modelFile,
                    config: config
                });
                console.log(`🔍 Discovered model: ${modelId}`);
            }
        }
    }

    async findModelFile(modelPath) {
        const possibleFiles = ['model.glb', 'model.gltf', 'ghost.glb', 'ghost.gltf'];
        
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
                ...modelConfig
            };
        }

        // Return default config
        return {
            ...this.modelConfig.defaults,
            id: modelId,
            name: modelId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            emoji: '🎭'
        };
    }

    async loadAllModels() {
        const arScene = document.getElementById('ar-scene');
        if (!arScene) {
            console.error('❌ AR scene not found');
            return;
        }

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

    createAssetsContainer(arScene) {
        const assets = document.createElement('a-assets');
        arScene.appendChild(assets);
        return assets;
    }

    addModelAsset(assetsContainer, model) {
        const asset = document.createElement('a-asset-item');
        asset.id = `${model.id}-model`;
        asset.src = `${model.path}/${model.file}`;
        assetsContainer.appendChild(asset);
        
        console.log(`📦 Added asset: ${model.id}-model`);
    }

    addModelEntity(marker, model) {
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

// Global model loader instance
window.modelLoader = new ModelLoader();
