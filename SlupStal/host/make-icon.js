// Ikona programu (ICO z obrazami PNG 16–256 px) z logo SłupStal – wymaga Playwright (Chromium)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const svg = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 32 32"><rect x="1.5" y="1.5" width="29" height="29" rx="4" fill="#dfe6f1" stroke="#9fb3d4"/><path d="M10 5.5h12v2.8h-4.6v15.2H22v2.8H10v-2.8h4.6V8.3H10z" fill="#b5413f"/><path d="M6.5 26.4h19v2.3h-19z" fill="#172235"/><path d="M10 5.5h12v1.4H10z" fill="#172235"/></svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const sizes = [256, 48, 32, 16], pngs = [];
  for (const s of sizes) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(s)}</body></html>`);
    pngs.push(await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: s, height: s } }));
  }
  await b.close();
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s >= 256 ? 0 : s, e); head.writeUInt8(s >= 256 ? 0 : s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
    off += pngs[i].length;
  });
  fs.writeFileSync(path.join(__dirname, 'slupstal.ico'), Buffer.concat([head, ...pngs]));
  console.log('slupstal.ico', off, 'B');
})();
