# AR Markers

Place your 5 marker images here as:
- marker1.png (or .jpg)
- marker2.png (or .jpg) 
- marker3.png (or .jpg)
- marker4.png (or .jpg)
- marker5.png (or .jpg)

## Marker Compilation

MindAR requires a compiled `.mind` file. After placing your marker images:

1. **Online Compiler**: Visit https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. **CLI Tool**: Run `npx mind-ar-cli compile --image-targets markers/`

The compiled `targets.mind` file should be placed in this directory.

## Marker Requirements

- High contrast, feature-rich images work best
- Recommended size: 512x512 pixels or larger
- Format: PNG or JPEG
- Avoid simple geometric shapes or low-contrast images
