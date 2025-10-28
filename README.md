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
- `markers/marker1.png` - Your AR marker image ✅ **READY**
- The app uses image tracking (better than pattern markers)
- Just point your camera at the marker image to see 3D models

### 2. Add 3D Models

Place your GLB/GLTF models in the `models/` directory:
- `silly-ghost/` - Ghost 3D model ✅ **READY**
- Add your custom models in folders (GLB/GLTF format)

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
