# 3D model asset audit

Six self-contained GLB 2.0 files are mapped in `GHOST_MODEL_MANIFEST`. The asset
suite verifies each file's header, declared length, SHA-256 hash, scene, meshes,
embedded resources, approximate triangle count, animation metadata, and embedded
Sketchfab provenance.

## Measured inventory

The current candidate guardrail is at most 5,000,000 bytes and 50,000 triangles
per model. It is a screening threshold, not proof of acceptable phone runtime.

| Model ID               |         Size | Approx. triangles | Textures | Skin | Runtime pool          |
| ---------------------- | -----------: | ----------------: | -------: | ---- | --------------------- |
| `animal-company-ghost` |    144,272 B |             3,322 |        0 | yes  | candidate             |
| `big-boo`              |    518,916 B |            17,384 |        1 | no   | excluded; rights gate |
| `crocodillo-penisini`  | 29,893,364 B |           844,269 |        1 | no   | excluded; optimize    |
| `halloween-pumpkin`    |     50,928 B |               632 |        0 | no   | candidate             |
| `halloween-skull`      |  3,198,204 B |            20,224 |        2 | no   | candidate             |
| `kuntilanak`           | 11,760,928 B |            97,271 |        1 | yes  | excluded; optimize    |

The server selects only entries that pass the mobile budget and have
`serverSelectable: true`. The known character reference and both oversized
models cannot be assigned. The client computes model bounds after loading and
scales a candidate into a 0.82 marker-unit visual envelope; this avoids trusting
inconsistent source coordinate systems. Actual marker/device calibration remains
required.

None of the files contains an animation clip. Idle floating, hit reaction, and
defeat motion are therefore applied around the model by the AR presentation
layer. A lightweight procedural ghost is rendered if an optional model fails.

## Required gates before public event use

- Every GLB embeds a Sketchfab author, source URL, and `SKETCHFAB Standard`
  label. The repository preserves that provenance, but rights review remains
  `NOT_REVIEWED`. Embedded metadata does not prove the uploader owns all depicted
  third-party rights or that the planned event use is permitted.
- The `big-boo` source title references a Nintendo character. It is not exposed
  as player-facing copy and is excluded from server selection. Do not enable it
  until the organizer completes the rights/risk review.
- Review all source imagery and titles for audience suitability. Metadata names
  are not gameplay names.
- Test each approved candidate on target iPhones and Android phones for load
  time, memory use, frame rate, camera stability, battery drain, and temperature
  during a full 30-minute session.
- Optimize and revalidate `crocodillo-penisini` and `kuntilanak` before changing
  them to candidates.

Until the rights and real-device records exist, the application is technically
testable but the provided model set is not approved for a public event.
