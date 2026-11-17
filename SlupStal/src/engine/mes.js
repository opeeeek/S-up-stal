/* =====================================================================
   SłupStal – metoda elementów skończonych dla pręta ściskanego i zginanego
   • statyka w płaszczyźnie (Euler–Bernoulli, 2 st. swobody w węźle: w, θ)
     z macierzą geometryczną od siły podłużnej N(x) – analiza I i II rzędu
     (P-δ i P-Δ), imperfekcje jako geometria początkowa d₀ (obciążenie
     zastępcze K_G·d₀), podpory sztywne i sprężyste;
   • wyboczenie giętne w płaszczyźnie: K_E·φ = α·K_G(N)·φ;
   • stateczność przestrzenna (teoria Własowa, 6 st. swobody w węźle:
     u, u′, v, v′, φ, φ′): wyboczenie skrętne i giętno-skrętne od N(x),
     zwichrzenie od M_y(x) i M_z(x) z wysokością przyłożenia obciążeń,
     monosymetrią (β_z) i stężeniami (sprężyny kary na dowolnej wysokości).
   Konwencja w płaszczyźnie: przemieszczenie w (+) i obciążenie q (+) w tym
   samym kierunku; M = EI·w″ (M > 0 ściska włókna po stronie +).
   N > 0 – ściskanie.  Jednostki: N, mm.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS;
const F = BS.FE = {};

/* ------------------------------------------------------- algebra pasmowa */
// macierz symetryczna pasmowa: A[i][k] = a(i, i+k), k = 0..hb
function bandNew(n, hb) { const A = new Array(n); for (let i = 0; i < n; i++) A[i] = new Float64Array(hb + 1); return { n, hb, A }; }
function bandAdd(B, i, j, v) { if (j < i) { const t = i; i = j; j = t; } const k = j - i; if (k > B.hb) throw new Error('poza pasmem'); B.A[i][k] += v; }
function bandGet(B, i, j) { if (j < i) { const t = i; i = j; j = t; } const k = j - i; return k > B.hb ? 0 : B.A[i][k]; }
function bandChol(B) { // in situ: L^T w paśmie (U = L^T)
  const { n, hb, A } = B;
  for (let i = 0; i < n; i++) {
    for (let k = Math.max(0, i - hb); k < i; k++) {
      const uki = A[k][i - k]; if (uki === 0) continue;
      for (let j = i; j <= Math.min(n - 1, k + hb); j++) A[i][j - i] -= uki * A[k][j - k];
    }
    const d = A[i][0];
    if (!(d > 0)) throw new Error('Macierz sztywności nie jest dodatnio określona – układ geometrycznie zmienny (sprawdź podpory).');
    const s = Math.sqrt(d); A[i][0] = s;
    for (let j = i + 1; j <= Math.min(n - 1, i + hb); j++) A[i][j - i] /= s;
  }
  return B;
}
function bandSolve(C, b) { // C – po bandChol; rozwiązuje U^T U x = b
  const { n, hb, A } = C, x = Float64Array.from(b);
  for (let i = 0; i < n; i++) { let s = x[i]; for (let k = Math.max(0, i - hb); k < i; k++) s -= A[k][i - k] * x[k]; x[i] = s / A[i][0]; }
  for (let i = n - 1; i >= 0; i--) { let s = x[i]; for (let j = i + 1; j <= Math.min(n - 1, i + hb); j++) s -= A[i][j - i] * x[j]; x[i] = s / A[i][0]; }
  return x;
}
function bandMul(B, x) {
  const { n, hb, A } = B, y = new Float64Array(n);
  for (let i = 0; i < n; i++) { y[i] += A[i][0] * x[i]; for (let k = 1; k <= hb && i + k < n; k++) { const a = A[i][k]; if (a) { y[i] += a * x[i + k]; y[i + k] += a * x[i]; } } }
  return y;
}
F.band = { bandNew, bandAdd, bandGet, bandChol, bandSolve, bandMul };

/* ------------------------------------------------------- symetryczne zagadnienie własne (gęste) */
// Householder (tred2) + QL z przesunięciami (tql2) – wartości i wektory własne macierzy symetrycznej
function eigSym(a) {
  const n = a.length, V = a.map(r => Float64Array.from(r)), d = new Float64Array(n), e = new Float64Array(n);
  for (let j = 0; j < n; j++) d[j] = V[n - 1][j];
  for (let i = n - 1; i > 0; i--) {
    let scale = 0, h = 0;
    for (let k = 0; k < i; k++) scale += Math.abs(d[k]);
    if (scale === 0) { e[i] = d[i - 1]; for (let j = 0; j < i; j++) { d[j] = V[i - 1][j]; V[i][j] = 0; V[j][i] = 0; } }
    else {
      for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
      let f = d[i - 1], g = Math.sqrt(h); if (f > 0) g = -g;
      e[i] = scale * g; h -= f * g; d[i - 1] = f - g;
      for (let j = 0; j < i; j++) e[j] = 0;
      for (let j = 0; j < i; j++) {
        f = d[j]; V[j][i] = f; g = e[j] + V[j][j] * f;
        for (let k = j + 1; k <= i - 1; k++) { g += V[k][j] * d[k]; e[k] += V[k][j] * f; }
        e[j] = g;
      }
      f = 0; for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
      const hh = f / (h + h); for (let j = 0; j < i; j++) e[j] -= hh * d[j];
      for (let j = 0; j < i; j++) { f = d[j]; g = e[j]; for (let k = j; k <= i - 1; k++) V[k][j] -= (f * e[k] + g * d[k]); d[j] = V[i - 1][j]; V[i][j] = 0; }
    }
    d[i] = h;
  }
  for (let i = 0; i < n - 1; i++) {
    V[n - 1][i] = V[i][i]; V[i][i] = 1; const h = d[i + 1];
    if (h !== 0) { for (let k = 0; k <= i; k++) d[k] = V[k][i + 1] / h; for (let j = 0; j <= i; j++) { let g = 0; for (let k = 0; k <= i; k++) g += V[k][i + 1] * V[k][j]; for (let k = 0; k <= i; k++) V[k][j] -= g * d[k]; } }
    for (let k = 0; k <= i; k++) V[k][i + 1] = 0;
  }
  for (let j = 0; j < n; j++) { d[j] = V[n - 1][j]; V[n - 1][j] = 0; } V[n - 1][n - 1] = 1; e[0] = 0;
  // tql2
  for (let i = 1; i < n; i++) e[i - 1] = e[i]; e[n - 1] = 0;
  let f = 0, tst1 = 0; const eps = Math.pow(2, -52);
  for (let l = 0; l < n; l++) {
    tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
    let m = l; while (m < n) { if (Math.abs(e[m]) <= eps * tst1) break; m++; }
    if (m > l) {
      let iter = 0;
      do {
        iter++; if (iter > 200) break;
        let g = d[l], p = (d[l + 1] - g) / (2 * e[l]), r = Math.hypot(p, 1); if (p < 0) r = -r;
        d[l] = e[l] / (p + r); d[l + 1] = e[l] * (p + r); const dl1 = d[l + 1]; let h = g - d[l];
        for (let i = l + 2; i < n; i++) d[i] -= h; f += h;
        p = d[m]; let c = 1, c2 = c, c3 = c, el1 = e[l + 1], s = 0, s2 = 0;
        for (let i = m - 1; i >= l; i--) {
          c3 = c2; c2 = c; s2 = s; g = c * e[i]; h = c * p; r = Math.hypot(p, e[i]); e[i + 1] = s * r; s = e[i] / r; c = p / r; p = c * d[i] - s * g; d[i + 1] = h + s * (c * g + s * d[i]);
          for (let k = 0; k < n; k++) { h = V[k][i + 1]; V[k][i + 1] = s * V[k][i] + c * h; V[k][i] = c * V[k][i] - s * h; }
        }
        p = -s * s2 * c3 * el1 * e[l] / dl1; e[l] = s * p; d[l] = c * p;
      } while (Math.abs(e[l]) > eps * tst1);
    }
    d[l] = d[l] + f; e[l] = 0;
  }
  return { d, V };
}
F.eigSym = eigSym;

/* ------------------------------------------------------- siatka */
// keys – położenia obowiązkowych węzłów [mm]; L – długość; hmax – maks. długość elementu
F.mesh = function (keys, L, hmax) {
  const k = Array.from(new Set(keys.concat([0, L]).map(x => Math.round(Math.min(L, Math.max(0, x)) * 1000) / 1000))).sort((a, b) => a - b);
  const xs = [k[0]];
  for (let i = 1; i < k.length; i++) {
    const a = k[i - 1], b = k[i]; if (b - a < 1e-6) continue;
    const n = Math.max(1, Math.ceil((b - a) / hmax - 1e-9));
    for (let j = 1; j <= n; j++) xs.push(a + (b - a) * j / n);
  }
  return xs;
};
F.nodeAt = (xs, x) => { let best = 0, bd = Infinity; for (let i = 0; i < xs.length; i++) { const d = Math.abs(xs[i] - x); if (d < bd) { bd = d; best = i; } } return best; };

/* ------------------------------------------------------- zwichrzenie – zagadnienie własne */
// Funkcje kształtu Hermite'a i pochodne w punkcie ξ ∈ [0,1] dla elementu długości L
function herm(t, L) {
  const N = [1 - 3 * t * t + 2 * t ** 3, L * (t - 2 * t * t + t ** 3), 3 * t * t - 2 * t ** 3, L * (-t * t + t ** 3)];
  const d1 = [(-6 * t + 6 * t * t) / L, 1 - 4 * t + 3 * t * t, (6 * t - 6 * t * t) / L, -2 * t + 3 * t * t];
  const d2 = [(-6 + 12 * t) / (L * L), (-4 + 6 * t) / L, (6 - 12 * t) / (L * L), (-2 + 6 * t) / L];
  return { N, d1, d2 };
}
const GP4 = [[-0.8611363115940526, 0.3478548451374538], [-0.3399810435848563, 0.6521451548625461], [0.3399810435848563, 0.6521451548625461], [0.8611363115940526, 0.3478548451374538]];


/* ------------------------------------------------------- uogólnione zagadnienie własne */
// KE (pasmowa, zostanie rozłożona), KG (pasmowa), fixed – zbiór więzów (wiersze/kolumny jednostkowe w KE, zerowe w KG).
// Zwraca najmniejszą dodatnią wartość własną λ (K_E·x = λ·K_G·x) i wektor własny.
F.genEig = function (KE, KG, fixed, maxIt) {
  const n = KE.n, HB = KE.hb;
  fixed.forEach(i => { for (let k = 0; k <= HB; k++) { KE.A[i][k] = 0; KG.A[i][k] = 0; if (i - k >= 0) { KE.A[i - k][k] = 0; KG.A[i - k][k] = 0; } } KE.A[i][0] = 1; });
  try { bandChol(KE); } catch (e) { return { lam: NaN, err: 'Układ geometrycznie zmienny – brak wystarczających więzów (podpory, stężenia).' }; }
  const A = KE.A;
  const solveU = (x) => { const y = Float64Array.from(x); for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let j = i + 1; j <= Math.min(n - 1, i + HB); j++) s -= A[i][j - i] * y[j]; y[i] = s / A[i][0]; } return y; };
  const solveUT = (x) => { const y = Float64Array.from(x); for (let i = 0; i < n; i++) { let s = y[i]; for (let k = Math.max(0, i - HB); k < i; k++) s -= A[k][i - k] * y[k]; y[i] = s / A[i][0]; } return y; };
  const op = (x) => solveUT(bandMul(KG, solveU(x)));
  const mMax = Math.min(n - fixed.size, maxIt || 90);
  if (mMax < 1) return { lam: Infinity, vec: null };
  const Q = [], al = [], be = [];
  let q = new Float64Array(n);
  for (let i = 0; i < n; i++) q[i] = fixed.has(i) ? 0 : Math.sin(0.37 * i + 1) + 0.3 * Math.cos(1.7 * i) + 0.5;
  let nq = Math.sqrt(q.reduce((s, v) => s + v * v, 0)); for (let i = 0; i < n; i++) q[i] /= nq;
  let bPrev = 0, qPrev = null, muBest = 0, sBest = null, kBest = 0;
  for (let k = 0; k < mMax; k++) {
    Q.push(q);
    const w = op(q);
    let a = 0; for (let i = 0; i < n; i++) a += w[i] * q[i];
    al.push(a);
    for (let i = 0; i < n; i++) w[i] -= a * q[i] + (qPrev ? bPrev * qPrev[i] : 0);
    for (let r = 0; r < 2; r++) for (const v of Q) { let d = 0; for (let i = 0; i < n; i++) d += w[i] * v[i]; for (let i = 0; i < n; i++) w[i] -= d * v[i]; }
    const b = Math.sqrt(w.reduce((s, v) => s + v * v, 0));
    if (k >= 3 && (k % 3 === 0 || b < 1e-12 || k === mMax - 1)) {
      const m2 = al.length, Tm = [];
      for (let i = 0; i < m2; i++) { const row = new Float64Array(m2); row[i] = al[i]; if (i > 0) row[i - 1] = be[i - 1]; if (i < m2 - 1) row[i + 1] = be[i]; Tm.push(row); }
      const { d, V } = eigSym(Tm);
      let kk = -1, mu = 0; for (let j = 0; j < m2; j++) if (d[j] > mu) { mu = d[j]; kk = j; }
      if (kk >= 0) {
        const s = new Float64Array(m2); for (let j = 0; j < m2; j++) s[j] = V[j][kk];
        const res = Math.abs(b * s[m2 - 1]);
        const conv = Math.abs(mu - muBest) <= 1e-10 * Math.abs(mu) && res <= 1e-7 * Math.abs(mu);
        muBest = mu; sBest = s; kBest = m2;
        if (conv) break;
      }
    }
    if (b < 1e-13) break;
    be.push(b); qPrev = q; bPrev = b;
    q = new Float64Array(n); for (let i = 0; i < n; i++) q[i] = w[i] / b;
  }
  if (!(muBest > 1e-15) || !sBest) return { lam: Infinity, vec: null };
  const y = new Float64Array(n); for (let j = 0; j < kBest; j++) { const c = sBest[j]; const v = Q[j]; for (let i = 0; i < n; i++) y[i] += c * v[i]; }
  const full = solveU(y); fixed.forEach(i => { full[i] = 0; });
  return { lam: 1 / muBest, vec: full };
};

/* ------------------------------------------------------- pręt w płaszczyźnie: statyka I/II rzędu */
const keB = (EI, L) => { const c = EI / (L * L * L); return [[12 * c, 6 * L * c, -12 * c, 6 * L * c], [6 * L * c, 4 * L * L * c, -6 * L * c, 2 * L * L * c], [-12 * c, -6 * L * c, 12 * c, -6 * L * c], [6 * L * c, 2 * L * L * c, -6 * L * c, 4 * L * L * c]]; };
const kgB = (N, L) => { const c = N / (30 * L); return [[36 * c, 3 * L * c, -36 * c, 3 * L * c], [3 * L * c, 4 * L * L * c, -3 * L * c, -L * L * c], [-36 * c, -3 * L * c, 36 * c, -3 * L * c], [3 * L * c, -L * L * c, -3 * L * c, 4 * L * L * c]]; };
F.keB = keB; F.kgB = kgB;
// obciążenie rozłożone liniowo (q1 → q2) – wektor węzłowy elementu
const feB = (q1, q2, L) => [L * (7 * q1 + 3 * q2) / 20, L * L * (3 * q1 + 2 * q2) / 60, L * (3 * q1 + 7 * q2) / 20, -L * L * (2 * q1 + 3 * q2) / 60];
// m: { xs, EI (liczba lub funkcja e), Nel: Float64Array (N na elemencie, ściskanie +; brak – I rząd),
//      sup: [{x, kv:'fix'|liczba|0, kr:'fix'|liczba|0}], dist:[{x0,x1,q0,q1}], point:[{x,P}], mom:[{x,M}],
//      d0: Float64Array (geometria początkowa – imperfekcje; tylko z Nel) }
F.col2 = function (m) {
  const xs = m.xs, ne = xs.length - 1, n = 2 * xs.length;
  const EIe = (e) => (typeof m.EI === 'function' ? m.EI(e) : m.EI);
  const K = bandNew(n, 3), f = new Float64Array(n);
  const elq = []; for (let e = 0; e < ne; e++) elq.push([0, 0]);
  (m.dist || []).forEach(d => {
    const L = d.x1 - d.x0; if (!(L > 1e-9)) return;
    for (let e = 0; e < ne; e++) {
      const a = Math.max(xs[e], d.x0), b = Math.min(xs[e + 1], d.x1);
      if (b - a < 1e-9 * Math.max(1, L)) continue;
      elq[e][0] += d.q0 + (d.q1 - d.q0) * (xs[e] - d.x0) / L; elq[e][1] += d.q0 + (d.q1 - d.q0) * (xs[e + 1] - d.x0) / L;
    }
  });
  const kes = [], kgs = [];
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e], i0 = 2 * e, ke = keB(EIe(e), L), kg = m.Nel ? kgB(m.Nel[e], L) : null;
    kes.push(ke); kgs.push(kg);
    for (let a = 0; a < 4; a++) for (let b = a; b < 4; b++) bandAdd(K, i0 + a, i0 + b, ke[a][b] - (kg ? kg[a][b] : 0));
    const fe = feB(elq[e][0], elq[e][1], L); for (let a = 0; a < 4; a++) f[i0 + a] += fe[a];
    if (kg && m.d0) { for (let a = 0; a < 4; a++) { let s = 0; for (let b = 0; b < 4; b++) s += kg[a][b] * m.d0[i0 + b]; f[i0 + a] += s; } }
  }
  (m.point || []).forEach(p => { f[2 * F.nodeAt(xs, p.x)] += p.P; });
  (m.mom || []).forEach(p => { f[2 * F.nodeAt(xs, p.x) + 1] += p.M; });
  const Kfull = { n, hb: 3, A: K.A.map(r => Float64Array.from(r)) }, f0 = Float64Array.from(f);
  const fixed = new Set();
  (m.sup || []).forEach(s => {
    const i = F.nodeAt(xs, s.x);
    if (s.kv === 'fix') fixed.add(2 * i); else if (s.kv > 0) bandAdd(K, 2 * i, 2 * i, s.kv);
    if (s.kr === 'fix') fixed.add(2 * i + 1); else if (s.kr > 0) bandAdd(K, 2 * i + 1, 2 * i + 1, s.kr);
  });
  fixed.forEach(i => { for (let k = 0; k <= 3; k++) { K.A[i][k] = 0; if (i - k >= 0) K.A[i - k][k] = 0; } K.A[i][0] = 1; f[i] = 0; });
  try { bandChol(K); } catch (e) { return { err: m.Nel ? 'Utrata stateczności – obciążenie przekracza obciążenie krytyczne (α_cr ≤ 1) lub układ jest geometrycznie zmienny.' : 'Układ geometrycznie zmienny – sprawdź warunki podparcia.' }; }
  const d = bandSolve(K, f); fixed.forEach(i => { d[i] = 0; });
  // siły końcowe elementów: F_e = (K_E − K_G)·d_e − K_G·d0_e − f_e
  const els = [];
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e], i0 = 2 * e, ke = kes[e], kg = kgs[e];
    const de = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]], fe = feB(elq[e][0], elq[e][1], L);
    const Fe = [0, 1, 2, 3].map(a => { let s = -fe[a]; for (let b = 0; b < 4; b++) { s += (ke[a][b] - (kg ? kg[a][b] : 0)) * de[b]; if (kg && m.d0) s -= kg[a][b] * m.d0[i0 + b]; } return s; });
    els.push({ x0: xs[e], x1: xs[e + 1], L, q1: elq[e][0], q2: elq[e][1], Ml: -Fe[1], Mr: Fe[3], Vl: Fe[0], Vr: -Fe[2], w1: de[0], t1: de[1], w2: de[2], t2: de[3] });
  }
  // reakcje
  const Kd = bandMul(Kfull, d);
  const reactions = (m.sup || []).map(s => {
    const i = F.nodeAt(xs, s.x);
    let Rv = 0, Rm = 0;
    if (s.kv === 'fix') Rv = Kd[2 * i] - f0[2 * i]; else if (s.kv > 0) Rv = -s.kv * d[2 * i];
    if (s.kr === 'fix') Rm = Kd[2 * i + 1] - f0[2 * i + 1]; else if (s.kr > 0) Rm = -s.kr * d[2 * i + 1];
    return { x: s.x, R: Rv, M: Rm, id: s.id };
  });
  return { xs, d, els, reactions };
};
// próbkowanie: 3 punkty na element (lewy koniec, środek, prawy koniec) – skoki przy siłach/momentach skupionych zachowane
F.sample2 = function (res) {
  const xs = [], M = [], V = [], w = [];
  res.els.forEach(el => {
    const L = el.L, qm = (el.q1 + el.q2) / 2;
    const wm = 0.5 * (el.w1 + el.w2) + L * (el.t1 - el.t2) / 8;
    xs.push(el.x0, (el.x0 + el.x1) / 2, el.x1);
    M.push(el.Ml, 0.5 * (el.Ml + el.Mr) - qm * L * L / 8, el.Mr);
    V.push(el.Vl, 0.5 * (el.Vl + el.Vr), el.Vr);
    w.push(el.w1, wm, el.w2);
  });
  return { xs, M, V, w };
};

/* ------------------------------------------------------- wyboczenie giętne w płaszczyźnie */
// m: { xs, EI, Nel (rozkład N – ściskanie +), sup: [{x, kv, kr}] } → { alpha, mode: { xs, w } }
F.buck2 = function (m) {
  const xs = m.xs, ne = xs.length - 1, n = 2 * xs.length;
  const EIe = (e) => (typeof m.EI === 'function' ? m.EI(e) : m.EI);
  const KE = bandNew(n, 3), KG = bandNew(n, 3);
  let any = false;
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e], i0 = 2 * e, ke = keB(EIe(e), L), Ne = Math.max(0, m.Nel[e]), kg = kgB(Ne, L);
    if (Ne > 0) any = true;
    for (let a = 0; a < 4; a++) for (let b = a; b < 4; b++) { bandAdd(KE, i0 + a, i0 + b, ke[a][b]); bandAdd(KG, i0 + a, i0 + b, kg[a][b]); }
  }
  if (!any) return { alpha: Infinity, mode: null };
  const fixed = new Set();
  (m.sup || []).forEach(s => {
    const i = F.nodeAt(xs, s.x);
    if (s.kv === 'fix') fixed.add(2 * i); else if (s.kv > 0) bandAdd(KE, 2 * i, 2 * i, s.kv);
    if (s.kr === 'fix') fixed.add(2 * i + 1); else if (s.kr > 0) bandAdd(KE, 2 * i + 1, 2 * i + 1, s.kr);
  });
  const r = F.genEig(KE, KG, fixed);
  if (r.err) return { alpha: NaN, err: r.err };
  if (!r.vec) return { alpha: r.lam, mode: null };
  const w = [], t = []; let mx = 0;
  for (let i = 0; i < xs.length; i++) { w.push(r.vec[2 * i]); t.push(r.vec[2 * i + 1]); if (Math.abs(r.vec[2 * i]) > Math.abs(mx)) mx = r.vec[2 * i]; }
  const k = mx ? 1 / mx : 1;
  return { alpha: r.lam, mode: { xs: xs.slice(), w: w.map(v => v * k), t: t.map(v => v * k) } };
};

/* ------------------------------------------------------- stateczność przestrzenna (Własow) */
/* m: { xs, EIy, EIz, EIw, GIt, A, Iy, Iz, y0, z0 (środek ścinania względem środka ciężkości), betaZ, betaY,
        fields: { u: true, v: true, phi: true } – aktywne pola (u – przesuw w kierunku y, v – w kierunku z, φ – skręcenie),
        Nel: N na elemencie (ściskanie +), Mye(e) → [Ma, Mm, Mb] (M_y, + ściska stronę +z), Mze(e) → [Ma, Mm, Mb] (M_z, + ściska stronę +y),
        qz(e) → [{w0, w1, e}] obciążenia w kierunku −z (ku środkowi ścinania przy e > 0) na wysokości e nad ŚŚ,
        ptz: [{x, P, e}] siły skupione w kierunku −z,
        bc: [{x, u, du, v, dv, phi, dphi}] więzy sztywne, springs: [{x, k:'rigid'|liczba, zr}] (blokada u na wysokości zr nad ŚŚ), [{x, kv}] (blokada v), [{x, kt}] (skrętna) }
   Zwraca λ_cr (mnożnik wszystkich obciążeń) i postać. */
F.ft = function (m) {
  const xs = m.xs, ne = xs.length - 1, nn = xs.length, n = 6 * nn, HB = 11;
  const fl = m.fields || { u: true, v: true, phi: true };
  const KE = bandNew(n, HB), KG = bandNew(n, HB);
  const ke = [], kg = []; for (let a = 0; a < 12; a++) { ke.push(new Float64Array(12)); kg.push(new Float64Array(12)); }
  const UI = [0, 1, 6, 7], VI = [2, 3, 8, 9], PI = [4, 5, 10, 11];
  const r02 = (m.Iy + m.Iz) / m.A + (m.y0 || 0) ** 2 + (m.z0 || 0) ** 2, y0 = m.y0 || 0, z0 = m.z0 || 0, bZ = m.betaZ || 0, bY = m.betaY || 0;
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e];
    for (let a = 0; a < 12; a++) { ke[a].fill(0); kg[a].fill(0); }
    const N = m.Nel ? m.Nel[e] : 0;
    const [Ma, Mm, Mb] = m.Mye ? m.Mye(e) : [0, 0, 0];
    const [Za, Zm, Zb] = m.Mze ? m.Mze(e) : [0, 0, 0];
    const ql = m.qz ? m.qz(e) : [];
    for (const [g, wg] of GP4) {
      const t = (g + 1) / 2, W = wg * L / 2, H = herm(t, L);
      const My = Ma * (1 - t) * (1 - 2 * t) + Mm * 4 * t * (1 - t) + Mb * t * (2 * t - 1);
      const Mz = Za * (1 - t) * (1 - 2 * t) + Zm * 4 * t * (1 - t) + Zb * t * (2 * t - 1);
      let qh = 0; for (const q of ql) qh += (q.w0 + (q.w1 - q.w0) * t) * q.e;
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        const d2d2 = H.d2[a] * H.d2[b], d1d1 = H.d1[a] * H.d1[b], NN = H.N[a] * H.N[b];
        ke[UI[a]][UI[b]] += W * m.EIz * d2d2;
        ke[VI[a]][VI[b]] += W * m.EIy * d2d2;
        ke[PI[a]][PI[b]] += W * (m.EIw * d2d2 + m.GIt * d1d1);
        // siła podłużna (ściskanie +): N·[u′² + v′² + r0²φ′² + 2z0·u′φ′ − 2y0·v′φ′]
        if (N) {
          kg[UI[a]][UI[b]] += W * N * d1d1; kg[VI[a]][VI[b]] += W * N * d1d1; kg[PI[a]][PI[b]] += W * N * r02 * d1d1;
          if (z0) { kg[UI[a]][PI[b]] += W * N * z0 * d1d1; kg[PI[b]][UI[a]] += W * N * z0 * d1d1; }
          if (y0) { kg[VI[a]][PI[b]] -= W * N * y0 * d1d1; kg[PI[b]][VI[a]] -= W * N * y0 * d1d1; }
        }
        // M_y: 2·M_y·u″φ − M_y·β_z·φ′²   (jak w zwichrzeniu belek)
        if (My) { const c = My * H.d2[a] * H.N[b]; kg[UI[a]][PI[b]] += W * c; kg[PI[b]][UI[a]] += W * c; kg[PI[a]][PI[b]] -= W * My * bZ * d1d1; }
        // M_z: −2·M_z·v″φ − M_z·β_y·φ′²
        if (Mz) { const c = Mz * H.d2[a] * H.N[b]; kg[VI[a]][PI[b]] -= W * c; kg[PI[b]][VI[a]] -= W * c; kg[PI[a]][PI[b]] -= W * Mz * bY * d1d1; }
        if (qh) kg[PI[a]][PI[b]] += W * qh * NN;
      }
    }
    const i0 = 6 * e;
    for (let a = 0; a < 12; a++) for (let b = a; b < 12; b++) { if (ke[a][b]) bandAdd(KE, i0 + a, i0 + b, ke[a][b]); if (kg[a][b]) bandAdd(KG, i0 + a, i0 + b, kg[a][b]); }
  }
  (m.ptz || []).forEach(p => { const i = F.nodeAt(xs, p.x); bandAdd(KG, 6 * i + 4, 6 * i + 4, p.P * p.e); });
  const Lt = xs[nn - 1] - xs[0], kref = Math.max(m.EIz, m.EIy, m.GIt * Lt * Lt / 10, m.EIw / (Lt * Lt)) / Math.pow(Lt / 20, 3) * 1e4;
  (m.springs || []).forEach(s => {
    const i = F.nodeAt(xs, s.x), a = 6 * i, v = 6 * i + 2, b = 6 * i + 4;
    if (s.zr !== undefined && s.k !== 0) { const k = s.k === 'rigid' || s.k === undefined ? kref : s.k; bandAdd(KE, a, a, k); bandAdd(KE, a, b, -k * s.zr); bandAdd(KE, b, b, k * s.zr * s.zr); }
    if (s.kv) { const k = s.kv === 'rigid' ? kref : s.kv; bandAdd(KE, v, v, k); }
    if (s.kt) { const k = s.kt === 'rigid' ? kref * Lt * Lt : s.kt; bandAdd(KE, b, b, k); }
    if (s.kru) bandAdd(KE, a + 1, a + 1, s.kru);      // sprężyna obrotowa (u′)
    if (s.krv) bandAdd(KE, v + 1, v + 1, s.krv);      // sprężyna obrotowa (v′)
  });
  const fixed = new Set();
  // pola nieaktywne – zablokowane w całości
  for (let i = 0; i < nn; i++) {
    if (!fl.u) { fixed.add(6 * i); fixed.add(6 * i + 1); }
    if (!fl.v) { fixed.add(6 * i + 2); fixed.add(6 * i + 3); }
    if (!fl.phi) { fixed.add(6 * i + 4); fixed.add(6 * i + 5); }
  }
  (m.bc || []).forEach(b => { const i = F.nodeAt(xs, b.x); if (b.u) fixed.add(6 * i); if (b.du) fixed.add(6 * i + 1); if (b.v) fixed.add(6 * i + 2); if (b.dv) fixed.add(6 * i + 3); if (b.phi) fixed.add(6 * i + 4); if (b.dphi) fixed.add(6 * i + 5); });
  const r = F.genEig(KE, KG, fixed, 120);
  if (r.err) return { lam: NaN, err: r.err };
  if (!r.vec) return { lam: r.lam, mode: null };
  const u = [], v = [], phi = [];
  for (let i = 0; i < nn; i++) { u.push(r.vec[6 * i]); v.push(r.vec[6 * i + 2]); phi.push(r.vec[6 * i + 4]); }
  return { lam: r.lam, mode: { xs: xs.slice(), u, v, phi } };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
