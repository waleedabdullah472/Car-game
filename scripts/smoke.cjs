/* Headless smoke test of the built site. Usage: node scripts/smoke.cjs <url> <outdir> (needs playwright). */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:4173/', OUT = process.argv[3] || '.';
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ARGS });
  const errs = [];
  for (const [tag, vp, mobile] of [['desktop', { width: 1280, height: 720 }, false], ['phone', { width: 390, height: 780 }, true]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(tag + ' pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push(tag + ' console: ' + m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.__fg, null, { timeout: 30000 });
    await p.waitForTimeout(3600);
    await p.screenshot({ path: `${OUT}/${tag}-intro.png` });
    await p.click('#introGo'); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${tag}-menu.png` });
    await p.click('#btnStart');
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${tag}-welcome.png` });
    await p.waitForTimeout(3600);
    await p.evaluate(() => { const g = window.__fg; g.G.keys.gas = true; g.tick(8); g.G.praise && g.G.praise('good'); });
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${tag}-play.png` });
    const info = await p.evaluate(() => ({ state: window.__fg.G.state, v: window.__fg.G.P.v, toasts: document.querySelectorAll('#toast .fname').length, hasNaN: !isFinite(window.__fg.G.P.x + window.__fg.G.P.z) }));
    console.log(tag, JSON.stringify(info));
    await p.evaluate(() => { const g = window.__fg; g.G.keys.gas = true; g.tick(90); });
    await p.keyboard.press('c'); await p.waitForTimeout(400); await p.keyboard.press('c'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${tag}-cockpit.png` });
    await ctx.close();
  }
  await b.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  process.exit(errs.length ? 1 : 0);
})();
