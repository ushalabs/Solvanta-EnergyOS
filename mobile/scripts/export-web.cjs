// Deterministic CI export modes. Public SDK config is supplied through build env,
// never placeholder keys or local dotenv files.
const { spawnSync } = require('node:child_process');
const env = { ...process.env, EXPO_NO_DOTENV: '1' };
const without = process.argv.includes('--without-firebase');
const required = ['EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_APP_ID'];
if (without) {
  for (const name of Object.keys(env)) {
    if (name.startsWith('EXPO_PUBLIC_FIREBASE_') || name === 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') delete env[name];
  }
} else {
  const missing = required.filter(name => !env[name]?.trim() || env[name].startsWith('YOUR_'));
  if (missing.length) {
    console.error(`Firebase-enabled export requires these build variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
console.log(`Export mode: ${without ? 'without Firebase configuration' : 'Firebase Web SDK configured'} (dotenv disabled)`);
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--max-workers', '1',
  '--output-dir', without ? 'dist-no-firebase' : 'dist'], { env, stdio: 'inherit' });
if (result.error) { console.error('Unable to start Expo export'); process.exit(1); }
process.exit(result.status ?? 1);
