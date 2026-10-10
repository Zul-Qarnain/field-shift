// Renders the README graphics in assets/src/*.html to PNG at exact pixel sizes.
// Run from the web/ directory:  node ../assets/src/render.js
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('/workspace/fs-next/web/node_modules/playwright');

const SRC = '/workspace/fs-next/assets/src';
const OUT = '/workspace/fs-next/assets';

const TARGETS = [
  { file: 'banner.html', out: 'banner.png', width: 1600, height: 500 },
  { file: 'steps.html', out: 'steps.png', width: 1600, height: 420 },
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--force-device-scale-factor=1'] });
  const shots = [];
  for (const t of TARGETS) {
    const page = await browser.newPage({ viewport: { width: t.width, height: t.height }, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(SRC, t.file));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const tmp = path.join(OUT, '_2x_' + t.out);
    await page.screenshot({ path: tmp, clip: { x: 0, y: 0, width: t.width, height: t.height } });
    shots.push({ tmp, final: path.join(OUT, t.out), w: t.width, h: t.height });
    await page.close();
  }
  await browser.close();

  // Supersample then downscale, so the shipped file is the exact pixel size it is shown at.
  const py = `
import sys
from PIL import Image
for src, dst, w, h in ${JSON.stringify(shots.map((s) => [s.tmp, s.final, s.w, s.h]))}:
    Image.open(src).resize((w, h), Image.LANCZOS).save(dst)
    print('wrote', dst.split('/')[-1], (w, h))
`;
  execFileSync('python3', ['-c', py], { stdio: 'inherit' });
  shots.forEach((s) => require('fs').unlinkSync(s.tmp));
})();
