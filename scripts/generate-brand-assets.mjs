// Regenerates the brand PNGs in mobile/assets/brand from the SVGs next to them.
// It needs no dependency: it drives a Chromium-based browser that is already installed
// (set BRAND_BROWSER to a browser executable to choose one).
// Usage: node scripts/generate-brand-assets.mjs [outputDir]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'mobile', 'assets', 'brand');
const outDir = resolve(process.argv[2] || brand);

// [svg, png, pixels, transparent background, optional share of the canvas the artwork fills (default 1)]
const JOBS = [
  ['solvanta-app-icon.svg', 'icon.png', 1024, false],
  ['solvanta-adaptive-foreground.svg', 'adaptive-icon-foreground.png', 1024, true],
  ['solvanta-app-icon.svg', 'favicon.png', 48, false],
  ['solvanta-leaf-mono.svg', 'notification-icon.png', 96, true],
  ['solvanta-leaf.svg', 'solvanta-leaf-1024.png', 1024, true],
  ['solvanta-leaf-badge.svg', 'solvanta-leaf-badge-1024.png', 1024, true],
  ['solvanta-leaf.svg', 'splash-icon.png', 1024, true, 0.64],
];

function findBrowser() {
  const candidates = [process.env.BRAND_BROWSER];
  const local = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
  const pw = join(local, 'ms-playwright');
  if (existsSync(pw)) {
    for (const d of readdirSync(pw).filter(n => n.startsWith('chromium')).sort().reverse()) {
      candidates.push(join(pw, d, 'chrome-win', 'chrome.exe'), join(pw, d, 'chrome-linux', 'chrome'), join(pw, d, 'chrome-win', 'headless_shell.exe'));
    }
  }
  candidates.push(
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  );
  return candidates.find(c => c && existsSync(c));
}

const browser = findBrowser();
if (!browser) { console.error('No Chromium-based browser found. Set BRAND_BROWSER to its executable.'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const work = join(tmpdir(), `solvanta-brand-${process.pid}`);
mkdirSync(work, { recursive: true });
let failed = false;
for (const [svg, png, px, transparent, fill = 1] of JOBS) {
  const src = join(brand, svg);
  // Wrap the SVG in a page of exactly px by px so it is rendered as vectors at the target size, never scaled up from a bitmap.
  const page = join(work, `${png}.html`);
  writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent}body{width:${px}px;height:${px}px;display:flex;align-items:center;justify-content:center}img{display:block;width:${Math.round(px * fill)}px;height:${Math.round(px * fill)}px}</style><img src="${pathToFileURL(src).href}">`);
  const target = join(outDir, png);
  const r = spawnSync(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
    `--window-size=${px},${px}`, '--default-background-color=00000000', `--screenshot=${target}`, pathToFileURL(page).href], { stdio: 'pipe' });
  if (r.status !== 0 || !existsSync(target)) { failed = true; console.error(`failed: ${png}`, String(r.stderr).slice(0, 300)); continue; }
  console.log(`${png} (${px}px) from ${svg}${transparent ? '' : ' (opaque)'}`);
}
rmSync(work, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
