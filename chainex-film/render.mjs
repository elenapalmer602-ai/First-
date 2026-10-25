#!/usr/bin/env node
// Frame-by-frame render of the Chainex hero film (adapted from the range-assembly-film skill's render-film.mjs):
// frame i is renderFrame(i/fps, subframesAt(t)) with motion blur; resumes from existing frames.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright/index.js');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const STAGE = path.resolve(opt('stage')), OUT = path.resolve(opt('out'));
const W = +opt('width', 1920), H = +opt('height', 1080), FPS = +opt('fps', 30);
const config = JSON.parse(await readFile(path.resolve(opt('config')), 'utf8'));
const quality = opt('quality', 'high');
const filmOpts = { ...config, manual: true, physical: quality !== 'fast', msaa: opt('msaa') != null ? +opt('msaa') : (quality === 'high' ? 4 : 0) };
const name = `render-${W}x${H}.html`;
await writeFile(path.join(STAGE, name), `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000;font-family:Inter,"Helvetica Neue",Arial,sans-serif}#stage{position:absolute;inset:0}</style>
<script type="importmap">{"imports":{"three":"./three.module.js"}}</script></head><body><div id="stage"></div>
<script type="module">
import { mountRangeFilm } from './range-film.js';
window.__film = mountRangeFilm(document.getElementById('stage'), ${JSON.stringify(filmOpts)});
window.__ready = window.__film.ready.then(() => true);
</script></body></html>`);
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try { const f = path.join(STAGE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(await readFile(f)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`http://localhost:${port}/${name}`);
await page.waitForFunction('window.__ready', null, { timeout: 120000 });
await page.evaluate('window.__ready');
const duration = await page.evaluate('window.__film.duration');
await mkdir(OUT, { recursive: true });
const t0 = +opt('from', 0), t1 = Math.min(duration, +opt('to', duration));
const first = Math.round(t0 * FPS), last = Math.round(t1 * FPS);
const existing = new Set(await readdir(OUT));
const started = Date.now(); let done = 0, todo = 0;
for (let i = first; i <= last; i++) if (!existing.has(`${String(i).padStart(5, '0')}.jpg`)) todo++;
console.log(`rendering ${todo} of ${last - first + 1} frames at ${W}x${H}, ${quality}`);
for (let i = first; i <= last; i++) {
  const file = `${String(i).padStart(5, '0')}.jpg`;
  if (existing.has(file)) continue;
  const t = i / FPS;
  await page.evaluate((tt) => window.__film.renderFrame(tt, window.__film.subframesAt(tt)), t);
  await page.evaluate(() => { const r = window.__film._debug.renderer; const gl = r.getContext(); gl.finish(); });
  await page.screenshot({ path: path.join(OUT, file + '.tmp.jpg'), type: 'jpeg', quality: 96, timeout: 300000 });
  const { rename } = await import('node:fs/promises'); await rename(path.join(OUT, file + '.tmp.jpg'), path.join(OUT, file));
  done++;
  if (done % 10 === 0 || i === last) {
    const el = (Date.now() - started) / 1000;
    console.log(`frame ${i} (${done}/${todo})  ${(el / done).toFixed(2)} s/frame  eta ${Math.round((el / done) * (todo - done) / 60)} min`);
  }
}
await browser.close(); server.close();
console.log('DONE', OUT);
