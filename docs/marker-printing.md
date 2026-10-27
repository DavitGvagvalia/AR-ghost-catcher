# Marker assets and print validation

`MARKER_MANIFEST` maps `marker-01` through `marker-30` to the corresponding
`.patt` and JPEG files. Run the automated integrity checks with:

```bash
npm run validate:assets
```

## Confirmed by automated checks

- All 30 canonical IDs have one pattern file and one printable JPEG.
- Every `.patt` has 192 non-empty rows, 16 integer values per row, with values in
  the range 0–255. This matches the shape of the official AR.js example pattern.
- All 30 pattern files have distinct SHA-256 hashes.
- No two patterns are exact duplicates under any of their four stored rotations.
- Each 1024×1024 JPEG downsamples exactly to the first orientation in its paired
  pattern data, proving that the manifest pairs the supplied files correctly.
- The closest pair under the current rotation-invariant mean absolute difference
  metric is `marker-16` / `marker-28` at 12.47.

The distance value is only a reproducible comparison metric. AR.js does not
publish a pass/fail threshold for it, so it must not be treated as proof that the
camera will distinguish the pair reliably.

AR.js describes pattern markers as high-contrast images with a border and uses a
generated image plus `.patt` file as a pair. See the official
[marker-based documentation](https://ar-js-org.github.io/AR.js-Docs/marker-based/)
and [marker generator source](https://github.com/AR-js-org/AR.js/blob/master/three.js/examples/marker-training/examples/generator.html).

## Still required before event use

The supplied JPEGs contain the marker artwork but no visible ID labels. A print
layout must add labels outside the marker boundary without changing or covering
the marker itself. The following deliverables and tests are still missing:

- printable contact-sheet PDF with a clear `marker-01` … `marker-30` label for
  each marker;
- calibration/test page with documented physical marker dimensions;
- recognition test for every marker on target iPhones and Android devices;
- distances, viewing angles, lighting conditions, and false-positive results;
- explicit testing of the closest pairs, beginning with `marker-16` and
  `marker-28`;
- multiple-marker visibility and simultaneous two-phone contention tests.

Do not report these assets as event-ready until those physical tests are recorded.
