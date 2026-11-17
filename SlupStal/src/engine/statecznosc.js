/* =====================================================================
   SłupStal – stateczność słupa (PN-EN 1993-1-1, 5.2, 6.3)
   • obciążenia krytyczne z MES dla rzeczywistego rozkładu N(x):
     wyboczenie giętne w obu płaszczyznach (postać przechyłowa
     i nieprzechyłowa), skrętne i giętno-skrętne (teoria Własowa),
     α_cr (5.2.1), długości wyboczeniowe L_cr = π·√(EI/N_cr);
   • moment krytyczny M_cr z MES (u, φ) dla rozkładu M_y kombinacji,
     z wysokością przyłożenia obciążeń poziomych i stężeniami;
   • χ, χ_T, χ_LT (6.3.1, 6.3.2.2 / 6.3.2.3 z f, k_c), współczynniki
     C_m (zał. B, tabl. B.3; zał. A, tabl. A.2), interakcja 6.61/6.62
     z k_ij wg zał. A (metoda 1) lub zał. B (metoda 2);
   • metoda ogólna 6.3.4 (α_ult,k, α_cr,op, χ_op).
   Ręczne nadpisania: L_cr, krzywe, M_cr, C_m, k_c.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, F = BS.FE, S = BS.S, R = BS.R;
const T = BS.T = {};
const ALPHA = { a0: 0.13, a: 0.21, b: 0.34, c: 0.49, d: 0.76 };
T.ALPHA = ALPHA;
const isSet = v => v !== '' && v !== null && v !== undefined && isFinite(+v) && +v > 0;

T.phi = (lam, al) => 0.5 * (1 + al * (lam - 0.2) + lam * lam);
T.chi = (lam, al) => { if (lam <= 0.2) return 1; const ph = T.phi(lam, al); return Math.min(1, 1 / (ph + Math.sqrt(Math.max(0, ph * ph - lam * lam)))); };

/* krzywe wyboczeniowe – tabl. 6.2 */
T.curveFlex = function (sec, fy) {
  if (sec.kind === 'CC') return { y: 'c', z: 'c', why: 'ceowniki (tabl. 6.2: przekroje U) – gałęzie słupa złożonego' };
  if (sec.kind === 'RHS' || sec.kind === 'CHS') {
    if (sec.wyk === 'zimn') return { y: 'c', z: 'c', why: 'kształtownik zamknięty formowany na zimno' };
    return fy >= 460 ? { y: 'a0', z: 'a0', why: 'kształtownik zamknięty gorąco wykończony, S460' } : { y: 'a', z: 'a', why: 'kształtownik zamknięty gorąco wykończony' };
  }
  const hb = sec.h / Math.max(sec.bg, sec.bd), tf = Math.max(sec.tg, sec.td);
  if (sec.typ === 'walc') {
    if (fy >= 460) { if (hb > 1.2) return tf <= 40 ? { y: 'a0', z: 'a0', why: 'walcowany, h/b > 1,2, t_f ≤ 40 mm, S460' } : { y: 'a', z: 'a', why: 'walcowany, h/b > 1,2, 40 < t_f ≤ 100 mm, S460' }; return tf <= 100 ? { y: 'a', z: 'a', why: 'walcowany, h/b ≤ 1,2, t_f ≤ 100 mm, S460' } : { y: 'c', z: 'c', why: 'walcowany, h/b ≤ 1,2, t_f > 100 mm, S460' }; }
    if (hb > 1.2) return tf <= 40 ? { y: 'a', z: 'b', why: `walcowany, h/b = ${U.fmt(hb, 2)} > 1,2, t_f ≤ 40 mm` } : { y: 'b', z: 'c', why: `walcowany, h/b > 1,2, 40 < t_f ≤ 100 mm` };
    return tf <= 100 ? { y: 'b', z: 'c', why: `walcowany, h/b = ${U.fmt(hb, 2)} ≤ 1,2, t_f ≤ 100 mm` } : { y: 'd', z: 'd', why: 'walcowany, h/b ≤ 1,2, t_f > 100 mm' };
  }
  return tf <= 40 ? { y: 'b', z: 'c', why: 'dwuteownik spawany, t_f ≤ 40 mm' } : { y: 'c', z: 'd', why: 'dwuteownik spawany, t_f > 40 mm' };
};
/* krzywe zwichrzenia – tabl. 6.4 (6.3.2.2) i 6.5 (6.3.2.3) */
T.curveLT = function (sec, met) {
  if (sec.kind !== 'I') return 'd';
  const hb = sec.h / Math.min(sec.bg, sec.bd);
  if (met === '6.3.2.3') return sec.typ === 'walc' ? (hb <= 2 ? 'b' : 'c') : (hb <= 2 ? 'c' : 'd');
  return sec.typ === 'walc' ? (hb <= 2 ? 'a' : 'b') : (hb <= 2 ? 'c' : 'd');
};
T.chiLT = function (lam, MEd, Mcr, sec, ndp, kc, met, curveOv) {
  const curve = curveOv || T.curveLT(sec, met), al = ALPHA[curve];
  const o = { met, curve, alLT: al, lam, kc };
  if (met === '6.3.2.3') {
    const l0 = +ndp.lamLT0, be = +ndp.betaLT;
    o.lam0 = l0; o.beta = be;
    if (lam <= l0 || Math.abs(MEd) / Mcr <= l0 * l0) { o.skip = true; o.chi = 1; o.f = 1; o.chimod = 1; return o; }
    const ph = 0.5 * (1 + al * (lam - l0) + be * lam * lam);
    o.phi = ph; o.chi = Math.min(1, 1 / lam / lam, 1 / (ph + Math.sqrt(Math.max(0, ph * ph - be * lam * lam))));
    o.f = Math.min(1, 1 - 0.5 * (1 - kc) * (1 - 2 * Math.pow(lam - 0.8, 2)));
    o.chimod = Math.min(1, 1 / lam / lam, o.chi / o.f);
  } else {
    o.lam0 = 0.2; o.beta = 1;
    if (lam <= 0.2 || Math.abs(MEd) / Mcr <= 0.04) { o.skip = true; o.chi = 1; o.f = 1; o.chimod = 1; return o; }
    const ph = 0.5 * (1 + al * (lam - 0.2) + lam * lam);
    o.phi = ph; o.chi = Math.min(1, 1 / (ph + Math.sqrt(Math.max(0, ph * ph - lam * lam)))); o.f = 1; o.chimod = o.chi;
  }
  return o;
};

/* ---------------------------------------------------------------- kształt wykresu momentów w odcinku */
T.shape = function (xs, M, x0, x1, hasDist, hasPt) {
  const at = (x) => S.at(xs, M, x);
  const ma = at(x0 + 1e-6), mb = at(x1 - 1e-6);
  let dev = 0, mmax = 0, xmax = x0, mabs = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]; if (x < x0 - 1e-6 || x > x1 + 1e-6) continue;
    const lin = ma + (mb - ma) * (x - x0) / Math.max(1e-9, x1 - x0);
    dev = Math.max(dev, Math.abs(M[i] - lin));
    if (Math.abs(M[i]) > mabs) { mabs = Math.abs(M[i]); mmax = M[i]; xmax = x; }
  }
  const linear = dev <= 0.02 * Math.max(mabs, 1);
  const Mh = Math.abs(ma) >= Math.abs(mb) ? ma : mb, Mo = Math.abs(ma) >= Math.abs(mb) ? mb : ma;
  const psi = Math.abs(Mh) > 1e-9 ? U.clamp(Mo / Mh, -1, 1) : 1;
  let Ms = (ma + mb) / 2; if (!linear) Ms = mmax;
  return { ma, mb, linear, psi, Mh, Ms, Mmax: mmax, xmax, mabs, conc: !!hasPt && !hasDist, x0, x1 };
};
/* C_m wg tabl. B.3 */
T.CmB = function (sh) {
  const psi = sh.psi, conc = sh.conc;
  if (sh.mabs < 1) return { v: 1, f: 'brak momentu' };
  if (sh.linear) return { v: Math.max(0.4, 0.6 + 0.4 * psi), f: `0,6 + 0,4ψ ≥ 0,4; ψ = ${U.fmt(psi, 3)}` };
  const Mh = sh.Mh, Ms = sh.Ms;
  if (Math.abs(Ms) < Math.abs(Mh)) {
    const as = Ms / Mh;
    if (as >= 0) return { v: Math.max(0.4, 0.2 + 0.8 * as), f: `0,2 + 0,8α_s ≥ 0,4; α_s = M_s/M_h = ${U.fmt(as, 3)}` };
    if (psi >= 0) return conc ? { v: Math.max(0.4, -0.8 * as), f: `−0,8α_s ≥ 0,4; α_s = ${U.fmt(as, 3)} (obciążenie skupione)` } : { v: Math.max(0.4, 0.1 - 0.8 * as), f: `0,1 − 0,8α_s ≥ 0,4; α_s = ${U.fmt(as, 3)} (obciążenie równomierne)` };
    return conc ? { v: Math.max(0.4, 0.2 * (-psi) - 0.8 * as), f: `0,2(−ψ) − 0,8α_s ≥ 0,4; ψ = ${U.fmt(psi, 3)}, α_s = ${U.fmt(as, 3)}` } : { v: Math.max(0.4, 0.1 * (1 - psi) - 0.8 * as), f: `0,1(1 − ψ) − 0,8α_s ≥ 0,4; ψ = ${U.fmt(psi, 3)}, α_s = ${U.fmt(as, 3)}` };
  }
  const ah = Math.abs(Ms) > 1e-9 ? Mh / Ms : 0;
  if (ah >= 0 || psi >= 0) return conc ? { v: 0.90 + 0.10 * ah, f: `0,90 + 0,10α_h; α_h = M_h/M_s = ${U.fmt(ah, 3)}` } : { v: 0.95 + 0.05 * ah, f: `0,95 + 0,05α_h; α_h = M_h/M_s = ${U.fmt(ah, 3)}` };
  return conc ? { v: 0.90 + 0.10 * ah * (1 + 2 * psi), f: `0,90 + 0,10α_h(1 + 2ψ); α_h = ${U.fmt(ah, 3)}, ψ = ${U.fmt(psi, 3)}` } : { v: 0.95 + 0.05 * ah * (1 + 2 * psi), f: `0,95 + 0,05α_h(1 + 2ψ); α_h = ${U.fmt(ah, 3)}, ψ = ${U.fmt(psi, 3)}` };
};
/* C_mi,0 wg tabl. A.2 */
T.CmA0 = function (sh, NEd, Ncr, EI, dx, L) {
  if (sh.mabs < 1) return { v: 1, f: 'brak momentu' };
  const r = NEd > 0 && isFinite(Ncr) ? NEd / Ncr : 0;
  if (sh.linear) return { v: 0.79 + 0.21 * sh.psi + 0.36 * (sh.psi - 0.33) * r, f: `0,79 + 0,21ψ + 0,36(ψ − 0,33)·N_Ed/N_cr; ψ = ${U.fmt(sh.psi, 3)}` };
  const k = Math.PI * Math.PI * EI * Math.abs(dx) / (L * L * sh.mabs);
  return { v: 1 + (k - 1) * r, f: `1 + (π²EI|δ_x|/(L²|M_Ed|) − 1)·N_Ed/N_cr; δ_x = ${U.fmt(Math.abs(dx), 2)} mm` };
};

/* ---------------------------------------------------------------- odcinki */
// granice odcinków w płaszczyźnie pl (stężenia blokujące przemieszczenie w tej płaszczyźnie)
T.segPlane = function (md, pl) {
  const pts = new Set([0, md.H]);
  md.stez.filter(z => z.pl === pl || z.pl === 'yz').forEach(z => pts.add(z.x));
  const xs = Array.from(pts).sort((a, b) => a - b);
  const o = []; for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 1) o.push({ x0: xs[i - 1], x1: xs[i] });
  return o;
};
// odcinki zwichrzeniowe: między stężeniami bocznymi (płaszczyzna z) i skrętnymi
T.segLT = function (md) {
  const pts = new Set([0, md.H]);
  md.stez.filter(z => z.pl === 'z' || z.pl === 'yz' || z.skret).forEach(z => pts.add(z.x));
  const xs = Array.from(pts).sort((a, b) => a - b);
  const o = []; for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 1) o.push({ x0: xs[i - 1], x1: xs[i], free: i === xs.length - 1 && md.bc.gora.z === 'swob' && md.bc.gora.skret === 'swob' });
  return o;
};

/* ---------------------------------------------------------------- warunki brzegowe Własowa */
T.restrZ = (sec, wys) => (wys === 'pas+' ? sec.h - (sec.tg || sec.t || 0) / 2 - sec.zs : wys === 'pas-' ? (sec.td || sec.t || 0) / 2 - sec.zs : 0);
T.heightOf = (sec, wys) => (wys === 'pas+' ? sec.h - sec.zs : wys === 'pas-' ? -sec.zs : 0);
T.bc3 = function (md, sec, ns) {
  const b = md.bc, H = md.H, bc = [], springs = [];  // więzy sztywne i sprężyny
  // podstawa: u, v = 0; obroty wg utwierdzenia; φ = 0; deplanacja wg warunku
  bc.push({ x: 0, u: true, v: true, du: b.dol.z === 'utw', dv: b.dol.y === 'utw', phi: true, dphi: b.dol.skret === 'pelne' });
  if (b.dol.z === 'spr' && b.dol.krz > 0) springs.push({ x: 0, kru: b.dol.krz });
  if (b.dol.y === 'spr' && b.dol.kry > 0) springs.push({ x: 0, krv: b.dol.kry });
  const top = { x: H };
  const tr = (g) => g === 'prz' || g === 'utw' || (ns && (g === 'swob' || g === 'utwp' || g === 'spr'));
  if (tr(b.gora.z)) top.u = true; if (tr(b.gora.y)) top.v = true;
  if (b.gora.z === 'utw' || b.gora.z === 'utwp') top.du = true; if (b.gora.y === 'utw' || b.gora.y === 'utwp') top.dv = true;
  if (b.gora.skret !== 'swob') top.phi = true; if (b.gora.skret === 'pelne') top.dphi = true;
  bc.push(top);
  if (!ns) {
    if (b.gora.z === 'spr' && b.gora.khy > 0) springs.push({ x: H, k: b.gora.khy, zr: 0 });
    if (b.gora.y === 'spr' && b.gora.khz > 0) springs.push({ x: H, kv: b.gora.khz });
  }
  md.stez.forEach(z => {
    if (z.pl === 'z' || z.pl === 'yz') springs.push({ x: z.x, k: 'rigid', zr: T.restrZ(sec, z.wys) });
    if (z.pl === 'y' || z.pl === 'yz') springs.push({ x: z.x, kv: 'rigid' });
    if (z.skret) springs.push({ x: z.x, kt: 'rigid' });
  });
  return { bc, springs };
};
T.ftBase = (md, sec) => ({ xs: md.xs, EIy: U.E * sec.Iy, EIz: U.E * sec.Iz, EIw: U.E * (sec.Iw || 0), GIt: U.G * sec.It, A: sec.A, Iy: sec.Iy, Iz: sec.Iz, y0: 0, z0: sec.z0 || 0, betaZ: sec.betaZ || 0, betaY: 0 });

/* ---------------------------------------------------------------- obciążenia krytyczne przy N(x) */
// cache: klucz – znormalizowany rozkład N
T.ncrAll = function (md, sec, Nel, ns, cache) {
  let Nmax = 0; for (let e = 0; e < md.ne; e++) Nmax = Math.max(Nmax, Nel[e]);
  if (!(Nmax > 1e-6)) return { Nmax: 0, y: { alpha: Infinity }, z: { alpha: Infinity }, T: { alpha: Infinity }, TF: { alpha: Infinity } };
  const key = (ns ? 'ns|' : 's|') + Array.from(Nel).map(v => Math.round(Math.max(0, v) / Nmax * 200)).join(',');
  if (cache && cache[key]) return Object.assign({ Nmax }, cache[key]);
  const Nn = Float64Array.from(Nel, v => Math.max(0, v) / Nmax);   // rozkład jednostkowy (N_max = 1)
  const o = {};
  ['y', 'z'].forEach(pl => {
    const r = F.buck2({ xs: md.xs, EI: U.E * (pl === 'y' ? sec.Iy : sec.Iz), Nel: Nn, sup: ns ? md.supNS[pl] : md.sup[pl] });
    o[pl] = { alpha: r.alpha, mode: r.mode, err: r.err };   // N_cr = α·N_max (α dla N_max = 1 N)
  });
  if (sec.kind === 'I') {
    const { bc, springs } = T.bc3(md, sec, ns);
    const b = T.ftBase(md, sec);
    const rT = F.ft(Object.assign({}, b, { fields: { u: false, v: false, phi: true }, Nel: Nn, bc, springs, z0: 0 }));
    o.T = { alpha: rT.lam, mode: rT.mode, err: rT.err };
    // postać sprzężona (u, φ): monosymetria lub stężenia przy pasie (wyboczenie względem osi wymuszonej)
    const rTF = F.ft(Object.assign({}, b, { fields: { u: true, v: false, phi: true }, Nel: Nn, bc, springs }));
    o.TF = { alpha: rTF.lam, mode: rTF.mode, err: rTF.err };
    // N_cr,T obliczone ze środka ścinania z i0² (z0 ≠ 0 uwzględnione w TF)
  } else { o.T = { alpha: Infinity, closed: true }; o.TF = { alpha: Infinity, closed: true }; }
  if (cache) cache[key] = o;
  return Object.assign({ Nmax }, o);
};

/* moment krytyczny: λ_cr dla rozkładu M_y kombinacji (I rząd), obciążenia poziome na wysokości e */
T.mcrRun = function (md, an, sec, combo, My1, cache, extra) {
  const xs3 = an.xs3;
  let mx = 0; for (let i = 0; i < My1.length; i++) mx = Math.max(mx, Math.abs(My1[i]));
  if (!(mx > 1e3)) return { lam: Infinity, none: true };
  // obciążenia w kierunku z z wysokością przyłożenia (parcie ku środkowi ścinania – destabilizujące)
  const qz = [], pz = [];
  combo.terms.forEach(t => {
    const c = md.cases.find(q => q.id === t.id); if (!c) return;
    c.parts.forEach(p => {
      if (p.kier !== 'z' || !(p.typ === 'q' || p.typ === 'H')) return;
      const e = T.heightOf(sec, p.wys); if (!e) return;
      if (p.typ === 'q') qz.push({ x0: p.x0, x1: p.x1, w0: -t.f * p.q0, w1: -t.f * p.q1, e });
      else pz.push({ x: p.x, P: -t.f * p.F, e });
    });
  });
  const key = Array.from(My1).map(v => Math.round(v / mx * 400)).join(',') + '|' + JSON.stringify(qz.map(q => [q.x0, q.x1, Math.round(q.w0 / mx * 1e9), Math.round(q.w1 / mx * 1e9), q.e])) + JSON.stringify(pz.map(p => [p.x, Math.round(p.P / mx * 1e9), p.e])) + (extra || '');
  if (cache && cache[key]) { const c = cache[key]; return { lam: c.lamN / mx, mode: c.mode, err: c.err, mx }; }
  const xs = md.xs, ne = md.ne;
  const Mfun = (e) => [S.at(xs3, My1, xs[e] + 1e-6), S.at(xs3, My1, (xs[e] + xs[e + 1]) / 2), S.at(xs3, My1, xs[e + 1] - 1e-6)];
  const qe = [];
  for (let e = 0; e < ne; e++) {
    const xa = xs[e], xb = xs[e + 1], xm = (xa + xb) / 2, arr = [];
    qz.forEach(d => { if (xm > d.x0 && xm < d.x1) { const L = d.x1 - d.x0; arr.push({ w0: d.w0 + (d.w1 - d.w0) * (xa - d.x0) / L, w1: d.w0 + (d.w1 - d.w0) * (xb - d.x0) / L, e: d.e }); } });
    qe.push(arr);
  }
  const { bc, springs } = T.bc3(md, sec, false);
  const r = F.ft(Object.assign({}, T.ftBase(md, sec), { fields: { u: true, v: false, phi: true }, Mye: Mfun, qz: (e) => qe[e], ptz: pz, bc, springs }));
  if (cache) cache[key] = { lamN: r.lam * mx, mode: r.mode, err: r.err };
  return { lam: r.lam, mode: r.mode, err: r.err, mx };
};
// M_cr,0 – moment stały w odcinku (do λ̄0 zał. A i C1)
T.mcrUniform = function (md, sec, sg, cache) {
  const key = 'U|' + sg.x0 + '|' + sg.x1;
  if (cache && cache[key]) return cache[key];
  const xs = md.xs, M0 = 1e6;
  const { bc, springs } = T.bc3(md, sec, false);
  const Mfun = (e) => { const xm = (xs[e] + xs[e + 1]) / 2; return xm > sg.x0 && xm < sg.x1 ? [M0, M0, M0] : [0, 0, 0]; };
  const r = F.ft(Object.assign({}, T.ftBase(md, sec), { fields: { u: true, v: false, phi: true }, Mye: Mfun, bc, springs }));
  const v = { Mcr0: r.lam * M0, err: r.err };
  if (cache) cache[key] = v;
  return v;
};
// C1 odcinka na podporach widełkowych (do k_c = 1/√C1)
T.C1seg = function (sec, sg, xs3, My, cache) {
  const Ls = sg.x1 - sg.x0, xs = F.mesh([sg.x0, sg.x1], sg.x1, Ls / 24).filter(x => x >= sg.x0 - 1e-6);
  let mx = 0; xs.forEach(x => { mx = Math.max(mx, Math.abs(S.at(xs3, My, x))); });
  if (!(mx > 0)) return 1;
  const key = 'C1|' + sg.x0 + '|' + sg.x1 + '|' + xs.map(x => Math.round(S.at(xs3, My, x) / mx * 400)).join(',');
  if (cache && cache[key]) return cache[key];
  const Mfun = (e) => [S.at(xs3, My, xs[e] + 1e-6), S.at(xs3, My, (xs[e] + xs[e + 1]) / 2), S.at(xs3, My, xs[e + 1] - 1e-6)];
  const bc = [{ x: sg.x0, u: true, phi: true }, { x: sg.x1, u: true, phi: true }];
  const r = F.ft({ xs, EIy: U.E * sec.Iy, EIz: U.E * sec.Iz, EIw: U.E * sec.Iw, GIt: U.G * sec.It, A: sec.A, Iy: sec.Iy, Iz: sec.Iz, betaZ: 0, fields: { u: true, v: false, phi: true }, Mye: Mfun, bc });
  const Mcr0 = Math.PI / Ls * Math.sqrt(U.E * sec.Iz * U.G * sec.It * (1 + Math.PI * Math.PI * U.E * sec.Iw / (Ls * Ls * U.G * sec.It)));
  const C1 = Math.max(1, r.lam * mx / Mcr0);
  if (cache) cache[key] = C1;
  return C1;
};

/* ---------------------------------------------------------------- sprawdzenie elementu (6.3.1–6.3.3) */
/* c: { md, an, sec, base, ndp, st, combo, Fd (siły obliczeniowe: N, y.M, z.M), F1 (I rząd – kształty, δ), method, cache, mcr }
   zwraca { flex: {y, z}, tors, segs: [ … interakcja … ] } */
T.member = function (c) {
  const { md, an, sec, base, ndp, st, combo, Fd, F1, method } = c;
  const fy = base.fy, g1 = ndp.gM1, E = U.E, G = U.G;
  const ov = (st.analiza && st.analiza.nadp) || {};
  const xs3 = an.xs3;
  const fl = T.curveFlex(sec, fy);
  const Aeff = base.Aeff, NRk = Aeff * fy;
  const ns = method === 'II_glob';
  // --- obciążenia krytyczne
  const nc = c.ncr || T.ncrAll(md, sec, Fd.Nel, ns, c.cache.ncr);
  const Nmax = nc.Nmax;
  const flex = {};
  ['y', 'z'].forEach(pl => {
    const I = pl === 'y' ? sec.Iy : sec.Iz, EI = E * I;
    const o = { pl, curve: (ov['krz' + pl.toUpperCase()] && ov['krz' + pl.toUpperCase()] !== 'auto') ? ov['krz' + pl.toUpperCase()] : fl[pl], curveAuto: fl[pl], curveWhy: fl.why };
    const Lov = isSet(ov['Lcr' + pl.toUpperCase()]) ? U.num(ov['Lcr' + pl.toUpperCase()]) * 1000 : null;
    const muOv = isSet(ov['mu' + pl.toUpperCase()]) ? U.num(ov['mu' + pl.toUpperCase()]) : null;
    if (method === 'II_pelna') { o.Ncr = Infinity; o.Lcr = 0; o.src = 'imperfekcje łukowe e₀ w analizie II rzędu – wyboczenie giętne ujęte w analizie (5.2.2(3)a)'; o.covered = true; }
    else if (Lov) { o.Lcr = Lov; o.Ncr = Math.PI * Math.PI * EI / (Lov * Lov); o.src = 'L_cr przyjęte ręcznie'; o.manual = true; }
    else if (muOv) { o.Lcr = muOv * md.H; o.Ncr = Math.PI * Math.PI * EI / (o.Lcr * o.Lcr); o.src = `μ = ${U.fmt(muOv, 2)} przyjęte ręcznie (L_cr = μ·H)`; o.manual = true; o.mu = muOv; }
    else {
      const a = nc[pl] ? nc[pl].alpha : Infinity;
      o.alpha = a;
      o.Ncr = Nmax > 0 ? a : Infinity;            // wartość własna dla rozkładu N(x) z N_max = 1 N → N_cr = α [N] (w przekroju z N_max)
      o.Lcr = isFinite(o.Ncr) ? Math.PI * Math.sqrt(EI / o.Ncr) : Infinity;
      o.mu = o.Lcr / md.H;
      o.src = ns ? 'MES – postać nieprzechyłowa (koniec górny unieruchomiony; przechył ujęty w analizie II rzędu z φ)' : 'MES – obciążenie krytyczne dla rozkładu N(x) kombinacji';
      o.mode = nc[pl] && nc[pl].mode; o.err = nc[pl] && nc[pl].err;
    }
    o.alphaCr = Nmax > 0 && isFinite(o.Ncr) ? o.Ncr / Nmax : Infinity;
    o.lam = isFinite(o.Ncr) && o.Ncr > 0 ? Math.sqrt(NRk / o.Ncr) : 0;
    o.lamE = isFinite(o.Lcr) && o.Lcr > 0 ? o.Lcr / Math.sqrt(I / sec.A) : 0;     // smukłość λ = L_cr/i
    o.chi = method === 'II_pelna' ? 1 : T.chi(o.lam, ALPHA[o.curve]);
    o.phi = T.phi(o.lam, ALPHA[o.curve]);
    o.NbRd = o.chi * NRk / g1;
    if (pl === 'z' && sec.bu) {
      // słup złożony z przewiązkami / przekładkami w rozstawie > 15 i_min – wyboczenie względem osi niematerialnej wg 6.4 (siła w gałęzi);
      // w interakcji 6.61/6.62 χ_z = 1 (stateczność gałęzi sprawdzana osobno)
      o.bu = true; o.chiStd = o.chi; o.chi = 1; o.NbRd = NRk / g1;
      o.src = (o.src || '') + ' · oś niematerialna – sprawdzenie gałęzi wg 6.4';
    }
    flex[pl] = o;
  });
  // --- skrętne i giętno-skrętne (przekroje otwarte)
  const tors = { relevant: sec.kind === 'I' || (sec.kind === 'CC' && !sec.bu) };
  if (tors.relevant) {
    const i02 = (sec.Iy + sec.Iz) / sec.A + (sec.z0 || 0) ** 2;
    tors.i02 = i02;
    if (isSet(ov.LcrT)) {
      const LT = U.num(ov.LcrT) * 1000; tors.LcrT = LT; tors.manual = true;
      tors.NcrT = (G * sec.It + Math.PI * Math.PI * E * sec.Iw / (LT * LT)) / i02;
      if (Math.abs(sec.z0) > 1e-6) { const Nz = flex.z.Ncr, bt = 1 - sec.z0 * sec.z0 / i02, a = Nz + tors.NcrT; tors.NcrTF = (a - Math.sqrt(a * a - 4 * bt * Nz * tors.NcrT)) / (2 * bt); }
      else tors.NcrTF = Infinity;
      tors.src = 'L_cr,T przyjęte ręcznie';
    } else {
      tors.NcrT = Nmax > 0 ? nc.T.alpha : Infinity; tors.NcrTF = Nmax > 0 ? nc.TF.alpha : Infinity;
      tors.LcrT = isFinite(tors.NcrT) && tors.NcrT * i02 > G * sec.It ? Math.PI * Math.sqrt(E * sec.Iw / (tors.NcrT * i02 - G * sec.It)) : Infinity;
      tors.src = 'MES (teoria Własowa) – warunki skrętne końców i stężenia';
      tors.mode = nc.T && nc.T.mode;
    }
    tors.mono = Math.abs(sec.z0 || 0) > 1e-6;
    // N_cr,TF z analizy sprzężonej (u, φ) jest miarodajne, gdy jest mniejsze od N_cr,z (postać giętno-skrętna lub względem osi wymuszonej stężeniem przy pasie);
    // w przeciwnym razie postać sprzężona jest postacią giętną z–z, sprawdzaną osobno
    tors.tfGov = isFinite(tors.NcrTF) && tors.NcrTF < flex.z.Ncr * 0.995;
    tors.Ncr = tors.tfGov ? Math.min(tors.NcrT, tors.NcrTF) : tors.NcrT;
    tors.lam = isFinite(tors.Ncr) && tors.Ncr > 0 ? Math.sqrt(NRk / tors.Ncr) : 0;
    tors.curve = flex.z.curve;
    tors.chi = T.chi(tors.lam, ALPHA[tors.curve]);
    tors.NbRd = tors.chi * NRk / g1;
    tors.governs = method === 'II_pelna' ? tors.chi < 1 : tors.chi < flex.z.chi - 1e-9;
  }
  // --- zwichrzenie i interakcja w odcinkach zwichrzeniowych
  const ltbSus = sec.kind === 'I' || (sec.kind === 'CC' && !sec.bu);
  const met = sec.kind === 'I' && sec.sym ? (ndp.ltbMet || '6.3.2.3') : '6.3.2.2';
  const segs = T.segLT(md), segY = T.segPlane(md, 'y'), segZ = T.segPlane(md, 'z');
  const My = Fd.y.M, Mz = Fd.z.M, Nar = Fd.N;
  const My1 = F1.y.M, Mz1 = F1.z.M;
  const kNinterMet = (st.analiza && st.analiza.interMet && st.analiza.interMet !== 'ndp') ? st.analiza.interMet : (ndp.interMet || 'B');
  let mcr = null;
  if (ltbSus && !isSet(ov.Mcr)) mcr = T.mcrRun(md, an, sec, combo, My1, c.cache.mcr);
  const distIn = (pl, s) => combo.terms.some(t => { const q = md.cases.find(k => k.id === t.id); return q && q.parts.some(p => p.typ === 'q' && p.kier === (pl === 'y' ? 'z' : 'y') && p.x1 > s.x0 + 1 && p.x0 < s.x1 - 1); });
  const ptIn = (pl, s) => combo.terms.some(t => { const q = md.cases.find(k => k.id === t.id); return q && q.parts.some(p => ((p.typ === 'H' && p.kier === (pl === 'y' ? 'z' : 'y')) || (p.typ === 'M' && p.os === pl)) && p.x > s.x0 + 1 && p.x < s.x1 - 1); });
  const out = [];
  segs.forEach(sg => {
    let NEd = 0; for (let i = 0; i < xs3.length; i++) if (xs3[i] >= sg.x0 - 1e-6 && xs3[i] <= sg.x1 + 1e-6) NEd = Math.max(NEd, Nar[i]);
    const shY = T.shape(xs3, My, sg.x0, sg.x1), shZ = T.shape(xs3, Mz, sg.x0, sg.x1);
    const MyEd = shY.mabs, MzEd = shZ.mabs;
    if (NEd <= 1e-3 * base.Npl && MyEd < 1e3 && MzEd < 1e3) return;
    // klasa przy (N, M_y, M_z) odcinka
    const cx = R.ctx(sec, base, NEd, shY.Mmax || 0, shZ.Mmax || 0);
    const cls = cx.cls;
    const Wy = cls <= 2 ? sec.Wpl_y : cls === 3 ? Math.min(sec.Wel_t, sec.Wel_b) : (shY.Mmax >= 0 ? base.Wy : base.WyN);
    const Wz = cls <= 2 ? sec.Wpl_z : cls === 3 ? sec.Wel_z : base.Wz;
    const MyRk = Wy * fy, MzRk = Wz * fy;
    const dMy = cls === 4 ? Math.abs(NEd * (base.eNy || 0)) : 0;
    // M_cr i χ_LT
    let ltb = { chimod: 1, skip: true, none: true }, Mcr = Infinity, lamLT = 0, C1 = null, kc = 1, kcSrc = '';
    const sh1 = T.shape(xs3, My1, sg.x0, sg.x1);
    if (ltbSus && MyEd > 1e3) {
      if (isSet(ov.Mcr)) { Mcr = U.num(ov.Mcr) * 1e6; }
      else if (mcr && isFinite(mcr.lam)) Mcr = mcr.lam * Math.max(sh1.mabs, 1);
      else if (mcr && mcr.lam === Infinity) Mcr = Infinity;
      lamLT = isFinite(Mcr) ? Math.sqrt(MyRk / Mcr) : 0;
      if (met === '6.3.2.3') {
        if (isSet(ov.kc)) { kc = U.clamp(U.num(ov.kc), 0.5, 1); kcSrc = 'k_c przyjęte ręcznie'; }
        else if (ndp.kcMet === '1' || kNinterMet === 'A') { kc = 1; kcSrc = kNinterMet === 'A' ? 'k_c = 1 (zał. A: wpływ rozkładu momentu ujęty w C_mLT)' : 'k_c = 1 (przyjęto bezpiecznie, f = 1)'; }
        else if (sg.free) { kc = 1; kcSrc = 'k_c = 1 (odcinek wspornikowy – bezpiecznie)'; }
        else if (sh1.linear) { kc = Math.min(1, 1 / (1.33 - 0.33 * sh1.psi)); kcSrc = `tabl. 6.6: k_c = 1/(1,33 − 0,33ψ), ψ = ${U.fmt(sh1.psi, 3)}`; }
        else { try { C1 = T.C1seg(sec, sg, xs3, My1, c.cache.c1); kc = U.clamp(1 / Math.sqrt(C1), 0.6, 1); kcSrc = `k_c = 1/√C₁ ≥ 0,6, C₁ = ${U.fmt(C1, 3)} (MES odcinka na podporach widełkowych)`; } catch (e) { kc = 1; kcSrc = 'k_c = 1'; } }
      }
      const crv = ov.krzLT && ov.krzLT !== 'auto' ? ov.krzLT : null;
      ltb = T.chiLT(lamLT, MyEd, Mcr, sec, ndp, kc, met, crv);
      ltb.kcSrc = kcSrc;
    }
    const chiLT = ltb.chimod;
    // C_m
    const sgY = segY.find(s => sg.x0 >= s.x0 - 1 && sg.x1 <= s.x1 + 1) || { x0: 0, x1: md.H };
    const sgZ = segZ.find(s => sg.x0 >= s.x0 - 1 && sg.x1 <= s.x1 + 1) || { x0: sg.x0, x1: sg.x1 };
    const shCmy = T.shape(xs3, method === 'II_pelna' ? My : My, sgY.x0, sgY.x1, distIn('y', sgY), ptIn('y', sgY));
    const shCmz = T.shape(xs3, Mz, sgZ.x0, sgZ.x1, distIn('z', sgZ), ptIn('z', sgZ));
    const shCmLT = T.shape(xs3, My, sg.x0, sg.x1, distIn('y', sg), ptIn('y', sg));
    const swayY = method === 'I' && md.sway.y && !flex.y.manual, swayZ = method === 'I' && md.sway.z && !flex.z.manual;
    const fy1 = flex.y, fz1 = flex.z;
    const chiy = fy1.chi, chiz0 = fz1.chi;
    const chiz = tors.relevant && tors.governs ? Math.min(chiz0, tors.chi) : chiz0;
    const lamy = method === 'II_pelna' ? 0 : fy1.lam, lamz = method === 'II_pelna' || fz1.bu ? 0 : fz1.lam;
    const r = { sg, NEd, MyEd, MzEd, dMy, cls, Wy, Wz, MyRk, MzRk, NRk, chiy, chiz, chiz0, chiT: tors.relevant ? tors.chi : 1, lamy, lamz, Mcr, lamLT, ltb, chiLT, C1, kc, met, shY, shZ, sgY, sgZ, swayY, swayZ, xMy: shY.xmax, xMz: shZ.xmax };
    // ---- współczynniki C_m i k_ij
    const meth = kNinterMet;
    r.meth = meth;
    const gOv = (k) => (isSet(ov[k]) ? U.num(ov[k]) : null);
    if (meth === 'A') {
      const Ncry = fy1.Ncr, Ncrz = fz1.Ncr, NcrT = tors.relevant ? tors.NcrT : Infinity, NcrTF = tors.relevant ? tors.NcrTF : Infinity;
      const EIy = E * sec.Iy, EIz = E * sec.Iz;
      const dxy = T.chordDev(xs3, F1.y.w, sgY), dxz = T.chordDev(xs3, F1.z.w, sgZ);
      const sh1Y = T.shape(xs3, My1, sgY.x0, sgY.x1), sh1Z = T.shape(xs3, Mz1, sgZ.x0, sgZ.x1);
      const cmy0 = T.CmA0(sh1Y, NEd, Ncry, EIy, dxy, sgY.x1 - sgY.x0), cmz0 = T.CmA0(sh1Z, NEd, Ncrz, EIz, dxz, sgZ.x1 - sgZ.x0);
      const aLT = Math.max(0, 1 - sec.It / sec.Iy);
      let Mcr0 = Infinity; if (ltbSus && MyEd > 1e3) { const u0 = T.mcrUniform(md, sec, sg, c.cache.mcr); Mcr0 = u0.Mcr0; }
      const lam0 = isFinite(Mcr0) ? Math.sqrt(MyRk / Mcr0) : 0;
      const C1a = isFinite(Mcr0) && isFinite(Mcr) && Mcr0 > 0 ? Math.max(1, Mcr / Mcr0) : 1;
      const lim0 = 0.2 * Math.sqrt(C1a) * Math.pow(Math.max(0, (1 - NEd / Ncrz) * (1 - NEd / NcrTF)), 0.25);
      const epsY = NEd > 0 ? MyEd / NEd * (cls === 4 ? Aeff / Wy : sec.A / Math.min(sec.Wel_t, sec.Wel_b)) : Infinity;
      let Cmy, Cmz = cmz0.v, CmLT;
      if (lam0 <= lim0 || !ltbSus) { Cmy = cmy0.v; CmLT = 1; r.Afall = 'λ̄0 ≤ 0,2√C₁·⁴√[(1 − N_Ed/N_cr,z)(1 − N_Ed/N_cr,TF)] → C_my = C_my,0, C_mLT = 1'; }
      else {
        const se = Math.sqrt(isFinite(epsY) ? epsY : 1e6);
        Cmy = cmy0.v + (1 - cmy0.v) * se * aLT / (1 + se * aLT);
        CmLT = Math.max(1, Cmy * Cmy * aLT / Math.sqrt(Math.max(1e-9, (1 - NEd / Ncrz) * (1 - NEd / NcrT))));
        r.Afall = 'λ̄0 > 0,2√C₁·⁴√[…] → C_my = C_my,0 + (1 − C_my,0)√ε_y·a_LT/(1 + √ε_y·a_LT), C_mLT = C_my²·a_LT/√[(1 − N_Ed/N_cr,z)(1 − N_Ed/N_cr,T)] ≥ 1';
      }
      if (method === 'II_pelna') { Cmy = 1; Cmz = 1; r.cmNote = 'C_m = 1 (momenty z analizy II rzędu z imperfekcjami)'; }
      if (gOv('Cmy') !== null) Cmy = gOv('Cmy'); if (gOv('Cmz') !== null) Cmz = gOv('Cmz'); if (gOv('CmLT') !== null) CmLT = gOv('CmLT');
      const ny = isFinite(Ncry) ? NEd / Ncry : 0, nz = isFinite(Ncrz) ? NEd / Ncrz : 0;
      const muy = (1 - ny) / Math.max(1e-9, 1 - chiy * ny), muz = (1 - nz) / Math.max(1e-9, 1 - chiz * nz);
      const wy = Math.min(1.5, sec.Wpl_y / Math.min(sec.Wel_t, sec.Wel_b)), wz = Math.min(1.5, sec.Wpl_z / sec.Wel_z);
      const npl = NEd / (NRk / g1);
      const lmax = Math.max(lamy, lamz);
      const MplyRd = sec.Wpl_y * fy / g1, MplzRd = sec.Wpl_z * fy / g1;
      const bLT = 0.5 * aLT * lam0 * lam0 * MyEd / (chiLT * MplyRd) * MzEd / MplzRd;
      const cLT = 10 * aLT * lam0 * lam0 / (5 + Math.pow(lamz, 4)) * MyEd / (Cmy * chiLT * MplyRd);
      const dLT = 2 * aLT * lam0 / (0.1 + Math.pow(lamz, 4)) * MyEd / (Cmy * chiLT * MplyRd) * MzEd / (Cmz * MplzRd);
      const eLT = 1.7 * aLT * lam0 / (0.1 + Math.pow(lamz, 4)) * MyEd / (Cmy * chiLT * MplyRd);
      const WelY = Math.min(sec.Wel_t, sec.Wel_b), WelZ = sec.Wel_z;
      const Cyy = Math.max(WelY / sec.Wpl_y, 1 + (wy - 1) * ((2 - 1.6 / wy * Cmy * Cmy * lmax - 1.6 / wy * Cmy * Cmy * lmax * lmax) * npl - bLT));
      const Cyz = Math.max(0.6 * Math.sqrt(wz / wy) * WelZ / sec.Wpl_z, 1 + (wz - 1) * ((2 - 14 * Cmz * Cmz * lmax * lmax / Math.pow(wz, 5)) * npl - cLT));
      const Czy = Math.max(0.6 * Math.sqrt(wy / wz) * WelY / sec.Wpl_y, 1 + (wy - 1) * ((2 - 14 * Cmy * Cmy * lmax * lmax / Math.pow(wy, 5)) * npl - dLT));
      const Czz = Math.max(WelZ / sec.Wpl_z, 1 + (wz - 1) * ((2 - 1.6 / wz * Cmz * Cmz * lmax - 1.6 / wz * Cmz * Cmz * lmax * lmax) * npl - eLT));
      const dY = Math.max(1e-9, 1 - ny), dZ = Math.max(1e-9, 1 - nz);
      let kyy, kyz, kzy, kzz;
      if (cls <= 2) {
        kyy = Cmy * CmLT * muy / dY / Cyy;
        kyz = Cmz * muy / dZ / Czy * 0.6 * Math.sqrt(wz / wy);
        kzy = Cmy * CmLT * muz / dY / Cyz * 0.6 * Math.sqrt(wy / wz);
        kzz = Cmz * muz / dZ / Czz;
      } else {
        kyy = Cmy * CmLT * muy / dY; kyz = Cmz * muy / dZ; kzy = Cmy * CmLT * muz / dY; kzz = Cmz * muz / dZ;
      }
      Object.assign(r, { Cmy, Cmz, CmLT, cmy0, cmz0, aLT, Mcr0, lam0, lim0, C1a, epsY, muy, muz, wy, wz, npl, lmax, bLT, cLT, dLT, eLT, Cyy, Cyz, Czy, Czz, ny, nz, kyy, kyz, kzy, kzz, dxy, dxz });
    } else {
      let cmy = swayY ? { v: 0.9, f: 'postać przechyłowa (tabl. B.3, uwaga) – C_my = 0,9' } : T.CmB(shCmy);
      let cmz = swayZ ? { v: 0.9, f: 'postać przechyłowa (tabl. B.3, uwaga) – C_mz = 0,9' } : T.CmB(shCmz);
      let cmlt = T.CmB(shCmLT); cmlt = { v: Math.max(0.4, cmlt.v), f: cmlt.f };
      if (method === 'II_pelna') { cmy = { v: 1, f: 'C_m = 1 (momenty z analizy II rzędu z imperfekcjami)' }; cmz = { v: 1, f: cmy.f }; }
      if (gOv('Cmy') !== null) cmy = { v: gOv('Cmy'), f: 'przyjęte ręcznie' };
      if (gOv('Cmz') !== null) cmz = { v: gOv('Cmz'), f: 'przyjęte ręcznie' };
      if (gOv('CmLT') !== null) cmlt = { v: gOv('CmLT'), f: 'przyjęte ręcznie' };
      const Cmy = cmy.v, Cmz = cmz.v, CmLT = cmlt.v;
      const ny = Math.max(0, NEd) / (chiy * NRk / g1), nz = Math.max(0, NEd) / (chiz * NRk / g1);
      let kyy, kyz, kzy, kzz, tab;
      const torsFree = !ltbSus || ltb.none;
      if (cls <= 2) {
        kyy = Math.min(Cmy * (1 + (lamy - 0.2) * ny), Cmy * (1 + 0.8 * ny));
        kzz = sec.kind === 'I' ? Math.min(Cmz * (1 + (2 * lamz - 0.6) * nz), Cmz * (1 + 1.4 * nz)) : Math.min(Cmz * (1 + (lamz - 0.2) * nz), Cmz * (1 + 0.8 * nz));
        kyz = 0.6 * kzz;
        if (torsFree) { kzy = 0.6 * kyy; tab = 'B.1'; }
        else { tab = 'B.2'; kzy = lamz < 0.4 ? Math.min(0.6 + lamz, 1 - 0.1 * lamz * nz / (CmLT - 0.25)) : Math.max(1 - 0.1 * lamz * nz / (CmLT - 0.25), 1 - 0.1 * nz / (CmLT - 0.25)); }
      } else {
        kyy = Math.min(Cmy * (1 + 0.6 * lamy * ny), Cmy * (1 + 0.6 * ny));
        kzz = Math.min(Cmz * (1 + 0.6 * lamz * nz), Cmz * (1 + 0.6 * nz));
        kyz = kzz;
        if (torsFree) { kzy = 0.8 * kyy; tab = 'B.1'; }
        else { tab = 'B.2'; kzy = Math.max(1 - 0.05 * lamz * nz / (CmLT - 0.25), 1 - 0.05 * nz / (CmLT - 0.25)); }
      }
      Object.assign(r, { Cmy, Cmz, CmLT, cmy, cmz, cmlt, ny, nz, kyy, kyz, kzy, kzz, tab });
    }
    const Ny = Math.max(0, NEd) / (chiy * NRk / g1), Nz = Math.max(0, NEd) / (chiz * NRk / g1);
    const t2 = (MyEd + dMy) / (chiLT * MyRk / g1), t3 = MzEd / (MzRk / g1);
    r.tN_y = Ny; r.tN_z = Nz; r.tMy = t2; r.tMz = t3;
    r.u61 = Ny + r.kyy * t2 + r.kyz * t3;
    r.u62 = Nz + r.kzy * t2 + r.kzz * t3;
    r.u = Math.max(r.u61, r.u62);
    r.MbRd = chiLT * MyRk / g1;
    out.push(r);
  });
  return { flex, tors, segs: out, nc, mcr, met, ltbSus, Nmax };
};
/* ---------------------------------------------------------- słup złożony z dwóch gałęzi (PN-EN 1993-1-1, 6.4) */
// q: { NEd, MzI – moment I rzędu względem osi niematerialnej (maks.), VyI, Lcr – długość wyboczeniowa względem z–z, Lcry, MyEd, kyy, fu, betaW }
T.builtUp = function (sec, base, ndp, q) {
  const E = U.E, fy = base.fy, g0 = ndp.gM0, g1 = ndp.gM1, g2 = ndp.gM2;
  const Ach = sec.A_ch, Ich = sec.I_ch, h0 = sec.h0, a = sec.pa, n = 2, L = q.Lcr, NEd = Math.max(0, q.NEd);
  const o = { Ach, Ich, h0, a, n, L, NEd, pack: !!sec.buPack };
  o.I1 = 0.5 * h0 * h0 * Ach + 2 * Ich;
  o.i0 = Math.sqrt(o.I1 / (2 * Ach));
  o.lam = L / o.i0;
  o.mu = o.lam <= 75 ? 1 : o.lam >= 150 ? 0 : 2 - o.lam / 75;                       // tabl. 6.8
  o.Ieff = 0.5 * h0 * h0 * Ach + 2 * o.mu * Ich;                                      // (6.74)
  o.Ib = o.pack ? Infinity : sec.pt * Math.pow(sec.pb, 3) / 12;
  o.Sv1 = o.pack ? Infinity : 24 * E * Ich / (a * a * (1 + 2 * Ich * h0 / (n * o.Ib * a)));
  o.Sv2 = 2 * Math.PI * Math.PI * E * Ich / (a * a);
  o.Sv = Math.min(o.Sv1, o.Sv2);                                                     // (6.73)
  o.Ncr = Math.PI * Math.PI * E * o.Ieff / (L * L);                                  // (6.72)
  o.e0 = L / 500;
  o.MI = Math.abs(q.MzI || 0);
  o.den = 1 - NEd / o.Ncr - NEd / o.Sv;
  o.MEd = o.den > 0 ? (NEd * o.e0 + o.MI) / o.den : Infinity;                       // (6.69)
  o.Nch = 0.5 * NEd + o.MEd * h0 * Ach / (2 * o.Ieff);                              // (6.69)
  o.VEd6 = Math.PI * o.MEd / L;                                                      // (6.70)
  o.VEd = Math.max(o.VEd6, Math.abs(q.VyI || 0));
  const lam1 = Math.PI * Math.sqrt(E / fy);
  // gałąź między przewiązkami – wyboczenie względem osi własnej gałęzi (L_ch = a), z momentem lokalnym M_ch = V_Ed·a/4 (rys. 6.11)
  o.lamCh = a / sec.i_ch / lam1; o.chiCh = T.chi(o.lamCh, ALPHA.c); o.NbCh = o.chiCh * Ach * fy / g1;
  o.Mch = o.VEd * a / 4; o.MchRd = sec.Wel_z_ch * fy / g0;
  o.u1 = !isFinite(o.MEd) ? Infinity : o.Nch / o.NbCh + o.Mch / o.MchRd;
  // gałąź – wyboczenie względem osi materiałowej y–y na długości L_cr,y, z połową momentu M_y
  o.Lcry = q.Lcry; o.lamY = q.Lcry > 0 && isFinite(q.Lcry) ? q.Lcry / sec.iy_ch / lam1 : 0; o.chiY = T.chi(o.lamY, ALPHA.c); o.NbY = o.chiY * Ach * fy / g1;
  o.MyCh = Math.abs(q.MyEd || 0) / 2; o.kyy = q.kyy || 1; o.MyRdCh = sec.Wel_y_ch * fy / g1;
  o.u2 = !isFinite(o.MEd) ? Infinity : o.Nch / o.NbY + o.kyy * o.MyCh / o.MyRdCh;
  if (!o.pack) {
    // przewiązki (dwie płaszczyzny): siła poprzeczna T_b = V_Ed·a/(n·h0), moment M_b = V_Ed·a/(2n)
    const tb = sec.pt, bb = sec.pb;
    o.Tb = o.VEd * a / (n * h0); o.Mb = o.VEd * a / (2 * n);
    o.Wb = tb * bb * bb / 6; o.sb = o.Mb / o.Wb; o.tb = 1.5 * o.Tb / (tb * bb);
    o.fyd = fy / g0; o.fvd = fy / (Math.sqrt(3) * g0);
    o.sred = Math.sqrt(o.sb * o.sb + 3 * o.tb * o.tb);
    o.ub = Math.max(o.sb / o.fyd, o.tb / o.fvd, o.sred / o.fyd);
    // spoiny przewiązki z gałęzią: dwie spoiny wzdłuż zakładu c i jedna na krawędzi (długość b_b), grubość a_w – metoda sprężysta
    const c = sec.pz, aw = sec.pw;
    const Aw = aw * (2 * c + bb), uc = c * (c + bb) / (2 * c + bb);
    const Iv = 2 * aw * c * (bb / 2) * (bb / 2) + aw * bb * bb * bb / 12;
    const Iu = 2 * aw * (c * c * c / 12 + c * Math.pow(c / 2 - uc, 2)) + aw * bb * Math.pow(c - uc, 2);
    const Ip = Iu + Iv;
    const pts = [[0, bb / 2], [c, bb / 2], [0, -bb / 2], [c, -bb / 2]];
    let tw = 0; pts.forEach(([u, v]) => { const tu = -o.Mb * v / Ip, tv = o.Tb / Aw + o.Mb * (u - uc) / Ip; tw = Math.max(tw, Math.hypot(tu, tv)); });
    o.weld = { c, aw, Aw, uc, Ip, tw, bw: q.betaW || 0.9, fu: q.fu || 360 };
    o.weld.fvw = o.weld.fu / (Math.sqrt(3) * o.weld.bw * g2);
    o.uw = tw / o.weld.fvw;
    o.nIb = n * o.Ib / h0; o.ich10 = 10 * Ich / a; o.stiffOk = o.nIb >= o.ich10;     // n·I_b/h0 ≥ 10·I_ch/a
  }
  o.panels = q.H > 0 ? q.H / a : Infinity;
  return o;
};
// największe odchylenie od cięciwy odcinka (I rząd) – δ_x do zał. A
T.chordDev = function (xs3, w, sg) {
  const a = S.at(xs3, w, sg.x0 + 1e-6), b = S.at(xs3, w, sg.x1 - 1e-6);
  let m = 0; for (let i = 0; i < xs3.length; i++) { const x = xs3[i]; if (x < sg.x0 - 1e-6 || x > sg.x1 + 1e-6) continue; const lin = a + (b - a) * (x - sg.x0) / Math.max(1e-9, sg.x1 - sg.x0); if (Math.abs(w[i] - lin) > Math.abs(m)) m = w[i] - lin; }
  // odcinek wspornikowy (koniec swobodny): przemieszczenie względem podstawy
  return m;
};

/* ---------------------------------------------------------------- metoda ogólna 6.3.4 */
// Fk: siły w płaszczyźnie (N, M_y) z analizy II rzędu z imperfekcjami w płaszczyźnie y; zwraca α_ult,k, α_cr,op, λ̄_op, χ_op
T.general = function (c) {
  const { md, an, sec, base, ndp, Fk, combo, F1 } = c;
  const fy = base.fy, xs3 = an.xs3;
  const ndpK = Object.assign({}, ndp, { gM0: 1 });
  const bK = R.basic(sec, { fy }, ndpK);
  // α_ult,k: minimalny mnożnik obciążeń do osiągnięcia nośności charakterystycznej przekroju (bisekcja)
  let aUlt = Infinity, at = null;
  const pts = []; let iN = 0, iM = 0;
  for (let i = 0; i < xs3.length; i++) { if (Fk.N[i] > Fk.N[iN]) iN = i; if (Math.abs(Fk.y.M[i]) > Math.abs(Fk.y.M[iM])) iM = i; }
  pts.push(iN, iM, 0, xs3.length - 1); for (let i = 0; i < xs3.length; i += 12) pts.push(i);
  Array.from(new Set(pts)).forEach(i => {
    const N = Fk.N[i], My = Fk.y.M[i];
    const cx = R.ctx(sec, bK, N, My, 0);
    const u1 = (lam) => { const r = R.atPoint(sec, bK, ndpK, { N: lam * N, My: lam * My }, cx); return Math.max(r.uMN, r.uN); };
    if (u1(1) <= 0) return;
    let lo = 0, hi = 1; while (u1(hi) < 1 && hi < 1e4) hi *= 2;
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (u1(m) < 1) lo = m; else hi = m; }
    const a = (lo + hi) / 2; if (a < aUlt) { aUlt = a; at = xs3[i]; }
  });
  // α_cr,op: postać z płaszczyzny (u, φ) przy N(x) i M_y(x) kombinacji
  const { bc, springs } = T.bc3(md, sec, false);
  const xs = md.xs, My1 = F1.y.M;
  const Mfun = (e) => [S.at(xs3, My1, xs[e] + 1e-6), S.at(xs3, My1, (xs[e] + xs[e + 1]) / 2), S.at(xs3, My1, xs[e + 1] - 1e-6)];
  const rop = F.ft(Object.assign({}, T.ftBase(md, sec), { fields: { u: true, v: false, phi: true }, Nel: Fk.Nel, Mye: Mfun, bc, springs }));
  const aCr = rop.lam;
  const lop = isFinite(aCr) && aCr > 0 ? Math.sqrt(aUlt / aCr) : 0;
  const fl = T.curveFlex(sec, fy);
  const chiZ = T.chi(lop, ALPHA[fl.z]);
  const ltb = sec.kind === 'I' ? T.chiLT(lop, 1, 1e9, sec, ndp, 1, '6.3.2.2') : { chimod: 1 };
  const chiLT = sec.kind === 'I' ? (lop <= 0.2 ? 1 : T.chi(lop, ALPHA[T.curveLT(sec, '6.3.2.2')])) : 1;
  const chiOp = Math.min(chiZ, chiLT);
  const u = ndp.gM1 / (chiOp * aUlt);
  void ltb; void combo;
  return { aUlt, at, aCr, lop, chiZ, chiLT, chiOp, u, curveZ: fl.z, curveLT: sec.kind === 'I' ? T.curveLT(sec, '6.3.2.2') : '—', mode: rop.mode, err: rop.err };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
