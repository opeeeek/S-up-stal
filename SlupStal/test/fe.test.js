// Weryfikacja MES wobec rozwiązań zamkniętych
const path = require('path');
const E = path.join(__dirname, '..', 'src', 'engine');
['core', 'normy', 'materialy', 'przekroje', 'mes'].forEach(f => require(path.join(E, f + '.js')));
const F = BS.FE, P = BS.P, U = BS.U;
let fails = 0;
const chk = (name, got, exp, tol) => { const r = Math.abs(got - exp) / Math.abs(exp); const ok = r <= (tol || 1e-3); if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${got.toPrecision(6)} vs ${exp.toPrecision(6)} (${(r * 100).toFixed(3)}%)`); };
const L = 6000, EI = 210000 * 8357e4, Nn = 1e5;
const xs = F.mesh([0, L], L, L / 40), ne = xs.length - 1, Nel = new Float64Array(ne).fill(Nn);
// 1. wyboczenie przegub-przegub
let r = F.buck2({ xs, EI, Nel, sup: [{ x: 0, kv: 'fix', kr: 0 }, { x: L, kv: 'fix', kr: 0 }] });
chk('Ncr pinned', r.alpha * Nn, Math.PI ** 2 * EI / L ** 2);
r = F.buck2({ xs, EI, Nel, sup: [{ x: 0, kv: 'fix', kr: 'fix' }] });
chk('Ncr cantilever', r.alpha * Nn, Math.PI ** 2 * EI / (4 * L ** 2));
r = F.buck2({ xs, EI, Nel, sup: [{ x: 0, kv: 'fix', kr: 'fix' }, { x: L, kv: 'fix', kr: 0 }] });
chk('Ncr fixed-pinned', r.alpha * Nn, Math.PI ** 2 * EI / (0.6992 * L) ** 2, 2e-3);
// 2. II rząd: przegub-przegub, q równomierne + N
const q = 5, N2 = 0.5 * Math.PI ** 2 * EI / L ** 2;
const res = F.col2({ xs, EI, Nel: new Float64Array(ne).fill(N2), sup: [{ x: 0, kv: 'fix', kr: 0 }, { x: L, kv: 'fix', kr: 0 }], dist: [{ x0: 0, x1: L, q0: q, q1: q }] });
const sm = F.sample2(res); const Mmid = Math.max(...sm.M.map(Math.abs));
const k = Math.sqrt(N2 / EI), Mex = q * EI / N2 * (1 / Math.cos(k * L / 2) - 1);
chk('M II rząd (q + N)', Mmid, Mex, 2e-3);
// 3. II rząd ze wspornikiem: siła H na wierzchu + N, M podstawy = H·tan(kL)/k
const H = 1e4, N3 = 0.3 * Math.PI ** 2 * EI / (4 * L * L);
const res3 = F.col2({ xs, EI, Nel: new Float64Array(ne).fill(N3), sup: [{ x: 0, kv: 'fix', kr: 'fix' }], point: [{ x: L, P: H }] });
const k3 = Math.sqrt(N3 / EI);
chk('M podstawy wspornika II rząd', Math.abs(res3.reactions[0].M), H * Math.tan(k3 * L) / k3, 2e-3);
// 4. imperfekcja łukowa e0: przegub-przegub, M_mid = N·e0/(1 − N/Ncr) (sinusoida)
const e0 = L / 250, d0 = new Float64Array(2 * xs.length); xs.forEach((x, i) => { d0[2 * i] = e0 * Math.sin(Math.PI * x / L); d0[2 * i + 1] = e0 * Math.PI / L * Math.cos(Math.PI * x / L); });
const res4 = F.col2({ xs, EI, Nel: new Float64Array(ne).fill(N2), sup: [{ x: 0, kv: 'fix', kr: 0 }, { x: L, kv: 'fix', kr: 0 }], d0 });
chk('M od imperfekcji e0', Math.max(...F.sample2(res4).M.map(Math.abs)), N2 * e0 / (1 - 0.5), 2e-3);
// 5. Własow – HEB 300, L = 6 m
const s = P.props({ typ: 'walc', seria: 'HEB', nr: 300 });
const base = { xs, EIy: 210000 * s.Iy, EIz: 210000 * s.Iz, EIw: 210000 * s.Iw, GIt: 81000 * s.It, A: s.A, Iy: s.Iy, Iz: s.Iz, y0: 0, z0: s.z0, betaZ: s.betaZ };
const fork = [{ x: 0, u: true, v: true, phi: true }, { x: L, u: true, v: true, phi: true }];
r = F.ft(Object.assign({}, base, { fields: { u: true, v: false, phi: false }, Nel, bc: fork }));
chk('Ncr,z (Własow)', r.lam * Nn, Math.PI ** 2 * 210000 * s.Iz / L ** 2);
r = F.ft(Object.assign({}, base, { fields: { u: false, v: false, phi: true }, Nel, bc: fork }));
const i02 = (s.Iy + s.Iz) / s.A;
chk('Ncr,T (widełki)', r.lam * Nn, (81000 * s.It + Math.PI ** 2 * 210000 * s.Iw / L ** 2) / i02);
const M0 = 1e8;
r = F.ft(Object.assign({}, base, { fields: { u: true, v: false, phi: true }, Mye: () => [M0, M0, M0], bc: fork }));
const Mcr0 = Math.PI / L * Math.sqrt(210000 * s.Iz * 81000 * s.It * (1 + Math.PI ** 2 * 210000 * s.Iw / (L * L * 81000 * s.It)));
chk('Mcr (M = const)', r.lam * M0, Mcr0, 2e-3);
// moment liniowy ψ = 0 → C1 ≈ 1,77 (wg ECCS ok. 1,77–1,88)
r = F.ft(Object.assign({}, base, { fields: { u: true, v: false, phi: true }, Mye: (e) => { const a = 1 - xs[e] / L, b = 1 - xs[e + 1] / L; return [M0 * a, M0 * (a + b) / 2, M0 * b]; }, bc: fork }));
console.log('C1 (ψ = 0) =', (r.lam * M0 / Mcr0).toFixed(3), '(oczekiwane ok. 1,77)');
// 6. monosymetryczny dwuteownik spawany – Ncr,TF (wzór z dwiema postaciami)
const m2 = P.props({ typ: 'spaw', h: 500, bg: 300, tg: 20, bd: 200, td: 16, tw: 10, aw: 5 });
const b2 = { xs, EIy: 210000 * m2.Iy, EIz: 210000 * m2.Iz, EIw: 210000 * m2.Iw, GIt: 81000 * m2.It, A: m2.A, Iy: m2.Iy, Iz: m2.Iz, y0: 0, z0: m2.z0, betaZ: m2.betaZ };
r = F.ft(Object.assign({}, b2, { fields: { u: true, v: false, phi: true }, Nel, bc: fork }));
const Nz = Math.PI ** 2 * 210000 * m2.Iz / L ** 2, i0s = (m2.Iy + m2.Iz) / m2.A + m2.z0 ** 2, NT = (81000 * m2.It + Math.PI ** 2 * 210000 * m2.Iw / L ** 2) / i0s, bt = 1 - m2.z0 ** 2 / i0s;
const NTF = ((Nz + NT) - Math.sqrt((Nz + NT) ** 2 - 4 * bt * Nz * NT)) / (2 * bt);
chk('Ncr,TF (monosymetryczny)', r.lam * Nn, NTF, 2e-3);
// 7. RHS / CHS – sprawdzenie, że Mcr bardzo duże
console.log(fails ? `\n${fails} BŁĘDÓW` : '\nWszystkie testy MES zaliczone');
process.exitCode = fails ? 1 : 0;
