# AR Model Viewer 🎭

A dynamic Augmented Reality web application that lets you view and interact with 3D models using your mobile device's camera.

## Features

- **AR Integration**: Uses AR.js for marker-based augmented reality
- **3D Models**: Interactive GLB/GLTF models with dynamic loading
- **Image Targets**: Scannable AR markers for model placement
- **Interactive Elements**: Tap to interact with models and animations
- **Dynamic Loading**: Automatically discovers and loads models from folders
- **Mobile Optimized**: Designed for high-end mobile devices
- **Sound Effects**: Ambient sounds and interaction feedback

## Setup Instructions

### 1. AR Marker Ready ✅

Your AR marker is already set up and ready to use:
- `markers/ar-pattern.patt` - Your AR pattern file ✅ **READY**
- The app uses pattern tracking for reliable AR detection
- Just point your camera at the pattern to see 3D models

### 2. 3D Models Ready ✅

Your 3D model is already set up and automatically loaded:
- `silly-ghost/` - Ghost 3D model with textures ✅ **READY**
- Models are loaded dynamically from the `models/` directory
- To add more models, see the "Adding New Models" section below

### 3. Sound Effects Ready ✅

Your sound effects are already set up:
- `sounds/interaction.mp3` - Sound when models are interacted with ✅ **READY**
- Audio is enabled and will play when you interact with 3D models

### 4. Deploy to Netlify

1. Push your code to a GitHub repository
2. Connect the repository to Netlify
3. Set build command to: `echo "Static site - no build needed"`
4. Set publish directory to: `/` (root)
5. Deploy!

## Adding New Models

To add new 3D models to your AR app:

1. **Create a folder** in `models/` directory: `models/your-model-name/`
2. **Place your GLB/GLTF file** as `model.glb` in that folder
3. **Add to configuration** in `models/model-config.json`:
   ```json
   {
     "id": "your-model",
     "name": "Your Model",
     "folder": "your-model-name",
     "modelFile": "model.glb",
     "scale": "0.5 0.5 0.5",
     "position": "0 0 0",
     "rotation": "0 0 0",
     "interactive": true,
     "emoji": "🦄"
   }
   ```
4. **Add to discovery list** in `js/model-loader.js`:
   ```javascript
   const knownModels = [
       'silly-ghost',
       'your-model-name',  // Add your model here
   ];
   ```

That's it! No HTML editing needed - models are loaded automatically.

## Usage

1. Open the app on a mobile device
2. Allow camera permissions
3. Point the camera at your AR marker image
4. Tap on the 3D models to interact with them
5. Explore all the available models!

## Technical Details

- **Framework**: AR.js with A-Frame
- **3D Engine**: Three.js
- **Models**: GLB/GLTF format
- **Markers**: AR.js pattern markers
- **Audio**: Web Audio API
- **Styling**: Custom CSS with modern theme

## Browser Support

- Chrome (Android/iOS) - Recommended
- Safari (iOS) - Supported
- Firefox (Android) - Supported
- Edge (Android) - Supported

## Performance Notes

- Optimized for high-end mobile devices
- Uses hardware acceleration when available
- Implements efficient 3D model loading
- Includes mobile-specific optimizations

## Customization

You can easily customize:
- 3D models by replacing files in `models/` directory
- AR markers by generating new patterns
- Sound effects by replacing audio files
- Styling by modifying `styles.css`
- Interactions by editing `script.js`

## Troubleshooting

**Camera not working?**
- Ensure HTTPS is enabled (required for camera access)
- Check browser permissions
- Try refreshing the page

**Models not loading?**
- Check file paths in HTML
- Ensure models are in GLB/GLTF format
- Verify file sizes are reasonable (< 10MB recommended)

**AR not detecting markers?**
- Ensure good lighting conditions
- Keep marker flat and stable
- Try different angles and distances
- Check marker pattern quality

## License

MIT License - Feel free to use and modify for your own projects!

---

Happy Model Viewing! 🎭✨
