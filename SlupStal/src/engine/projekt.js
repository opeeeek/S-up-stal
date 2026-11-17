/* =====================================================================
   SłupStal – projekt: stan domyślny, migracja danych i pełny przebieg
   obliczeń: profil normowy → przekrój i materiał → model i analiza
   I rzędu przypadków → kombinacje (PN-EN 1990) → analiza globalna
   (I rząd / II rząd z imperfekcją przechyłową / II rząd z imperfekcjami
   przechyłową i łukową) → nośność przekroju (6.2) na całej wysokości →
   stateczność (6.3) → metoda ogólna (opcjonalnie) → SGU → podstawa
   (PN-EN 1993-1-8) → pożar → kruche pękanie → klasa wykonania.
   Wynik zawiera wszystkie wielkości pośrednie (tok obliczeń w raporcie).
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, N = BS.N, M = BS.M, P = BS.P, S = BS.S, K = BS.K, R = BS.R, T = BS.T, X = BS.X, PB = BS.PB;
const J = BS.J = {};

J.SCHEMATY = [
  { id: 'hala', n: 'Słup hali: utwierdzony w płaszczyźnie ramy (M_y), przegubowy i stężony u góry z płaszczyzny', dol: { y: 'utw', z: 'prz' }, gora: { y: 'swob', z: 'prz' } },
  { id: 'wspornik', n: 'Wspornik w obu płaszczyznach (utwierdzenie u podstawy, wierzchołek swobodny)', dol: { y: 'utw', z: 'utw' }, gora: { y: 'swob', z: 'swob' } },
  { id: 'pp', n: 'Przegubowy na obu końcach w obu płaszczyznach (rama stężona)', dol: { y: 'prz', z: 'prz' }, gora: { y: 'prz', z: 'prz' } },
  { id: 'up', n: 'Utwierdzony u podstawy, przegubowy nieprzesuwny u góry', dol: { y: 'utw', z: 'utw' }, gora: { y: 'prz', z: 'prz' } },
  { id: 'uu', n: 'Utwierdzony na obu końcach (nieprzesuwny)', dol: { y: 'utw', z: 'utw' }, gora: { y: 'utw', z: 'utw' } },
  { id: 'rama', n: 'Słup ramy przechyłowej z ryglem sztywnym (M_y), stężony z płaszczyzny', dol: { y: 'utw', z: 'prz' }, gora: { y: 'utwp', z: 'prz' } }
];

J.defaultState = function () {
  return {
    format: BS.FORMAT,
    meta: { nazwa: 'Słup S-1', obiekt: 'Hala magazynowa – słup ramy w osi 2', projektant: '', sprawdzajacy: '', nrUprawnien: '', data: '', opis: 'Słup hali utwierdzony w fundamencie w płaszczyźnie ramy (zginanie od wiatru względem osi y–y), w płaszczyźnie ściany podłużnej przegubowy, u góry stężony stężeniem ściennym, w połowie wysokości stężony ryglem ściennym przy pasie zewnętrznym.' },
    normy: N.defaultProfile(),
    schemat: 'hala',
    geom: { H: 6.0 },
    podpory: { dol: { y: 'utw', z: 'prz', kry: '', krz: '', skret: 'widelki' }, gora: { y: 'swob', z: 'prz', khy: '', khz: '', skret: 'widelki' } },
    stezenia: [{ x: 3.0, pl: 'z', wys: 'pas+', skret: false }],
    przekroj: { typ: 'walc', seria: 'HEA', nr: 280 },
    material: { gatunek: 'S355', podgatunek: 'J2', fyRecz: '' },
    ciezarWlasny: { auto: true, dodatek: 10 },
    obciazenia: [
      { id: 'G1', nazwa: 'Przekrycie dachu i dźwigar (reakcja)', rodzaj: 'G', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 85, ey: 0, ez: 0 }] },
      { id: 'G2', nazwa: 'Obudowa ścienna (płyty warstwowe, rygle)', rodzaj: 'G', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 12, ey: 0, ez: 150 }] },
      { id: 'S1', nazwa: 'Śnieg na dachu (reakcja dźwigara)', rodzaj: 'S', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 68, ey: 0, ez: 0 }] },
      { id: 'W1', nazwa: 'Wiatr – parcie na ścianę (+ reakcja z dachu)', rodzaj: 'W', wyklucz: 'W', aktywne: true, sklad: [{ typ: 'q', kier: 'z', q0: 3.4, q1: '', x0: '', x1: '', wys: 'srodek' }, { typ: 'H', x: '', kier: 'z', F: 3.5, wys: 'srodek' }] },
      { id: 'W2', nazwa: 'Wiatr – ssanie (+ reakcja z dachu)', rodzaj: 'W', wyklucz: 'W', aktywne: true, sklad: [{ typ: 'q', kier: 'z', q0: -2.1, q1: '', x0: '', x1: '', wys: 'srodek' }, { typ: 'H', x: '', kier: 'z', F: -2.5, wys: 'srodek' }, { typ: 'N', x: '', F: -18, ey: 0, ez: 0 }] }
    ],
    analiza: { metoda: 'II_glob', imp: { m: 1, phi: '', e0y: '', e0z: '', pomin015: true }, interMet: 'ndp', ogolna: false,
      nadp: { LcrY: '', LcrZ: '', LcrT: '', muY: '', muZ: '', krzY: 'auto', krzZ: 'auto', krzLT: 'auto', Mcr: '', Cmy: '', Cmz: '', CmLT: '', kc: '' } },
    sgu: { typ: 'hala', lim: 150, limZ: 150 },
    podstawa: { aktywna: true, typ: 'sztywna', lp: 480, bp: 360, tp: 35, gat: 'S235', kotwy: { d: 'M30', kl: '8.8', uklad: 'zew', ez: 55, w: 260, n: 4, p: '' }, beton: 'C25/30', podlewka: 30, aF: 1200, bF: 1400, hF: 800, kjRecz: '', spoiny: { pas: 10, srodnik: 5 }, scinanieKotwy: true, podatna: true },
    pozar: { aktywny: false, R: 30, ekspozycja: '4', ochrona: 'brak', dp: 20, lp: 0.12, cp: 1200, rp: 300, LcrFi: 1.0 },
    kruche: { Tmd: -25, dTr: 0 },
    wykonanie: { CC: 'CC2', EXC: 'auto', uzasadnienie: '', korozja: 'C3', trwalosc: 'M', uwagi: '' },
    design: { eta: 100 }
  };
};

J.normalize = function (st) {
  const d = J.defaultState();
  const o = Object.assign({}, d, st || {});
  ['meta', 'geom', 'material', 'ciezarWlasny', 'analiza', 'sgu', 'podstawa', 'pozar', 'kruche', 'wykonanie', 'design', 'przekroj'].forEach(k => { o[k] = Object.assign({}, d[k], (st || {})[k] || {}); });
  o.podpory = { dol: Object.assign({}, d.podpory.dol, ((st || {}).podpory || {}).dol || {}), gora: Object.assign({}, d.podpory.gora, ((st || {}).podpory || {}).gora || {}) };
  o.analiza.imp = Object.assign({}, d.analiza.imp, ((st || {}).analiza || {}).imp || {});
  o.analiza.nadp = Object.assign({}, d.analiza.nadp, ((st || {}).analiza || {}).nadp || {});
  o.podstawa.kotwy = Object.assign({}, d.podstawa.kotwy, ((st || {}).podstawa || {}).kotwy || {});
  o.podstawa.spoiny = Object.assign({}, d.podstawa.spoiny, ((st || {}).podstawa || {}).spoiny || {});
  o.normy = Object.assign(N.defaultProfile(), (st || {}).normy || {});
  const dp = N.defaultProfile();
  o.normy.zestawy = { 1: Object.assign({}, dp.zestawy[1], ((st || {}).normy || {}).zestawy ? st.normy.zestawy[1] : {}), 2: Object.assign({}, dp.zestawy[2], ((st || {}).normy || {}).zestawy ? st.normy.zestawy[2] : {}) };
  o.normy.ndp1 = Object.assign({}, dp.ndp1, ((st || {}).normy || {}).ndp1 || {});
  ['obciazenia', 'stezenia'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
  o.format = BS.FORMAT;
  return o;
};
J.hash = (st) => U.sha256(U.canon(st));
J.applyScheme = function (st, id) {
  const s = J.SCHEMATY.find(q => q.id === id); if (!s) return;
  Object.assign(st.podpory.dol, s.dol); Object.assign(st.podpory.gora, s.gora); st.schemat = id;
};
J.schemeOf = function (st) {
  const p = st.podpory;
  const s = J.SCHEMATY.find(q => q.dol.y === p.dol.y && q.dol.z === p.dol.z && q.gora.y === p.gora.y && q.gora.z === p.gora.z);
  return s ? s.id : 'wlasny';
};

const fmtCombo = (c) => c ? c.opis : '';
const kNs = (v) => U.fmt(v / 1e3, 1) + ' kN', kNms = (v) => U.fmt(v / 1e6, 1) + ' kNm';

/* ================================================================ OBLICZENIA */
J.run = function (st0, opt) {
  opt = opt || {};
  const t0 = Date.now();
  const st = J.normalize(st0);
  const out = { errors: [], warnings: [], checks: [], info: [], engine: BS.ENGINE, version: BS.VERSION, hash: J.hash(st0), st };
  const err = (m) => out.errors.push(m), wrn = (m) => out.warnings.push(m);
  // --- profil normowy
  const nrm = N.ocen(st); out.norm = nrm;
  nrm.bledy.forEach(err);
  if (nrm.genStosowana !== 1 || !N.SILNIK[nrm.genStosowana]) { err('Silnik nie obsługuje stosowanej generacji – obliczenia przerwane.'); return out; }
  const ndp = Object.assign({}, nrm.ndp); out.ndp = ndp;
  ['gG_sup', 'gG_inf', 'gQ', 'xi', 'gG_sup_equ', 'gG_inf_equ', 'gQ_equ', 'KFI', 'gM0', 'gM1', 'gM2', 'gM3', 'lamLT0', 'betaLT', 'eta', 'phi0', 'alfaCr', 'HV015', 'Cfd', 'k2', 'gMfi', 'dTR', 'gc', 'acc', 'betaJ'].forEach(k => { ndp[k] = U.num(ndp[k]); });
  // --- przekrój i materiał
  let sec;
  try { const g = P.geom(st.przekroj); const ge = P.validate(g); if (ge.length) { ge.forEach(err); return out; } sec = P.props(g); }
  catch (e) { err('Przekrój: ' + e.message); return out; }
  out.sec = sec;
  const gat = st.material.gatunek, pod = st.material.podgatunek;
  if (!M.STAL[gat]) { err('Nieznany gatunek stali.'); return out; }
  const fyr = M.fy(gat, sec.tMax, ndp.fySrc);
  if (fyr.poza) wrn('Grubość ścianki > 80 mm – poza zakresem tablicy 3.1 PN-EN 1993-1-1.');
  const fyMan = U.num(st.material.fyRecz, 0) > 0 ? U.num(st.material.fyRecz) : null;
  const mat = { gatunek: gat, podgatunek: pod, fy: fyMan || fyr.fy, fu: fyr.fu, zr: fyMan ? `przyjęto ręcznie f_y = ${U.fmt(fyMan, 0)} MPa (np. wg świadectwa odbioru) – tablicowo ${fyr.fy} MPa` : fyr.zr, fyTab: fyr.fy, manual: !!fyMan, tMax: sec.tMax, E: U.E, G: U.G };
  if (fyMan && fyMan > fyr.fy * 1.0001) wrn(`Przyjęto f_y = ${U.fmt(fyMan, 0)} MPa większe od wartości nominalnej ${fyr.fy} MPa – wymaga udokumentowania (PN-EN 1993-1-1, 3.2.1).`);
  out.mat = mat;
  let base;
  try { base = R.basic(sec, mat, ndp); } catch (e) { err('Przekrój: ' + e.message); return out; }
  out.base = base;
  if (base.effErr) err('Przekrój: ' + base.effErr);
  // --- podatność podstawy w modelu (S_j,ini z metody składnikowej, czyste zginanie – dolne oszacowanie)
  out.baseSpring = null;
  if (st.podstawa && st.podstawa.aktywna && st.podstawa.typ === 'sztywna' && st.podstawa.podatna && sec.kind !== 'CHS') {
    try {
      const C0 = PB.components(st, sec, base, ndp);
      if (!C0.err.length && C0.stiff) {
        const s0 = C0.stiff, Sj0 = U.E * s0.z * s0.z / (1 / s0.kT + 1 / s0.kC);
        ['y', 'z'].forEach(pl => {
          if (pl === 'y' && st.podpory.dol.y === 'utw') { st.podpory.dol.y = 'spr'; st.podpory.dol.kry = Sj0 / 1e6; out.baseSpring = { pl, Sj: Sj0 }; }
        });
      }
    } catch (e) { /* bez podatności */ }
  }
  // --- model i analiza I rzędu
  const md = S.model(st, sec); out.md = md;
  md.err.forEach(err); md.warn.forEach(wrn);
  if (out.errors.length) return out;
  let an;
  try { an = S.analyze(md, sec); } catch (e) { err('Analiza statyczna: ' + e.message); return out; }
  out.an = an;
  const gk = K.generate(md, ndp, { pozar: !!st.pozar.aktywny });
  gk.warn.forEach(wrn);
  const combos = gk.list; out.combos = combos;
  const sgn = combos.filter(c => c.typ === 'SGN' || c.typ === 'wyj');
  if (!sgn.length) { err('Brak kombinacji SGN – dodaj obciążenia.'); return out; }
  const xs3 = an.xs3, ns = an.ns, H = md.H;
  // --- metoda analizy i imperfekcje
  const A = st.analiza, method = ['I', 'II_glob', 'II_pelna'].includes(A.metoda) ? A.metoda : 'II_glob';
  out.method = method;
  const imp = S.phiSway(md, ndp, A.imp || {});
  const fl = T.curveFlex(sec, mat.fy);
  const ovK = A.nadp || {};
  const curveOf = (pl) => (ovK['krz' + pl.toUpperCase()] && ovK['krz' + pl.toUpperCase()] !== 'auto' ? ovK['krz' + pl.toUpperCase()] : fl[pl]);
  const e0L = { y: 0, z: 0 }, e0Src = {};
  ['y', 'z'].forEach(pl => {
    const man = U.num((A.imp || {})['e0' + pl], 0);
    if (man > 0) { e0L[pl] = man; e0Src[pl] = `przyjęto ręcznie e₀ = L/${U.fmt(man, 0)}`; }
    else { e0L[pl] = S.E0L[curveOf(pl)]; e0Src[pl] = `tabl. 5.1 – krzywa ${curveOf(pl)}, analiza sprężysta: e₀/L = 1/${S.E0L[curveOf(pl)]}`; }
  });
  out.imp = { phi: imp, e0L, e0Src, curves: { y: curveOf('y'), z: curveOf('z') }, bow: { y: S.bowSegments(md, 'y'), z: S.bowSegments(md, 'z') } };
  if (method !== 'II_pelna') { out.imp.e0Used = false; }
  // --- cache MES
  const cache = { ncr: {}, mcr: {}, c1: {} };
  const reg = {};
  const rec = (key, o) => { if (!reg[key] || o.util > reg[key].util) reg[key] = o; };
  // obwiednie
  const env = { Nmax: new Float64Array(ns).fill(-Infinity), Nmin: new Float64Array(ns).fill(Infinity), My: { max: new Float64Array(ns).fill(-Infinity), min: new Float64Array(ns).fill(Infinity) }, Mz: { max: new Float64Array(ns).fill(-Infinity), min: new Float64Array(ns).fill(Infinity) }, Vy: { max: new Float64Array(ns).fill(-Infinity), min: new Float64Array(ns).fill(Infinity) }, Vz: { max: new Float64Array(ns).fill(-Infinity), min: new Float64Array(ns).fill(Infinity) }, uSec: new Float64Array(ns) };
  const upd = (a, v) => { for (let i = 0; i < ns; i++) { if (v[i] > a.max[i]) a.max[i] = v[i]; if (v[i] < a.min[i]) a.min[i] = v[i]; } };
  const res = []; out.res = res;
  const baseForces = [];
  let alphaMin = { y: Infinity, z: Infinity, T: Infinity, combo: null };
  const neglect015 = (A.imp || {}).pomin015 !== false;
  sgn.forEach((c, ci) => {
    const c1 = S.combine1(md, an, c);
    const Nbase = c1.N[0];
    // α_cr – postać przechyłowa (rzeczywiste warunki brzegowe)
    const ncS = T.ncrAll(md, sec, c1.Nel, false, cache.ncr);
    const aC = { y: ncS.Nmax > 0 ? ncS.y.alpha / ncS.Nmax : Infinity, z: ncS.Nmax > 0 ? ncS.z.alpha / ncS.Nmax : Infinity, T: ncS.Nmax > 0 && ncS.T ? ncS.T.alpha / ncS.Nmax : Infinity };
    if (Math.min(aC.y, aC.z) < Math.min(alphaMin.y, alphaMin.z)) alphaMin = { y: aC.y, z: aC.z, T: aC.T, combo: c };
    // warianty imperfekcji
    const phiAct = { y: false, z: false }, hv = {};
    ['y', 'z'].forEach(pl => {
      const HEd = Math.abs((c1[pl].R.A || { R: 0 }).R), VEd = Math.max(0, Nbase);
      hv[pl] = { HEd, VEd, r: VEd > 0 ? HEd / VEd : Infinity };
      phiAct[pl] = method !== 'I' && md.sway[pl] && !(neglect015 && VEd > 0 && HEd >= ndp.HV015 * VEd);
    });
    let variants = [];
    if (method === 'I') variants = [{ F: c1, lab: 'analiza I rzędu' }];
    else {
      const planes = ['y', 'z'].filter(pl => phiAct[pl] || method === 'II_pelna');
      const sgnB0 = { y: Math.sign(S.maxAbs(c1.y.w).v) || 1, z: Math.sign(S.maxAbs(c1.z.w).v) || 1 };
      const runs = planes.length ? planes.flatMap(pl => [1, -1].map(s => ({ pl, s }))) : [{ pl: null, s: 1 }];
      runs.forEach(v => {
        const o = { phi: imp.phi, e0L: method === 'II_pelna' ? e0L : null, var: v.pl && phiAct[v.pl] ? v : (v.pl ? { pl: v.pl, s: v.s, noPhi: true } : null) };
        if (o.var && o.var.noPhi) o.phi = 0;
        o.sgnB = { y: v.pl === 'y' ? v.s : sgnB0.y, z: v.pl === 'z' ? v.s : sgnB0.z };
        const F2 = S.combine2(md, an, sec, c, o);
        if (F2.err) { err(`Kombinacja ${c.id}: ${F2.err}`); return; }
        const lab = (v.pl ? (phiAct[v.pl] ? `φ w płaszczyźnie ${S.PLS[v.pl]} (${v.s > 0 ? '+' : '−'})` : `łuk e₀ (${v.s > 0 ? '+' : '−'}) w płaszczyźnie ${S.PLS[v.pl]}`) : 'bez imperfekcji przechyłowej') + (method === 'II_pelna' ? ' + łuki e₀ w obu płaszczyznach' : '');
        variants.push({ F: F2, lab, v });
      });
      if (!variants.length) variants = [{ F: c1, lab: 'I rząd (błąd II rzędu)' }];
    }
    const cr = { combo: c, ci, c1, aC, hv, phiAct, variants: [] };
    variants.forEach((vr, vi) => {
      const F = vr.F;
      upd({ max: env.Nmax, min: env.Nmin }, F.N);
      upd(env.My, F.y.M); upd(env.Mz, F.z.M); upd(env.Vz, F.y.V); upd(env.Vy, F.z.V);
      // ---- nośność przekroju na całej wysokości
      const iMy = S.maxAbs(F.y.M).i, iMz = S.maxAbs(F.z.M).i;
      let iN = 0; for (let i = 0; i < ns; i++) if (F.N[i] > F.N[iN]) iN = i;
      const cx = R.ctx(sec, base, F.N[iN], iMy >= 0 ? F.y.M[iMy] : 0, iMz >= 0 ? F.z.M[iMz] : 0);
      let best = null;
      for (let i = 0; i < ns; i++) {
        const e = { N: F.N[i], My: F.y.M[i], Mz: F.z.M[i], Vy: F.z.V[i], Vz: F.y.V[i] };
        const p = R.atPoint(sec, base, ndp, e, cx);
        if (p.u > env.uSec[i]) env.uSec[i] = p.u;
        if (!best || p.uMN > best.p.uMN) best = { p, i, e };
        rec('N', { util: p.uN, x: xs3[i], combo: c, vr: vr.lab, p, e, cx });
        rec('MN', { util: p.uMN, x: xs3[i], combo: c, vr: vr.lab, p, e, cx });
        rec('Vz', { util: p.uVz, x: xs3[i], combo: c, vr: vr.lab, p, e, cx });
        rec('Vy', { util: p.uVy, x: xs3[i], combo: c, vr: vr.lab, p, e, cx });
      }
      // ---- stateczność
      let mem = null;
      try { mem = T.member({ md, an, sec, base, ndp, st, combo: c, Fd: F, F1: c1, method, cache }); }
      catch (e) { err(`Stateczność (${c.id}): ${e.message}`); }
      if (mem) {
        const fy1 = mem.flex.y, fz1 = mem.flex.z;
        const NEd = mem.Nmax;
        if (NEd > 0 && method !== 'II_pelna') {
          rec('By', { util: NEd / fy1.NbRd, combo: c, vr: vr.lab, mem, NEd, f: fy1 });
          rec('Bz', { util: NEd / fz1.NbRd, combo: c, vr: vr.lab, mem, NEd, f: fz1 });
        }
        if (NEd > 0 && mem.tors.relevant && isFinite(mem.tors.Ncr) && method !== 'II_pelna' || NEd > 0 && mem.tors.relevant && method === 'II_pelna' && mem.tors.chi < 1) rec('BT', { util: NEd / mem.tors.NbRd, combo: c, vr: vr.lab, mem, NEd, f: mem.tors });
        mem.segs.forEach((s, si) => {
          if (mem.ltbSus && s.MyEd > 1e3 && !s.ltb.none) rec('LT' + si, { util: (s.MyEd + s.dMy) / s.MbRd, combo: c, vr: vr.lab, mem, s });
          rec('I61_' + si, { util: s.u61, combo: c, vr: vr.lab, mem, s });
          rec('I62_' + si, { util: s.u62, combo: c, vr: vr.lab, mem, s });
        });
      }
      // ---- siły u podstawy (podstawa słupa)
      const b0 = { N: F.N[0], My: F.y.M[0], Mz: F.z.M[0], Vz: F.y.V[0], Vy: F.z.V[0], combo: c, vr: vr.lab };
      baseForces.push(b0);
      cr.variants.push({ lab: vr.lab, F, best, mem, cx });
    });
    res.push(cr);
  });
  out.env = env; out.alphaMin = alphaMin; out.baseForces = baseForces;
  // ---------------------------------------------------------------- rejestr sprawdzeń – SGN
  const G1 = 'Nośność przekroju (PN-EN 1993-1-1, 6.2)', G2 = 'Stateczność elementu (PN-EN 1993-1-1, 6.3)', G0 = 'Analiza globalna (PN-EN 1993-1-1, 5.2–5.3)';
  // analiza globalna – α_cr
  const aMin = Math.min(alphaMin.y, alphaMin.z);
  const swayAny = md.sway.y || md.sway.z;
  out.checks.push(BS.check({ id: 'acr', grp: G0, n: `Mnożnik obciążenia krytycznego α_cr (postać ${swayAny ? 'przechyłowa' : 'giętna'})`, ref: '5.2.1(3)', Ed: ndp.alfaCr, Rd: aMin, unit: '-', util: isFinite(aMin) ? ndp.alfaCr / aMin : 0, info: true,
    forceStatus: method === 'I' && swayAny && aMin < ndp.alfaCr ? 'warn' : 'ok', combo: fmtCombo(alphaMin.combo), d: { alphaMin, method, swayAny } }));
  if (method === 'I' && swayAny && aMin < ndp.alfaCr) wrn(`α_cr = ${U.fmt(aMin, 2)} < ${U.fmt(ndp.alfaCr, 0)} – w ustroju przechyłowym efekty II rzędu są istotne. Analiza I rzędu jest dopuszczalna tylko z długościami wyboczeniowymi z postaci przechyłowej (5.2.2(8)); zalecana metoda: analiza II rzędu z imperfekcjami (Analiza → metoda).`);
  if (aMin < 3 && method !== 'II_pelna') wrn(`α_cr = ${U.fmt(aMin, 2)} < 3 – zalecana pełna analiza II rzędu z imperfekcjami globalnymi i łukowymi (5.2.2(6)).`);
  if (aMin <= 1) err(`α_cr = ${U.fmt(aMin, 2)} ≤ 1 – obciążenie przekracza sprężyste obciążenie krytyczne słupa (utrata stateczności).`);
  // nośność przekroju
  const recSec = (key, n, ref, Ed, Rd, unit) => { const q = reg[key]; if (!q) return; out.checks.push(BS.check({ id: key, grp: G1, n: typeof n === 'function' ? n(q) : n, ref: typeof ref === 'function' ? ref(q) : ref, Ed: Ed(q), Rd: Rd(q), unit, util: q.util, x: q.x, combo: fmtCombo(q.combo) + (q.vr && method !== 'I' ? ` · ${q.vr}` : ''), d: q })); };
  recSec('N', q => q.e.N >= 0 ? 'Ściskanie – nośność przekroju' : 'Rozciąganie – nośność przekroju', q => q.e.N >= 0 ? '6.2.4' : '6.2.3', q => Math.abs(q.e.N), q => q.e.N >= 0 ? base.Nc : base.Npl, 'F');
  recSec('MN', q => q.p.cls >= 3 ? `Zginanie z siłą podłużną – naprężenia (kl. ${q.p.cls})` : q.p.biax ? 'Zginanie dwukierunkowe z siłą podłużną (kl. ' + q.p.cls + ')' : 'Zginanie z siłą podłużną (kl. ' + q.p.cls + ')', q => q.p.cls >= 3 ? `6.2.9.2 (${q.p.f})` : `6.2.9.1 (${q.p.f})`, q => q.p.uMN, () => 1, '-');
  recSec('Vz', 'Ścinanie V_z (siła wzdłuż osi z)', '6.2.6', q => Math.abs(q.e.Vz), () => base.Vplz, 'F');
  recSec('Vy', 'Ścinanie V_y (siła wzdłuż osi y)', '6.2.6', q => Math.abs(q.e.Vy), () => base.Vply, 'F');
  // wyboczenie środnika przy ścinaniu
  if (sec.kind === 'I' || sec.kind === 'RHS') {
    const sb = R.shearBuckling(sec, base, ndp, {});
    out.sb = sb;
    if (sb.need && reg.Vz) out.checks.push(BS.check({ id: 'Vb', grp: G1, n: 'Wyboczenie środnika przy ścinaniu', ref: 'PN-EN 1993-1-5, 5.2', Ed: Math.abs(reg.Vz.e.Vz), Rd: sb.Vb, unit: 'F', util: Math.abs(reg.Vz.e.Vz) / sb.Vb, x: reg.Vz.x, combo: fmtCombo(reg.Vz.combo), d: { sb, q: reg.Vz } }));
  }
  // stateczność
  if (reg.By) out.checks.push(BS.check({ id: 'By', grp: G2, n: 'Wyboczenie giętne względem osi y–y', ref: '6.3.1', Ed: reg.By.NEd, Rd: reg.By.f.NbRd, unit: 'F', util: reg.By.util, combo: fmtCombo(reg.By.combo), d: reg.By }));
  if (reg.Bz) out.checks.push(BS.check({ id: 'Bz', grp: G2, n: 'Wyboczenie giętne względem osi z–z', ref: '6.3.1', Ed: reg.Bz.NEd, Rd: reg.Bz.f.NbRd, unit: 'F', util: reg.Bz.util, combo: fmtCombo(reg.Bz.combo), d: reg.Bz }));
  if (reg.BT) out.checks.push(BS.check({ id: 'BT', grp: G2, n: reg.BT.f.tfGov ? 'Wyboczenie giętno-skrętne (sprzężone u–φ)' : 'Wyboczenie skrętne', ref: '6.3.1.4', Ed: reg.BT.NEd, Rd: reg.BT.f.NbRd, unit: 'F', util: reg.BT.util, combo: fmtCombo(reg.BT.combo), d: reg.BT }));
  const segN = (s) => md.stez.length || T.segLT(md).length > 1 ? ` – odcinek ${U.fmt(s.sg.x0 / 1000, 2)}–${U.fmt(s.sg.x1 / 1000, 2)} m` : '';
  Object.keys(reg).filter(k => /^LT\d+$/.test(k)).forEach(k => { const q = reg[k]; out.checks.push(BS.check({ id: k, grp: G2, n: 'Zwichrzenie' + segN(q.s), ref: '6.3.2.1, ' + (q.s.met === '6.3.2.3' ? '6.3.2.3' : '6.3.2.2'), Ed: q.s.MyEd + q.s.dMy, Rd: q.s.MbRd, unit: 'M', util: q.util, x: q.s.xMy, combo: fmtCombo(q.combo) + (method !== 'I' ? ` · ${q.vr}` : ''), d: q })); });
  Object.keys(reg).filter(k => /^I6[12]_\d+$/.test(k)).sort().forEach(k => { const q = reg[k], is61 = /^I61/.test(k); out.checks.push(BS.check({ id: k, grp: G2, n: `Interakcja N + M_y + M_z (${is61 ? '6.61' : '6.62'}, zał. ${q.s.meth})` + segN(q.s), ref: '6.3.3 (' + (is61 ? '6.61' : '6.62') + '), zał. ' + q.s.meth, Ed: q.util, Rd: 1, unit: '-', util: q.util, combo: fmtCombo(q.combo) + (method !== 'I' ? ` · ${q.vr}` : ''), d: q })); });
  // ---------------------------------------------------------------- metoda ogólna 6.3.4
  if (A.ogolna) {
    const maxMz = Math.max(Math.abs(Math.max(...env.Mz.max)), Math.abs(Math.min(...env.Mz.min)));
    if (sec.kind !== 'I') out.info.push('Metoda ogólna 6.3.4 – pominięta: przekrój zamknięty (nie podlega zwichrzeniu).');
    else if (maxMz > 0.02 * base.Mcz) out.info.push('Metoda ogólna 6.3.4 – nie dotyczy: występuje zginanie M_z (metoda dotyczy elementów obciążonych w płaszczyźnie).');
    else {
      let g = null;
      sgn.forEach(c => {
        const c1 = S.combine1(md, an, c);
        const o = { phi: imp.phi, e0L: { y: e0L.y, z: 0 }, var: md.sway.y ? { pl: 'y', s: Math.sign(S.maxAbs(c1.y.w).v) || 1 } : { pl: 'y', s: Math.sign(S.maxAbs(c1.y.w).v) || 1 }, sgnB: { y: Math.sign(S.maxAbs(c1.y.w).v) || 1, z: 1 } };
        if (!md.sway.y) o.phi = 0;
        const Fk = S.combine2(md, an, sec, c, o); if (Fk.err) return;
        try { const r = T.general({ md, an, sec, base, ndp, Fk, combo: c, F1: c1 }); if (!g || r.u > g.u) g = Object.assign(r, { combo: c }); } catch (e) { out.info.push('Metoda ogólna: ' + e.message); }
      });
      if (g) { out.general = g; out.checks.push(BS.check({ id: 'GM', grp: 'Metoda ogólna (PN-EN 1993-1-1, 6.3.4)', n: 'Stateczność z płaszczyzny – metoda ogólna', ref: '6.3.4 (6.63)', Ed: 1, Rd: g.chiOp * g.aUlt / ndp.gM1, unit: '-', util: g.u, x: g.at, combo: fmtCombo(g.combo), d: g })); }
    }
  }
  // ---------------------------------------------------------------- SGU – przemieszczenia poziome
  const sgu = { y: null, z: null };
  const limY = U.num(st.sgu.lim, 150), limZ = U.num(st.sgu.limZ, limY);
  combos.filter(c => c.typ === 'char').forEach(c => {
    let F;
    if (method === 'I') F = S.combine1(md, an, c);
    else { F = S.combine2(md, an, sec, c, { phi: 0, e0L: null, var: null }); if (F.err) F = S.combine1(md, an, c); }
    ['y', 'z'].forEach(pl => {
      const w = F[pl].w; const mx = S.maxAbs(w, xs3, 0, H);
      if (!sgu[pl] || Math.abs(mx.v) > Math.abs(sgu[pl].w)) sgu[pl] = { w: mx.v, x: mx.x, combo: c, wTop: S.at(xs3, w, H), order: F.order };
    });
  });
  out.sgu = sgu;
  ['y', 'z'].forEach(pl => {
    const q = sgu[pl]; if (!q || Math.abs(q.w) < 1e-3) return;
    const lim = pl === 'y' ? limY : limZ, wLim = H / lim;
    out.checks.push(BS.check({ id: 'w' + pl, grp: 'SGU – przemieszczenia poziome (PN-EN 1990, A1.4.3; PN-EN 1993-1-1, 7.2)', n: `Przemieszczenie poziome – ${S.PLS[pl]}${pl === 'y' ? ' (w kierunku z)' : ' (w kierunku y)'}`, ref: 'PN-EN 1990 A1.4.3; PN-EN 1993-1-1 7.2.2', Ed: Math.abs(q.w), Rd: wLim, unit: 'mm', util: Math.abs(q.w) / wLim, x: q.x, combo: fmtCombo(q.combo), d: Object.assign({ lim, wLim, pl }, q) }));
  });
  // ---------------------------------------------------------------- podstawa słupa
  if (st.podstawa && st.podstawa.aktywna) {
    let C = null;
    try { C = PB.components(st, sec, base, ndp); } catch (e) { err('Podstawa: ' + e.message); }
    if (C) {
      C.err.forEach(err); C.warn.forEach(wrn);
      out.pb = { C, worst: {} };
      if (!C.err.length) {
        const fixedModel = md.bc.dol.y === 'utw' || md.bc.dol.z === 'utw' || !!out.baseSpring;
        if (C.fixed && !fixedModel) wrn('Podstawa zaprojektowana jako utwierdzona, a w modelu podstawa jest przegubowa – sprawdź zgodność modelu.');
        if (!C.fixed && fixedModel) err('Model zakłada utwierdzenie podstawy, a podstawa jest zaprojektowana jako przegubowa – zmień typ podstawy na utwierdzoną lub warunek podparcia na przegub.');
        const W = {};
        const recB = (k, u, o) => { if (!W[k] || u > W[k].u) W[k] = Object.assign({ u }, o); };
        baseForces.forEach(f => {
          const r = PB.check(C, f, ndp, sec);
          recB('N', r.uN, { r, f }); recB('Nt', r.uNt, { r, f }); recB('M', r.uM, { r, f }); recB('V', r.uV, { r, f }); recB('TV', r.uTV, { r, f }); recB('Wf', r.uWf, { r, f }); recB('Ww', r.uWw, { r, f });
        });
        out.pb.worst = W;
        const GB = 'Podstawa słupa (PN-EN 1993-1-8)';
        const pc = (k, n, ref, Ed, Rd, unit) => { const q = W[k]; if (!q || !(q.u > 1e-9)) return; out.checks.push(BS.check({ id: 'PB' + k, grp: GB, n, ref, Ed: Ed(q), Rd: Rd(q), unit, util: q.u, combo: fmtCombo(q.f.combo) + (method !== 'I' ? ` · ${q.f.vr}` : ''), d: q })); };
        pc('N', 'Docisk do fundamentu – ściskanie osiowe (N_j,Rd)', '6.2.5, 6.2.8.2', q => q.r.N, () => C.NjRd, 'F');
        pc('Nt', 'Wyrywanie – blacha i kotwy rozciągane', '6.2.6.11, 6.2.6.12', q => -q.r.N, q => q.r.NtRd, 'F');
        if (C.fixed) pc('M', 'Nośność podstawy przy N + M (M_j,Rd)', '6.2.8.3, tabl. 6.7', q => q.u, () => 1, '-');
        pc('V', 'Ścinanie – tarcie i kotwy', '6.2.2(6)–(8)', q => q.r.V, q => q.r.FvRd, 'F');
        pc('TV', 'Kotwa – rozciąganie ze ścinaniem', 'tabl. 3.4', q => q.u, () => 1, '-');
        pc('Wf', 'Spoiny pasów słupa z blachą podstawy', '4.5.3.3', q => q.r.wf.fw, () => C.fvwd, 'MPa');
        pc('Ww', 'Spoiny środnika słupa z blachą podstawy (V_z)', '4.5.3.3', q => q.r.wf.fvz, () => C.fvwd, 'MPa');
        // sztywność
        if (C.fixed && W.M) {
          const Lc = md.H;
          const s1 = PB.stiffness(C, W.M.f.N, W.M.f.My, sec, Lc);
          out.pb.stiff = s1;
          if (s1) {
            const ok = md.bc.dol.y !== 'utw' || s1.rigid;
            s1.inModel = out.baseSpring;
            out.checks.push(BS.check({ id: 'PBS', grp: GB, n: `Sztywność podstawy S_j,ini = ${U.fmt(s1.Sj / 1e9, 1)} MNm/rad – ${s1.cls}${out.baseSpring ? ' (podatność uwzględniona w modelu)' : ''}`, ref: '6.3.4, 5.2.2.5(4)', Ed: s1.Sj, Rd: 30 * s1.EIL, unit: '-', util: s1.rigid ? 0 : 30 * s1.EIL / s1.Sj, info: true, forceStatus: ok ? 'ok' : 'warn', d: s1 }));
            if (!ok) wrn(`Podstawa podatna: S_j,ini = ${U.fmt(s1.Sj / 1e9, 2)} MNm/rad < 30·EI_c/L_c = ${U.fmt(30 * s1.EIL / 1e9, 2)} MNm/rad – w modelu przyjęto utwierdzenie. Rozważ: sprężynę obrotową w modelu (k = ${U.fmt(s1.Sj / 1e9, 2)} MNm/rad) lub sztywniejszą podstawę (grubsza blacha, żebra, większe kotwy).`);
          }
        }
      }
    }
  }
  // ---------------------------------------------------------------- pożar
  if (st.pozar.aktywny) {
    const fc = combos.filter(c => c.typ === 'poz');
    let worst = null;
    fc.forEach(c => {
      const c1 = S.combine1(md, an, c);
      let mem = null;
      try { mem = T.member({ md, an, sec, base, ndp, st, combo: c, Fd: c1, F1: c1, method: 'I', cache }); } catch (e) { return; }
      const kf = U.num(st.pozar.LcrFi, 1) || 1;
      let iN = 0; for (let i = 0; i < ns; i++) if (c1.N[i] > c1.N[iN]) iN = i;
      const shY = T.shape(xs3, c1.y.M, 0, H), shZ = T.shape(xs3, c1.z.M, 0, H);
      const sg0 = mem.segs.reduce((a, s) => (!a || s.MyEd > a.MyEd ? s : a), null);
      const Efi = { N: Math.max(0, c1.N[iN]), My: shY.Mmax, Mz: shZ.Mmax, lamY: mem.flex.y.lam * kf, lamZ: mem.flex.z.lam * kf, lamLT: sg0 ? sg0.lamLT : 0, ltb: !!(sg0 && !sg0.ltb.none), shY, shZ, shLT: sg0 ? sg0.shY : shY };
      const r = X.fire(sec, base, ndp, st.pozar, Efi);
      if (!worst || r.uR > worst.uR || r.thcr < worst.thcr) worst = Object.assign(r, { combo: c, Efi, mem });
    });
    if (worst) {
      out.fire = worst;
      out.checks.push(BS.check({ id: 'FI', grp: 'Pożar (PN-EN 1993-1-2)', n: `Odporność ogniowa R ${worst.Rreq} – temperatura stali θ_a ≤ θ_cr`, ref: '4.2.3.2, 4.2.3.5, 4.2.4', Ed: worst.thR, Rd: worst.thcr, unit: '°C', util: worst.thR / worst.thcr, combo: fmtCombo(worst.combo), d: worst }));
    } else if (st.pozar.aktywny) wrn('Pożar: brak kombinacji w sytuacji pożarowej.');
  }
  // ---------------------------------------------------------------- kruche pękanie
  {
    let rmax = 0, cK = null;
    combos.filter(c => c.typ === 'kruche').forEach(c => {
      const c1 = S.combine1(md, an, c);
      for (let i = 0; i < ns; i++) { const s = -c1.N[i] / sec.A + Math.abs(c1.y.M[i]) / Math.min(sec.Wel_t, sec.Wel_b) + Math.abs(c1.z.M[i]) / sec.Wel_z; const r = s / mat.fy; if (r > rmax) { rmax = r; cK = c; } }
    });
    const TEd = U.num(st.kruche.Tmd, -25) + U.num(st.kruche.dTr, 0) + U.num(ndp.dTR, 0);
    const ratio = Math.max(0.25, rmax);
    const tm = X.tmax(gat, pod, TEd, ratio);
    const tCol = sec.tMax;
    if (tm.err) wrn('Kruche pękanie: ' + tm.err);
    else {
      out.brittle = { TEd, ratio, rmax, tm, tCol, combo: cK };
      out.checks.push(BS.check({ id: 'KR', grp: 'Kruche pękanie (PN-EN 1993-1-10)', n: `Grubość ścianek słupa (${gat}${pod}, T_Ed = ${U.fmt(TEd, 0)} °C)`, ref: 'PN-EN 1993-1-10, 2.3, tabl. 2.1', Ed: tCol, Rd: tm.t, unit: 'mm', util: tCol / tm.t, combo: cK ? fmtCombo(cK) : 'σ_Ed ≤ 0,25·f_y(t)', d: out.brittle }));
      if (out.pb && out.pb.C && !out.pb.C.err.length) {
        const C = out.pb.C, gP = C.gat, podP = (st.podstawa.podgatunek || (M.STAL[gP] || { pod: ['JR'] }).pod.slice(-1)[0]);
        const tp2 = X.tmax(gP, podP, TEd, 0.75);
        if (!tp2.err) { out.brittle.plate = { tm: tp2, pod: podP, t: C.tp }; out.checks.push(BS.check({ id: 'KRP', grp: 'Kruche pękanie (PN-EN 1993-1-10)', n: `Grubość blachy podstawy (${gP}${podP}, σ_Ed = 0,75·f_y – bezpiecznie)`, ref: 'PN-EN 1993-1-10, tabl. 2.1', Ed: C.tp, Rd: tp2.t, unit: 'mm', util: C.tp / tp2.t, d: { tm: tp2, TEd } })); }
      }
    }
  }
  // ---------------------------------------------------------------- klasa wykonania
  out.exc = X.exc(st.wykonanie, { zmeczenie: false, spawana: sec.typ === 'spaw' || !!(st.podstawa && st.podstawa.aktywna), fy: mat.fy, gatunek: gat, podgatunek: pod, pozar: st.pozar.aktywny ? `R ${st.pozar.R}${st.pozar.ochrona !== 'brak' ? ` – ochrona ${st.pozar.ochrona === 'plyty' ? 'płytami' : 'natryskiem/farbą'} d_p = ${st.pozar.dp} mm` : ' – bez ochrony'}` : '', podstawa: st.podstawa && st.podstawa.aktywna ? 'kotwy osadzone wg szablonu montażowego; podlewka z zaprawy niskoskurczowej (f_ck,g ≥ 0,2·f_ck fundamentu); tolerancje osadzenia kotew i płaszczyzny podparcia wg PN-EN 1090-2, rozdz. 11' : '' });
  // ---------------------------------------------------------------- podsumowanie
  const real = out.checks.filter(c => !c.info && c.util !== null && isFinite(c.util));
  out.uMax = real.length ? Math.max(...real.map(c => c.util)) : 0;
  if (out.checks.some(c => !c.info && (c.util === Infinity || (c.util !== null && !isFinite(c.util))))) out.uMax = Infinity;
  out.time = Date.now() - t0;
  return out;
};


/* ================================================================ DOBÓR */
J.passes = function (R, eta, scope) {
  if (!R) return false;
  if (R.errors.some(e => !(scope === 'sec' && /^Podstawa|^Model zakłada/.test(e)))) return false;
  const lim = (eta || 100) / 100 + 1e-9;
  return R.checks.every(c => {
    if (c.info) return true;
    if (scope === 'sec' && (/^Podstawa/.test(c.grp) || c.id === 'KRP')) return true;
    if (scope === 'base' && !/^Podstawa/.test(c.grp) && c.id !== 'KRP') return true;
    return c.util !== null && isFinite(c.util) && c.util <= lim;
  });
};
J.secCandidates = function (st) {
  const d = st.przekroj, typ = d.typ;
  if (typ === 'walc') return P.lista(d.seria).map(nr => ({ typ, seria: d.seria, nr }));
  if (typ === 'rura') { if (d.seria === 'wlasna') return []; return P.lista(d.seria).map(nr => ({ typ, seria: d.seria, nr, wyk: d.wyk })); }
  if (typ === 'chs') { if (d.seria === 'wlasna') return []; return P.lista('CHS').map(nr => ({ typ, seria: 'CHS', nr, wyk: d.wyk })); }
  if (typ === 'spaw') {
    const out = [], h = U.num(d.h), b = U.num(d.bg), bd = U.num(d.bd || d.bg);
    [8, 10, 12, 15, 16, 18, 20, 22, 25, 28, 30, 35, 40].forEach(tf => [6, 8, 10, 12, 14, 16, 20].forEach(tw => { if (tw <= tf + 4 && 2 * tf < h) out.push(Object.assign({}, d, { tg: tf, td: tf * (U.num(d.td) / Math.max(1, U.num(d.tg)) || 1), tw })); }));
    void b; void bd;
    return out;
  }
  return [];
};
J.massOf = (d) => { try { return P.props(d).masa; } catch (e) { return Infinity; } };
// dobór przekroju: najlżejszy kształtownik serii spełniający wszystkie warunki (bez podstawy) z wytężeniem ≤ η
J.designSection = function (st0, eta) {
  const st = U.clone(st0); if (!(st.podstawa && st.podstawa.podatna && st.podstawa.typ === 'sztywna')) st.podstawa = Object.assign({}, st.podstawa, { aktywna: false }); st.analiza = Object.assign({}, st.analiza, { ogolna: false });
  const cand = J.secCandidates(st).map(d => ({ d, m: J.massOf(d) })).filter(c => isFinite(c.m)).sort((a, b) => a.m - b.m);
  if (!cand.length) return { err: 'Brak katalogu do doboru (wymiary dowolne) – zmień rodzaj lub serię przekroju.' };
  const memo = {};
  const ok = (i) => { if (memo[i] !== undefined) return memo[i]; const s2 = U.clone(st); s2.przekroj = cand[i].d; let r; try { r = J.run(s2); } catch (e) { r = null; } memo[i] = J.passes(r, eta, 'sec'); return memo[i]; };
  let lo = 0, hi = cand.length - 1;
  if (!ok(hi)) return { err: `Żaden kształtownik ${st.przekroj.typ === 'walc' ? 'serii ' + st.przekroj.seria : 'tego rodzaju'} nie spełnia warunków przy wytężeniu ≤ ${eta}%.` };
  while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (ok(m)) hi = m; else lo = m + 1; }
  // sprawdzenie lżejszych (brak ścisłej monotoniczności – np. klasa przekroju)
  for (let i = Math.max(0, lo - 3); i < lo; i++) if (ok(i)) { lo = i; break; }
  return { d: cand[lo].d, masa: cand[lo].m, n: Object.keys(memo).length };
};
// dobór podstawy: najmniejsza masa blachy (+ koszt kotew) spełniająca warunki dla sił z bieżących wyników
J.designBase = function (st, R, eta) {
  if (!R || !R.sec || !R.base || !R.baseForces) return { err: 'Brak wyników analizy – usuń błędy danych.' };
  const sec = R.sec, ndp = R.ndp, lim = (eta || 100) / 100;
  const o = st.podstawa, fixed = o.typ === 'sztywna' && sec.kind !== 'CHS';
  const h = sec.h, b = sec.kind === 'I' ? Math.max(sec.bg, sec.bd) : sec.b;
  const ds = ['M16', 'M20', 'M24', 'M27', 'M30', 'M36', 'M42', 'M48'], kls = ['5.6', '8.8'];
  const tps = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80];
  let best = null;
  const forces = R.baseForces;
  ds.forEach(dn => kls.forEach(kl => {
    const d = BS.M.SRUBY[dn].d, d0 = BS.M.d0Kotwy(d), ez = Math.max(50, Math.ceil(1.5 * d0 / 5) * 5);
    const extList = fixed ? [2 * ez + 30, 2 * ez + 60, 2 * ez + 90, 2 * ez + 130] : [40, 60];
    extList.forEach(ext => {
      const lp = Math.ceil((h + 2 * ext) / 10) * 10;
      [Math.max(30, Math.ceil(1.2 * d0 / 5) * 5 + 10), 60, 80].forEach(ey => {
        const bp = Math.ceil((b + 2 * Math.max(ey - 10, 30)) / 10) * 10;
        const w = Math.max(b + 2 * 20, bp - 2 * Math.max(ey, Math.ceil(1.2 * d0)));
        for (const tp of tps) {
          const s2 = U.clone(st);
          Object.assign(s2.podstawa, { lp, bp, tp });
          Object.assign(s2.podstawa.kotwy, { d: dn, kl, ez, w, uklad: fixed ? 'zew' : (s2.podstawa.kotwy.uklad === 'os' ? 'os' : 'wew') });
          let C; try { C = PB.components(s2, sec, R.base, ndp); } catch (e) { continue; }
          if (C.err.length) continue;
          let u = 0; for (const f of forces) { const r = PB.check(C, f, ndp, sec); u = Math.max(u, r.u); if (u > lim) break; }
          if (u <= lim) {
            const cost = 7.85e-6 * lp * bp * tp + (fixed ? 4 : C.nb) * BS.M.SRUBY[dn].As * (kl === '8.8' ? 1.6 : 1) * 0.004;
            if (!best || cost < best.cost) best = { lp, bp, tp, d: dn, kl, ez, w, u, cost };
            break;
          }
        }
      });
    });
  }));
  if (!best) return { err: 'Nie znaleziono podstawy spełniającej warunki w zakresie doboru (kotwy do M48, blacha do 80 mm) – rozważ żebra usztywniające lub podstawę z trawersami.' };
  return best;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
