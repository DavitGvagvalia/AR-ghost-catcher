# AR Ghost Catcher 👻

A modern React-based Augmented Reality game where players hunt for ghosts using AR markers. Built with MindAR, A-Frame, and Vite.

## Features

- **AR Marker Detection**: Uses MindAR for direct PNG/JPEG marker tracking
- **5 Rarity Levels**: Common, Uncommon, Rare, Epic, Legendary ghosts
- **Random Ghost Selection**: 4 different ghost models per rarity level
- **Tap-to-Catch Mechanic**: Click ghosts multiple times based on rarity
- **Halloween Theme**: Spooky UI with animations and sound effects
- **Mobile-First**: Optimized for mobile devices
- **Session Scoring**: Track points and prevent duplicate catches

## Rarity System

| Rarity | Clicks Required | Points Awarded | Models Available |
|--------|----------------|----------------|------------------|
| Common | 1 | 1 | 4 variants |
| Uncommon | 3 | 3 | 4 variants |
| Rare | 5 | 5 | 4 variants |
| Epic | 10 | 10 | 4 variants |
| Legendary | 20 | 20 | 4 variants |

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Add Your Assets**
   - Place 5 marker images in `public/markers/` as `marker1.png` through `marker5.png`
   - Compile markers to `targets.mind` using [MindAR Compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile)
   - Add 20 ghost models (4 per rarity) in `public/models/{rarity}/ghost{1-4}/`
   - Add sound effects `click.mp3` and `catch.mp3` in `public/sounds/`

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Mobile Browser**
   - Navigate to the provided local URL
   - Ensure camera permissions are enabled
   - Point camera at AR markers to catch ghosts!

## Asset Requirements

### AR Markers
- **Format**: PNG or JPEG
- **Size**: 512x512 pixels or larger
- **Quality**: High contrast, feature-rich images work best
- **Compilation**: Must be compiled to `targets.mind` using MindAR tools

### 3D Ghost Models
- **Format**: GLB or GLTF with .bin file
- **Structure**: `public/models/{rarity}/ghost{1-4}/scene.gltf`
- **Size**: Under 5MB per model for web performance
- **Scale**: Appropriately sized for AR (0.5-2 meters)

### Sound Effects
- **Format**: MP3
- **Files**: `click.mp3` (tap sound), `catch.mp3` (catch sound)
- **Duration**: 0.5-2 seconds each
- **Quality**: Normalized volume, 44.1kHz sample rate

## Project Structure

```
ar-ghost-catcher/
├── public/
│   ├── markers/           # AR marker images + targets.mind
│   ├── models/            # 3D ghost models by rarity
│   └── sounds/            # Audio effects
├── src/
│   ├── components/        # React components
│   ├── lib/              # Utilities and hooks
│   └── styles/           # CSS themes
└── package.json
```

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **MindAR** - AR marker tracking
- **A-Frame** - 3D scene rendering
- **CSS3** - Halloween-themed styling

## Browser Compatibility

- **iOS Safari** 11+
- **Chrome Android** 81+
- **Modern mobile browsers** with WebGL support
- **HTTPS required** for camera access (localhost OK for dev)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Components

- **App.tsx** - Main app state machine
- **ARScene.tsx** - MindAR integration and ghost spawning
- **HUD.tsx** - Game UI overlay
- **EndScreen.tsx** - Score display and restart
- **HalloweenFrame.tsx** - Decorative elements

### Key Libraries

- **rarity.ts** - Rarity configuration and model selection
- **session.ts** - Score tracking and caught markers
- **audio.ts** - Sound effect management
- **arHelpers.ts** - Ghost spawning and animation utilities

## Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to static hosting**
   - Upload `dist/` folder to your hosting service
   - Ensure HTTPS is enabled for camera access
   - Test on mobile devices

3. **Recommended hosting platforms**
   - Vercel
   - Netlify
   - GitHub Pages (with custom domain for HTTPS)

## Troubleshooting

### Camera Issues
- Ensure HTTPS is enabled
- Check browser camera permissions
- Try refreshing the page
- Test on different devices

### AR Detection Issues
- Verify marker images are high contrast
- Ensure `targets.mind` file is properly compiled
- Check marker image quality and size
- Test with different lighting conditions

### Performance Issues
- Optimize 3D model file sizes
- Reduce texture resolution if needed
- Test on lower-end devices
- Check browser WebGL support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile devices
5. Submit a pull request

## License

MIT License - feel free to use this project for your own AR games!

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review asset requirements
3. Test on different devices
4. Open an issue with detailed information

Happy ghost hunting! 👻🎃
