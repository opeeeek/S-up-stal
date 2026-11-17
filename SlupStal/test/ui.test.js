// Test funkcjonalny interfejsu (Chromium/Playwright): node test/ui.test.js [katalog na zrzuty]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const file = path.join(__dirname, '..', 'dist', 'SlupStal.html');
  const shots = process.argv[2] || null;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; let n = 0, fails = 0;
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ok = (name, c, info) => { n++; if (!c) fails++; console.log(`${c ? 'OK  ' : 'FAIL'} ${name}${info ? ' – ' + info : ''}`); };
  const shot = async (nm) => { if (shots) await p.screenshot({ path: path.join(shots, nm + '.png') }); };
  await p.goto('file://' + file); await p.waitForTimeout(1500);
  ok('start – status', /spełnione|Niespełnione/.test(await p.textContent('#status')), await p.textContent('#status'));
  // nowe obciążenie z dialogu
  await p.click('#dataside [data-act="addload"]'); await p.waitForTimeout(200);
  await p.fill('[data-p="nazwa"]', 'Wspornik suwnicy');
  await p.selectOption('[data-p="rodzaj"]', 'M'); await p.waitForTimeout(150);
  await p.fill('[data-p="sklad.0.F"]', '90'); await p.fill('[data-p="sklad.0.x"]', '4,2'); await p.fill('[data-p="sklad.0.ez"]', '350');
  await p.click('#lOk'); await p.waitForTimeout(900);
  const nl = await p.evaluate(() => BS.A.S().obciazenia.length);
  ok('dodanie obciążenia z dialogu', nl === 6, 'liczba obciążeń ' + nl);
  const R1 = await p.evaluate(() => ({ e: BS.A.R().errors.length, u: BS.A.R().uMax }));
  ok('przeliczenie po dodaniu', R1.e === 0, 'η = ' + (R1.u * 100).toFixed(0) + '%');
  await shot('u1_load');
  // zmiana metody analizy
  await p.selectOption('select[data-k="analiza.metoda"]', 'II_pelna'); await p.waitForTimeout(900);
  ok('metoda II_pelna', await p.evaluate(() => BS.A.R().method === 'II_pelna'));
  await p.selectOption('select[data-k="analiza.interMet"]', 'A'); await p.waitForTimeout(900);
  ok('zał. A', await p.evaluate(() => BS.A.R().checks.some(c => /zał\. A/.test(c.n))));
  // nadpisanie ręczne L_cr,y
  await p.fill('input[data-k="analiza.nadp.LcrZ"]', '2,5'); await p.press('input[data-k="analiza.nadp.LcrZ"]', 'Enter'); await p.waitForTimeout(900);
  await p.selectOption('select[data-k="analiza.metoda"]', 'II_glob'); await p.waitForTimeout(900);
  const lz = await p.evaluate(() => { const c = BS.A.R().checks.find(q => q.id === 'Bz'); return c && c.d.f.Lcr; });
  ok('nadpisanie L_cr,z = 2,5 m', Math.abs(lz - 2500) < 1e-6, String(lz));
  // dobór wszystkiego
  await p.click('#adAll'); await p.waitForTimeout(9000);
  const R2 = await p.evaluate(() => ({ n: BS.A.R().sec.nazwa, u: BS.A.R().uMax, e: BS.A.R().errors }));
  ok('dobór wszystkiego', R2.u <= 1 + 1e-9 && !R2.e.length, `${R2.n}, η = ${(R2.u * 100).toFixed(0)}%`);
  await shot('u2_design');
  // zakładki
  for (const t of ['sec', 'chart', 'stab', 'base', 'fire', 'sum', 'report']) {
    await p.click(`.tabs button[data-tab="${t}"]`); await p.waitForTimeout(t === 'report' ? 1500 : 500);
    const txt = await p.textContent('#p-' + t);
    ok('zakładka ' + t, txt.length > 100 && !/Błąd widoku/.test(txt));
    await shot('u3_' + t);
  }
  // wykres dla wybranej kombinacji
  await p.click('.tabs button[data-tab="chart"]'); await p.waitForTimeout(300);
  await p.selectOption('#chC', '3'); await p.waitForTimeout(600);
  ok('wykresy – wybrana kombinacja', (await p.$$('#p-chart svg.hchart')).length >= 5);
  // okno „jak obliczono” dla każdego sprawdzenia
  const nC = await p.evaluate(() => BS.A.R().checks.length);
  const bad = await p.evaluate(() => { const R = BS.A.R(), S = BS.A.S(); return R.checks.filter(c => { const h = BS.Raport.frag(c, R, S); return !h || /Brak toku|undefined|NaN/.test(h); }).map(c => c.id); });
  ok('tok obliczeń dla wszystkich sprawdzeń', !bad.length, `${nC} sprawdzeń; problem: ${bad.join(', ')}`);
  const rep = await p.evaluate(() => BS.Raport.build(BS.A.S(), BS.A.R()));
  ok('raport bez „undefined/NaN”', !/undefined|NaN/.test(rep), (rep.match(/.{60}(undefined|NaN).{40}/) || [''])[0]);
  // pożar
  await p.evaluate(() => { BS.A.S().pozar.aktywny = true; BS.A.changed(true); }); await p.waitForTimeout(1200);
  ok('pożar', await p.evaluate(() => !!BS.A.R().fire && BS.A.R().checks.some(c => c.id === 'FI')));
  await p.click('.tabs button[data-tab="fire"]'); await p.waitForTimeout(500); await shot('u4_fire');
  // zapis raportu HTML z danymi i ponowne wczytanie
  await p.click('.tabs button[data-tab="report"]'); await p.waitForTimeout(1200);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#rHtml')]);
  const tmp = path.join(require('os').tmpdir(), 'ss_rep.html'); await dl.saveAs(tmp);
  const html = fs.readFileSync(tmp, 'utf8');
  ok('raport HTML zawiera dane projektu', /id="slupstal-data"/.test(html), (html.length / 1024).toFixed(0) + ' kB');
  const before = await p.evaluate(() => BS.J.hash(BS.A.S()));
  await p.evaluate(() => { BS.A.S().geom.H = 3; BS.A.changed(true); }); await p.waitForTimeout(500);
  await p.evaluate((t) => BS.A.loadProject(t, 'raport.html'), html); await p.waitForTimeout(1200);
  const after = await p.evaluate(() => BS.J.hash(BS.A.S()));
  ok('wczytanie projektu z raportu HTML (SHA-256 zgodne)', before === after);
  // .odt
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('#rOdt')]);
  const tmp2 = path.join(require('os').tmpdir(), 'ss_rep.odt'); await dl2.saveAs(tmp2);
  const odt = fs.readFileSync(tmp2);
  ok('eksport .odt (ZIP)', odt.slice(0, 2).toString() === 'PK' && odt.length > 5000, (odt.length / 1024).toFixed(0) + ' kB');
  // drugi słup w projekcie
  await p.click('.tabs button[data-tab="data"]'); await p.waitForTimeout(300);
  await p.click('[data-badd]'); await p.waitForTimeout(900);
  ok('drugi słup w projekcie', (await p.$$('.btab')).length === 2);
  ok('brak błędów JS', !errs.length, errs.slice(0, 3).join(' | '));
  console.log(`\n${n - fails}/${n} testów interfejsu zaliczonych`);
  await b.close();
  process.exitCode = fails ? 1 : 0;
})();
