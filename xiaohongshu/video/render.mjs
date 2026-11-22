// Renders video.html to numbered PNG frames by driving headless Chrome over the
// DevTools protocol (no extra packages): node render.mjs <out-dir> [fps]
// Then: ffmpeg -framerate 30 -i <out-dir>/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 17 lookup-teaser.mp4
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const out = process.argv[2];
const fps = Number(process.argv[3] ?? 30);
const page = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'video.html')).href;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
mkdirSync(out, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  `--remote-debugging-port=${PORT}`, '--window-size=1080,1440', `--user-data-dir=${join(out, '.chrome')}`, page,
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
  } catch {}
}
if (!target) throw new Error('Chrome did not start');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const waiting = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1440, deviceScaleFactor: 1, mobile: false });
// Wait for the page, its images and fonts.
for (let i = 0; i < 100; i++) {
  const r = await send('Runtime.evaluate', {
    expression: 'document.readyState === "complete" && [...document.images].every(i => i.complete) && typeof render === "function"',
    returnByValue: true,
  });
  if (r.result.value) break;
  await sleep(100);
}
await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });

const { result } = await send('Runtime.evaluate', { expression: 'DURATION', returnByValue: true });
const frames = Math.round(result.value * fps);
for (let f = 0; f < frames; f++) {
  await send('Runtime.evaluate', {
    // Two animation frames so layout and filters settle before the capture.
    expression: `render(${f / fps}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`,
    awaitPromise: true,
  });
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(out, `${String(f).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
  if (f % 90 === 0) console.log(`frame ${f}/${frames}`);
}
ws.close();
chrome.kill();
console.log(`done: ${frames} frames`);
