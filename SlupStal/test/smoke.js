const BS = require('./run.js'), U = BS.U;
const st = BS.J.defaultState();
for (const m of ['I', 'II_glob', 'II_pelna']) {
  st.analiza.metoda = m;
  const t = Date.now();
  const R = BS.J.run(st);
  console.log('=== metoda', m, 'czas', Date.now() - t, 'ms', 'kombinacji', R.combos && R.combos.length, 'SGN', R.res && R.res.length);
  console.log('errors', R.errors, 'warnings', R.warnings);
  R.checks.forEach(c => console.log(` ${c.status.padEnd(4)} ${(c.util === null ? '' : (c.util * 100).toFixed(1) + '%').padStart(7)}  ${c.grp.slice(0, 22).padEnd(22)} | ${c.n} [${c.ref}] Ed=${U.fmtS(c.unit === 'F' ? c.Ed / 1e3 : c.unit === 'M' ? c.Ed / 1e6 : c.Ed)} Rd=${U.fmtS(c.unit === 'F' ? c.Rd / 1e3 : c.unit === 'M' ? c.Rd / 1e6 : c.Rd)} | ${c.combo || ''}`));
}
