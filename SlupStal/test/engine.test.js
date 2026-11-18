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
  // niedopasowana geometria podstawy (zmiana przekroju) – dobór podstawy musi ją naprawić
  if (R.checks.some(c => c.id === 'PBG')) { const b = J.designBase(s, R, 100); if (!b.err) { Object.assign(s.podstawa, { lp: b.lp, bp: b.bp, tp: b.tp, spoiny: { pas: b.af, srodnik: b.aw } }); Object.assign(s.podstawa.kotwy, { d: b.d, kl: b.kl, ez: b.ez, w: b.w, uklad: b.uklad }); R = J.run(s); } }
  const badU = R.checks.filter(c => !c.info && c.id !== 'PBG' && (c.util === null || !isFinite(c.util)));
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
/* 7. Słup z dwóch ceowników (PN-EN 1993-1-1, 6.4) – charakterystyki i obliczenie ręczne */
{
  const P = BS.P;
  const s0 = P.props(P.geom({ typ: 'dwuc', seria: 'UPN', nr: 200, uklad: 'zew', a: 140, pa: 700, pb: 150, pt: 10, pc: 60, pw: 5 }));
  const ch = s0.pc;
  near('2×UPN 200: A = 2·A_ch', s0.A, 2 * ch.A, 1e-9);
  near('2×UPN 200: I_y = 2·I_y,ch (oś materiałowa)', s0.Iy, 2 * ch.Iy, 1e-9);
  near('2×UPN 200: I_z = 2·(I_ch + A_ch·(h0/2)²) (oś niematerialna)', s0.Iz, 2 * (ch.Iz + ch.A * (s0.h0 / 2) ** 2), 1e-6);
  near('2×UPN 200: h0 = a + 2e', s0.h0, 140 + 2 * ch.yc, 1e-9);
  near('2×UPN 200: W_pl,z = A_ch·h0 (gałęzie po obu stronach osi)', s0.Wpl_z, ch.A * s0.h0, 1e-6);
  const sw = P.props(P.geom({ typ: 'dwuc', seria: 'UPE', nr: 200, uklad: 'wew', a: 60 }));
  near('2×UPE 200 [ ]: h0 = a + 2b − 2e', sw.h0, 60 + 2 * 80 - 2 * sw.pc.yc, 1e-9);
  // słup przegubowy H = 6 m z przewiązkami, N = 600 kN (wartość obliczeniowa), bez momentów – obliczenie ręczne 6.4
  const s = base();
  Object.assign(s, { geom: { H: 6 }, przekroj: { typ: 'dwuc', seria: 'UPN', nr: 200, uklad: 'zew', a: 140, pa: 700, pb: 150, pt: 10, pc: 60, pw: 5 }, material: { gatunek: 'S235', podgatunek: 'J2', fyRecz: '' } });
  J.applyScheme(s, 'pp'); s.analiza.metoda = 'I';
  s.obciazenia = [{ id: 'G1', nazwa: 'N', rodzaj: 'G', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 600 / 1.35, ey: 0, ez: 0 }] }];
  const R = J.run(s);
  ok('2×UPN 200 z przewiązkami: brak błędów', !R.errors.length, R.errors.join('; '));
  const sec = R.sec, E = 210000, fy = 235, L = 6000, Ach = sec.A_ch, Ich = sec.I_ch, h0 = sec.h0, a = 700;
  const I1 = 0.5 * h0 * h0 * Ach + 2 * Ich, i0 = Math.sqrt(I1 / (2 * Ach)), lam = L / i0, mu = lam <= 75 ? 1 : lam >= 150 ? 0 : 2 - lam / 75;
  const Ieff = 0.5 * h0 * h0 * Ach + 2 * mu * Ich, Ib = 10 * 150 ** 3 / 12;
  const Sv = Math.min(24 * E * Ich / (a * a * (1 + 2 * Ich * h0 / (2 * Ib * a))), 2 * Math.PI ** 2 * E * Ich / (a * a));
  const Ncr = Math.PI ** 2 * E * Ieff / (L * L), NEd = 600e3, e0 = L / 500;
  const MEd = NEd * e0 / (1 - NEd / Ncr - NEd / Sv), Nch = 0.5 * NEd + MEd * h0 * Ach / (2 * Ieff);
  const lch = a / sec.i_ch / (Math.PI * Math.sqrt(E / fy)), phc = 0.5 * (1 + 0.49 * (lch - 0.2) + lch * lch), chic = 1 / (phc + Math.sqrt(phc * phc - lch * lch));
  const VEd = Math.PI * MEd / L, Mch = VEd * a / 4, u1 = Nch / (chic * Ach * fy) + Mch / (sec.Wel_z_ch * fy);
  const b1 = R.checks.find(c => c.id === 'BU1');
  ok('6.4: sprawdzenie gałęzi BU1 obecne, brak „Bz” (oś niematerialna wg 6.4)', !!b1 && !R.checks.some(c => c.id === 'Bz'));
  if (b1) {
    near('6.4: I_eff (6.74)', b1.d.bu.Ieff, Ieff, 1e-6);
    near('6.4: S_v (6.73)', b1.d.bu.Sv, Sv, 1e-6);
    near('6.4: M_Ed (6.69) – ręcznie ' + (MEd / 1e6).toFixed(3) + ' kNm', b1.d.bu.MEd, MEd, 0.002);
    near('6.4: N_ch,Ed (6.69) – ręcznie ' + (Nch / 1e3).toFixed(2) + ' kN', b1.d.bu.Nch, Nch, 0.002);
    near('6.4: wytężenie gałęzi między przewiązkami', b1.util, u1, 0.003);
  }
  const bb = R.checks.find(c => c.id === 'BUb');
  if (bb) { const Tb = VEd * a / (2 * h0), Mb = VEd * a / 4, sg = Mb / (10 * 150 * 150 / 6), ta = 1.5 * Tb / (10 * 150); near('6.4: przewiązka σ_red = √(σ² + 3τ²)', bb.d.bu.sred, Math.sqrt(sg * sg + 3 * ta * ta), 0.003); }
  // plecami – przekładki co ≤ 15 i_min: pręt jednolity (Bz z pełnym I_z, krzywa c)
  const s2 = U.clone(s); s2.przekroj = { typ: 'dwuc', seria: 'UPN', nr: 200, uklad: 'plecy', a: 10, pa: 250 }; s2.obciazenia[0].sklad[0].F = 150 / 1.35;
  const R2 = J.run(s2), bs = R2.checks.find(c => c.id === 'BUs');
  ok('6.4.4: plecami, a ≤ 15·i_min → pręt jednolity (BUs spełniony, Bz obecne)', !R2.errors.length && bs && bs.status === 'ok' && R2.checks.some(c => c.id === 'Bz') && !R2.checks.some(c => c.id === 'BU1'), bs ? `15·i_min = ${bs.Rd.toFixed(0)} mm` : '');
  const s3 = U.clone(s2); s3.przekroj.pa = 900;
  const R3 = J.run(s3);
  ok('6.4.4(2): plecami, a > 15·i_min → sprawdzenie jak z przewiązkami', !R3.errors.length && R3.checks.some(c => c.id === 'BU1') && !R3.checks.some(c => c.id === 'Bz'));
  // dobór najlżejszego ceownika
  const s4 = J.defaultState(); s4.przekroj = { typ: 'dwuc', seria: 'UPN', nr: 300, uklad: 'zew', a: '' };
  const r4 = J.designSection(s4, 90);
  ok('dobór 2×UPN (η ≤ 90%)', !r4.err && J.passes(J.run(Object.assign(U.clone(s4), { przekroj: r4.d })), 90, 'sec'), r4.err || `2×${r4.d.seria} ${r4.d.nr}`);
}
/* 8. Rozmieszczenie otworów kotew – PN-EN 1993-1-8, tabl. 3.3; odstęp kotew od słupa */
{
  const s = J.defaultState();                       // HEA 280, blacha 480×360, 4 kotwy poza pasami
  const R = J.run(s), g = R.pb.C.geo, d0 = BS.M.d0Kotwy(BS.M.SRUBY[s.podstawa.kotwy.d].d);
  near('otwory: e_min = 1,2·d₀', g.eMin, 1.2 * d0, 1e-12);
  near('otwory: p₁,min = 2,2·d₀, p₂,min = 2,4·d₀', g.p1Min + g.p2Min, 4.6 * d0, 1e-12);
  near('otwory: e_y = (b_p − w)/2', g.eY, (U.num(s.podstawa.bp) - U.num(s.podstawa.kotwy.w)) / 2, 1e-12);
  near('otwory: e_z = l_p/2 − z_T (= e_z zadane)', g.eZ, U.num(s.podstawa.kotwy.ez), 1e-12);
  near('odstęp od słupa = z_T − h/2 (lico pasa)', g.clr, U.num(s.podstawa.lp) / 2 - U.num(s.podstawa.kotwy.ez) - R.sec.h / 2, 1e-6);
  const st = (id, RR) => (RR.checks.find(c => c.id === id) || {}).status;
  ok('otwory: układ domyślny spełnia tabl. 3.3 i odstęp od słupa', st('PBe', R) === 'ok' && st('PBp', R) === 'ok' && st('PBk', R) === 'ok');
  const s2 = U.clone(s); s2.podstawa.kotwy.w = U.num(s.podstawa.bp) - 2 * 30;      // e_y = 30 mm < 1,2·d₀
  ok('otwory: e_y = 30 mm < 1,2·d₀ → warunek niespełniony', st('PBe', J.run(s2)) === 'fail');
  const s3 = U.clone(s); s3.podstawa.kotwy.w = 2 * d0;                               // rozstaw w rzędzie < 2,4·d₀
  ok('otwory: p₂ < 2,4·d₀ → warunek niespełniony', st('PBp', J.run(s3)) === 'fail');
  const s4 = U.clone(s); s4.podstawa.kotwy.ez = (U.num(s.podstawa.lp) - R.sec.h) / 2 - 20;   // kotwa 20 mm od lica pasa
  ok('kotwa 20 mm od lica pasa → odstęp od słupa niespełniony', st('PBk', J.run(s4)) === 'fail');
  const s5 = J.defaultState(); s5.przekroj = { typ: 'rura', seria: 'SHS', nr: '200x10', wyk: 'gor' }; s5.podstawa.typ = 'przegub'; Object.assign(s5.podstawa.kotwy, { uklad: 'wew', w: 120, p: 120 }); s5.podpory.dol.y = 'prz'; s5.podpory.gora.y = 'prz';
  const R5 = J.run(s5);
  ok('kotwy wewnątrz rury → błąd geometrii (układ niewykonalny)', R5.pb && R5.pb.C.geo.inside && R5.checks.some(c => c.id === 'PBG'));
  // dobór podstawy zachowuje minimalne odległości i rozstawy
  const b = J.designBase(s, R, 90);
  const s6 = U.clone(s); Object.assign(s6.podstawa, { lp: b.lp, bp: b.bp, tp: b.tp, spoiny: { pas: b.af, srodnik: b.aw } }); Object.assign(s6.podstawa.kotwy, { d: b.d, kl: b.kl, ez: b.ez, w: b.w, uklad: b.uklad });
  const R6 = J.run(s6);
  ok('dobór podstawy: e ≥ 1,2·d₀, p ≥ 2,2/2,4·d₀, odstęp od słupa', !b.err && ['PBe', 'PBp', 'PBk'].every(id => st(id, R6) === 'ok'), b.err || `${b.lp}×${b.bp}, e_y = ${R6.pb.C.geo.eY}, e_z = ${R6.pb.C.geo.eZ}`);
}
/* 9. Klasy kotew – PN-EN 1993-1-8, tabl. 3.1; kl. 10.9 */
{
  const KL = BS.PB.KOTWY_KL;
  ok('klasy kotew: 4.6, 4.8, 5.6, 5.8, 6.8, 8.8, 10.9 i pręty S235–S460', ['4.6', '4.8', '5.6', '5.8', '6.8', '8.8', '10.9', 'S235', 'S275', 'S355', 'S460'].every(k => KL[k]), Object.keys(KL).join(', '));
  const s = J.defaultState(); s.podstawa.kotwy.kl = '10.9';
  const R = J.run(s), C = R.pb.C, As = BS.M.SRUBY[s.podstawa.kotwy.d].As, g2 = R.ndp.gM2;
  near('kl. 10.9: F_t,Rd = k₂·f_ub·A_s/γ_M2 (f_ub = 1000 MPa)', C.FtRd, 0.9 * 1000 * As / g2, 1e-9);
  near('kl. 10.9: F_2,vb,Rd jak dla f_yb = 640, f_ub = 800 MPa (zakres 6.2.2(7))', C.F2vb, (0.44 - 0.0003 * 640) * 800 * As / g2, 1e-9);
  ok('kl. 10.9: uwaga o cynkowaniu i ciągliwości, brak błędów', !R.errors.length && R.warnings.some(w => /10\.9/.test(w)));
  const s2 = J.defaultState(); s2.podstawa.kotwy.kl = '6.8';
  near('kl. 6.8: F_2,vb,Rd = (0,44 − 0,0003·480)·600·A_s/γ_M2', J.run(s2).pb.C.F2vb, (0.44 - 0.0003 * 480) * 600 * As / g2, 1e-9);
}
console.log(`\n${n - fails}/${n} testów zaliczonych`);
process.exitCode = fails ? 1 : 0;
