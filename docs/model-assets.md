# 3D model asset audit

Six self-contained GLB 2.0 files are mapped in `GHOST_MODEL_MANIFEST`. The
validation suite checks each file's header, declared length, SHA-256 hash, scene,
meshes, embedded resources, approximate triangle count, animation metadata, and
embedded Sketchfab provenance.

## Measured inventory

The initial mobile candidate budget is at most 5,000,000 bytes and 50,000
triangles per model. This is a project guardrail, not proof of acceptable runtime
performance; real-device testing remains authoritative.

| Model ID               |         Size | Approx. triangles | Textures | Skin | Mobile status         |
| ---------------------- | -----------: | ----------------: | -------: | ---- | --------------------- |
| `animal-company-ghost` |    144,272 B |             3,322 |        0 | yes  | candidate             |
| `big-boo`              |    518,916 B |            17,384 |        1 | no   | candidate             |
| `crocodillo-penisini`  | 29,893,364 B |           844,269 |        1 | no   | requires optimization |
| `halloween-pumpkin`    |     50,928 B |               632 |        0 | no   | candidate             |
| `halloween-skull`      |  3,198,204 B |            20,224 |        2 | no   | candidate             |
| `kuntilanak`           | 11,760,928 B |            97,271 |        1 | yes  | requires optimization |

None of the six files contains animation clips. Idle floating, hit reactions, and
defeat motion therefore need to be implemented around the model in A-Frame/Three.js
or supplied later as real animation clips.

## Required gates before gameplay use

- `crocodillo-penisini` and `kuntilanak` must be optimized and revalidated before
  inclusion in the mobile random-selection pool.
- `displayScale` deliberately remains `null` for every model until the assets are
  viewed on an actual marker and calibrated. The manifest must not invent scale
  values from inconsistent source coordinate systems.
- Every GLB embeds a Sketchfab author, source URL, and `SKETCHFAB Standard`
  license label. This provenance is preserved in the manifest, but rights review
  is explicitly `NOT_REVIEWED`. Embedded metadata is not proof that an uploader
  owns all depicted third-party rights.
- In particular, the `big-boo` title references a Nintendo character. Do not use
  it publicly until the organizer has reviewed the relevant rights and event risk.
- Review model appearance and source titles for audience suitability; source
  titles are metadata and should not automatically become player-facing copy.
- Test candidate models on target iPhones and Android devices for load time,
  memory, frame rate, battery, and thermal behavior.
