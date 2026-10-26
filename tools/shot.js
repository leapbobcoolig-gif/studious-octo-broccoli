// Headless preview: node tools/shot.js [outDir] [query...]
// Renders each position (static, deterministic steps) and saves PNGs.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const out = process.argv[2] || 'shots';
  const extra = process.argv.slice(3);
  const queries = extra.length ? extra : [
    'pos=cowgirl&t=2.1', 'pos=reverse&t=2.3', 'pos=missionary&t=2.2', 'pos=doggy&t=2.4',
  ];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  require('fs').mkdirSync(out, { recursive: true });
  for (const q of queries) {
    const url = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?gate=0&static=1&' + q.split('#')[0];
    await page.goto(url);
    await page.waitForTimeout(150);
    const click = new URLSearchParams(q.split('#')[0]).get('click');
    if (click) { await page.click(`#toolbar button:text-is("${click}")`); await page.waitForTimeout(100); }
    const [query, clip] = q.split('#');
    const name = q.replace(/[^a-z0-9.=]+/gi, '_') + '.png';
    if (clip) {
      // crop in game pixels, upscale 6x with nearest neighbour
      const [x, y, w, h] = clip.split(',').map(Number);
      const data = await page.evaluate(([x, y, w, h]) => {
        const src = document.getElementById('screen');
        const c = document.createElement('canvas');
        c.width = w * 6; c.height = h * 6;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(src, x, y, w, h, 0, 0, w * 6, h * 6);
        return c.toDataURL('image/png');
      }, [x, y, w, h]);
      require('fs').writeFileSync(path.join(out, name), Buffer.from(data.split(',')[1], 'base64'));
    } else await page.locator('#stage').screenshot({ path: path.join(out, name) });
    console.log('saved', name);
  }
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
  await browser.close();
})();
