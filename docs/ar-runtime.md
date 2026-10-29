# AR runtime provenance

The WebAR runtime is vendored under `apps/web/public/vendor/` so the event does
not depend on third-party CDNs and so Node-only transitive dependencies from the
upstream npm packages are not installed in production.

| Runtime            | Upstream version | Local file                           | SHA-256                                                            |
| ------------------ | ---------------- | ------------------------------------ | ------------------------------------------------------------------ |
| A-Frame            | 1.6.0            | `vendor/aframe/aframe-v1.6.0.min.js` | `197b3200cecb0c5638a29788bc4eae42449eada9e4ef23f77c1d5598ecac17fc` |
| AR.js marker build | 3.4.8            | `vendor/arjs/aframe-ar-3.4.8.js`     | `aec697f1662c8c2f2257eac149641a9f7b34c7c235fabcf7f67666a711ff917d` |

The corresponding upstream license files are stored beside each runtime file.
A-Frame 1.6.0 is intentionally pinned because AR.js 3.4.8 declares
`aframe: ^1.6.0`, and the official AR.js marker example uses A-Frame 1.6.0.

To reproduce the files:

1. Install `aframe@1.6.0` and `@ar-js-org/ar.js@3.4.8` in a temporary working
   directory.
2. Copy `aframe/dist/aframe-v1.6.0.min.js` and
   `@ar-js-org/ar.js/aframe/build/aframe-ar.js` to the paths above.
3. Copy each package's `LICENSE` file beside its runtime.
4. Run `shasum -a 256` on both JavaScript files and compare with this table.

Do not silently upgrade either runtime. Re-run marker recognition and real-device
iOS/Android tests before changing these versions.
