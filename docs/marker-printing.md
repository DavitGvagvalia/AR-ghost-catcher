# Marker assets and print validation

`MARKER_MANIFEST` maps `marker-01` through `marker-30` one-to-one to `.patt` and
printable JPEG assets. Create an isolated PDF tool environment once:

```bash
python3 -m venv .venv-markers
source .venv-markers/bin/activate
python -m pip install --requirement scripts/markers/requirements.txt
```

With that environment active, verify and regenerate the print deliverable:

```bash
npm run validate:assets
npm run markers:pdf
```

The generated file is `output/pdf/ghost-hunt-marker-pack.pdf`.

## Confirmed by automated checks

- All 30 canonical IDs have one pattern file and one printable JPEG.
- Every `.patt` has 192 non-empty rows, 16 integer values per row, and values in
  the range 0–255, matching the structure of the official AR.js example.
- The 30 pattern files have distinct SHA-256 hashes and are not exact duplicates
  under any stored rotation.
- Each JPEG downsamples to the first orientation in its paired pattern, verifying
  the manifest pairing.
- The closest pair under the repository's rotation-invariant mean absolute
  difference metric is `marker-16` / `marker-28` at 12.47.
- The PDF contains a labeled contact sheet, 15 placement sheets with two 90 mm
  markers per page, a 100 mm print-calibration bar, and a closest-pair test page.

The distance metric is a reproducible comparison, not an AR.js recognition
threshold. AR.js publishes no pass/fail value for it, so physical testing remains
mandatory.

## Printing

1. Print the PDF on A4 paper at **actual size / 100%**. Disable “fit to page”.
2. Measure the 100 mm calibration bar. If it is not 100 mm, correct the printer
   scaling before producing placement sheets.
3. Keep labels and cut guides outside the black marker border. Do not crop,
   cover, recolor, stretch, laminate with a highly reflective finish, or add
   writing inside a marker.
4. Place markers on flat, rigid surfaces with enough ambient light and minimal
   glare. Record each physical location by its printed ID.

AR.js describes pattern markers as a high-contrast image and generated `.patt`
pair. The workflow is based on the official
[marker documentation](https://ar-js-org.github.io/AR.js-Docs/marker-based/) and
[marker generator](https://github.com/AR-js-org/AR.js/blob/master/three.js/examples/marker-training/examples/generator.html).

## Physical acceptance record

Before event use, record recognition of every marker on the target iPhones and
Android phones at realistic placement sizes, distances, angles, and lighting.
Also record:

- false positives or incorrect IDs;
- `marker-16` and `marker-28` individually and visible together;
- several markers visible at once;
- two phones claiming the same marker simultaneously;
- glare, motion blur, damaged print, and low-light behavior.

The assets and PDF are structurally verified. They are not proven event-ready
until this physical record is complete.
