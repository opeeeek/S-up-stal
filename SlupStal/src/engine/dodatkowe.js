/* =====================================================================
   SłupStal – moduły dodatkowe:
   • pożar – PN-EN 1993-1-2: temperatura stali (4.2.5.1, 4.2.5.2),
     krzywa ISO 834, element ściskany (4.2.3.2) i ściskany ze zginaniem
     (4.2.3.5) klas 1–3, klasa 4 – θ_cr = 350 °C (4.2.3.6), temperatura
     krytyczna i czas do jej osiągnięcia;
   • kruche pękanie – PN-EN 1993-1-10 (tabl. 2.1);
   • klasa wykonania i wymagania wykonawcze – PN-EN 1993-1-1 zał. C,
     PN-EN 1090-2.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, M = BS.M, T = BS.T, R = BS.R;
const X = BS.X = {};

/* ================================================================ POŻAR */
X.iso834 = (tmin) => 20 + 345 * Math.log10(8 * tmin + 1);


// wskaźnik ekspozycji słupa: 4 – ze wszystkich stron, 3 – jedna płaszczyzna (pas −z) przy ścianie
X.sectionFactor = function (sec, eksp, ochrona) {
  let P = 0;
  (sec.kind === 'CC' ? sec.rings : [sec.pts]).forEach(pts => { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; P += Math.hypot(b[0] - a[0], b[1] - a[1]); } });
  const b = sec.kind === 'I' ? Math.max(sec.bg, sec.bd) : sec.b;
  let Pk, Pb;
  if (sec.kind === 'CHS') { Pk = Pb = Math.PI * sec.D; if (eksp === '3') { Pk = Pb = Math.PI * sec.D * 0.75; } }
  else { Pk = eksp === '3' ? P - b : P; Pb = eksp === '3' ? 2 * sec.h + b : 2 * sec.h + 2 * b; }
  const A = sec.A;
  return { P, Pk, Pb, AmV: Pk / A * 1000, AmVb: Pb / A * 1000, ApV: (ochrona === 'plyty' ? Pb : Pk) / A * 1000, kind: sec.kind, closed: sec.kind === 'RHS' || sec.kind === 'CHS' };
};
// przyrost temperatury: zwraca historię θa(t) co 30 s do tmax [min]
X.heating = function (sf, o, tmax) {
  const dt = 2, rho = U.RHO, sig = 5.67e-8, ac = 25, em = 0.7, ef = 1.0;
  let th = 20, thg = 20; const hist = [[0, 20, 20]];
  const prot = o.ochrona && o.ochrona !== 'brak';
  const ksh = prot ? 1 : sf.closed ? 1 : sf.kind === 'I' ? Math.min(1, 0.9 * sf.AmVb / sf.AmV) : Math.min(1, sf.AmVb / sf.AmV);
  const lp = U.num(o.lp, 0.12), dp = U.num(o.dp, 20) / 1000, cp = U.num(o.cp, 1200), rp = U.num(o.rp, 300);
  for (let t = dt; t <= tmax * 60 + 1e-9; t += dt) {
    const thg1 = X.iso834(t / 60);
    const ca = M.ca(th);
    if (!prot) {
      const h = ac * (thg1 - th) + em * ef * sig * (Math.pow(thg1 + 273, 4) - Math.pow(th + 273, 4));
      th += ksh * sf.AmV / (ca * rho) * h * dt;
    } else {
      const phi = cp * rp / (ca * rho) * dp * sf.ApV;
      let d = lp * sf.ApV / dp / (ca * rho) * (thg1 - th) / (1 + phi / 3) * dt - (Math.exp(phi / 10) - 1) * (thg1 - thg);
      if (d < 0 && thg1 > thg) d = 0; // 4.2.5.2(2): Δθa ≥ 0 przy rosnącej θg
      th += d;
    }
    thg = thg1;
    if (Math.abs(t % 30) < 1e-9) hist.push([t / 60, th, thg]);
  }
  return { hist, ksh };
};


// β_M wg rys. 4.2 PN-EN 1993-1-2 z kształtu wykresu (T.shape)
X.betaM = function (sh) {
  if (!sh || sh.mabs < 1) return { v: 1.1, f: '—' };
  const bPsi = 1.8 - 0.7 * sh.psi;
  if (sh.linear) return { v: bPsi, f: `β_M,ψ = 1,8 − 0,7ψ, ψ = ${U.fmt(sh.psi, 3)}` };
  const lin = (sh.ma + sh.mb) / 2, MQ = Math.abs(sh.Mmax - lin);
  const sgn = sh.ma * sh.mb < 0 || sh.Mmax * sh.ma < 0 || sh.Mmax * sh.mb < 0;
  const dM = sgn ? Math.abs(sh.Mmax) + Math.max(Math.abs(Math.min(sh.ma, sh.mb, 0)), Math.abs(Math.max(sh.ma, sh.mb, 0)) * 0) : Math.abs(sh.Mmax);
  const bQ = sh.conc ? 1.4 : 1.3;
  const v = bPsi + MQ / Math.max(1, dM) * (bQ - bPsi);
  return { v, f: `β_M = β_M,ψ + M_Q/ΔM·(β_M,Q − β_M,ψ) = ${U.fmt(bPsi, 3)} + ${U.fmt(MQ / 1e6, 2)}/${U.fmt(dM / 1e6, 2)}·(${U.fmt(bQ, 1)} − ${U.fmt(bPsi, 3)})` };
};
/* wytężenie w pożarze w temperaturze θ: Efi = { N, My, Mz, lamY, lamZ, lamLT, shY, shZ, ltb } (λ̄ w temperaturze normalnej, z L_cr,fi) */
X.fireUtil = function (sec, base, ndp, Efi, th) {
  const fy = base.fy, gfi = ndp.gMfi;
  const ky = M.kFire(th, 1), kE = M.kFire(th, 3);
  const k = R.classCol(sec, fy, Efi.N, Efi.My, Efi.Mz, 0.85 * Math.sqrt(235 / fy));   // 4.2.2: ε = 0,85√(235/fy)
  const cls = k.cls;
  const o = { th, ky, kE, cls };
  if (cls === 4) { o.u = th > 350 ? Infinity : 0; o.cls4 = true; return o; }
  const al = 0.65 * Math.sqrt(235 / fy), r = Math.sqrt(ky / Math.max(kE, 1e-9));
  const chiF = (lam) => { const ph = 0.5 * (1 + al * lam + lam * lam); return Math.min(1, 1 / (ph + Math.sqrt(Math.max(0, ph * ph - lam * lam)))); };
  const lyT = Efi.lamY * r, lzT = Efi.lamZ * r;
  const cy = chiF(lyT), cz = chiF(lzT), cmin = Math.min(cy, cz);
  const A = sec.A, Wy = cls <= 2 ? sec.Wpl_y : Math.min(sec.Wel_t, sec.Wel_b), Wz = cls <= 2 ? sec.Wpl_z : sec.Wel_z;
  const NRd = A * ky * fy / gfi;
  const bMy = X.betaM(Efi.shY), bMz = X.betaM(Efi.shZ), bLT = X.betaM(Efi.shLT || Efi.shY);
  const N = Math.max(0, Efi.N), My = Math.abs(Efi.My || 0), Mz = Math.abs(Efi.Mz || 0);
  const muy = Math.min(0.8, (1.2 * bMy.v - 3) * Math.min(lyT, 1.1) + 0.44 * bMy.v - 0.29);
  const muz = Math.min(0.8, (2 * bMz.v - 5) * Math.min(lzT, 1.1) + 0.44 * bMz.v + 0.29);
  const kyF = Math.min(3, 1 - muy * N / (cy * NRd)), kzF = Math.min(3, 1 - muz * N / (cz * NRd));
  let cLT = 1, lLTt = 0, muLT = 0, kLT = 1;
  if (Efi.ltb && Efi.lamLT > 0.2 && sec.kind === 'I') {
    lLTt = Efi.lamLT * r;
    cLT = chiF(lLTt);
    muLT = Math.min(0.9, 0.15 * lzT * bLT.v - 0.15);
    kLT = Math.min(1, 1 - muLT * N / (cz * NRd));
  }
  const MyRd = Wy * ky * fy / gfi, MzRd = Wz * ky * fy / gfi;
  const ua = N / (cmin * NRd) + kyF * My / MyRd + kzF * Mz / MzRd;
  const ub = N / (cz * NRd) + kLT * My / (cLT * MyRd) + kzF * Mz / MzRd;
  Object.assign(o, { al, lyT, lzT, cy, cz, cmin, NRd, NbfiRd: cmin * NRd, Wy, Wz, MyRd, MzRd, bMy, bMz, bLT, muy, muz, kyF, kzF, lLTt, cLT, muLT, kLT, ua, ub, u: Math.max(ua, ub), N, My, Mz });
  return o;
};

X.fire = function (sec, base, ndp, o, Efi) {
  const sf = X.sectionFactor(sec, o.ekspozycja || '4', o.ochrona || 'brak');
  const prot = o.ochrona && o.ochrona !== 'brak';
  const util = (th) => X.fireUtil(sec, base, ndp, Efi, th).u;
  const u20 = X.fireUtil(sec, base, ndp, Efi, 20);
  let thcr;
  if (u20.cls4) thcr = 350;
  else if (util(20) >= 1) thcr = 20;
  else {
    let lo = 20, hi = 1200;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (util(m) < 1) lo = m; else hi = m; }
    thcr = (lo + hi) / 2;
  }
  // 4.2.4 – temperatura krytyczna wg μ0 (porównawczo – elementy bez utraty stateczności)
  const mu0 = Math.max(0.013, Math.min(1, Efi.N / Math.max(1, sec.A * base.fy / ndp.gMfi) + Math.abs(Efi.My || 0) / (sec.Wpl_y * base.fy) + Math.abs(Efi.Mz || 0) / (sec.Wpl_z * base.fy)));
  const thcr424 = 39.19 * Math.log(1 / (0.9674 * Math.pow(mu0, 3.833)) - 1) + 482;
  const Rreq = U.num(o.R, 60);
  const ht = X.heating(sf, o, Math.max(Rreq * 1.5, 120));
  let tcr = null;
  for (let i = 1; i < ht.hist.length; i++) if (ht.hist[i][1] >= thcr) { const [t0, a0] = ht.hist[i - 1], [t1, a1] = ht.hist[i]; tcr = t0 + (t1 - t0) * (thcr - a0) / (a1 - a0); break; }
  const thR = U.interp(ht.hist.map(r => [r[0], r[1]]), Rreq);
  const atR = X.fireUtil(sec, base, ndp, Efi, thR);
  return { sf, cls4: !!u20.cls4, thcr, thcr424, mu0, Rreq, tcr, thR, atR, at20: u20, hist: ht.hist, ksh: ht.ksh, prot, uR: atR.u, ok: thR <= thcr + 1e-9 };
};

/* ================================================================ KRUCHE PĘKANIE – tabl. 2.1 */
// kolumny TEd: +10, 0, −10, −20, −30, −40, −50 °C; wiersze σEd = 0,75 fy(t), 0,50 fy(t), 0,25 fy(t)
X.T21_TEMPS = [10, 0, -10, -20, -30, -40, -50];
X.T21 = {
  S235: { JR: [[60, 50, 40, 35, 30, 25, 20], [90, 75, 65, 55, 45, 40, 35], [135, 115, 100, 85, 75, 65, 60]],
          J0: [[90, 75, 60, 50, 40, 35, 30], [125, 105, 90, 75, 65, 55, 45], [175, 155, 135, 115, 100, 85, 75]],
          J2: [[125, 105, 90, 75, 60, 50, 40], [170, 145, 125, 105, 90, 75, 65], [200, 200, 175, 155, 135, 115, 100]] },
  S275: { JR: [[55, 45, 35, 30, 25, 20, 15], [80, 70, 55, 50, 40, 35, 30], [125, 110, 95, 80, 70, 60, 55]],
          J0: [[75, 65, 55, 45, 35, 30, 25], [115, 95, 80, 70, 55, 50, 40], [165, 145, 125, 110, 95, 80, 70]],
          J2: [[110, 95, 75, 65, 55, 45, 35], [155, 130, 115, 95, 80, 70, 55], [200, 190, 165, 145, 125, 110, 95]],
          'M,N': [[135, 110, 95, 75, 65, 55, 45], [180, 155, 130, 115, 95, 80, 70], [200, 200, 190, 165, 145, 125, 110]],
          'ML,NL': [[185, 160, 135, 110, 95, 75, 65], [200, 200, 180, 155, 130, 115, 95], [230, 200, 200, 200, 190, 165, 145]] },
  S355: { JR: [[40, 35, 25, 20, 15, 15, 10], [65, 55, 45, 40, 30, 25, 25], [110, 95, 80, 70, 60, 55, 45]],
          J0: [[60, 50, 40, 35, 25, 20, 15], [95, 80, 65, 55, 45, 40, 35], [150, 130, 110, 95, 80, 70, 60]],
          J2: [[90, 75, 60, 50, 40, 35, 25], [135, 110, 95, 80, 65, 55, 45], [200, 175, 150, 130, 110, 95, 80]],
          'K2,M,N': [[110, 90, 75, 60, 50, 40, 35], [155, 135, 110, 95, 80, 65, 55], [200, 200, 175, 150, 130, 110, 95]],
          'ML,NL': [[155, 130, 110, 90, 75, 60, 50], [200, 180, 155, 135, 110, 95, 80], [210, 200, 200, 200, 175, 150, 130]] },
  S420: { 'M,N': [[95, 80, 65, 55, 45, 35, 30], [140, 120, 100, 85, 70, 60, 50], [200, 185, 160, 140, 120, 100, 85]],
          'ML,NL': [[135, 115, 95, 80, 65, 55, 45], [190, 165, 140, 120, 100, 85, 70], [200, 200, 200, 185, 160, 140, 120]] },
  S460: { 'M,N': [[90, 70, 60, 50, 40, 30, 25], [130, 110, 95, 75, 65, 55, 45], [200, 175, 155, 130, 115, 95, 80]],
          'ML,NL': [[125, 105, 90, 70, 60, 50, 40], [180, 155, 130, 110, 95, 75, 65], [200, 200, 200, 175, 155, 130, 115]] }
};
X.t21Row = function (gat, pod) {
  const base = gat.replace(/[NM]$/, '').replace('S450', 'S460');
  const g = X.T21[base]; if (!g) return null;
  const key = Object.keys(g).find(k => k.split(',').includes(pod));
  return key ? { rows: g[key], key, base } : null;
};
// maksymalna grubość [mm] dla TEd i poziomu σEd/fy(t)
X.tmax = function (gat, pod, TEd, ratio) {
  const r = X.t21Row(gat, pod); if (!r) return { err: `Brak danych tablicy 2.1 dla ${gat} ${pod}.` };
  const temps = X.T21_TEMPS;
  if (TEd < -50) return { err: 'TEd < −50 °C – poza zakresem tablicy 2.1 (wymagana analiza wg mechaniki pękania).' };
  const Tc = Math.min(10, TEd);
  const colVal = (row) => { for (let i = 1; i < temps.length; i++) if (Tc >= temps[i]) { const t = (Tc - temps[i]) / (temps[i - 1] - temps[i]); return row[i] + t * (row[i - 1] - row[i]); } return row[0]; };
  const v75 = colVal(r.rows[0]), v50 = colVal(r.rows[1]), v25 = colVal(r.rows[2]);
  const rr = Math.max(0.25, ratio);
  let t;
  if (rr >= 0.75) t = v75; else if (rr >= 0.5) t = v50 + (v75 - v50) * (rr - 0.5) / 0.25; else t = v25 + (v50 - v25) * (rr - 0.25) / 0.25;
  return { t, v75, v50, v25, key: r.key, over: ratio > 0.75 };
};
// klasa Z – rozdz. 3, tabl. 3.1/3.2
X.zClass = function (z) {
  const ZEd = U.num(z.Za) + U.num(z.Zb) + U.num(z.Zc) + U.num(z.Zd) + U.num(z.Ze);
  const cls = ZEd <= 10 ? 'brak wymagań (ZEd ≤ 10)' : ZEd <= 20 ? 'Z15' : ZEd <= 30 ? 'Z25' : 'Z35';
  return { ZEd, cls };
};
X.Za = (a) => (a <= 7 ? 0 : a <= 10 ? 3 : a <= 20 ? 6 : a <= 30 ? 9 : a <= 40 ? 12 : 15);
X.Zc = (s) => (s <= 10 ? 2 : s <= 20 ? 4 : s <= 30 ? 6 : s <= 40 ? 8 : s <= 50 ? 10 : s <= 60 ? 12 : 15);

/* ================================================================ WYKONANIE */
X.exc = function (o, opts) {
  const base = { CC1: 1, CC2: 2, CC3: 3 }[o.CC || 'CC2'] || 2;
  let exc = base;
  const why = [`klasa konsekwencji ${o.CC || 'CC2'} → EXC${base} (PN-EN 1993-1-1/A1 zał. C, tabl. C.1)`];
  if (opts.zmeczenie && exc < 2) { exc = 2; why.push('obciążenia zmęczeniowe – co najmniej EXC2'); }
  if (opts.spawana && exc < 2 && opts.fy > 355) { exc = 2; why.push('elementy spawane ze stali > S355 – zalecana EXC2'); }
  if (o.EXC && o.EXC !== 'auto') { why.push(`przyjęto ręcznie ${o.EXC} – uzasadnienie: ${o.uzasadnienie || '(brak)'}`); exc = +o.EXC.replace('EXC', ''); }
  const E = 'EXC' + exc;
  const req = [];
  req.push(['Klasa wykonania', `${E} – całość elementu i jego połączeń (PN-EN 1090-2, 4.1.2)`]);
  req.push(['Materiał', `${opts.gatunek}${opts.podgatunek ? opts.podgatunek : ''} wg ${(M.STAL[opts.gatunek] || {}).norma || 'PN-EN 10025'}; dokument kontroli ${exc >= 2 ? '3.1' : '2.2'} wg PN-EN 10204; identyfikowalność ${exc >= 3 ? 'pełna (każdy element)' : 'partii wyrobów'}`]);
  req.push(['Wyroby i tolerancje', 'kształtowniki wg PN-EN 10365 i PN-EN 10034; blachy wg PN-EN 10029 (klasa grubości wg zamówienia)']);
  req.push(['Spawanie', `system jakości wg PN-EN ISO 3834-${exc >= 3 ? '2' : '3'}; poziom jakości spoin wg PN-EN ISO 5817: ${exc === 1 ? 'D' : exc === 2 ? 'C' : 'B'}${exc === 4 ? ' (+ wymagania dodatkowe)' : ''}; spawacze wg PN-EN ISO 9606-1; WPS/WPQR wg PN-EN ISO 15614-1${exc >= 2 ? '' : ' (dla EXC1 – wg PN-EN 1090-2, 7.4.1)'}; nadzór spawalniczy wg PN-EN ISO 14731`]);
  req.push(['Badania nieniszczące spoin', exc === 1 ? '100% VT; badania dodatkowe – nie wymagane' : `100% VT; zakres badań dodatkowych (UT/RT/MT/PT) wg PN-EN 1090-2, tabl. 24 dla ${E}`]);
  req.push(['Połączenia śrubowe', 'zestawy niesprężane wg PN-EN 15048-1 (lub sprężane PN-EN 14399); otwory normalne wg PN-EN 1090-2, tabl. 11; dokręcenie – „do styku” (połączenia niesprężane)']);
  req.push(['Tolerancje geometryczne', 'tolerancje zasadnicze i funkcjonalne wg PN-EN 1090-2, rozdz. 11 i zał. B (m.in. prostoliniowość, wygięcie wstępne, płaskość środnika, prostopadłość blach czołowych)']);
  req.push(['Ochrona przed korozją', `kategoria korozyjności ${o.korozja || 'C2'} wg PN-EN ISO 12944-2; trwałość ${o.trwalosc || 'M'}; przygotowanie powierzchni wg PN-EN 1090-2, rozdz. 10`]);
  if (opts.pozar) req.push(['Zabezpieczenie ogniochronne', opts.pozar]);
  if (opts.podniesienie) req.push(['Podniesienie wykonawcze', opts.podniesienie]);
  if (opts.podstawa) req.push(['Podstawa słupa', opts.podstawa]);
  return { exc: E, n: exc, why, req };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
