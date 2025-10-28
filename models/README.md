# 3D Models Directory

This directory should contain your GLB/GLTF 3D models for the AR Ghost Catcher app.

## Required Models

- `ghost.glb` - Main ghost character (recommended size: 0.5-1MB)
- `pumpkin.glb` - Halloween pumpkin (recommended size: 0.3-0.8MB)  
- `bat.glb` - Flying bat creature (recommended size: 0.2-0.5MB)

## Model Requirements

- **Format**: GLB or GLTF
- **Size**: Keep under 2MB each for optimal performance
- **Polygons**: Optimize for mobile (under 10k triangles per model)
- **Textures**: Use compressed textures (WebP, KTX2)
- **Animations**: Optional, but supported

## Where to Find Models

- [Sketchfab](https://sketchfab.com) - Free and paid models
- [Poly by Google](https://poly.google.com) - Free models
- [TurboSquid](https://www.turbosquid.com) - Professional models
- [CGTrader](https://www.cgtrader.com) - Various price ranges

## Model Optimization Tips

1. Use Blender or similar software to optimize models
2. Reduce polygon count for mobile performance
3. Compress textures appropriately
4. Remove unnecessary materials and animations
5. Test on actual mobile devices

## Halloween-Themed Model Ideas

- Ghosts (various styles)
- Pumpkins (carved and plain)
- Bats (flying poses)
- Skeletons
- Witches
- Spiders
- Tombstones
- Candles
- Cauldrons

## File Naming Convention

Use lowercase, descriptive names:
- `ghost.glb`
- `pumpkin.glb`
- `bat.glb`
- `skeleton.glb`
- `witch-hat.glb`

## Testing Your Models

1. Place models in this directory
2. Update the model paths in `index.html` if needed
3. Test on mobile device with AR functionality
4. Check performance and loading times
5. Adjust model complexity if needed
