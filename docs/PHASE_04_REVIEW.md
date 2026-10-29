# Phase 4 — Measured roof geometry

Implemented camera/gallery import (Expo ImagePicker), manual boundary correction by canvas taps or coordinates, obstacle polygons, two-point known-distance calibration, setbacks, module footprint and gap inputs, authenticated preview/save/reload and building selection. Photos are stored with geometry, rather than relying on temporary device URIs. Images are limited to 2 MB and bounded aspect ratios.

The backend uses Shapely geometry in metres. It erodes the roof by the setback, subtracts buffered obstacles, and accepts a panel only if the entire footprint is covered by the remaining geometry. Overlapping obstacles are unioned. Grid packing is deterministic and conservative, not an optimization claim. Self-intersecting rings, out-of-bounds points, degenerate scale and oversized canvases are rejected.

Limitations: one scale line assumes a top-down rectified image. Perspective photos need rectification outside this tool. Structural, wind, electrical and shading assessments are outside this preliminary layout. Optional CV proposals are not implemented or claimed; all accepted geometry is explicitly entered by the user. Native AR remains Phase 12.

Phase-end validation: 28 backend tests including migration downgrade/upgrade on the isolated test database, geometry/collision cases and cross-tenant save/read/preview rejection. 26 mobile tests and TypeScript check pass.

References: [Shapely polygon operations](https://shapely.readthedocs.io/en/stable/manual.html), [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/). Installed ImagePicker is resolved by the project's Expo SDK 57 compatibility map.

Live HTTP verification also passed: authenticated create temporary building, save calibrated roof, reload identical geometry and layout, delete temporary building. The native emulator hit a System UI ANR at boot; native camera/gallery interactions have not been verified on physical hardware.

Metro Android bundle completed successfully (3,495 modules). Web export required a low-concurrency retry and is tracked separately from the successful Android bundle.
