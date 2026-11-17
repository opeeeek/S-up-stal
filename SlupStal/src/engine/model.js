/* =====================================================================
   SłupStal – model obliczeniowy słupa i analiza statyczna
   • geometria (wysokość H), warunki podparcia w dwóch płaszczyznach:
     „y” – zginanie M_y względem osi y–y (przemieszczenie w w kierunku z),
     „z” – zginanie M_z względem osi z–z (przemieszczenie v w kierunku y);
   • stężenia pośrednie (blokada przemieszczeń w płaszczyźnie y / z,
     na wysokości pasa lub środka ścinania, opcjonalnie skrętne);
   • obciążenia (przypadki): siły podłużne z mimośrodami, siły poziome,
     obciążenia rozłożone poziome, momenty skupione, ciężar własny;
   • siatka MES, analiza I rzędu przypadków (superpozycja) oraz analiza
     II rzędu kombinacji z imperfekcjami (przechyłową φ, łukową e₀).
   Jednostki wewnętrzne: N, mm.  Dane: kN, m, kNm, kN/m.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, F = BS.FE;
const S = BS.S = {};

S.RODZAJE = {
  G: { n: 'stałe (G)', stale: true },
  Q: { n: 'użytkowe (Q)', psiKey: c => c.kat || 'Q-B' },
  S: { n: 'śnieg (S)', psiKey: () => 'S' },
  W: { n: 'wiatr (W)', psiKey: () => 'W' },
  T: { n: 'temperatura (T)', psiKey: () => 'T' },
  M: { n: 'dźwignice / maszyny (M)', psiKey: () => 'M' },
  Qc: { n: 'montażowe (Qc)', psiKey: () => 'Qc' },
  A: { n: 'wyjątkowe (A)', wyj: true }
};
S.PLN = { y: 'płaszczyzna x–z (zginanie M_y, wyboczenie względem osi y–y)', z: 'płaszczyzna x–y (zginanie M_z, wyboczenie względem osi z–z)' };
S.PLS = { y: 'x–z (M_y)', z: 'x–y (M_z)' };
S.DOL = { utw: 'utwierdzenie', prz: 'przegub', spr: 'przegub + sprężyna obrotowa' };
S.GORA = { swob: 'swobodny (wspornik)', prz: 'przegub nieprzesuwny', utw: 'utwierdzenie nieprzesuwne', utwp: 'utwierdzenie przesuwne (obrót zablokowany)', spr: 'podparcie sprężyste poziome' };
S.SKRET_D = { widelki: 'widełkowe (φ = 0, deplanacja swobodna)', pelne: 'pełne (φ = 0, φ′ = 0 – deplanacja zablokowana)' };
S.SKRET_G = { widelki: 'widełkowe (φ = 0)', swob: 'swobodne (koniec nieskręcony nie jest zapewniony)', pelne: 'pełne (φ = 0, φ′ = 0)' };

const kN = 1e3, m2mm = 1e3, kNm = 1e6;
const isSet = v => v !== '' && v !== null && v !== undefined && isFinite(+v);

/* ---------------------------------------------------------------- budowa modelu */
S.model = function (st, sec) {
  const md = { err: [], warn: [] };
  const H = U.num(st.geom.H) * m2mm;
  if (!(H > 100)) { md.err.push('Wysokość słupa musi być dodatnia (H > 0,1 m).'); return md; }
  md.H = H;
  const pod = st.podpory || {}, dol = pod.dol || {}, gora = pod.gora || {};
  md.bc = { dol: { y: dol.y || 'utw', z: dol.z || 'utw', kry: U.num(dol.kry, 0) * kNm, krz: U.num(dol.krz, 0) * kNm, skret: dol.skret || 'widelki' },
            gora: { y: gora.y || 'swob', z: gora.z || 'swob', khy: U.num(gora.khy, 0), khz: U.num(gora.khz, 0), skret: gora.skret || 'widelki' } };
  // stężenia pośrednie
  md.stez = (st.stezenia || []).map((z, i) => ({ i, x: U.num(z.x) * m2mm, pl: z.pl || 'z', skret: !!z.skret, wys: z.wys || 'srodek' }))
    .filter(z => z.x > 1 && z.x < H - 1).sort((a, b) => a.x - b.x);
  // przypadki obciążeń
  const cases = [];
  const sw = st.ciezarWlasny || {};
  if (sw.auto !== false) {
    const g = sec.gk * (1 + U.num(sw.dodatek, 0) / 100);    // kN/m ≡ N/mm
    cases.push({ id: 'G0', c: { id: 'G₀', nazwa: `ciężar własny słupa (${U.fmt(sec.masa, 1)} kg/m${U.num(sw.dodatek, 0) ? ` + ${U.fmt(U.num(sw.dodatek), 0)}% na blachy i łączniki` : ''})`, rodzaj: 'G', auto: true }, parts: [{ typ: 'Nq', q: g, x0: 0, x1: H }] });
  }
  (st.obciazenia || []).forEach((o, i) => {
    if (o.aktywne === false) return;
    const parts = [];
    (o.sklad || []).forEach(p => {
      if (p.typ === 'N') {
        const x = isSet(p.x) ? U.clamp(U.num(p.x) * m2mm, 0, H) : H;
        parts.push({ typ: 'N', x, F: U.num(p.F) * kN, ey: U.num(p.ey, 0), ez: U.num(p.ez, 0) });
      } else if (p.typ === 'H') {
        const x = isSet(p.x) ? U.clamp(U.num(p.x) * m2mm, 0, H) : H;
        parts.push({ typ: 'H', x, kier: p.kier === 'y' ? 'y' : 'z', F: U.num(p.F) * kN, wys: p.wys || 'srodek' });
      } else if (p.typ === 'q') {
        const x0 = isSet(p.x0) ? U.clamp(U.num(p.x0) * m2mm, 0, H) : 0, x1 = isSet(p.x1) ? U.clamp(U.num(p.x1) * m2mm, 0, H) : H;
        if (x1 - x0 < 1) return;
        const q0 = U.num(p.q0), q1 = isSet(p.q1) ? U.num(p.q1) : q0;
        parts.push({ typ: 'q', kier: p.kier === 'y' ? 'y' : 'z', q0, q1, x0, x1, wys: p.wys || 'srodek' });
      } else if (p.typ === 'M') {
        const x = isSet(p.x) ? U.clamp(U.num(p.x) * m2mm, 0, H) : H;
        parts.push({ typ: 'M', x, os: p.os === 'z' ? 'z' : 'y', M: U.num(p.M) * kNm });
      } else if (p.typ === 'Nq') {
        const x0 = isSet(p.x0) ? U.num(p.x0) * m2mm : 0, x1 = isSet(p.x1) ? U.num(p.x1) * m2mm : H;
        parts.push({ typ: 'Nq', q: U.num(p.q), x0, x1 });
      }
    });
    cases.push({ id: 'L' + i, idx: i, c: o, parts });
  });
  md.cases = cases;
  // siatka: węzły obowiązkowe
  const keys = [0, H];
  md.stez.forEach(z => keys.push(z.x));
  cases.forEach(c => c.parts.forEach(p => { if (p.x !== undefined) keys.push(p.x); if (p.x0 !== undefined) keys.push(p.x0, p.x1); }));
  md.xs = F.mesh(keys, H, H / 48);
  md.ne = md.xs.length - 1;
  md.xm = []; for (let e = 0; e < md.ne; e++) md.xm.push((md.xs[e] + md.xs[e + 1]) / 2);
  // podpory w płaszczyznach (statyka)
  md.sup = { y: S.supports(md, 'y', false), z: S.supports(md, 'z', false) };
  md.supNS = { y: S.supports(md, 'y', true), z: S.supports(md, 'z', true) };
  const kr0 = (pl) => (pl === 'y' ? md.bc.dol.kry : md.bc.dol.krz);
  const baseRot = (pl) => md.bc.dol[pl] === 'utw' || (md.bc.dol[pl] === 'spr' && kr0(pl) > 0);
  const hasBrace = (pl) => md.stez.some(z => z.pl === pl || z.pl === 'yz');
  ['y', 'z'].forEach(pl => { const b = md.bc; if (!baseRot(pl) && (b.gora[pl] === 'swob' || b.gora[pl] === 'utwp' || (b.gora[pl] === 'spr' && !((pl === 'y' ? b.gora.khz : b.gora.khy) > 0))) && !hasBrace(pl)) md.err.push(`Płaszczyzna ${S.PLS[pl]}: układ geometrycznie zmienny – przy przesuwnym końcu górnym podstawa musi być utwierdzona (lub sprężysta z k > 0).`); });
  ['y', 'z'].forEach(pl => { const b = md.bc; if (b.dol[pl] === 'spr' && !(kr0(pl) > 0)) md.warn.push(`Płaszczyzna ${S.PLS[pl]}: sprężyna obrotowa podstawy k = 0 – przyjęto przegub.`); });
  md.sway = { y: S.isSway(md, 'y'), z: S.isSway(md, 'z') };
  return md;
};

/* tryb przechyłowy: koniec górny przesuwny i brak stężeń w płaszczyźnie */
S.isSway = (md, pl) => ['swob', 'utwp', 'spr'].includes(md.bc.gora[pl]) && !md.stez.some(z => z.pl === pl || z.pl === 'yz');

/* podpory dla F.col2 / F.buck2; ns = true – koniec górny unieruchomiony poziomo (postać nieprzechyłowa) */
S.supports = function (md, pl, ns) {
  const b = md.bc, H = md.H, out = [];
  const d = b.dol[pl], g = b.gora[pl];
  out.push({ x: 0, id: 'A', kv: 'fix', kr: d === 'utw' ? 'fix' : d === 'spr' ? (pl === 'y' ? b.dol.kry : b.dol.krz) : 0 });
  let top = null;
  if (g === 'prz') top = { kv: 'fix', kr: 0 };
  else if (g === 'utw') top = { kv: 'fix', kr: 'fix' };
  else if (g === 'utwp') top = { kv: ns ? 'fix' : 0, kr: 'fix' };
  else if (g === 'spr') { const k = pl === 'y' ? b.gora.khz : b.gora.khy; top = { kv: ns ? 'fix' : k, kr: 0 }; }
  else if (ns) top = { kv: 'fix', kr: 0 };
  if (top) out.push(Object.assign({ x: H, id: 'B' }, top));
  md.stez.filter(z => z.pl === pl || z.pl === 'yz').forEach((z, i) => out.push({ x: z.x, id: 'S' + (i + 1), kv: 'fix', kr: 0, brace: true }));
  return out;
};

/* obciążenia przypadku w płaszczyźnie: { dist, point, mom } oraz N na elementach */
S.planeLoads = function (md, c, pl) {
  const o = { dist: [], point: [], mom: [] };
  c.parts.forEach(p => {
    if (p.typ === 'N') { const e = pl === 'y' ? p.ez : p.ey; if (e) o.mom.push({ x: p.x, M: p.F * e }); }
    else if (p.typ === 'H' && p.kier === (pl === 'y' ? 'z' : 'y')) o.point.push({ x: p.x, P: p.F });
    else if (p.typ === 'q' && p.kier === (pl === 'y' ? 'z' : 'y')) o.dist.push({ x0: p.x0, x1: p.x1, q0: p.q0, q1: p.q1 });
    else if (p.typ === 'M' && p.os === pl) o.mom.push({ x: p.x, M: p.M });
  });
  return o;
};
S.axial = function (md, c) {
  const Nel = new Float64Array(md.ne);
  c.parts.forEach(p => {
    if (p.typ === 'N') { for (let e = 0; e < md.ne; e++) if (md.xm[e] < p.x) Nel[e] += p.F; }
    else if (p.typ === 'Nq') { for (let e = 0; e < md.ne; e++) { const xm = md.xm[e]; const a = Math.max(xm, p.x0), b = p.x1; if (b > a) Nel[e] += p.q * (b - a); } }
  });
  return Nel;
};

/* ---------------------------------------------------------------- analiza I rzędu przypadków */
S.analyze = function (md, sec) {
  const E = U.E;
  const an = { res: {}, xs3: null };
  md.cases.forEach(c => {
    const r = { c: c.c, Nel: S.axial(md, c), pl: {} };
    ['y', 'z'].forEach(pl => {
      const L = S.planeLoads(md, c, pl);
      const EI = E * (pl === 'y' ? sec.Iy : sec.Iz);
      const has = L.dist.length || L.point.length || L.mom.length;
      if (!has) { r.pl[pl] = null; return; }
      const res = F.col2(Object.assign({ xs: md.xs, EI, sup: md.sup[pl] }, L));
      if (res.err) throw new Error(`${S.PLS[pl]}: ${res.err}`);
      const sm = F.sample2(res);
      r.pl[pl] = { sm, reac: res.reactions, loads: L };
      if (!an.xs3) an.xs3 = sm.xs;
    });
    an.res[c.id] = r;
  });
  if (!an.xs3) { const xs3 = []; for (let e = 0; e < md.ne; e++) xs3.push(md.xs[e], md.xm[e], md.xs[e + 1]); an.xs3 = xs3; }
  an.ns = an.xs3.length;
  // N w punktach próbkowania (3 na element)
  an.N3 = (Nel) => { const o = new Float64Array(an.ns); for (let e = 0; e < md.ne; e++) { o[3 * e] = o[3 * e + 1] = o[3 * e + 2] = Nel[e]; } return o; };
  return an;
};

/* ---------------------------------------------------------------- kombinacja: I rząd (superpozycja) */
S.combine1 = function (md, an, combo) {
  const ns = an.ns, z = () => new Float64Array(ns);
  const o = { Nel: new Float64Array(md.ne), y: { M: z(), V: z(), w: z(), R: { A: { R: 0, M: 0 }, B: { R: 0, M: 0 } } }, z: { M: z(), V: z(), w: z(), R: { A: { R: 0, M: 0 }, B: { R: 0, M: 0 } } } };
  combo.terms.forEach(t => {
    const r = an.res[t.id]; if (!r) return;
    for (let e = 0; e < md.ne; e++) o.Nel[e] += t.f * r.Nel[e];
    ['y', 'z'].forEach(pl => {
      const p = r.pl[pl]; if (!p) return;
      const a = o[pl];
      for (let i = 0; i < ns; i++) { a.M[i] += t.f * p.sm.M[i]; a.V[i] += t.f * p.sm.V[i]; a.w[i] += t.f * p.sm.w[i]; }
      p.reac.forEach(q => { if (!a.R[q.id]) a.R[q.id] = { R: 0, M: 0 }; a.R[q.id].R += t.f * q.R; a.R[q.id].M += t.f * q.M; });
    });
  });
  o.N = an.N3(o.Nel);
  o.order = 1;
  return o;
};

/* obciążenia kombinacji w płaszczyźnie (do analizy II rzędu i Mcr) */
S.comboLoads = function (md, an, combo, pl) {
  const L = { dist: [], point: [], mom: [] };
  combo.terms.forEach(t => {
    const r = an.res[t.id]; if (!r || !r.pl[pl]) return;
    const q = r.pl[pl].loads;
    q.dist.forEach(d => L.dist.push({ x0: d.x0, x1: d.x1, q0: t.f * d.q0, q1: t.f * d.q1 }));
    q.point.forEach(p => L.point.push({ x: p.x, P: t.f * p.P }));
    q.mom.forEach(p => L.mom.push({ x: p.x, M: t.f * p.M }));
  });
  return L;
};

/* ---------------------------------------------------------------- imperfekcje */
// φ = φ0·αh·αm (5.3.2(3)); h – wysokość słupa [m]
S.phiSway = function (md, ndp, imp) {
  const h = md.H / 1000;
  const ah = U.clamp(2 / Math.sqrt(h), 2 / 3, 1), m = Math.max(1, Math.round(U.num(imp.m, 1))), am = Math.sqrt(0.5 * (1 + 1 / m));
  const phi0 = U.num(ndp.phi0, 1 / 200);
  const auto = phi0 * ah * am;
  const man = isSet(imp.phi) && +imp.phi > 0 ? 1 / U.num(imp.phi) : null;   // podane jako 1/φ (np. 200)
  return { phi0, ah, am, m, h, auto, phi: man !== null ? man : auto, manual: man !== null };
};
// e0/L wg tabl. 5.1 (analiza sprężysta)
S.E0L = { a0: 350, a: 300, b: 250, c: 200, d: 150 };
// segmenty łuku: między punktami blokady przemieszczenia w płaszczyźnie (podpory, stężenia); górny swobodny – do wierzchołka
S.bowSegments = function (md, pl) {
  const pts = new Set([0]);
  const g = md.bc.gora[pl];
  if (g === 'prz' || g === 'utw') pts.add(md.H);
  md.stez.filter(z => z.pl === pl || z.pl === 'yz').forEach(z => pts.add(z.x));
  const xs = Array.from(pts).sort((a, b) => a - b);
  const segs = [];
  for (let i = 1; i < xs.length; i++) segs.push({ x0: xs[i - 1], x1: xs[i] });
  const last = xs[xs.length - 1];
  if (last < md.H - 1) segs.push({ x0: last, x1: md.H, free: true });
  return segs;
};
// wektor d0 (w, θ w węzłach): przechył φ·x (sgn) + łuki e0 (sgnB) w segmentach
S.d0 = function (md, pl, phi, e0L, sgn, sgnB, segs) {
  const xs = md.xs, d0 = new Float64Array(2 * xs.length);
  const sw = phi && md.sway[pl] ? phi * sgn : 0;
  xs.forEach((x, i) => { d0[2 * i] += sw * x; d0[2 * i + 1] += sw; });
  if (e0L) (segs || S.bowSegments(md, pl)).forEach((s, k) => {
    const Ls = s.x1 - s.x0, e0 = Ls / e0L * (Array.isArray(sgnB) ? sgnB[k] : sgnB);
    xs.forEach((x, i) => {
      if (x < s.x0 - 1e-6 || x > s.x1 + 1e-6) return;
      const t = (x - s.x0) / Ls;
      // łuk półfalowy; dla odcinka wspornikowego – ćwiartka fali (wygięcie rośnie ku swobodnemu końcowi) dodawana do łuku
      d0[2 * i] += e0 * Math.sin(Math.PI * t); d0[2 * i + 1] += e0 * Math.PI / Ls * Math.cos(Math.PI * t);
    });
  });
  return d0;
};

/* ---------------------------------------------------------------- kombinacja: II rząd z imperfekcjami */
// o: { phi, e0L: {y, z}, var: { pl: 'y'|'z', s: ±1 } – płaszczyzna i zwrot imperfekcji przechyłowej, sgnB: { y, z } }
S.combine2 = function (md, an, sec, combo, o) {
  const E = U.E, ns = an.ns;
  const c1 = S.combine1(md, an, combo);
  const out = { Nel: c1.Nel, N: c1.N, order: 2, imp: { phi: {}, e0: {} } };
  for (const pl of ['y', 'z']) {
    const L = S.comboLoads(md, an, combo, pl);
    const EI = E * (pl === 'y' ? sec.Iy : sec.Iz);
    const swayHere = o.var && o.var.pl === pl ? o.phi : 0;
    const e0L = o.e0L ? o.e0L[pl] : 0;
    const sB = o.sgnB && o.sgnB[pl] !== undefined ? o.sgnB[pl] : (o.var ? o.var.s : 1);
    const d0 = S.d0(md, pl, swayHere, e0L, o.var && o.var.pl === pl ? o.var.s : 1, sB);
    const res = F.col2(Object.assign({ xs: md.xs, EI, sup: md.sup[pl], Nel: c1.Nel, d0 }, L));
    if (res.err) { out.err = `${S.PLS[pl]}: ${res.err}`; out[pl] = c1[pl]; continue; }
    const sm = F.sample2(res);
    const R = {}; res.reactions.forEach(q => { R[q.id] = { R: q.R, M: q.M }; });
    out[pl] = { M: Float64Array.from(sm.M), V: Float64Array.from(sm.V), w: Float64Array.from(sm.w), R };
    out.imp.phi[pl] = swayHere && md.sway[pl] ? swayHere * (o.var.s || 1) : 0;
    out.imp.e0[pl] = e0L ? sB : 0;
  }
  void ns;
  return out;
};

/* ---------------------------------------------------------------- pomocnicze */
S.at = function (xs, arr, x) {
  // wartość w x (pierwsze trafienie od lewej; przy skoku – wartość „z dołu”)
  for (let i = 1; i < xs.length; i++) if (x <= xs[i] + 1e-9) { const x0 = xs[i - 1], x1 = xs[i]; if (x1 - x0 < 1e-9) return arr[i]; return arr[i - 1] + (arr[i] - arr[i - 1]) * (x - x0) / (x1 - x0); }
  return arr[arr.length - 1];
};
S.maxAbs = function (arr, xs, x0, x1) { let m = 0, im = -1; for (let i = 0; i < arr.length; i++) { if (xs && (xs[i] < x0 - 1e-6 || xs[i] > x1 + 1e-6)) continue; if (Math.abs(arr[i]) > Math.abs(m)) { m = arr[i]; im = i; } } return { v: m, i: im, x: im >= 0 && xs ? xs[im] : null }; };

})(typeof globalThis !== 'undefined' ? globalThis : this);
