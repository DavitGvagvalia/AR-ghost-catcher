# 🎭 How to Add New 3D Models

## **Super Easy Process - No HTML Updates Needed!**

### **Step 1: Create Model Folder**
Create a new folder in `models/` directory:
```
models/
├── your-model-name/
│   ├── model.glb (or model.gltf)
│   └── textures/ (optional)
```

### **Step 2: Add to Configuration**
Edit `models/model-config.json` and add your model:

```json
{
  "models": [
    {
      "id": "your-model-name",
      "name": "Your Model Name",
      "folder": "your-model-name",
      "modelFile": "model.glb",
      "scale": "0.5 0.5 0.5",
      "position": "1 0 0",
      "rotation": "0 0 0",
      "animations": {
        "float": {
          "property": "position",
          "to": "1 0.5 0",
          "dir": "alternate",
          "dur": 2000,
          "loop": true
        }
      },
      "interactive": true,
      "emoji": "🦄"
    }
  ]
}
```

### **Step 3: Add to Discovery List**
Edit `js/model-loader.js` and add your model to the `knownModels` array:

```javascript
const knownModels = [
    'silly-ghost',
    'your-model-name',  // Add this line
    // Add more model folders here
];
```

### **Step 4: That's It!**
Your model will automatically appear in:
- ✅ **AR App** - As a 3D model in the AR scene
- ✅ **Demo Mode** - As an emoji creature
- ✅ **All Interactions** - Clickable and animated

## **Model File Naming:**
The system looks for these files in order:
1. `model.glb` (preferred)
2. `model.gltf`
3. `ghost.glb`
4. `ghost.gltf`

## **Configuration Options:**

### **Basic Properties:**
- `id` - Unique identifier
- `name` - Display name
- `folder` - Folder name in models/
- `modelFile` - GLB/GLTF filename
- `scale` - Size (x y z)
- `position` - Position (x y z)
- `rotation` - Rotation (x y z)

### **Animations:**
```json
"animations": {
  "float": {
    "property": "position",
    "to": "0 0.5 0",
    "dir": "alternate",
    "dur": 2000,
    "loop": true
  },
  "rotate": {
    "property": "rotation",
    "to": "0 360 0",
    "dur": 10000,
    "loop": true
  }
}
```

### **Interactive:**
- `interactive: true` - Makes it clickable
- `emoji: "🦄"` - Emoji for demo mode

## **Example: Adding a Dragon Model**

1. **Create folder:** `models/dragon/`
2. **Add model file:** `models/dragon/model.glb`
3. **Update config:**
```json
{
  "id": "dragon",
  "name": "Fire Dragon",
  "folder": "dragon",
  "modelFile": "model.glb",
  "scale": "0.8 0.8 0.8",
  "position": "0 1 0",
  "animations": {
    "fly": {
      "property": "position",
      "to": "0 1.5 0",
      "dir": "alternate",
      "dur": 3000,
      "loop": true
    }
  },
  "interactive": true,
  "emoji": "🐉"
}
```
4. **Add to discovery:** `'dragon'` in `knownModels` array

## **🎉 Benefits:**
- ✅ **No HTML editing** required
- ✅ **Automatic discovery** and loading
- ✅ **Consistent animations** and interactions
- ✅ **Easy to add** multiple models
- ✅ **Works in both** AR and demo modes
- ✅ **Mobile optimized** automatically

Your AR Ghost Catcher will automatically include any models you add following this process!
