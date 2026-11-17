/* =====================================================================
   SłupStal – nośność przekroju słupa (PN-EN 1993-1-1, 5.5 i 6.2;
   PN-EN 1993-1-5, 4.4 i 5): klasyfikacja przy N + M_y + M_z,
   przekroje efektywne klasy 4 (A_eff, W_eff,y, W_eff,z, e_N),
   nośności plastyczne / sprężyste, interakcja N–M_y–M_z (6.31–6.41,
   6.42, 6.44), redukcja od ścinania (6.2.8, 6.2.10), wyboczenie
   środnika przy ścinaniu (PN-EN 1993-1-5, 5).
   Znaki: N > 0 – ściskanie; M_y > 0 – ściska stronę +z; M_z > 0 – ściska stronę +y.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, P = BS.P;
const R = BS.R = {};
const s3 = Math.sqrt(3);

/* ---------------------------------------------------------- klasyfikacja (tabl. 5.2) */
// położenie osi obojętnej plastycznej przy sile Nc (ściskanie +) i ściskanej stronie Mpos (oś z)
function plasticNA(sec, fy, Nc, Mpos) {
  const Ac = U.clamp((sec.A + Nc / fy) / 2, 0, sec.A);
  let lo = 0, hi = sec.h;
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    const a = P.integrals(P.clip(sec.rings, m, Mpos), 0).A; // pole po stronie ściskanej
    if (Mpos) { if (a > Ac) lo = m; else hi = m; } else { if (a > Ac) hi = m; else lo = m; }
  }
  return (lo + hi) / 2;
}
R.plasticNA = plasticNA;
// klasa ścianki wewnętrznej przy rozkładzie (α – plastycznie, ψ – sprężyście)
function internalClass(ct, eps, alpha, ps) {
  let l1, l2, l3;
  if (alpha >= 0.999 && ps >= 0.999) { l1 = 33 * eps; l2 = 38 * eps; l3 = 42 * eps; }
  else {
    l1 = alpha > 0.5 ? 396 * eps / (13 * alpha - 1) : 36 * eps / Math.max(alpha, 1e-6);
    l2 = alpha > 0.5 ? 456 * eps / (13 * alpha - 1) : 41.5 * eps / Math.max(alpha, 1e-6);
    l3 = ps > -1 ? 42 * eps / (0.67 + 0.33 * ps) : 62 * eps * (1 - ps) * Math.sqrt(-ps);
  }
  return { cls: ct <= l1 ? 1 : ct <= l2 ? 2 : ct <= l3 ? 3 : 4, lim: [l1, l2, l3] };
}
R.plasticNA = plasticNA;
// oś obojętna plastyczna w kierunku y (zginanie M_z): pole po stronie ściskanej (+y gdy Mpos) = (A + Nc/fy)/2
function plasticNAy(sec, fy, Nc, Mpos) {
  const Ac = U.clamp((sec.A + Nc / fy) / 2, 0, sec.A);
  let lo = sec.ymin, hi = sec.ymax;
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    const ar = P.integrals(P.clipY(sec.rings, m), 0).A;     // pole po stronie y ≥ m
    const a = Mpos ? ar : sec.A - ar;
    if (Mpos) { if (a > Ac) lo = m; else hi = m; } else { if (a > Ac) hi = m; else lo = m; }
  }
  return (lo + hi) / 2;
}
R.plasticNAy = plasticNAy;
// klasa ścianki wewnętrznej (α – rozkład plastyczny, ψ – sprężysty)
function internalClass(ct, eps, alpha, ps) {
  let l1, l2, l3;
  if (alpha >= 0.999 && ps >= 0.999) { l1 = 33 * eps; l2 = 38 * eps; l3 = 42 * eps; }
  else {
    l1 = alpha > 0.5 ? 396 * eps / (13 * alpha - 1) : 36 * eps / Math.max(alpha, 1e-6);
    l2 = alpha > 0.5 ? 456 * eps / (13 * alpha - 1) : 41.5 * eps / Math.max(alpha, 1e-6);
    l3 = ps > -1 ? 42 * eps / (0.67 + 0.33 * ps) : 62 * eps * (1 - ps) * Math.sqrt(-ps);
  }
  return { cls: ct <= l1 ? 1 : ct <= l2 ? 2 : ct <= l3 ? 3 : 4, lim: [l1, l2, l3] };
}
R.internalClass = internalClass;
// ścianka wspornikowa (pas dwuteownika) z gradientem: tip – naprężenie na krawędzi swobodnej, root – przy środniku (ściskanie +)
function outstandClass(ct, eps, sTip, sRoot, alpha) {
  const smax = Math.max(sTip, sRoot);
  if (smax <= 0) return { cls: 1, lim: [Infinity, Infinity, Infinity], tension: true, opis: 'rozciągana' };
  if (sRoot > 0 && sTip > 0 && Math.abs(sTip - sRoot) <= 1e-6 * smax) return { cls: ct <= 9 * eps ? 1 : ct <= 10 * eps ? 2 : ct <= 14 * eps ? 3 : 4, lim: [9 * eps, 10 * eps, 14 * eps], opis: 'ściskana równomiernie' };
  const tipC = sTip >= sRoot;
  let ks, l1, l2;
  const a = U.clamp(alpha, 1e-3, 1);
  if (tipC) { const ps = sRoot / sTip; ks = ps >= 1 ? 0.43 : 0.57 - 0.21 * ps + 0.07 * ps * ps; l1 = 9 * eps / a; l2 = 10 * eps / a; }
  else { const ps = sTip / sRoot; ks = ps >= 1 ? 0.43 : ps > 0 ? 0.578 / (ps + 0.34) : ps > -1 ? 1.7 - 5 * ps + 17.1 * ps * ps : 23.8; l1 = 9 * eps / (a * Math.sqrt(a)); l2 = 10 * eps / (a * Math.sqrt(a)); }
  const l3 = 21 * eps * Math.sqrt(ks);
  return { cls: ct <= l1 ? 1 : ct <= l2 ? 2 : ct <= l3 ? 3 : 4, lim: [l1, l2, l3], ks, opis: tipC ? 'ściskana krawędź swobodna' : 'ściskana krawędź przy środniku' };
}

/* klasyfikacja przy (N, M_y, M_z); epsF – ε wymuszone (np. pożar: 0,85·√(235/fy)) */
R.classCol = function (sec, fy, Nc, My, Mz, epsF) {
  const eps = epsF || Math.sqrt(235 / fy);
  const out = { eps, all: [] };
  const Nn = Nc || 0, Myy = My || 0, Mzz = Mz || 0;
  const hasMy = Math.abs(Myy) > 1, hasMz = Math.abs(Mzz) > 1;
  const sig = (y, z) => Nn / sec.A + Myy * (z - sec.zc) / sec.Iy + Mzz * (y - (sec.yc || 0)) / sec.Iz;   // ściskanie +
  if (sec.kind === 'CHS') {
    const dt = sec.D / sec.t, e2 = eps * eps, lim = [50 * e2, 70 * e2, 90 * e2];
    const smax = Math.abs(Nn) / sec.A + Math.hypot(Myy, Mzz) / sec.Wel_y * (Nn >= 0 ? 1 : 1);
    const tens = Nn < 0 && Math.hypot(Myy, Mzz) / sec.Wel_y < -Nn / sec.A;
    const cls = tens ? 1 : dt <= lim[0] ? 1 : dt <= lim[1] ? 2 : dt <= lim[2] ? 3 : 4;
    out.all.push({ n: 'ścianka rury (d/t)', typ: 'rura okrągła', c: sec.D, t: sec.t, ct: dt, lim, cls, tension: tens, ref: 'tabl. 5.2 (ark. 3)', opis: smax > 0 ? 'ściskanie i/lub zginanie' : '' });
    out.cls = cls; out.web = out.all[0]; out.parts = [];
    return out;
  }
  // ---- ścianki pionowe (środnik dwuteownika, ścianki boczne rury): rozkład w kierunku z od N + M_y; dla rur – przesunięcie od M_z
  const pw = sec.parts.find(p => p.side === 'web');
  if (pw) {
    const c = pw.z1 - pw.z0, ct = pw.c / pw.t;
    const yW = sec.kind === 'RHS' ? (Mzz >= 0 ? sec.b / 2 - sec.t / 2 : -sec.b / 2 + sec.t / 2) : 0;
    const sT = sig(yW, pw.z1), sB = sig(yW, pw.z0), smax = Math.max(sT, sB), smin = Math.min(sT, sB);
    if (smax <= 0) out.all.push({ n: pw.n, typ: 'wewnętrzna', c: pw.c, t: pw.t, ct, alpha: 0, psi: -Infinity, lim: [Infinity, Infinity, Infinity], cls: 1, tension: true, ref: 'tabl. 5.2 (ark. 1)' });
    else {
      let alpha;
      if (!hasMy) alpha = 1;
      else {
        const zp = plasticNA(sec, fy, Nn, Myy >= 0);
        alpha = U.clamp(Myy >= 0 ? (pw.z1 - zp) / c : (zp - pw.z0) / c, 0, 1);
      }
      const aEl = smin >= 0 ? 1 : smax / (smax - smin);
      if (sec.kind === 'RHS' && hasMz) alpha = Math.max(alpha, aEl);
      const ps = smin / smax, k = internalClass(ct, eps, alpha, ps);
      out.all.push({ n: pw.n, typ: 'wewnętrzna', c: pw.c, t: pw.t, ct, alpha, psi: ps, lim: k.lim, cls: k.cls, ref: 'tabl. 5.2 (ark. 1)' });
      out.alpha = alpha;
    }
  }
  // ---- ścianki poziome (pasy dwuteownika – wspornikowe; ścianki ±z rury – wewnętrzne z gradientem od M_z)
  sec.parts.filter(p => p.side === 'top' || p.side === 'bot').forEach(p => {
    const ct = p.c / p.t;
    if (sec.kind === 'I') {
      const half = (p.bw || sec.b) / 2, sRoot = sig(0, p.z), sTipP = sig(half, p.z), sTipM = sig(-half, p.z);
      const sTip = Math.max(sTipP, sTipM);
      let alpha = 1;
      if (sRoot <= 0 && sTip > 0) alpha = sTip / (sTip - sRoot);              // krawędź swobodna ściskana, przy środniku rozciąganie
      // pas ściskany od N + M_y przy środniku – przyjęto (bezpiecznie) ściskanie równomierne
      const k = sRoot > 0 ? outstandClass(ct, eps, Math.max(sTip, sRoot), Math.max(sTip, sRoot), 1) : outstandClass(ct, eps, sTip, sRoot, alpha);
      out.all.push({ n: p.n, typ: 'wspornikowa', c: p.c, t: p.t, ct, alpha, lim: k.lim, cls: k.cls, tension: !!k.tension, ref: 'tabl. 5.2 (ark. 2)', opis: k.opis });
    } else {
      // rura prostokątna – ścianka ±z: rozkład wzdłuż y (M_z), stała od N + M_y
      const yA = p.y0, yB = p.y1, sA = sig(yA, p.z), sB = sig(yB, p.z), smax = Math.max(sA, sB), smin = Math.min(sA, sB);
      if (smax <= 0) { out.all.push({ n: p.n, typ: 'wewnętrzna', c: p.c, t: p.t, ct, lim: [Infinity, Infinity, Infinity], cls: 1, tension: true, ref: 'tabl. 5.2 (ark. 1)' }); return; }
      let alpha = 1;
      if (hasMz) {
        const yp = plasticNAy(sec, fy, Nn, Mzz >= 0), cw = yB - yA;
        const aPl = U.clamp(Mzz >= 0 ? (yB - yp) / cw : (yp - yA) / cw, 0, 1);
        const aEl = smin >= 0 ? 1 : smax / (smax - smin);
        alpha = Math.max(aPl, aEl);
      }
      const ps = smin / smax, k = internalClass(ct, eps, alpha, ps);
      out.all.push({ n: p.n, typ: 'wewnętrzna', c: p.c, t: p.t, ct, alpha, psi: ps, lim: k.lim, cls: k.cls, ref: 'tabl. 5.2 (ark. 1)' });
    }
  });
  out.cls = Math.max(...out.all.map(p => p.cls));
  out.parts = out.all.filter(p => p.n !== (pw && pw.n));
  out.web = out.all.find(p => pw && p.n === pw.n) || out.all[0];
  return out;
};

/* ---------------------------------------------------------- przekrój efektywny (PN-EN 1993-1-5, 4.4) */
const rhoInternal = (lp, psi) => (lp <= 0.5 + Math.sqrt(0.085 - 0.055 * psi) ? 1 : Math.min(1, (lp - 0.055 * (3 + psi)) / (lp * lp)));
const rhoOutstand = (lp) => (lp <= 0.748 ? 1 : Math.min(1, (lp - 0.188) / (lp * lp)));
const kSigInternal = (psi) => (psi >= 1 ? 4 : psi > 0 ? 8.2 / (1.05 + psi) : psi === 0 ? 7.81 : psi > -1 ? 7.81 - 6.29 * psi + 9.78 * psi * psi : psi >= -3 ? 5.98 * (1 - psi) * (1 - psi) : 5.98 * 16);

// mode: 'Mpos' | 'Mneg' | 'N' – zwraca prostokąty efektywne i charakterystyki
R.effective = function (sec, fy, mode) {
  if (sec.kind === 'L' || sec.kind === 'U') throw new Error('Przekrój efektywny tego kształtu nie jest obsługiwany.');
  if (sec.kind === 'CHS') throw new Error('Rura okrągła klasy 4 (d/t > 90ε²) – nośność wg PN-EN 1993-1-6 poza zakresem programu; dobierz grubszą ściankę.');
  const eps = Math.sqrt(235 / fy);
  let rects = P.rects(sec);
  const info = [];
  const flange = (id) => {
    const p = sec.parts.find(q => q.side === (id === 'fg' ? 'top' : 'bot'));
    if (!p) return;
    const out = p.typ === 'wsp';
    const kS = out ? 0.43 : 4;
    const lp = (p.c / p.t) / (28.4 * eps * Math.sqrt(kS));
    const rho = out ? rhoOutstand(lp) : rhoInternal(lp, 1), cut = (1 - rho) * p.c;
    info.push({ el: p.n, lp, rho, kS, beff: rho * p.c, c: p.c });
    if (cut <= 1e-6) return;
    const r = rects.find(q => q.id === id);
    rects = rects.filter(q => q !== r);
    if (!out) { const ym = (r.y0 + r.y1) / 2; rects.push(Object.assign({}, r, { y1: ym - cut / 2, id: id + 'L' }), Object.assign({}, r, { y0: ym + cut / 2, id: id + 'P' })); }   // ścianka wewnętrzna – część środkowa nieefektywna
    else if (r.tip === 'right') rects.push(Object.assign({}, r, { y1: r.y1 - cut, id: id + 'e' }));
    else rects.push(Object.assign({}, r, { y0: r.y0 + cut, y1: r.y1 - cut, id: id + 'e' }));     // dwuteownik – krawędzie swobodne po obu stronach
  };
  if (mode === 'Mpos' || mode === 'N') flange('fg');
  if (mode === 'Mneg' || mode === 'N') flange('fd');
  // ścianki pionowe – rozkład naprężeń z przekroju z efektywnymi pasami i pełnymi ściankami
  const g1 = P.rectProps(rects);
  const pw = sec.parts.find(q => q.side === 'web');
  const zTw = pw.z1, zBw = pw.z0, c = zTw - zBw;
  let psi; const zc = g1.zc;
  if (mode === 'N') psi = 1;
  else if (mode === 'Mpos') psi = (zBw - zc) / (zTw - zc); // σ ∝ (z − zc), ściskanie u góry
  else psi = (zTw - zc) / (zBw - zc);
  const kS = kSigInternal(psi);
  const lp = (c / pw.t) / (28.4 * eps * Math.sqrt(kS));
  const rho = rhoInternal(lp, psi);
  const bc = psi < 0 ? c / (1 - psi) : c; // długość strefy ściskanej
  const beff = rho * bc;
  let hole = null;
  if (rho < 1) {
    let be1, be2;
    if (psi >= 1) { be1 = 0.5 * beff; be2 = 0.5 * beff; }
    else if (psi >= 0) { be1 = 2 * beff / (5 - psi); be2 = beff - be1; }
    else { be1 = 0.4 * beff; be2 = 0.6 * beff; }
    if (mode === 'Mpos') hole = [zTw - bc + be2, zTw - be1];
    else if (mode === 'Mneg') hole = [zBw + be1, zBw + bc - be2];
    else hole = [zBw + be2, zTw - be1];
    const ws = rects.filter(q => q.id === 'w');
    rects = rects.filter(q => q.id !== 'w');
    ws.forEach(w => rects.push(Object.assign({}, w, { z1: hole[0], id: 'w1' }), Object.assign({}, w, { z0: hole[1], id: 'w2' })));
  }
  info.push({ el: pw.n, lp, rho, kS, psi, bc, beff, c, hole });
  const g = P.rectProps(rects);
  return { rects, A: g.A, zc: g.zc, Iy: g.Iy, Wt: g.Wt, Wb: g.Wb, Weff: mode === 'N' ? null : Math.min(g.Wt, g.Wb), eN: g.zc - sec.zc, info, reduced: info.some(i => i.rho < 1) };
};


/* przekrój efektywny przy zginaniu względem osi z (M_z) – klasa 4 */
R.effectiveZ = function (sec, fy) {
  const eps = Math.sqrt(235 / fy);
  if (sec.kind === 'RHS') {
    // obrót rury o 90°: ścianki boczne stają się ±z
    const rot = P.props({ typ: 'rura', seria: 'wlasna', h: sec.b, b: sec.h, t: sec.t, wyk: sec.wyk });
    const e = R.effective(rot, fy, 'Mpos');
    return { Weff: e.Weff, info: e.info, reduced: e.reduced };
  }
  if (sec.kind !== 'I') throw new Error('Przekrój efektywny przy M_z – nieobsługiwany kształt.');
  // pasy wspornikowe ściskane jednostronnie (ψ = 0 przy środniku – bezpiecznie: krawędź swobodna ściskana, k_σ = 0,57)
  const info = []; const R2 = [];
  const fl = [{ b: sec.bg, t: sec.tg, z: sec.h - sec.tg / 2, n: 'pas (+z)', c: sec.c_fg }, { b: sec.bd, t: sec.td, z: sec.td / 2, n: 'pas (−z)', c: sec.c_fd }];
  fl.forEach(f => {
    const kS = 0.57, lp = (f.c / f.t) / (28.4 * eps * Math.sqrt(kS)), rho = lp <= 0.748 ? 1 : Math.min(1, (lp - 0.188) / (lp * lp)), cut = (1 - rho) * f.c;
    info.push({ el: f.n, lp, rho, kS, beff: rho * f.c, c: f.c });
    // strona ściskana +y: odcięcie przy krawędzi swobodnej
    R2.push({ y0: -f.b / 2, y1: f.b / 2 - cut, t: f.t });
  });
  // moment bezwładności względem nowej osi (kierunek y) + środnik
  let A = 0, Sy = 0;
  R2.forEach(r => { const a = (r.y1 - r.y0) * r.t; A += a; Sy += a * (r.y0 + r.y1) / 2; });
  const aw = sec.hw * sec.tw; A += aw;
  const yc = Sy / A; let I = 0;
  R2.forEach(r => { const b = r.y1 - r.y0; I += r.t * b * b * b / 12 + r.t * b * Math.pow((r.y0 + r.y1) / 2 - yc, 2); });
  I += sec.hw * Math.pow(sec.tw, 3) / 12 + aw * yc * yc;
  const ymax = Math.max(...R2.map(r => Math.max(Math.abs(r.y0 - yc), Math.abs(r.y1 - yc))));
  return { Weff: I / ymax, info, reduced: info.some(i => i.rho < 1) };
};

/* nośność plastyczna przy zginaniu ze siłą osiową (przekrój dowolny – numerycznie): MN,y,Rd */
R.MNpl = function (sec, fy, Nc, Mpos, g0) {
  // oś obojętna: pole ściskane − pole rozciągane = Nc/fy
  const A = sec.A, Ac = U.clamp((A + Nc / fy) / 2, 0, A);
  let lo = 0, hi = sec.h;
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    const a = P.integrals(P.clip(sec.rings, m, Mpos), 0).A;
    if (Mpos) { if (a > Ac) lo = m; else hi = m; } else { if (a > Ac) hi = m; else lo = m; }
  }
  const zp = (lo + hi) / 2;
  const up = P.integrals(P.clip(sec.rings, zp, true), sec.zc), dn = P.integrals(P.clip(sec.rings, zp, false), sec.zc);
  // moment względem środka ciężkości: ściskanie u góry (Mpos) → M = fy(∫_up z − ∫_dn z)
  // moment względem środka ciężkości przekroju brutto (ściskanie po stronie Mpos)
  const M = fy * (up.Sz - dn.Sz);
  return Math.abs(M) / g0;
};


/* ---------------------------------------------------------- nośności podstawowe */
R.basic = function (sec, mat, ndp) {
  const fy = mat.fy, g0 = ndp.gM0;
  const eta = fy > 460 ? 1.0 : ndp.eta;
  const Avz = sec.kind === 'I' ? Math.max(sec.Avz, eta * sec.hw * sec.tw) : sec.Avz;
  const o = {
    fy, eps: Math.sqrt(235 / fy), eta, Avz, Avy: sec.Avy,
    Npl: sec.A * fy / g0,
    Vplz: Avz * fy / (s3 * g0), Vply: sec.Avy * fy / (s3 * g0),
    Mply: sec.Wpl_y * fy / g0, Mplz: sec.Wpl_z * fy / g0,
    Mely: Math.min(sec.Wel_t, sec.Wel_b) * fy / g0, Melz: sec.Wel_z * fy / g0
  };
  o.kN = R.classCol(sec, fy, 1e6, 0, 0);
  o.kMy = R.classCol(sec, fy, 0, 1e9, 0); o.kMyN = R.classCol(sec, fy, 0, -1e9, 0);
  o.kMz = R.classCol(sec, fy, 0, 0, 1e9);
  o.effN = null; o.effMy = null; o.effMyN = null; o.effMz = null;
  if (o.kN.cls === 4) { try { o.effN = R.effective(sec, fy, 'N'); } catch (e) { o.effErr = e.message; } }
  if (o.kMy.cls === 4) { try { o.effMy = R.effective(sec, fy, 'Mpos'); } catch (e) { o.effErr = e.message; } }
  if (o.kMyN.cls === 4) { try { o.effMyN = R.effective(sec, fy, 'Mneg'); } catch (e) { o.effErr = e.message; } }
  if (o.kMz.cls === 4) { try { o.effMz = R.effectiveZ(sec, fy); } catch (e) { o.effErr = e.message; } }
  o.Aeff = o.effN ? o.effN.A : sec.A;
  o.eNy = o.effN ? o.effN.eN : 0;   // przesunięcie osi obojętnej (przekrój monosymetryczny)
  o.Nc = o.Aeff * fy / g0;
  const Wy = (k, eff) => (k.cls <= 2 ? sec.Wpl_y : k.cls === 3 ? Math.min(sec.Wel_t, sec.Wel_b) : eff ? eff.Weff : Math.min(sec.Wel_t, sec.Wel_b));
  o.Wy = Wy(o.kMy, o.effMy); o.WyN = Wy(o.kMyN, o.effMyN);
  o.Wz = o.kMz.cls <= 2 ? sec.Wpl_z : o.kMz.cls === 3 ? sec.Wel_z : (o.effMz ? o.effMz.Weff : sec.Wel_z);
  o.Mcy = o.Wy * fy / g0; o.McyN = o.WyN * fy / g0; o.Mcz = o.Wz * fy / g0;
  o.hwtw = sec.hw / sec.tw;
  return o;
};

/* ---------------------------------------------------------- kontekst kombinacji: klasa przy (N, M_y, M_z) */
R.ctx = function (sec, b, N, My, Mz) {
  const fy = b.fy;
  const k = R.classCol(sec, fy, N, My, Mz);
  const cls = k.cls;
  let Wy, Wz, Aeff = sec.A, eNy = 0, effNote = null;
  if (cls <= 2) { Wy = sec.Wpl_y; Wz = sec.Wpl_z; }
  else if (cls === 3) { Wy = Math.min(sec.Wel_t, sec.Wel_b); Wz = sec.Wel_z; }
  else {
    const effY = My >= 0 ? (b.effMy || (b.kMy.cls === 4 ? null : null)) : b.effMyN;
    Wy = effY ? effY.Weff : (My >= 0 ? b.Wy : b.WyN);
    if (b.kMy.cls < 4 && b.kMyN.cls < 4) Wy = Math.min(sec.Wel_t, sec.Wel_b);
    Wz = b.effMz ? b.effMz.Weff : sec.Wel_z;
    if (N > 0) { Aeff = b.Aeff; eNy = b.eNy; }
    effNote = 'A_eff z czystego ściskania, W_eff z czystego zginania (PN-EN 1993-1-1, 6.2.2.5(4))';
  }
  return { k, cls, Wy, Wz, Aeff, eNy, effNote, N, My, Mz };
};

/* ---------------------------------------------------------- sprawdzenie przekroju w punkcie (6.2.1–6.2.10) */
// e: { N (ściskanie +), My, Mz, Vy, Vz } [N, Nmm]; c – z R.ctx
R.atPoint = function (sec, b, ndp, e, c) {
  const fy = b.fy, g0 = ndp.gM0;
  const N = e.N || 0, My = Math.abs(e.My || 0), Mz = Math.abs(e.Mz || 0), Vy = Math.abs(e.Vy || 0), Vz = Math.abs(e.Vz || 0);
  const o = { cls: c.cls, N, My, Mz, Vy, Vz };
  o.uVz = Vz / b.Vplz; o.uVy = Vy / b.Vply;
  let rz = 0, ry = 0;
  if (sec.kind === 'CHS') { const V = Math.hypot(Vy, Vz), Vp = b.Vplz; rz = ry = V > 0.5 * Vp ? Math.pow(2 * V / Vp - 1, 2) : 0; o.uVz = o.uVy = V / Vp; o.Vres = V; }
  else { rz = Vz > 0.5 * b.Vplz ? Math.pow(2 * Vz / b.Vplz - 1, 2) : 0; ry = Vy > 0.5 * b.Vply ? Math.pow(2 * Vy / b.Vply - 1, 2) : 0; }
  o.rhoZ = rz; o.rhoY = ry;
  const n = Math.abs(N) / b.Npl; o.n = n;
  if (c.cls <= 2) {
    // nośności plastyczne z redukcją od ścinania (6.2.8)
    let Mply = b.Mply, Mplz = b.Mplz;
    if (rz > 0) {
      if (sec.kind === 'I') Mply = Math.min(Mply, (sec.Wpl_y - rz * sec.Aw * sec.Aw / (4 * sec.tw)) * fy / g0);
      else if (sec.kind === 'RHS') Mply = Math.min(Mply, (sec.Wpl_y - rz * sec.Aw * sec.Aw / (4 * 2 * sec.t)) * fy / g0);
      else Mply = Mply * (1 - rz);
    }
    if (ry > 0) Mplz = sec.kind === 'CHS' ? Mplz * (1 - ry) : Mplz * (1 - ry);
    o.MplyV = Mply; o.MplzV = Mplz;
    let MNy, MNz, al = 2, be = 1, f;
    if (sec.kind === 'I') {
      const a = Math.min(0.5, (sec.A - sec.bg * sec.tg - sec.bd * sec.td) / sec.A); o.a = a;
      const noRedY = N >= 0 ? (N <= 0.25 * b.Npl && N <= 0.5 * sec.hw * sec.tw * fy / g0) : n <= 0.25;
      const noRedZ = N >= 0 ? N <= sec.hw * sec.tw * fy / g0 : false;
      o.noRedY = noRedY; o.noRedZ = noRedZ;
      if (sec.sym) MNy = noRedY ? Mply : Math.min(Mply, Mply * (1 - n) / (1 - 0.5 * a));
      else MNy = noRedY ? Mply : Math.min(Mply, R.MNpl(sec, fy, N, (e.My || 0) >= 0, g0) * Mply / b.Mply);
      MNz = noRedZ || n <= a ? Mplz : Mplz * (1 - Math.pow((n - a) / (1 - a), 2));
      al = 2; be = Math.max(1, 5 * n);
      f = '6.36, 6.37, 6.38';
    } else if (sec.kind === 'RHS') {
      const aw = Math.min(0.5, (sec.A - 2 * sec.b * sec.t) / sec.A), af = Math.min(0.5, (sec.A - 2 * sec.h * sec.t) / sec.A);
      o.aw = aw; o.af = af;
      MNy = Math.min(Mply, Mply * (1 - n) / (1 - 0.5 * aw)); MNz = Math.min(Mplz, Mplz * (1 - n) / (1 - 0.5 * af));
      al = be = n < 0.8 ? Math.min(6, 1.66 / (1 - 1.13 * n * n)) : 6;
      f = '6.39, 6.40';
    } else {
      MNy = MNz = Mply * Math.max(0, 1 - Math.pow(n, 1.7));
      al = be = 2;
      f = '6.2.9.1(6) – rura okrągła';
    }
    o.MNy = Math.max(0, MNy); o.MNz = Math.max(0, MNz); o.al = al; o.be = be;
    if (n >= 1) o.uMN = Infinity;
    else if (sec.kind === 'CHS') { o.uMN = Math.hypot(My, Mz) / o.MNy; o.f = '6.2.9.1(6): √(M_y² + M_z²) ≤ M_N,Rd'; o.biax = My > 1 && Mz > 1; }
    else if (My > 1 && Mz > 1) { o.uMN = Math.pow(My / o.MNy, al) + Math.pow(Mz / o.MNz, be); o.f = '6.41'; o.biax = true; }
    else if (Mz > 1) { o.uMN = Mz / o.MNz; o.f = n > 1e-6 ? '6.31' : '6.12'; }
    else { o.uMN = My / o.MNy; o.f = n > 1e-6 ? '6.31' : '6.12'; }
    o.fMN = f;
  } else {
    // klasy 3 i 4 – naprężenia normalne (6.42, 6.44)
    let Wy = c.Wy, Wz = c.Wz, Aeff = c.cls === 4 && N > 0 ? c.Aeff : sec.A, eNy = c.cls === 4 && N > 0 ? c.eNy : 0;
    if (rz > 0 && sec.kind !== 'CHS') {
      try { const rp = P.rectProps(P.rects(sec, (1 - rz) * sec.tw).filter(r => r.id !== 'r')); Wy *= Math.min(1, Math.min(rp.Wt, rp.Wb) / Math.min(sec.Wel_t, sec.Wel_b)); } catch (er) { Wy *= (1 - rz); }
    }
    if (ry > 0) Wz *= (1 - ry);
    o.Wy = Wy; o.Wz = Wz; o.Aeff = Aeff; o.eNy = eNy;
    o.sN = Math.abs(N) / Aeff; o.sMy = (My + Math.abs(N * eNy)) / Wy; o.sMz = Mz / Wz;
    o.sx = o.sN + o.sMy + o.sMz;
    o.uMN = o.sx / (fy / g0);
    o.f = c.cls === 3 ? '6.42' : '6.44';
  }
  o.uN = Math.abs(N) / (N > 0 ? b.Nc : b.Npl);
  o.u = Math.max(o.uMN, o.uN, o.uVy, o.uVz);
  return o;
};

/* ---------------------------------------------------------- wyboczenie przy ścinaniu (PN-EN 1993-1-5, 5) */
R.shearBuckling = function (sec, b, ndp, opt) {
  const fy = b.fy, eps = b.eps, eta = b.eta, t = sec.tw, hw = sec.hw;
  const a = opt && opt.a > 0 ? opt.a : Infinity;
  const kt = a === Infinity ? 5.34 : (a / hw >= 1 ? 5.34 + 4 * Math.pow(hw / a, 2) : 4 + 5.34 * Math.pow(hw / a, 2));
  const limit = a === Infinity ? 72 * eps / eta : 31 * eps * Math.sqrt(kt) / eta;
  const need = hw / t > limit;
  const lw = a === Infinity ? hw / (86.4 * t * eps) : hw / (37.4 * t * eps * Math.sqrt(kt));
  const rigid = opt && opt.sztywny;
  let chi;
  if (lw < 0.83 / eta) chi = eta;
  else if (lw < 1.08) chi = 0.83 / lw;
  else chi = rigid ? 1.37 / (0.7 + lw) : 0.83 / lw;
  const nw = sec.nWeb || 1;
  const Vbw = nw * chi * fy * hw * t / (s3 * ndp.gM1);
  const Vmax = nw * eta * fy * hw * t / (s3 * ndp.gM1);
  return { need, limit, ht: hw / t, kt, a, lw, chi, Vbw, Vb: Math.min(Vbw, Vmax), Vmax, rigid };
};


})(typeof globalThis !== 'undefined' ? globalThis : this);
