/* =====================================================================
   SłupStal – podstawa słupa wg PN-EN 1993-1-8 (metoda składnikowa)
   • wytrzymałość połączenia na docisk f_jd (6.2.5(7), PN-EN 1992-1-1, 6.7),
     szerokość efektywna c (6.5), króćce teowe ściskane (6.2.5),
   • blacha podstawy zginana przy rozciąganiu i śruby kotwiące (6.2.6.11,
     6.2.6.12, tabl. 6.2, 6.6 – wysięg blachy), L_b i L_b* (efekt dźwigni),
   • pas i środnik słupa przy ściskaniu (6.2.6.7),
   • nośność podstawy przy N + M (6.2.8.3, tabl. 6.7) i przy ściskaniu osiowym,
   • ścinanie: tarcie C_f,d·N_c,Ed + śruby kotwiące (6.2.2(6)–(8)),
   • spoiny słup–blacha (4.5.3.3 – metoda uproszczona),
   • sztywność początkowa S_j,ini (6.3.4) i klasyfikacja (5.2.2.5).
   Układ: blacha l_p (wzdłuż osi z – wysokości przekroju h) × b_p (wzdłuż y) × t_p.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, M = BS.M;
const PB = BS.PB = {};
const s3 = Math.sqrt(3);

PB.KOTWY_KL = {
  '4.6': { fyb: 240, fub: 400, n: 'śruba kl. 4.6 (PN-EN ISO 898-1)' }, '5.6': { fyb: 300, fub: 500, n: 'śruba kl. 5.6 (PN-EN ISO 898-1)' },
  '8.8': { fyb: 640, fub: 800, n: 'śruba kl. 8.8 (PN-EN ISO 898-1)' },
  'S235': { fyb: 235, fub: 360, n: 'pręt gwintowany ze stali S235' }, 'S355': { fyb: 355, fub: 490, n: 'pręt gwintowany ze stali S355' }
};

/* geometria i nośności składników (niezależne od sił) */
PB.components = function (st, sec, base, ndp) {
  const o = st.podstawa || {}, kt = o.kotwy || {};
  const err = [], warn = [];
  const g0 = ndp.gM0, g2 = ndp.gM2;
  const lp = U.num(o.lp), bp = U.num(o.bp), tp = U.num(o.tp);
  if (!(lp > 0 && bp > 0 && tp > 0)) { err.push('Podstawa: wymiary blachy muszą być dodatnie.'); return { err, warn }; }
  const kind = sec.kind;
  if (kind === 'CHS' && o.typ === 'sztywna') warn.push('Podstawa utwierdzona rury okrągłej – poza zakresem metody składnikowej programu; sprawdzono nośność na ściskanie, ścinanie i docisk (podstawa traktowana jako przegubowa).');
  const fixed = o.typ === 'sztywna' && kind !== 'CHS';
  const h = sec.h, b = kind === 'I' ? Math.max(sec.bg, sec.bd) : sec.b;
  const tf = kind === 'I' ? Math.max(sec.tg, sec.td) : sec.t, tw = kind === 'I' ? sec.tw : sec.t;
  if (lp < h + 20 || bp < b + 20) err.push(`Podstawa: blacha ${U.fmt(lp, 0)} × ${U.fmt(bp, 0)} mm za mała dla przekroju ${U.fmt(h, 0)} × ${U.fmt(b, 0)} mm (minimum o 10 mm z każdej strony).`);
  // stal blachy
  const gat = o.gat || 'S235';
  const fyp = M.fy(gat, tp, ndp.fySrc), fyP = fyp.fy, fuP = fyp.fu;
  // beton i docisk
  const fck = M.BETON[o.beton || 'C25/30'] || 25, fcd = ndp.acc * fck / ndp.gc;
  const aF = U.num(o.aF, 0) || bp, bF = U.num(o.bF, 0) || lp, hF = U.num(o.hF, 0) || 600;
  const a1 = Math.min(bF, 3 * lp, lp + hF), b1 = Math.min(aF, 3 * bp, bp + hF);
  let kj = Math.max(1, Math.min(3, Math.sqrt(Math.max(a1, lp) * Math.max(b1, bp) / (lp * bp))));
  const kjMan = U.num(o.kjRecz, 0) > 0;
  if (kjMan) kj = U.clamp(U.num(o.kjRecz), 1, 3);
  const betaJ = U.num(ndp.betaJ, 2 / 3);
  const fjd = betaJ * kj * fcd;
  const tg = U.num(o.podlewka, 30);
  if (tg > 0.2 * Math.min(lp, bp)) warn.push(`Podstawa: grubość podlewki ${U.fmt(tg, 0)} mm > 0,2·min(l_p, b_p) – założenie β_j = 2/3 wymaga sprawdzenia (PN-EN 1993-1-8, 6.2.5(7)).`);
  // szerokość efektywna c (6.5)
  const c = tp * Math.sqrt(fyP / (3 * fjd * g0));
  // --- króćce teowe ściskane
  const extZ = (lp - h) / 2, extY = (bp - b) / 2;
  const cz = Math.min(c, extZ), cy = Math.min(c, extY);
  let Tf = null, Tw = null, Aeff;
  if (kind === 'CHS') {
    const Ro = sec.D / 2 + Math.min(c, extZ, extY), Ri = Math.max(0, sec.D / 2 - sec.t - c);
    Aeff = Math.PI * (Ro * Ro - Ri * Ri);
    Tf = { beff: sec.t + Math.min(c, extZ) + Math.min(c, sec.D / 2 - sec.t), leff: Math.PI * sec.D, A: Aeff / 2, zC: (sec.D - sec.t) / 2 };
  } else {
    const beffF = tf + cz + Math.min(c, (h - 2 * tf) / 2), leffF = b + 2 * cy;
    Tf = { beff: beffF, leff: leffF, A: beffF * leffF, zC: h / 2 - tf / 2 };
    const hClear = Math.max(0, h - 2 * tf - 2 * c);
    const bw = kind === 'I' ? tw + 2 * c : 2 * (tw + 2 * c);                  // rura – dwie ścianki boczne
    Tw = { beff: Math.min(bw, kind === 'I' ? b : b + 2 * cy), leff: hClear, A: Math.min(bw, kind === 'I' ? b : b + 2 * cy) * hClear };
    if (kind === 'RHS' && b - 2 * tf - 2 * c <= 0) { Tw = { beff: b + 2 * cy, leff: hClear, A: (b + 2 * cy) * hClear }; }
    Aeff = 2 * Tf.A + Tw.A;
  }
  const NjRd = Aeff * fjd;
  const FcplRd = Tf.A * fjd;
  // pas i środnik słupa przy ściskaniu (6.2.6.7): F_c,fc,Rd = M_c,Rd/(h − t_f)
  const FcfcRd = kind === 'CHS' ? Infinity : base.Mcy / (h - tf);
  const FC = Math.min(FcplRd, FcfcRd);
  const zC = Tf.zC;
  // --- kotwy
  const db = M.SRUBY[kt.d || 'M24'] || M.SRUBY.M24, kl = PB.KOTWY_KL[kt.kl || '5.6'] || PB.KOTWY_KL['5.6'];
  const d = db.d, As = db.As, fub = kl.fub, fyb = kl.fyb;
  const k2 = U.num(ndp.k2, 0.9);
  const FtRd = k2 * fub * As / g2;
  const uk = kt.uklad || (fixed ? 'zew' : 'wew');
  const nR = 2;                                                     // kotwy w rzędzie (szerokość b_p)
  const w = U.num(kt.w, 0) || Math.max(0, Math.min(bp - 2 * 50, b + 2 * 60)), eY = (bp - w) / 2;
  let nb, rows, zT = null, Tt = null;
  const d0 = M.d0Kotwy(d);
  const lb = M.kotwaLb(d, tp, tg);
  const af = U.num((o.spoiny || {}).pas, 8), aw = U.num((o.spoiny || {}).srodnik, 5);
  if (uk === 'zew') {
    const ez = U.num(kt.ez, 0) || Math.max(1.5 * d0, 50);
    nb = 4; rows = 2;
    zT = lp / 2 - ez;                                               // od osi słupa
    if (zT <= h / 2 + 0.8 * af * Math.SQRT2 + 1.2 * d0 / 2) err.push(`Podstawa: kotwy zbyt blisko pasa słupa (z_T = ${U.fmt(zT, 0)} mm) – zwiększ l_p lub zmniejsz e_z.`);
    const x = zT - h / 2;                                           // od lica pasa do osi kotwy
    const mx = Math.max(1, x - 0.8 * af * Math.SQRT2), ex = ez;
    const e = eY;
    const lcp = Math.min(2 * Math.PI * mx, Math.PI * mx + w, Math.PI * mx + 2 * e);
    const lnc = Math.min(4 * mx + 1.25 * ex, e + 2 * mx + 0.625 * ex, 0.5 * bp, 0.5 * w + 2 * mx + 0.625 * ex);
    const leff1 = Math.min(lcp, lnc), leff2 = lnc;
    const Mpl1 = 0.25 * leff1 * tp * tp * fyP / g0, Mpl2 = 0.25 * leff2 * tp * tp * fyP / g0;
    const n = Math.min(ex, 1.25 * mx);
    const sumFt = nR * FtRd;
    const LbStar = 8.8 * Math.pow(mx, 3) * As * nR / (leff1 * Math.pow(tp, 3));
    const prying = lb <= LbStar;
    const FT1 = 4 * Mpl1 / mx, FT2 = (2 * Mpl2 + n * sumFt) / (mx + n), FT3 = sumFt, FT12 = 2 * Mpl1 / mx;
    const FTpl = prying ? Math.min(FT1, FT2, FT3) : Math.min(FT12, FT3);
    const mode = prying ? (FTpl === FT1 ? 'postać 1 (pełne uplastycznienie blachy)' : FTpl === FT2 ? 'postać 2 (zniszczenie kotew z uplastycznieniem blachy)' : 'postać 3 (zerwanie kotew)') : (FTpl === FT12 ? 'postać 1-2 (bez efektu dźwigni – uplastycznienie blachy)' : 'postać 3 (zerwanie kotew)');
    Tt = { mx, ex, e, w, lcp, lnc, leff1, leff2, Mpl1, Mpl2, n, sumFt, LbStar, Lb: lb, prying, FT1, FT2, FT3, FT12, FTpl, mode, x };
  } else {
    // kotwy wewnątrz obrysu (między pasami, przy środniku) lub w osi – podstawa przegubowa
    nb = U.num(kt.n, 4) === 2 ? 2 : 4; rows = nb === 2 ? 1 : 2;
    const p = U.num(kt.p, 0) || Math.max(0, h - 2 * tf - 2 * 50);
    zT = rows === 1 ? 0 : p / 2;
    // rozciąganie (wyrywanie, N rozciągające): blacha między pasami – króciec z m od środnika (6.2.6.11, jak blacha czołowa – rząd wewnętrzny)
    const m = Math.max(1, (w / 2) - tw / 2 - 0.8 * aw * Math.SQRT2);
    const e = eY, leffcp = 2 * Math.PI * m, leffnc = 4 * m + 1.25 * e;
    const leff1 = Math.min(leffcp, leffnc);
    const Mpl1 = 0.25 * leff1 * tp * tp * fyP / g0;
    const FT12 = 2 * Mpl1 / m, FT3 = 2 * FtRd;
    Tt = { m, e, w, leff1, Mpl1, FT12, FT3, FTpl: Math.min(FT12, FT3), mode: FT12 < FT3 ? 'blacha (postać 1-2)' : 'kotwy (postać 3)', p, prying: false, Lb: lb, inner: true };
  }
  // ścinanie kotwy (6.2.2(7)): F_2,vb,Rd = α_bc·f_ub·A_s/γM2, α_bc = 0,44 − 0,0003·f_yb; docisk blachy F_1,vb,Rd (tabl. 3.4)
  const abc = 0.44 - 0.0003 * U.clamp(fyb, 235, 640);
  const F2vb = abc * fub * As / g2;
  const e1 = Math.max(eY, 1.2 * d0), e2 = eY;
  const ab = Math.min(e1 / (3 * d0), fub / fuP, 1), k1 = Math.min(2.8 * e2 / d0 - 1.7, 2.5);
  const F1vb = Math.max(0, k1) * ab * fuP * d * tp / g2;
  const Fvb = Math.min(F1vb, F2vb);
  const kotwyScin = o.scinanieKotwy !== false;
  // spoiny słup–blacha
  const fuW = Math.min(M.STAL[(st.material || {}).gatunek] ? M.fy(st.material.gatunek, sec.tMax, ndp.fySrc).fu : 360, fuP);
  const bw = M.betaW((st.material || {}).gatunek || 'S235');
  const fvwd = fuW / s3 / (bw * g2);
  const lwf = kind === 'I' ? 2 * b - tw : kind === 'RHS' ? b : Math.PI * sec.D / 2;   // długość spoin jednego pasa (obie strony pasa)
  const lww = kind === 'I' ? 2 * (h - 2 * tf) : kind === 'RHS' ? 2 * h : Math.PI * sec.D / 2;
  // sztywność (6.3.4) – tylko podstawa utwierdzona
  let stiff = null;
  if (fixed && Tt && !Tt.inner) {
    const Ec = M.Ecm(fck);
    const k13 = Ec * Math.sqrt(Tf.beff * Tf.leff) / (1.275 * U.E);
    const k15 = (Tt.prying ? 0.425 : 0.85) * Tt.leff1 * Math.pow(tp, 3) / Math.pow(Tt.mx, 3);
    const k16 = (Tt.prying ? 1.6 : 2.0) * As * nR / lb;
    const kT = 1 / (1 / k15 + 1 / k16), kC = k13;
    stiff = { Ec, k13, k15, k16, kT, kC, z: zT + zC };
  }
  return { err, warn, fixed, kind, lp, bp, tp, gat, fyP, fuP, fck, fcd, a1, b1, kj, kjMan, betaJ, fjd, tg, c, cz, cy, extZ, extY, Tf, Tw, Aeff, NjRd, FcplRd, FcfcRd, FC, zC, zT, d, As, fub, fyb, kl, FtRd, k2, uk, nb, rows, w, eY, d0, Tt, abc, F2vb, F1vb, Fvb, kotwyScin, af, aw, fvwd, bw, lwf, lww, h, b, tf, tw, stiff, kt, lb };
};

/* M_j,Rd wg tabl. 6.7 (N > 0 – rozciąganie; M ≥ 0) – symetryczna podstawa */
PB.MjRd = function (C, N, Mabs) {
  const FT = C.Tt ? C.Tt.FTpl : 0, FC = C.FC, zT = C.zT, zC = C.zC;
  const Mv = Math.abs(Mabs);
  if (Mv < 1) return null;
  const e = Math.abs(N) < 1 ? (N >= 0 ? Infinity : -Infinity) : Mv / N;
  let z, Mj, cas;
  if (N >= 0 && e > zT || N < 0 && e <= -zC || !isFinite(e)) {
    z = zT + zC; cas = 'strona lewa rozciągana, prawa ściskana';
    const a = isFinite(e) ? FT * z / (zC / e + 1) : FT * z, b = isFinite(e) ? -FC * z / (zT / e - 1) : FC * z;
    Mj = Math.min(a, b); return { Mj, z, cas, e, a, b, f: 'min{F_T,l,Rd·z/(z_C,r/e + 1); −F_C,r,Rd·z/(z_T,l/e − 1)}' };
  }
  if (N >= 0) {
    z = 2 * zT; cas = 'obie strony rozciągane';
    const a = FT * z / (zT / e + 1), b = FT * z / (zT / e - 1);
    Mj = Math.min(a, b > 0 ? b : Infinity); return { Mj, z, cas, e, a, b, f: 'min{F_T,l,Rd·z/(z_T,r/e + 1); F_T,r,Rd·z/(z_T,l/e − 1)}' };
  }
  z = 2 * zC; cas = 'obie strony ściskane';
  const a = -FC * z / (zC / e + 1), b = -FC * z / (zC / e - 1);
  Mj = Math.min(a > 0 ? a : Infinity, b > 0 ? b : Infinity); return { Mj, z, cas, e, a, b, f: 'min{−F_C,l,Rd·z/(z_C,r/e + 1); −F_C,r,Rd·z/(z_C,l/e − 1)}' };
};

/* sprawdzenie dla sił u podstawy: f = { N (ściskanie +), My, Mz, Vy, Vz } */
PB.check = function (C, f, ndp, sec) {
  const Nc = f.N, Nt = -f.N;                       // Nt > 0 – rozciąganie (konwencja tabl. 6.7)
  const My = Math.abs(f.My || 0), Mz = Math.abs(f.Mz || 0);
  const o = { N: f.N, My: f.My || 0, Mz: f.Mz || 0, Vy: f.Vy || 0, Vz: f.Vz || 0 };
  // ściskanie osiowe / docisk
  o.uN = Nc > 0 ? Nc / C.NjRd : 0;
  // rozciąganie osiowe (wyrywanie)
  o.NtRd = C.Tt ? C.Tt.FTpl * (C.Tt.inner ? C.rows : 2) : 0;
  o.uNt = Nt > 0 ? Nt / Math.max(1, o.NtRd) : 0;
  // moment (podstawa utwierdzona)
  if (C.fixed) {
    const ry = My > 1 ? PB.MjRd(C, Nt, My) : null;
    o.mjy = ry; o.uMy = ry ? My / ry.Mj : 0;
    if (Mz > 1) {
      // M_z – model uproszczony (przybliżenie): rozciągane 2 kotwy po stronie +y (po jednej w rzędzie), ściskanie pod krawędziami pasów po stronie −y
      const tfz = C.kind === 'I' ? C.tf : C.t;
      const ccz = Math.min(C.c, C.extY);
      const FCz = Math.min(C.fjd * 2 * (tfz + 2 * Math.min(C.c, C.extZ)) * (ccz + Math.min(C.c, C.b / 2)), C.FcfcRdZ || Infinity);
      const my = Math.max(1, (C.w - C.b) / 2 - 0.8 * C.af * Math.SQRT2);
      const leffZ = Math.min(2 * Math.PI * my, 4 * my + 1.25 * Math.max(1, C.eY));
      const FTz = Math.min(2 * C.FtRd, 2 * (2 * 0.25 * leffZ * C.tp * C.tp * C.fyP / ndp.gM0) / my);
      const Cz = Object.assign({}, C, { zT: C.w / 2, zC: C.b / 2 - ccz / 2, FC: FCz, Tt: Object.assign({}, C.Tt, { FTpl: FTz }) });
      const rz = PB.MjRd(Cz, Nt, Mz); o.mjz = rz ? Object.assign(rz, { FT: FTz, FC: FCz, zT: Cz.zT, zC: Cz.zC, approx: true }) : null; o.uMz = rz ? Mz / rz.Mj : 0;
    } else o.uMz = 0;
    o.uM = o.uMy + o.uMz;                         // interakcja liniowa M_y i M_z (założenie projektowe)
  } else {
    o.uM = 0;
    o.Mpin = My > 1 || Mz > 1;
  }
  // ścinanie
  const V = Math.hypot(o.Vy, o.Vz);
  const Ff = Nc > 0 ? U.num(ndp.Cfd, 0.2) * Nc : 0;
  const nVb = C.kotwyScin ? C.nb * C.Fvb : 0;
  o.V = V; o.FfRd = Ff; o.FvbTot = nVb; o.FvRd = Ff + nVb;
  o.uV = V > 0 ? V / Math.max(1e-9, o.FvRd) : 0;
  // kotwy: rozciąganie + ścinanie (tabl. 3.4: F_v/F_v,Rd + F_t/(1,4F_t,Rd) ≤ 1) – siły na kotwę
  let Ft1 = 0;
  if (C.fixed && o.mjy && My > 1) { const z = o.mjy.z; Ft1 = Math.max(0, (My - Math.max(0, Nc) * C.zC) / z + Math.max(0, Nt) * C.zC / z) / 2; }
  if (Nt > 0) Ft1 = Math.max(Ft1, Nt / C.nb);
  const Fv1 = C.kotwyScin && C.nb ? Math.max(0, V - Ff) / C.nb : 0;
  o.Ft1 = Ft1; o.Fv1 = Fv1;
  o.uTV = (C.kotwyScin ? Fv1 / C.F2vb : 0) + Ft1 / (1.4 * C.FtRd);
  // spoiny – metoda uproszczona: siła w pasie F_f = M_y/(h − t_f) ± N·A_f/A; środnik – ścinanie V_z
  const Af = C.kind === 'I' ? C.b * C.tf : C.kind === 'RHS' ? C.b * C.t : sec.A / 2;
  const Ff1 = Math.abs(o.My) / Math.max(1, C.h - C.tf) + Math.abs(f.N) * Af / sec.A;
  const fvy = Math.abs(o.Vy) / (2 * C.af * C.lwf);
  const fw = Math.hypot(Ff1 / (C.af * C.lwf), fvy);
  const fvz = Math.abs(o.Vz) / (C.aw * C.lww);
  o.wf = { Ff1, fw, fvy, fvz, Af, fn: Ff1 / (C.af * C.lwf) };
  o.uWf = fw / C.fvwd; o.uWw = fvz / C.fvwd;
  o.u = Math.max(o.uN, o.uNt, o.uM, o.uV, o.uTV, o.uWf, o.uWw);
  return o;
};

/* sztywność S_j,ini dla mimośrodu e (6.3.4) i klasyfikacja (5.2.2.5) */
PB.stiffness = function (C, N, My, sec, Lc) {
  if (!C.stiff) return null;
  const s = C.stiff, z = s.z, E = U.E;
  const ek = (C.zC * s.kC - C.zT * s.kT) / (s.kC + s.kT);
  const Nt = -N, e = Math.abs(Nt) > 1 ? Math.abs(My) / Nt : Infinity;
  let Sj = E * z * z / (1 / s.kT + 1 / s.kC);
  let fe = 1;
  if (isFinite(e) && Math.abs(e + ek) > 1e-6) { fe = e / (e + ek); if (fe > 0) Sj *= fe; }
  const EIL = E * sec.Iy / Lc;
  const rigid = Sj >= 30 * EIL, pinned = Sj <= 0.5 * EIL;
  return { Sj, ek, e, fe, EIL, ratio: Sj / EIL, rigid, pinned, cls: rigid ? 'sztywna' : pinned ? 'przegubowa' : 'podatna' };
};

PB.mass = function (C) {
  const m = 7.85e-6 * C.lp * C.bp * C.tp;
  return { plate: m };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
