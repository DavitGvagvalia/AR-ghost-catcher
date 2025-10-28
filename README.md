# AR Ghost Catcher 👻

A spooky Halloween-themed Augmented Reality web application that lets you catch ghosts and other supernatural creatures using your mobile device's camera.

## Features

- **AR Integration**: Uses AR.js for marker-based augmented reality
- **3D Models**: Interactive GLB/GLTF models (ghosts, pumpkins, bats)
- **Image Targets**: Scannable AR markers for model placement
- **Interactive Elements**: Tap to make creatures disappear with animations
- **Halloween Theme**: Spooky but minimalistic design
- **Mobile Optimized**: Designed for high-end mobile devices
- **Sound Effects**: Ambient sounds and interaction feedback

## Setup Instructions

### 1. Create AR Pattern Markers

You need to create AR pattern markers for the app to work:

1. Go to [AR.js Pattern Generator](https://jeromeetienne.github.io/AR.js/three.js/examples/marker-training/examples/generator.html)
2. Upload a spooky image (recommended: 512x512px)
3. Download the generated `.patt` file
4. Replace `markers/ghost-pattern.patt` with your generated pattern

### 2. Add 3D Models

Place your GLB/GLTF models in the `models/` directory:
- `ghost.glb` - Ghost 3D model ✅ **READY**
- Add your custom models here (GLB/GLTF format)

### 3. Add Sound Effects (Optional)

Place audio files in the `sounds/` directory:
- `ghost-disappear.mp3` - Sound when creatures disappear
- `spooky-ambient.mp3` - Background ambient sound

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
4. Tap on the 3D creatures to make them disappear
5. Try to catch all the ghosts!

## Technical Details

- **Framework**: AR.js with A-Frame
- **3D Engine**: Three.js
- **Models**: GLB/GLTF format
- **Markers**: AR.js pattern markers
- **Audio**: Web Audio API
- **Styling**: Custom CSS with Halloween theme

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

Happy Ghost Hunting! 👻🎃
