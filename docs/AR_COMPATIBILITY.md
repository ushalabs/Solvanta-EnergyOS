# Phase 1 SDK decision and AR limits

Checked 28 October 2026. The mobile baseline remains Expo 57.0.31, React Native 0.86.3, React 19.2.3. `package-lock.json` records the resolved dependency tree. `npx expo install --check` passes after aligning native module versions and React.

The official [Expo SDK reference](https://docs.expo.dev/versions/latest/) maps SDK 57 to React Native 0.86 / React 19.2.3. The official [ViroReact Expo integration guide](https://viro-community.readme.io/docs/integrating-with-expo) documents SDK 57 / RN 0.86 support for ViroReact 2.57.3 and requires a custom development client or prebuild; ViroReact does not run in Expo Go.

Executed metadata check:

```text
npm view @reactvision/react-viro@2.57.3 peerDependencies --json
expo: >=55.0.0 <58.0.0
react: >=18.0.0
react-native: >=0.83.0 <0.87.0
```

This verifies that the chosen baseline falls inside the published compatibility range. Native UI screens were run in matching Expo Go 57.0.9. It does **not** prove native AR integration: ViroReact is not installed, no Viro native scene was built, and no physical ARCore device was tested. A native integration/hardware spike remains a prerequisite for claiming AR works in Phase 12. The Phase 1 rooftop is explicitly a static 2D demo; editing, persistence, measurement, and feasible panel placement belong to later phases.

The earlier phrase “AR Locked” and unconditional “100% operational” editor claim were inaccurate and have been removed from the app.
