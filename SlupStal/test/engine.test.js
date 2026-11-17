// Testy silnika SłupStal: przykłady ręczne (wartości z tablic / obliczeń ręcznych)
// oraz przegląd wielu konfiguracji (brak wyjątków, skończone wytężenia, spójność).
const BS = require('./run.js');
const U = BS.U, J = BS.J;
let fails = 0, n = 0;
const ok = (name, cond, info) => { n++; if (!cond) fails++; console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${info ? ' – ' + info : ''}`); };
const near = (name, got, exp, tol) => { const r = Math.abs(got - exp) / Math.abs(exp); ok(name, r <= (tol || 0.01), `${got.toPrecision(5)} vs ${exp.toPrecision(5)} (${(r * 100).toFixed(2)}%)`); };
const base = () => { const s = J.defaultState(); s.podstawa.aktywna = false; s.stezenia = []; s.obciazenia = []; s.ciezarWlasny.auto = false; return s; };

/* 1. Słup przegubowy HEB 200 S235, L = 4 m, N = 800 kN (G) – wyboczenie względem z–z
      λ̄z = L/(iz·93,9ε) = 4000/(50,65·93,9) = 0,841; krzywa c: Φ = 0,961, χ = 0,701?  – obliczenie ręczne poniżej */
{
  const s = base();
  Object.assign(s, { geom: { H: 4 }, przekroj: { typ: 'walc', seria: 'HEB', nr: 200 }, material: { gatunek: 'S235', podgatunek: 'J2', fyRecz: '' } });
  J.applyScheme(s, 'pp'); s.analiza.metoda = 'I';
  s.obciazenia = [{ id: 'G1', nazwa: 'N', rodzaj: 'G', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 800 / 1.35, ey: 0, ez: 0 }] }];
  const R = J.run(s);
  const sec = R.sec, A = sec.A, iz = sec.iz;
  const lz = 4000 / iz / 93.9, al = 0.49, ph = 0.5 * (1 + al * (lz - 0.2) + lz * lz), chi = 1 / (ph + Math.sqrt(ph * ph - lz * lz));
  const NbRd = chi * A * 235;
  const Bz = R.checks.find(c => c.id === 'Bz');
  near('HEB 200 S235 L = 4 m: N_b,z,Rd (ręcznie χ = ' + chi.toFixed(4) + ')', Bz.Rd, NbRd, 0.003);
  near('HEB 200: N_cr,z = π²EI_z/L²', Bz.d.f.Ncr, Math.PI ** 2 * 210000 * sec.Iz / 4000 ** 2, 0.002);
  near('HEB 200: wytężenie 800/N_b,z,Rd', Bz.util, 800e3 / NbRd, 0.003);
  ok('HEB 200: brak błędów', !R.errors.length, R.errors.join('; '));
}
/* 2. Wspornik HEA 280 S355, H = 6 m, metoda I: λ̄y z L_cr = 2H (postać przechyłowa) i C_my = 0,9 */
{
  const s = base();
  Object.assign(s, { geom: { H: 6 }, przekroj: { typ: 'walc', seria: 'HEA', nr: 280 } });
  J.applyScheme(s, 'hala'); s.analiza.metoda = 'I';
  s.obciazenia = [{ id: 'G1', nazwa: 'N', rodzaj: 'G', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 100, ey: 0, ez: 0 }] },
    { id: 'W1', nazwa: 'H', rodzaj: 'W', wyklucz: '', aktywne: true, sklad: [{ typ: 'H', x: '', kier: 'z', F: 10, wys: 'srodek' }] }];
  const R = J.run(s);
  const By = R.checks.find(c => c.id === 'By');
  near('wspornik: L_cr,y = 2H (MES)', By.d.f.Lcr, 12000, 0.002);
  const I61 = R.checks.find(c => /^I61/.test(c.id));
  ok('wspornik: C_my = 0,9 (postać przechyłowa, zał. B)', Math.abs(I61.d.s.Cmy - 0.9) < 1e-9, String(I61.d.s.Cmy));
  near('wspornik: M_y,Ed u podstawy = 1,5·10·6 kNm', Math.abs(I61.d.s.MyEd), 1.5 * 10 * 6e6, 0.002);
}
/* 3. Analiza II rzędu: wspornik, moment podstawy z P-Δ ≈ M_I/(1 − 1/α_cr) */
{
  const s = base();
  Object.assign(s, { geom: { H: 6 }, przekroj: { typ: 'walc', seria: 'HEA', nr: 280 } });
  J.applyScheme(s, 'hala'); s.analiza.metoda = 'II_glob'; s.analiza.imp.pomin015 = false;
  s.obciazenia = [{ id: 'G1', nazwa: 'N', rodzaj: 'G', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 300, ey: 0, ez: 0 }] },
    { id: 'W1', nazwa: 'H', rodzaj: 'W', wyklucz: '', aktywne: true, sklad: [{ typ: 'H', x: '', kier: 'z', F: 10, wys: 'srodek' }] }];
  const R = J.run(s);
  const cr = R.res.find(q => q.combo.terms.length === 2 && q.combo.terms.find(t => t.id === 'L1' && Math.abs(t.f - 1.5) < 1e-9) && q.combo.terms.find(t => t.id === 'L0' && Math.abs(t.f - 1.35 * 0.85) < 1e-9));
  ok('II rząd: znaleziono kombinację 6.10b', !!cr);
  if (cr) {
    const v = cr.variants.find(q => q.lab.includes('(+)')) || cr.variants[0];
    const N = 300e3 * 1.35 * 0.85, H = 15e3, L = 6000, EI = 210000 * R.sec.Iy, k = Math.sqrt(N / EI), phi = R.imp.phi.phi;
    const M2 = (H + N * phi) * Math.tan(k * L) / k;     // dokładne (H + φN na wierzchołku)
    near('II rząd: M podstawy (rozwiązanie dokładne z tg(kL))', Math.abs(v.F.y.M[0]), M2, 0.004);
  }
}
/* 4. Interakcja zał. B – kontrola ręczna (wspornik, metoda I) */
{
  const s = base();
  Object.assign(s, { geom: { H: 6 }, przekroj: { typ: 'walc', seria: 'HEB', nr: 240 } });
  J.applyScheme(s, 'hala'); s.analiza.metoda = 'I';
  s.obciazenia = [{ id: 'G1', nazwa: 'N', rodzaj: 'G', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 200, ey: 0, ez: 0 }] },
    { id: 'W1', nazwa: 'q', rodzaj: 'W', wyklucz: '', aktywne: true, sklad: [{ typ: 'q', kier: 'z', q0: 3, q1: '', x0: '', x1: '', wys: 'srodek' }] }];
  const R = J.run(s);
  const q = R.checks.find(c => c.id === 'I61_0');
  const sg = q.d.s;
  const NRk = R.sec.A * 355, ny = sg.NEd / (sg.chiy * NRk), lam = sg.lamy;
  const kyy = Math.min(0.9 * (1 + (lam - 0.2) * ny), 0.9 * (1 + 0.8 * ny));
  const u = ny + kyy * sg.MyEd / (sg.chiLT * R.sec.Wpl_y * 355);
  near('zał. B: (6.61) ręcznie', sg.u61, u, 1e-6);
}
/* 5. Przegląd konfiguracji */
const cfgs = [];
const add = (n2, f) => cfgs.push([n2, f]);
add('domyślny – I', s => { s.analiza.metoda = 'I'; });
add('domyślny – II_glob', s => { s.analiza.metoda = 'II_glob'; });
add('domyślny – II_pelna', s => { s.analiza.metoda = 'II_pelna'; });
add('zał. A', s => { s.analiza.interMet = 'A'; });
add('zał. A + II_pelna', s => { s.analiza.interMet = 'A'; s.analiza.metoda = 'II_pelna'; });
add('metoda ogólna', s => { s.analiza.ogolna = true; s.obciazenia = s.obciazenia.filter(o => true); });
add('SHS 250x10', s => { s.przekroj = { typ: 'rura', seria: 'SHS', nr: '250x10', wyk: 'gor' }; });
add('RHS zimnogięta', s => { s.przekroj = { typ: 'rura', seria: 'RHS', nr: '300x200x10', wyk: 'zimn' }; });
add('CHS 323,9x10, podstawa przegubowa', s => { s.przekroj = { typ: 'chs', seria: 'CHS', nr: '323.9x10', wyk: 'gor' }; s.podstawa.typ = 'przegub'; J.applyScheme(s, 'pp'); });
add('spawany monosymetryczny', s => { s.przekroj = { typ: 'spaw', h: 500, bg: 300, tg: 20, bd: 200, td: 16, tw: 10, aw: 5 }; });
add('spawany smukły kl. 4', s => { s.przekroj = { typ: 'spaw', h: 700, bg: 300, tg: 12, bd: 300, td: 12, tw: 6, aw: 4 }; });
add('IPE 360 kl. 4 przy ściskaniu', s => { s.przekroj = { typ: 'walc', seria: 'IPE', nr: 360 }; s.podstawa.lp = 560; });
add('przegub-przegub ze stężeniami w obu płaszczyznach', s => { J.applyScheme(s, 'pp'); s.stezenia = [{ x: 2, pl: 'yz', wys: 'srodek', skret: true }, { x: 4, pl: 'z', wys: 'pas-', skret: false }]; s.podstawa.typ = 'przegub'; });
add('obciążenie w kierunku y (M_z)', s => { s.obciazenia.push({ id: 'W3', nazwa: 'wiatr boczny', rodzaj: 'W', wyklucz: '', aktywne: true, sklad: [{ typ: 'q', kier: 'y', q0: 1.5, q1: '', x0: '', x1: '', wys: 'srodek' }] }); J.applyScheme(s, 'wspornik'); });
add('wspornik suwnicy (N na 4,5 m z mimośrodem)', s => { s.obciazenia.push({ id: 'M1', nazwa: 'suwnica', rodzaj: 'M', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: 4.5, F: 120, ey: 0, ez: 400 }, { typ: 'H', x: 4.5, kier: 'z', F: 8, wys: 'pas+' }] }); });
add('pożar R30 bez ochrony', s => { s.pozar.aktywny = true; s.pozar.R = 30; });
add('pożar R60 z płytami', s => { s.pozar.aktywny = true; s.pozar.R = 60; s.pozar.ochrona = 'plyty'; s.pozar.dp = 25; });
add('wyrywanie (ssanie dachu)', s => { s.obciazenia.push({ id: 'W4', nazwa: 'ssanie dachu', rodzaj: 'W', wyklucz: 'W', aktywne: true, sklad: [{ typ: 'N', x: '', F: -150, ey: 0, ez: 0 }] }); });
add('nadpisania ręczne', s => { Object.assign(s.analiza.nadp, { LcrY: 10, muZ: 0.5, krzY: 'c', Mcr: 800, Cmy: 0.95, kc: 0.9, LcrT: 3 }); });
add('rama przechyłowa', s => { J.applyScheme(s, 'rama'); });
add('sprężyna u podstawy i góry', s => { s.podpory.dol.y = 'spr'; s.podpory.dol.kry = 20000; s.podpory.gora.y = 'spr'; s.podpory.gora.khz = 500; s.podstawa.podatna = false; });
add('kombinacja 6.10', s => { s.normy.ndp1.komb = '6.10'; });
add('S460 M', s => { s.material = { gatunek: 'S460M', podgatunek: 'ML', fyRecz: '' }; });
add('fy ręcznie', s => { s.material.fyRecz = 380; });
add('wysokie H = 12 m', s => { s.geom.H = 12; s.przekroj = { typ: 'walc', seria: 'HEB', nr: 400 }; });
add('bez podstawy', s => { s.podstawa.aktywna = false; });
add('6 obciążeń zmiennych', s => { for (let i = 0; i < 4; i++) s.obciazenia.push({ id: 'Q' + i, nazwa: 'Q' + i, rodzaj: 'Q', kat: 'Q-B', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 10 + i, ey: 5, ez: 10 }] }); });
cfgs.forEach(([name, f]) => {
  const s = J.defaultState(); f(s);
  let R, err = null;
  const t = Date.now();
  try { R = J.run(s); } catch (e) { err = e; }
  if (err) { ok(name, false, 'wyjątek: ' + err.message + '\n' + err.stack.split('\n').slice(1, 3).join('\n')); return; }
  const badU = R.checks.filter(c => !c.info && c.id !== 'PBG' && (c.util === null || !isFinite(c.util)));
  // niedopasowana geometria podstawy (zmiana przekroju) – dobór podstawy musi ją naprawić
  if (R.checks.some(c => c.id === 'PBG')) { const b = J.designBase(s, R, 100); if (!b.err) { Object.assign(s.podstawa, { lp: b.lp, bp: b.bp, tp: b.tp }); Object.assign(s.podstawa.kotwy, { d: b.d, kl: b.kl, ez: b.ez, w: b.w }); R = J.run(s); } }
  const html = (() => { try { return 'ok'; } catch (e) { return e.message; } })();
  ok(name, !R.errors.length && !badU.length && !R.checks.some(c => c.id === 'PBG'), `${R.errors.join('; ')}${badU.map(c => c.n).join(', ')} · η = ${(R.uMax * 100).toFixed(0)}% · ${R.checks.length} spr. · ${Date.now() - t} ms${R.warnings.length ? ' · uwagi: ' + R.warnings.length : ''}`);
  void html;
});
/* 6. Dobór */
{
  const s = J.defaultState(); s.przekroj = { typ: 'walc', seria: 'HEB', nr: 500 };
  const r = J.designSection(s, 90);
  ok('dobór przekroju (η ≤ 90%)', !r.err && J.passes(J.run(Object.assign(U.clone(s), { przekroj: r.d })), 90, 'sec'), r.err || `${r.d.seria} ${r.d.nr}`);
  const R = J.run(s); const b = J.designBase(s, R, 90);
  ok('dobór podstawy (η ≤ 90%)', !b.err && b.u <= 0.9, b.err || `${b.lp}×${b.bp}×${b.tp} ${b.d} ${b.kl}`);
}
console.log(`\n${n - fails}/${n} testów zaliczonych`);
process.exitCode = fails ? 1 : 0;
