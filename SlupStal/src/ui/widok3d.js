/* =====================================================================
   SłupStal – zakładka „Słup i podstawa” (jak „Zbrojenie słupa” w SłupŻB):
   • widok 2D: słup w dwóch płaszczyznach z blachą podstawy, podlewką,
     fundamentem, kotwami, głowicą i stężeniami – elementy klikalne
     (przekrój, podstawa, fundament, stężenia, podpory), przekrój i siły
     pod kursorem (panel obok), klik – siły i sprawdzenia na tej wysokości;
   • widok 3D (canvas): obrót, przesuw, powiększenie (mysz, dotyk, Ctrl +
     kółko, +/−, ⌂), cieniowanie ścian, opcjonalnie obciążenia i postacie
     utraty stateczności (giętna, giętno-skrętna u–φ, zwichrzenie) oraz
     przemieszczenia SGU – w skali powiększonej;
   • zestawienie materiałów (słup, blachy, kotwy, spoiny) i eksport DXF
     (AutoCAD R12, ASCII): widok słupa i rzut blachy podstawy z wymiarami.
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, D = BS.D, Q = BS.Q, M = BS.M;
const { $, $$, esc, fmt, tx, svgOpen } = Q;
const W3 = BS.W3 = {};
const A = () => BS.A;
const C = D.C;

/* ================================================================ GEOMETRIA 3D */
// układ: X – oś y przekroju (szerokość pasa), Y – oś słupa (w górę), Z – oś z przekroju (wysokość h); [mm]
function sceneOf(S, R, opt) {
  opt = opt || {};
  const sec = R.sec, H = R.md ? R.md.H : U.num(S.geom.H) * 1000;
  const faces = [], lines = [], labels = [];
  const NS = 12;                                    // podział słupa na wysokości (kolejność rysowania)
  const box = (x0, x1, y0, y1, z0, z1, col, kind, alpha) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]].forEach(f => faces.push({ p: f.map(i => c[i]), col, kind, alpha: alpha === undefined ? 1 : alpha }));
  };
  const boxCol = (x0, x1, z0, z1, y0, y1, col, kind) => { for (let i = 0; i < NS; i++) box(x0, x1, y0 + (y1 - y0) * i / NS, y0 + (y1 - y0) * (i + 1) / NS, z0, z1, col, kind); };
  const cyl = (r, y0, y1, col, kind, inner, nY) => {
    const n = 28; nY = nY || NS;
    for (let k = 0; k < nY; k++) {
      const ya = y0 + (y1 - y0) * k / nY, yb = y0 + (y1 - y0) * (k + 1) / nY;
      for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, b = (i + 1) / n * 2 * Math.PI; const p = [[r * Math.cos(a), ya, r * Math.sin(a)], [r * Math.cos(b), ya, r * Math.sin(b)], [r * Math.cos(b), yb, r * Math.sin(b)], [r * Math.cos(a), yb, r * Math.sin(a)]]; faces.push({ p: inner ? p.reverse() : p, col, kind, alpha: 1 }); }
    }
  };
  const ring = (ro, ri, y, col, kind, up) => { const n = 28; for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, b = (i + 1) / n * 2 * Math.PI; const p = [[ro * Math.cos(a), y, ro * Math.sin(a)], [ro * Math.cos(b), y, ro * Math.sin(b)], [ri * Math.cos(b), y, ri * Math.sin(b)], [ri * Math.cos(a), y, ri * Math.sin(a)]]; faces.push({ p: up ? p.reverse() : p, col, kind, alpha: 1 }); } };
  const STEEL = '#9fb0c8', PLATE = '#7f8ea8', CONC = '#c9ced6', ANCH = '#c0262d', BRACE = '#c98a2e';
  // ---- słup
  if (sec.kind === 'I') {
    const h = sec.h, bg = sec.bg, bd = sec.bd, tg = sec.tg, td = sec.td, tw = sec.tw, z0 = -h / 2;
    boxCol(-bd / 2, bd / 2, z0, z0 + td, 0, H, STEEL, 'col');
    boxCol(-bg / 2, bg / 2, z0 + h - tg, z0 + h, 0, H, STEEL, 'col');
    boxCol(-tw / 2, tw / 2, z0 + td, z0 + h - tg, 0, H, STEEL, 'col');
  } else if (sec.kind === 'RHS') {
    const h = sec.h, b = sec.b, t = sec.t;
    boxCol(-b / 2, b / 2, -h / 2, -h / 2 + t, 0, H, STEEL, 'col'); boxCol(-b / 2, b / 2, h / 2 - t, h / 2, 0, H, STEEL, 'col');
    boxCol(-b / 2, -b / 2 + t, -h / 2 + t, h / 2 - t, 0, H, STEEL, 'col'); boxCol(b / 2 - t, b / 2, -h / 2 + t, h / 2 - t, 0, H, STEEL, 'col');
  } else { cyl(sec.D / 2, 0, H, STEEL, 'col'); cyl(sec.D / 2 - sec.t, 0, H, STEEL, 'col', true); ring(sec.D / 2, sec.D / 2 - sec.t, H, STEEL, 'col', true); }
  const hh = sec.h, bb = sec.kind === 'I' ? Math.max(sec.bg, sec.bd) : sec.b;
  // ---- głowica (orientacyjnie) gdy wierzchołek podparty
  const topSup = R.md && ['prz', 'utw', 'utwp'].some(g => R.md.bc.gora.y === g || R.md.bc.gora.z === g);
  if (topSup && sec.kind !== 'CHS') box(-bb / 2 - 20, bb / 2 + 20, H, H + 15, -hh / 2 - 20, hh / 2 + 20, PLATE, 'cap');
  // ---- podstawa
  const pb = R.pb && R.pb.C && !R.pb.C.err.length ? R.pb.C : null;
  const o = S.podstawa || {};
  if (o.aktywna && pb) {
    const lp = pb.lp, bp = pb.bp, tp = pb.tp, tg = pb.tg || 0;
    box(-bp / 2, bp / 2, -tp, 0, -lp / 2, lp / 2, PLATE, 'plate');
    if (tg > 0) box(-bp / 2 + 5, bp / 2 - 5, -tp - tg, -tp, -lp / 2 + 5, lp / 2 - 5, '#b7bcc5', 'grout');
    if (opt.found !== false) {
      const aF = U.num(o.aF) || bp + 600, bF = U.num(o.bF) || lp + 600, hF = Math.min(U.num(o.hF) || 800, 1200);
      box(-aF / 2, aF / 2, -tp - tg - hF, -tp - tg, -bF / 2, bF / 2, CONC, 'found', 0.32);
    }
    // kotwy
    const pts = [];
    if (pb.uk === 'zew') [1, -1].forEach(sz => [1, -1].forEach(sy => pts.push([sy * pb.w / 2, sz * pb.zT])));
    else if (pb.nb === 2) [1, -1].forEach(sy => pts.push([sy * pb.w / 2, 0]));
    else [1, -1].forEach(sz => [1, -1].forEach(sy => pts.push([sy * pb.w / 2, sz * pb.zT])));
    const lA = Math.max(300, 20 * pb.d);
    pts.forEach(([x, z]) => {
      lines.push({ a: [x, 1.6 * pb.d, z], b: [x, -tp - tg - lA, z], col: ANCH, w: Math.max(2, pb.d / 9), kind: 'anchor' });
      box(x - 0.9 * pb.d, x + 0.9 * pb.d, 0, 0.8 * pb.d, z - 0.9 * pb.d, z + 0.9 * pb.d, '#6b7584', 'nut');
    });
  }
  // ---- stężenia (rygle / stężenia – odcinki 600 mm)
  (S.stezenia || []).forEach((zz, i) => {
    const y = U.num(zz.x) * 1000; if (!(y > 0 && y < H)) return;
    const zOff = zz.wys === 'pas+' ? hh / 2 + 60 : zz.wys === 'pas-' ? -hh / 2 - 60 : 0;
    if (zz.pl === 'z' || zz.pl === 'yz') { const zc = zz.wys === 'srodek' ? hh / 2 + 60 : zOff; box(-bb / 2 - 700, bb / 2 + 700, y - 70, y + 70, zc - 25, zc + 25, BRACE, 'brace'); labels.push({ p: [bb / 2 + 720, y, zc], t: `S${i + 1}`, c: '#a35d00' }); }
    if (zz.pl === 'y' || zz.pl === 'yz') { box(-25, 25, y - 70, y + 70, -hh / 2 - 700, hh / 2 + 700, BRACE, 'brace'); labels.push({ p: [0, y, hh / 2 + 720], t: `S${i + 1}`, c: '#a35d00' }); }
  });
  // ---- obciążenia (charakterystyczne)
  if (opt.loads && R.md) {
    const L = Math.max(400, H * 0.09);
    let nTop = 0;
    (S.obciazenia || []).forEach(ld => {
      if (ld.aktywne === false) return;
      const col = D.loadColor(ld);
      (ld.sklad || []).forEach(p => {
        const x = p.x === '' || p.x === undefined ? H : U.num(p.x) * 1000;
        if (p.typ === 'N') { const ez = U.num(p.ez, 0), ey = U.num(p.ey, 0), F = U.num(p.F); const top = [ey, x + (F >= 0 ? L : 0) + 60, ez], bot = [ey, x + (F >= 0 ? 0 : L) + 60, ez]; lines.push({ a: top, b: bot, col, w: 2, kind: 'load', arrow: true }); labels.push({ p: [ey, x + L + 140 + (nTop++) * L * 0.28, ez], t: `${ld.id} ${fmt(Math.abs(F), 0)} kN`, c: col }); }
        else if (p.typ === 'H') { const F = U.num(p.F), d = F >= 0 ? 1 : -1; const tip = p.kier === 'z' ? [0, x, -d * (hh / 2 + 10)] : [-d * (bb / 2 + 10), x, 0], tail = p.kier === 'z' ? [0, x, -d * (hh / 2 + 10 + L)] : [-d * (bb / 2 + 10 + L), x, 0]; lines.push({ a: tail, b: tip, col, w: 2, kind: 'load', arrow: true }); labels.push({ p: tail, t: `${ld.id} ${fmt(Math.abs(F), 1)} kN`, c: col }); }
        else if (p.typ === 'q') {
          const x0 = p.x0 === '' || p.x0 === undefined ? 0 : U.num(p.x0) * 1000, x1 = p.x1 === '' || p.x1 === undefined ? H : U.num(p.x1) * 1000, d = U.num(p.q0) >= 0 ? 1 : -1;
          for (let k = 0; k <= 6; k++) { const y = x0 + (x1 - x0) * k / 6; const tip = p.kier === 'z' ? [0, y, -d * (hh / 2 + 10)] : [-d * (bb / 2 + 10), y, 0], tail = p.kier === 'z' ? [0, y, -d * (hh / 2 + 10 + L * 0.6)] : [-d * (bb / 2 + 10 + L * 0.6), y, 0]; lines.push({ a: tail, b: tip, col, w: 1.2, kind: 'load', arrow: true }); }
          labels.push({ p: p.kier === 'z' ? [0, (x0 + x1) / 2, -d * (hh / 2 + L * 0.7)] : [-d * (bb / 2 + L * 0.7), (x0 + x1) / 2, 0], t: `${ld.id} ${fmt(Math.abs(U.num(p.q0)), 2)} kN/m`, c: col });
        }
      });
    });
  }
  // ---- postać / przemieszczenia (krawędzie przekroju po deformacji)
  if (opt.mode && opt.mode !== 'none') { const def = deformOf(S, R, opt.mode); if (def) { def.lines.forEach(l => lines.push(l)); if (def.note) labels.push({ p: [0, H + 300, 0], t: def.note, c: '#a35d00', screen: true }); } }
  labels.push({ p: [bb / 2 + 160, 0, -hh / 2], t: '±0,00', c: '#4a5466' }, { p: [bb / 2 + 160, H, -hh / 2], t: `+${fmt(H / 1000, 2)}`, c: '#4a5466' });
  return { faces, lines, labels, H, hh, bb };
}
W3.scene = sceneOf;

// punkty charakterystyczne przekroju (X, Z względem środka geometrycznego)
function keyPts(sec) {
  if (sec.kind === 'I') { const h = sec.h; return [[-sec.bg / 2, h / 2], [sec.bg / 2, h / 2], [0, h / 2], [0, -h / 2], [-sec.bd / 2, -h / 2], [sec.bd / 2, -h / 2]]; }
  if (sec.kind === 'RHS') return [[-sec.b / 2, sec.h / 2], [sec.b / 2, sec.h / 2], [sec.b / 2, -sec.h / 2], [-sec.b / 2, -sec.h / 2]];
  const n = 12, r = sec.D / 2, o = []; for (let i = 0; i < n; i++) o.push([r * Math.cos(2 * Math.PI * i / n), r * Math.sin(2 * Math.PI * i / n)]); return o;
}
const keyEdges = (sec) => (sec.kind === 'I' ? [[0, 1], [2, 3], [4, 5]] : sec.kind === 'RHS' ? [[0, 1], [1, 2], [2, 3], [3, 0]] : Array.from({ length: 12 }, (_, i) => [i, (i + 1) % 12]));
// deformacja: funkcje u(x) [kierunek y → X], v(x) [kierunek z → Z], φ(x)
function deformOf(S, R, mode) {
  const sec = R.sec, H = R.md.H, gov = BS.Raport.govMember(R);
  let xs, u, v, phi, note = '';
  if (mode === 'TF' || mode === 'LT' || mode === 'flexy' || mode === 'flexz') {
    if (!gov) return null;
    const mem = gov.mem;
    if (mode === 'TF' && mem.nc && mem.nc.TF && mem.nc.TF.mode) { const m = mem.nc.TF.mode; xs = m.xs; u = m.u; v = m.u.map(() => 0); phi = m.phi; note = `postać giętno-skrętna (u, φ): N_cr,TF = ${fmt(mem.tors.NcrTF / 1e3, 0)} kN`; }
    else if (mode === 'LT' && mem.mcr && mem.mcr.mode) { const m = mem.mcr.mode; xs = m.xs; u = m.u; v = m.u.map(() => 0); phi = m.phi; const s0 = mem.segs[0]; note = `postać zwichrzenia (u, φ)${s0 && isFinite(s0.Mcr) ? `: M_cr = ${fmt(s0.Mcr / 1e6, 0)} kNm` : ''}`; }
    else if ((mode === 'flexy' || mode === 'flexz') && mem.flex[mode === 'flexy' ? 'y' : 'z'].mode) { const pl = mode === 'flexy' ? 'y' : 'z', m = mem.flex[pl].mode; xs = m.xs; if (pl === 'y') { v = m.w; u = m.w.map(() => 0); } else { u = m.w; v = m.w.map(() => 0); } phi = m.w.map(() => 0); note = `postać giętna ${pl}–${pl}: N_cr = ${fmt(mem.flex[pl].Ncr / 1e3, 0)} kN, L_cr = ${fmt(mem.flex[pl].Lcr / 1000, 2)} m`; }
    else return null;
  } else if (mode === 'sgu') {
    const q = R.sgu && (R.sgu.y || R.sgu.z); if (!q) return null;
    let F; try { F = R.method === 'I' ? BS.S.combine1(R.md, R.an, q.combo) : BS.S.combine2(R.md, R.an, R.sec, q.combo, { phi: 0 }); } catch (e) { return null; }
    xs = Array.from(R.an.xs3); v = Array.from(F.y.w); u = Array.from(F.z.w); phi = xs.map(() => 0);
    note = `przemieszczenia SGU – ${q.combo.opis}`;
  } else return null;
  // skala: największe przemieszczenie punktu przekroju = 9% wysokości
  const kp = keyPts(sec), zs = sec.kind === 'I' ? sec.zs - sec.h / 2 : 0;
  const disp = (i, k) => { const [X, Z] = kp[k]; return [u[i] - (Z - zs) * phi[i], v[i] + X * phi[i]]; };
  let mx = 1e-12; xs.forEach((x, i) => kp.forEach((p, k) => { const d = disp(i, k); mx = Math.max(mx, Math.hypot(d[0], d[1])); }));
  const amp = 0.09 * H / mx;
  const lines = [], E = keyEdges(sec), col = '#a35d00';
  const P = (i, k) => { const d = disp(i, k); return [kp[k][0] + amp * d[0], xs[i], kp[k][1] + amp * d[1]]; };
  kp.forEach((_, k) => { for (let i = 0; i < xs.length - 1; i++) lines.push({ a: P(i, k), b: P(i + 1, k), col, w: 1.4, kind: 'def' }); });
  const step = Math.max(1, Math.floor(xs.length / 10));
  for (let i = 0; i < xs.length; i += step) E.forEach(([a, b]) => lines.push({ a: P(i, a), b: P(i, b), col, w: 1.1, kind: 'def' }));
  return { lines, note: note + ' (skala powiększona)' };
}

/* ================================================================ RENDER 3D */
const V3 = { yaw: -0.65, pitch: 0.28, k: 1, px: 0, py: 0, mode: 'rot' };
W3.V3 = V3;
const hex = (c) => { const h = c.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
W3.draw3D = function (cv, S, R, opt) {
  const sc = sceneOf(S, R, opt);
  const ctx = cv.getContext('2d'), W = +cv.getAttribute('width'), H = +cv.getAttribute('height'), dpr = window.devicePixelRatio || 1;
  cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr;
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const all = sc.faces.flatMap(f => f.p).concat(sc.lines.flatMap(l => [l.a, l.b]));
  const ext = [0, 1, 2].map(k => [Math.min(...all.map(p => p[k])), Math.max(...all.map(p => p[k]))]);
  const cen = ext.map(([a, b]) => (a + b) / 2), span = Math.max(ext[1][1] - ext[1][0], (ext[0][1] - ext[0][0]) * 1.2, (ext[2][1] - ext[2][0]) * 1.2);
  const base = Math.min((H - 80) / span, (W - 60) / span * 1.6);
  const LGT = (() => { const l = [0.35, 0.55, 0.75], n = Math.hypot(...l); return l.map(v => v / n); })();
  const render = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const cy = Math.cos(V3.yaw), sy = Math.sin(V3.yaw), cp = Math.cos(V3.pitch), sp = Math.sin(V3.pitch), s0 = base * V3.k;
    const cam = ([x, y, z]) => { const X0 = x - cen[0], Y0 = y - cen[1], Z0 = z - cen[2]; const X1 = X0 * cy + Z0 * sy, Z1 = -X0 * sy + Z0 * cy; const Y2 = Y0 * cp - Z1 * sp, Z2 = Y0 * sp + Z1 * cp; return [X1, Y2, Z2]; };
    const scr = (c) => [W / 2 + V3.px + c[0] * s0, H / 2 + V3.py - c[1] * s0, c[2]];
    const items = [];
    sc.faces.forEach(f => {
      const cs = f.p.map(cam);
      const e1 = [cs[1][0] - cs[0][0], cs[1][1] - cs[0][1], cs[1][2] - cs[0][2]], e2 = [cs[2][0] - cs[0][0], cs[2][1] - cs[0][1], cs[2][2] - cs[0][2]];
      const nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nl = Math.hypot(...nrm) || 1;
      const nn = nrm.map(v => v / nl);
      const lit = 0.42 + 0.58 * Math.abs(nn[0] * LGT[0] + nn[1] * LGT[1] - nn[2] * LGT[2]);
      items.push({ z: cs.reduce((a, q) => a + q[2], 0) / cs.length, poly: cs.map(scr), f, lit });
    });
    sc.lines.forEach(l => { const a = cam(l.a), b = cam(l.b); items.push({ z: (a[2] + b[2]) / 2 + (l.kind === 'def' || l.kind === 'load' ? 1e6 : 0), line: [scr(a), scr(b)], l }); });
    items.sort((u, v) => u.z - v.z);
    items.forEach(it => {
      if (it.poly) {
        const [r, g, b] = hex(it.f.col), k = it.lit, a = it.f.alpha;
        ctx.beginPath(); it.poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
        ctx.fillStyle = `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`; ctx.fill();
        ctx.strokeStyle = it.f.kind === 'found' ? (dark ? 'rgba(200,210,225,0.25)' : 'rgba(80,90,105,0.25)') : (dark ? 'rgba(20,25,35,0.35)' : 'rgba(30,38,52,0.30)'); ctx.lineWidth = 0.6; ctx.stroke();
      } else {
        const [p1, p2] = it.line, l = it.l;
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.strokeStyle = l.col; ctx.lineWidth = l.w * Math.max(0.7, Math.min(2.2, V3.k)); ctx.lineCap = 'round'; ctx.stroke();
        if (l.arrow) { const ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]), hs = 8; ctx.beginPath(); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(p2[0] - hs * Math.cos(ang - 0.4), p2[1] - hs * Math.sin(ang - 0.4)); ctx.lineTo(p2[0] - hs * Math.cos(ang + 0.4), p2[1] - hs * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fillStyle = l.col; ctx.fill(); }
      }
    });
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'start';
    sc.labels.forEach(lb => { if (lb.screen) return; const p = scr(cam(lb.p)); ctx.fillStyle = dark ? '#e9eef6' : lb.c; ctx.fillText(lb.t, p[0] + 4, p[1] - 3); });
    // osie układu
    const o0 = scr(cam([0, 0, 0])), axis = (v, t, col) => { const p = scr(cam(v)); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(o0[0], o0[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.fillStyle = col; ctx.fillText(t, p[0] + 3, p[1] - 3); };
    const La = Math.max(sc.hh, sc.bb) * 0.9 + 150;
    axis([La, 0, 0], 'y', '#1d5bb8'); axis([0, 0, La], 'z', '#1d5bb8'); axis([0, La * 1.2, 0], 'x', '#1d5bb8');
    ctx.fillStyle = dark ? '#c9d4e6' : '#3d4656';
    const note = sc.labels.find(l => l.screen);
    if (note) { ctx.fillStyle = '#a35d00'; ctx.fillText(note.t.replace(/_([A-Za-z,]+)/g, '$1'), 10, H - 42); ctx.fillStyle = dark ? '#c9d4e6' : '#3d4656'; }
    ctx.fillText(`${R.sec.nazwa} · ${S.material.gatunek}${S.material.podgatunek} · H = ${fmt(sc.H / 1000, 2)} m${R.pb && R.pb.C && !R.pb.C.err.length ? ` · blacha ${fmt(R.pb.C.lp, 0)}×${fmt(R.pb.C.bp, 0)}×${fmt(R.pb.C.tp, 0)}, kotwy ${R.pb.C.nb}×${S.podstawa.kotwy.d}` : ''}`, 10, H - 26);
    ctx.fillText(`obrót ${Math.round(V3.yaw * 180 / Math.PI)}°, pochylenie ${Math.round(V3.pitch * 180 / Math.PI)}°, powiększenie ${Math.round(V3.k * 100)}% · tryb: ${V3.mode === 'pan' ? 'przesuw' : 'obrót'}`, 10, H - 10);
  };
  render();
  const zoomAt = (f, mx, my) => { const k1 = Math.max(0.2, Math.min(40, V3.k * f)), q = k1 / V3.k; V3.px = (mx - W / 2) - (mx - W / 2 - V3.px) * q; V3.py = (my - H / 2) - (my - H / 2 - V3.py) * q; V3.k = k1; };
  const loc = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  const pts = new Map(); let drag = null, pinch = null;
  cv.oncontextmenu = e => e.preventDefault();
  cv.onpointerdown = e => {
    cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, loc(e));
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v: Object.assign({}, V3) }; drag = null; return; }
    const pan = V3.mode === 'pan' || e.shiftKey || e.button === 1 || e.button === 2;
    drag = { x: e.clientX, y: e.clientY, v: Object.assign({}, V3), pan }; cv.classList.toggle('pan', pan);
  };
  cv.onpointermove = e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, loc(e));
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mm = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; Object.assign(V3, { k: pinch.v.k, px: pinch.v.px + mm[0] - pinch.m[0], py: pinch.v.py + mm[1] - pinch.m[1] }); zoomAt(d / pinch.d, mm[0], mm[1]); render(); return; }
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.pan) { V3.px = drag.v.px + dx; V3.py = drag.v.py + dy; }
    else { V3.yaw = drag.v.yaw + dx * 0.008; V3.pitch = Math.max(-1.45, Math.min(1.45, drag.v.pitch + dy * 0.008)); }
    render();
  };
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null; cv.classList.remove('pan'); };
  cv.onpointerup = up; cv.onpointercancel = up;
  cv.onwheel = e => { if (!e.ctrlKey) return; e.preventDefault(); const [mx, my] = loc(e); zoomAt(Math.exp(-e.deltaY * 0.002), mx, my); render(); };
  cv.ondblclick = () => { Object.assign(V3, { yaw: -0.65, pitch: 0.28, k: 1, px: 0, py: 0 }); render(); };
  const bar = cv.parentElement && cv.parentElement.querySelector('.v3tools');
  if (bar) {
    bar.querySelectorAll('[data-v3m]').forEach(b => { b.onclick = () => { V3.mode = b.dataset.v3m; bar.querySelectorAll('[data-v3m]').forEach(q => q.classList.toggle('on', q === b)); render(); }; });
    bar.querySelectorAll('[data-v3z]').forEach(b => { b.onclick = () => { zoomAt(+b.dataset.v3z > 0 ? 1.25 : 0.8, W / 2, H / 2); render(); }; });
    const rb = bar.querySelector('[data-v3r]'); if (rb) rb.onclick = () => cv.ondblclick();
    bar.querySelectorAll('[data-v3v]').forEach(b => { b.onclick = () => { const v = b.dataset.v3v; Object.assign(V3, v === 'xz' ? { yaw: 0, pitch: 0 } : v === 'xy' ? { yaw: -Math.PI / 2, pitch: 0 } : v === 'top' ? { yaw: 0, pitch: 1.45 } : { yaw: -0.65, pitch: 0.28 }, { px: 0, py: 0 }); render(); }; });
  }
  return { render };
};

/* ================================================================ WIDOK 2D (elewacja) */
// dwa widoki: płaszczyzna x–z (wysokość przekroju h) i x–y (szerokość b); skala pozioma powiększona
W3.elevSVG = function (S, R, o) {
  o = o || {};
  const sec = R.sec, H = R.md.H, W = o.W || 620, Hs = o.H || 720;
  const pb = R.pb && R.pb.C && !R.pb.C.err.length && S.podstawa.aktywna ? R.pb.C : null;
  const tp = pb ? pb.tp : 0, tg = pb ? pb.tg : 0, hF = 420;
  const zTop = H + 220, zBot = -(tp + tg + hF);
  const mt = 34, mb = 46, k = (Hs - mt - mb) / (zTop - zBot);
  const Y = z => Hs - mb - (z - zBot) * k;
  const views = [{ pl: 'y', t: 'Płaszczyzna x–z (M_y)', w: sec.h, wp: pb ? pb.lp : 0, an: pb ? (pb.uk === 'zew' ? [-pb.zT, pb.zT] : pb.nb === 2 ? [0] : [-pb.zT, pb.zT]) : [] },
                 { pl: 'z', t: 'Płaszczyzna x–y (M_z)', w: sec.kind === 'I' ? Math.max(sec.bg, sec.bd) : sec.b, wp: pb ? pb.bp : 0, an: pb ? [-pb.w / 2, pb.w / 2] : [] }];
  const fwOf = (v) => (pb ? Math.max(v.wp + 300, v.w + 500) : v.w + 200);
  const kx = Math.min(110 / Math.max(sec.h, sec.b || sec.h), (W / 2 - 70) / Math.max(...views.map(fwOf)));
  let s = svgOpen(W, Hs, `class="elevsvg" data-h="${H}" data-mt="${mt}" data-mb="${mb}" data-zb="${zBot}" data-zt="${zTop}" data-k="${k}"`);
  views.forEach((v, vi) => {
    const cx = W * (vi === 0 ? 0.27 : 0.73), X = d => cx + d * kx, w = v.w;
    s += tx(cx, 16, D.sub(v.t), { fs: 11.5, w: 650 });
    // fundament
    if (pb) {
      const fw = fwOf(v);
      s += `<g class="el-found" data-el="found" style="cursor:pointer"><title>Fundament – kliknij, aby zmienić (projektant podstawy)</title><rect x="${X(-fw / 2)}" y="${Y(-tp - tg)}" width="${fw * kx}" height="${Y(zBot) - Y(-tp - tg)}" fill="#eef0f3" stroke="#9aa3b0"/>` + tx(X(fw / 2) - 4, Y(zBot) - 6, `fundament ${esc(S.podstawa.beton)}`, { fs: 9, a: 'end', c: C.mut }) + '</g>';
      // podlewka i blacha
      s += `<g class="el-base" data-el="base" style="cursor:pointer"><title>Blacha podstawy ${fmt(pb.lp, 0)}×${fmt(pb.bp, 0)}×${fmt(pb.tp, 0)} mm – kliknij: projektant podstawy</title>`;
      if (tg > 0) s += `<rect x="${X(-v.wp / 2)}" y="${Y(-tp)}" width="${v.wp * kx}" height="${Math.max(2, tg * k)}" fill="#d9dde3" stroke="#9aa3b0" stroke-dasharray="3 2"/>`;
      s += `<rect x="${X(-v.wp / 2)}" y="${Y(0)}" width="${v.wp * kx}" height="${Math.max(4, tp * k)}" fill="#b9c3d3" stroke="${C.ink}"/>`;
      v.an.forEach(a => { s += `<line x1="${X(a)}" y1="${Y(0) - 12}" x2="${X(a)}" y2="${Y(zBot) - 10}" stroke="${C.red}" stroke-width="${Math.max(2, pb.d * kx * 0.9)}"/><rect x="${X(a) - 6}" y="${Y(0) - 9}" width="12" height="7" fill="${C.red}" fill-opacity="0.75"/>`; });
      s += '</g>';
    }
    // słup
    const yT = Y(H), yB = Y(0);
    s += `<g class="el-col" data-pl="${v.pl}" style="cursor:pointer"><title>Słup ${esc(sec.nazwa)} – kliknij: siły i sprawdzenia na tej wysokości; dwuklik: przekrój</title><rect x="${X(-w / 2)}" y="${yT}" width="${w * kx}" height="${yB - yT}" fill="${C.steel}" fill-opacity="0.55" stroke="${C.ink}" stroke-width="1.1"/>`;
    if (sec.kind === 'I' && v.pl === 'y') { s += `<line x1="${X(-w / 2 + sec.td)}" y1="${yT}" x2="${X(-w / 2 + sec.td)}" y2="${yB}" stroke="${C.ink}" stroke-width="0.7"/><line x1="${X(w / 2 - sec.tg)}" y1="${yT}" x2="${X(w / 2 - sec.tg)}" y2="${yB}" stroke="${C.ink}" stroke-width="0.7"/>`; }
    else if (sec.kind === 'I') s += `<line x1="${X(-sec.tw / 2)}" y1="${yT}" x2="${X(-sec.tw / 2)}" y2="${yB}" stroke="${C.ink}" stroke-width="0.6" stroke-dasharray="6 3"/><line x1="${X(sec.tw / 2)}" y1="${yT}" x2="${X(sec.tw / 2)}" y2="${yB}" stroke="${C.ink}" stroke-width="0.6" stroke-dasharray="6 3"/>`;
    else if (sec.kind === 'RHS') { const t = sec.t; s += `<line x1="${X(-w / 2 + t)}" y1="${yT}" x2="${X(-w / 2 + t)}" y2="${yB}" stroke="${C.ink}" stroke-width="0.6" stroke-dasharray="6 3"/><line x1="${X(w / 2 - t)}" y1="${yT}" x2="${X(w / 2 - t)}" y2="${yB}" stroke="${C.ink}" stroke-width="0.6" stroke-dasharray="6 3"/>`; }
    s += `<line x1="${X(0)}" y1="${yT - 14}" x2="${X(0)}" y2="${yB + 14}" stroke="${C.blu}" stroke-width="0.7" stroke-dasharray="10 3 2 3"/></g>`;
    // głowica i warunek u góry
    const g = R.md.bc.gora[v.pl];
    s += `<g class="el-top" data-pl="${v.pl}" style="cursor:pointer"><title>Warunki podparcia (${v.pl === 'y' ? 'x–z' : 'x–y'}) – kliknij, aby zmienić</title>`;
    if (['prz', 'utw', 'utwp'].includes(g)) s += `<rect x="${X(-w / 2) - 6}" y="${yT - 6}" width="${w * kx + 12}" height="6" fill="#b9c3d3" stroke="${C.ink}"/>`;
    s += tx(X(w / 2) + 10, yT + 4, esc(BS.S.GORA[g] || g), { fs: 9, a: 'start', c: C.mut }) + `<rect x="${X(-w / 2) - 10}" y="${yT - 16}" width="${w * kx + 120}" height="22" fill="transparent"/></g>`;
    // stężenia
    (S.stezenia || []).forEach((zz, i) => {
      const yy = Y(U.num(zz.x) * 1000); const act = zz.pl === (v.pl === 'y' ? 'y' : 'z') || zz.pl === 'yz';
      const side = zz.wys === 'pas-' ? -1 : 1;
      s += `<g class="el-brace" data-i="${i}" style="cursor:pointer"><title>Stężenie S${i + 1}: x = ${fmt(U.num(zz.x), 2)} m – kliknij, aby zmienić</title>`;
      if (act) s += `<line x1="${X(side * w / 2)}" y1="${yy}" x2="${X(side * w / 2) + side * 44}" y2="${yy}" stroke="#c98a2e" stroke-width="5"/>` + tx(X(side * w / 2) + side * 48, yy + 3, `S${i + 1}`, { fs: 9.5, a: side > 0 ? 'start' : 'end', c: C.warn, w: 650 });
      else s += `<circle cx="${X(0)}" cy="${yy}" r="3" fill="none" stroke="#c98a2e"/>`;
      s += '</g>';
    });
    // wymiary
    if (vi === 0) s += Q.dimV(X(-Math.max(w, v.wp) / 2) - 26, yT, yB, `H = ${fmt(H / 1000, 2)} m`, { fs: 10 });
    s += tx(X(Math.max(w, v.wp) / 2) + 8, yB - 3, '±0,00', { fs: 9, a: 'start', c: C.ink2 }) + tx(X(w / 2) + 8, yT + 16, `+${fmt(H / 1000, 2)}`, { fs: 9, a: 'start', c: C.ink2 });
    if (pb) s += Q.dimH(X(-v.wp / 2), X(v.wp / 2), Y(zBot) + 18, `${v.pl === 'y' ? 'l' : 'b'}<tspan baseline-shift="sub" font-size="75%">p</tspan> = ${fmt(v.wp, 0)}`, { below: true, fs: 9.5 });
    s += tx(cx, 29, `${v.pl === 'y' ? `h = ${fmt(sec.h, 0)} mm` : `b = ${fmt(w, 0)} mm`}`, { fs: 9.5, c: C.ink2 });
  });
  s += `<g class="hcur" style="display:none;pointer-events:none"><line x1="0" x2="${W}" y1="0" y2="0" stroke="${C.blu}" stroke-dasharray="4 3"/><text x="6" y="0" font-size="10" fill="#1d5bb8"></text></g>`;
  s += tx(W - 6, Hs - 6, 'skala pozioma powiększona', { fs: 8.5, a: 'end', c: C.mut });
  return s + '</svg>';
};

/* ---------------------------------------------------------------- siły na wysokości x */
W3.atX = function (R, x) {
  const xs = R.an.xs3; let i = 0; for (let j = 0; j < xs.length; j++) if (Math.abs(xs[j] - x) < Math.abs(xs[i] - x)) i = j;
  const e = R.env;
  return { i, x: xs[i], Nmax: e.Nmax[i], Nmin: e.Nmin[i], Mymax: e.My.max[i], Mymin: e.My.min[i], Mzmax: e.Mz.max[i], Mzmin: e.Mz.min[i], Vzmax: e.Vz.max[i], Vzmin: e.Vz.min[i], Vymax: e.Vy.max[i], Vymin: e.Vy.min[i], u: e.uSec[i] };
};
W3.hsecHTML = function (S, R, x) {
  if (!R || !R.env) return '';
  const q = W3.atX(R, x), sec = R.sec;
  const My = Math.abs(q.Mymax) >= Math.abs(q.Mymin) ? q.Mymax : q.Mymin, Mz = Math.abs(q.Mzmax) >= Math.abs(q.Mzmin) ? q.Mzmax : q.Mzmin;
  const gov = BS.Raport.govMember(R), seg = gov ? gov.mem.segs.find(sg => x >= sg.sg.x0 - 1 && x <= sg.sg.x1 + 1) : null;
  let h = `<h4>Przekrój na wysokości x = ${fmt(x / 1000, 2)} m</h4>${D.section(sec, { size: 190, sigma: { N: q.Nmax, My, Mz }, fy: R.mat.fy })}`;
  h += `<table class="kv"><tr><td>N<sub>Ed</sub> max / min</td><td>${fmt(q.Nmax / 1e3, 1)} / ${fmt(q.Nmin / 1e3, 1)}</td><td>kN</td></tr><tr><td>M<sub>y,Ed</sub> max / min</td><td>${fmt(q.Mymax / 1e6, 1)} / ${fmt(q.Mymin / 1e6, 1)}</td><td>kNm</td></tr><tr><td>M<sub>z,Ed</sub> max / min</td><td>${fmt(q.Mzmax / 1e6, 1)} / ${fmt(q.Mzmin / 1e6, 1)}</td><td>kNm</td></tr><tr><td>V<sub>z,Ed</sub> / V<sub>y,Ed</sub></td><td>${fmt(Math.max(Math.abs(q.Vzmax), Math.abs(q.Vzmin)) / 1e3, 1)} / ${fmt(Math.max(Math.abs(q.Vymax), Math.abs(q.Vymin)) / 1e3, 1)}</td><td>kN</td></tr><tr><td>wytężenie przekroju η</td><td><b style="color:var(--${q.u > 1 ? 'fail' : 'ok'})">${fmt(q.u * 100, 0)}%</b></td><td></td></tr>${seg ? `<tr><td>odcinek ${fmt(seg.sg.x0 / 1000, 2)}–${fmt(seg.sg.x1 / 1000, 2)} m</td><td>(6.61) ${fmt(seg.u61, 3)} · (6.62) ${fmt(seg.u62, 3)}</td><td></td></tr>` : ''}</table><p class="hint">Obwiednia SGN ${R.method !== 'I' ? '(II rząd)' : '(I rząd)'}; σ – dla N<sub>max</sub> i M o największej wartości bezwzględnej. Kliknij słup – szczegóły i sprawdzenia w tym miejscu.</p>`;
  return h;
};
// okno: siły i sprawdzenia na wysokości x (klik na słupie, na schemacie lub na wykresie)
W3.atXPopup = function (x) {
  const a = A(), R = a.R(), S = a.S(); if (!R || !R.env) return;
  const q = W3.atX(R, x), xs = q.x;
  const near = (re) => R.checks.filter(c => re.test(c.id)).sort((c1, c2) => Math.abs((c1.x === undefined ? 1e12 : c1.x) - xs) - Math.abs((c2.x === undefined ? 1e12 : c2.x) - xs))[0];
  const gov = BS.Raport.govMember(R), si = gov ? gov.mem.segs.findIndex(sg => xs >= sg.sg.x0 - 1 && xs <= sg.sg.x1 + 1) : -1;
  const cks = [near(/^MN$/), si >= 0 ? R.checks.find(c => c.id === 'I61_' + si) : null, si >= 0 ? R.checks.find(c => c.id === 'I62_' + si) : null, si >= 0 ? R.checks.find(c => c.id === 'LT' + si) : null].filter(Boolean);
  const m = Q.modal(`<h3>Słup na wysokości x = ${fmt(xs / 1000, 2)} m</h3>${W3.hsecHTML(S, R, xs).replace(/<h4>.*?<\/h4>/, '')}
    ${cks.length ? `<h4>Sprawdzenia w tym miejscu</h4><table class="ctab"><tbody>${cks.map(c => `<tr class="${c.status === 'ok' ? 'done' : ''}"><td>${Q.sym(c.n)}</td><td class="val xclick" data-cid="${esc(c.id)}"><b>${fmt(c.util * 100, 0)}%</b></td></tr>`).join('')}</tbody></table>` : ''}
    <div class="dbtn"><button class="btn" id="axLoad" type="button">Obciążenie w tym miejscu…</button><button class="btn" id="axBrace" type="button">Stężenie w tym miejscu…</button><span style="flex:1"></span><button class="btn pri" id="axClose" type="button">Zamknij</button></div>`, 'fpop');
  $$('[data-cid]', m).forEach(td => td.addEventListener('click', () => { const c = R.checks.find(q2 => q2.id === td.dataset.cid); if (c) a.explainPopup(c); }));
  $('#axClose', m).onclick = Q.closeModal;
  $('#axLoad', m).onclick = () => a.loadPopup(null, { x: Math.round(xs / 50) * 0.05 });
  $('#axBrace', m).onclick = () => { S.stezenia.push({ x: Math.round(xs / 50) * 0.05, pl: 'z', wys: 'pas+', skret: false }); Q.closeModal(); a.bracesPopup(S.stezenia.length - 1); };
};

/* ================================================================ ZESTAWIENIE MATERIAŁÓW */
W3.takeoff = function (S, R) {
  const rows = []; if (!R || !R.sec) return { rows, total: 0, welds: [] };
  const sec = R.sec, H = R.md.H, rho = 7.85e-6;
  let poz = 1;
  rows.push({ poz: poz++, n: `Słup ${sec.nazwa}`, mat: `${S.material.gatunek}${S.material.podgatunek}`, szt: 1, wym: `L = ${fmt(H, 0)} mm`, m: sec.masa * H / 1000 });
  const welds = [];
  const C0 = R.pb && R.pb.C && !R.pb.C.err.length && S.podstawa.aktywna ? R.pb.C : null;
  if (C0) {
    rows.push({ poz: poz++, n: 'Blacha podstawy', mat: `${C0.gat}`, szt: 1, wym: `${fmt(C0.tp, 0)}×${fmt(C0.bp, 0)}×${fmt(C0.lp, 0)}`, m: rho * C0.tp * C0.bp * C0.lp });
    const lA = Math.max(300, 20 * C0.d) + C0.tp + C0.tg + 2.5 * C0.d;
    rows.push({ poz: poz++, n: `Śruby kotwiące ${S.podstawa.kotwy.d} (długość orientacyjna; zakotwienie wg PN-EN 1992-4)`, mat: `kl. ${S.podstawa.kotwy.kl}`, szt: C0.nb, wym: `l ≈ ${fmt(lA, 0)} mm`, m: C0.nb * M.SRUBY[S.podstawa.kotwy.d].A * lA * rho });
    rows.push({ poz: poz++, n: `Nakrętki i podkładki ${S.podstawa.kotwy.d}`, mat: 'kpl.', szt: C0.nb, wym: '2 nakrętki + podkładka', m: C0.nb * 0.06 * Math.pow(C0.d / 10, 3) });
    const lf = C0.lwf * 2, lw = C0.lww;
    welds.push({ n: 'pasy słupa – blacha podstawy', a: C0.af, l: lf }, { n: 'środnik słupa – blacha podstawy', a: C0.aw, l: lw });
  }
  const total = rows.reduce((s, r) => s + r.m, 0);
  return { rows, total, welds };
};
W3.takeoffHTML = function (S, R) {
  const t = W3.takeoff(S, R);
  if (!t.rows.length) return '';
  let h = `<table class="sched"><thead><tr><th>poz.</th><th>element</th><th>materiał</th><th>szt.</th><th>wymiary</th><th>masa [kg]</th></tr></thead><tbody>`;
  t.rows.forEach(r => { h += `<tr><td class="n">${r.poz}</td><td>${esc(r.n)}</td><td>${esc(r.mat)}</td><td class="n">${r.szt}</td><td>${esc(r.wym)}</td><td class="n">${fmt(r.m, 1)}</td></tr>`; });
  h += `<tr class="tot"><td colspan="5">Razem (bez spoin i powłok)</td><td class="n">${fmt(t.total, 1)}</td></tr></tbody></table>`;
  if (t.welds.length) h += `<table class="sched" style="margin-top:8px"><thead><tr><th>spoiny pachwinowe</th><th>a [mm]</th><th>długość [mm]</th></tr></thead><tbody>${t.welds.map(w => `<tr><td>${esc(w.n)}</td><td class="n">${fmt(w.a, 0)}</td><td class="n">${fmt(w.l, 0)}</td></tr>`).join('')}</tbody></table>`;
  return h;
};

/* ================================================================ DXF (AutoCAD R12) */
const encD = t => String(t).replace(/[⌀ØøΦ]/g, '%%c').replace(/°/g, '%%d').replace(/±/g, '%%p').replace(/[^\x20-\x7e]/g, ch => '\\U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
const LAYERS = [['STAL', 7, 'CONTINUOUS'], ['BLACHY', 5, 'CONTINUOUS'], ['KOTWY', 1, 'CONTINUOUS'], ['BETON', 8, 'CONTINUOUS'], ['OSIE', 8, 'CENTER'], ['UKRYTE', 8, 'DASHED'], ['WYMIARY', 8, 'CONTINUOUS'], ['OPISY', 7, 'CONTINUOUS']];
function dxfWriter() {
  const o = [], bb = [Infinity, Infinity, -Infinity, -Infinity];
  const n = v => { const r = Math.round(v * 1000) / 1000; return Object.is(r, -0) ? '0' : String(r); };
  const add = (...a) => { for (let i = 0; i < a.length; i += 2) o.push(String(a[i]), String(a[i + 1])); };
  const ext = (x, y) => { if (!isFinite(x) || !isFinite(y)) return; bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); };
  const Wd = {
    line(x1, y1, x2, y2, L) { add(0, 'LINE', 8, L, 10, n(x1), 20, n(y1), 30, 0, 11, n(x2), 21, n(y2), 31, 0); ext(x1, y1); ext(x2, y2); },
    circle(x, y, r, L) { add(0, 'CIRCLE', 8, L, 10, n(x), 20, n(y), 30, 0, 40, n(r)); ext(x - r, y - r); ext(x + r, y + r); },
    text(x, y, h, t, L, al, rot) { const j = al === 'c' ? 1 : al === 'r' ? 2 : 0; add(0, 'TEXT', 8, L, 10, n(x), 20, n(y), 30, 0, 40, n(h), 1, encD(t)); if (rot) add(50, n(rot)); if (j) add(72, j, 11, n(x), 21, n(y), 31, 0); const w = String(t).length * h * 0.6; if (rot) { ext(x - h, y); ext(x, y + w); } else { const x0 = j === 1 ? x - w / 2 : j === 2 ? x - w : x; ext(x0, y); ext(x0 + w, y + h); } },
    pline(pts, L, closed) { for (let i = 0; i < pts.length - 1; i++) Wd.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], L); if (closed && pts.length > 2) Wd.line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], L); },
    rect(x0, y0, x1, y1, L) { Wd.pline([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], L, true); },
    dimH(x1, x2, y, label, h) { h = h || 2; Wd.line(x1, y, x2, y, 'WYMIARY'); [x1, x2].forEach(x => { Wd.line(x, y - 1.2, x, y + 1.2, 'WYMIARY'); Wd.line(x - 0.7, y - 0.7, x + 0.7, y + 0.7, 'WYMIARY'); }); if (label) Wd.text((x1 + x2) / 2, y + 0.8, h, label, 'WYMIARY', 'c'); },
    dimV(x, y1, y2, label, h) { h = h || 2; Wd.line(x, y1, x, y2, 'WYMIARY'); [y1, y2].forEach(y => { Wd.line(x - 1.2, y, x + 1.2, y, 'WYMIARY'); Wd.line(x - 0.7, y - 0.7, x + 0.7, y + 0.7, 'WYMIARY'); }); if (label) Wd.text(x - 0.8, (y1 + y2) / 2, h, label, 'WYMIARY', 'c', 90); },
    bbox: () => bb.slice(), out: () => o
  };
  return Wd;
}
W3.dxf = function (S, R) {
  const sec = R.sec, H = R.md.H, Dw = dxfWriter(), f0 = (v, d) => U.fmt(v, d).replace(/[\s  ]/g, '');
  const C0 = R.pb && R.pb.C && !R.pb.C.err.length && S.podstawa.aktywna ? R.pb.C : null;
  const tp = C0 ? C0.tp : 0, tg = C0 ? C0.tg : 0;
  // ---- widok słupa (płaszczyzna x–z) w skali 1:K
  const K = [10, 20, 25, 50].find(k => (H + 800) / k <= 280) || 100;
  const ox = 30, X = x => ox + x / K, Y = z => z / K;
  const h = sec.h;
  Dw.rect(X(-h / 2), Y(0), X(h / 2), Y(H), 'STAL');
  if (sec.kind === 'I') { Dw.line(X(-h / 2 + sec.td), Y(0), X(-h / 2 + sec.td), Y(H), 'STAL'); Dw.line(X(h / 2 - sec.tg), Y(0), X(h / 2 - sec.tg), Y(H), 'STAL'); }
  if (sec.kind === 'RHS' || sec.kind === 'CHS') { const t = sec.t; Dw.line(X(-h / 2 + t), Y(0), X(-h / 2 + t), Y(H), 'UKRYTE'); Dw.line(X(h / 2 - t), Y(0), X(h / 2 - t), Y(H), 'UKRYTE'); }
  Dw.line(X(0), Y(-tp - tg - 300), X(0), Y(H + 300), 'OSIE');
  if (C0) {
    Dw.rect(X(-C0.lp / 2), Y(-tp), X(C0.lp / 2), Y(0), 'BLACHY');
    if (tg > 0) Dw.rect(X(-C0.lp / 2), Y(-tp - tg), X(C0.lp / 2), Y(-tp), 'BETON');
    Dw.line(X(-C0.lp / 2 - 300), Y(-tp - tg), X(C0.lp / 2 + 300), Y(-tp - tg), 'BETON');
    const zs = C0.uk === 'zew' ? [-C0.zT, C0.zT] : C0.nb === 2 ? [0] : [-C0.zT, C0.zT];
    zs.forEach(z => { Dw.line(X(z), Y(2 * C0.d), X(z), Y(-tp - tg - Math.max(300, 20 * C0.d)), 'KOTWY'); });
    Dw.dimH(X(-C0.lp / 2), X(C0.lp / 2), Y(-tp - tg) - 8, `${f0(C0.lp, 0)}`);
  }
  (S.stezenia || []).forEach((zz, i) => { const y = Y(U.num(zz.x) * 1000); Dw.line(X(h / 2), y, X(h / 2) + 6, y, 'OPISY'); Dw.text(X(h / 2) + 7, y - 0.8, 2, `S${i + 1} (x = ${f0(U.num(zz.x), 2)} m)`, 'OPISY'); });
  Dw.dimV(X(-h / 2) - 10, Y(0), Y(H), `${f0(H, 0)}`);
  Dw.text(X(h / 2) + 4, Y(0) - 0.8, 2, '%%p0,00', 'OPISY'); Dw.text(X(h / 2) + 4, Y(H) - 0.8, 2, `+${f0(H / 1000, 2)}`, 'OPISY');
  Dw.text(X(0), Y(H) + 14, 3, `SŁUP ${sec.nazwa} – widok (płaszczyzna x–z) 1:${K}`, 'OPISY', 'c');
  // ---- rzut blachy podstawy 1:Kp
  if (C0) {
    const Kp = Math.max(C0.lp, C0.bp) <= 600 ? 5 : 10;
    const px = ox + 120, py = 40, PX = y => px + y / Kp, PY = z => py + z / Kp;
    Dw.rect(PX(-C0.bp / 2), PY(-C0.lp / 2), PX(C0.bp / 2), PY(C0.lp / 2), 'BLACHY');
    sec.rings.forEach(rg => Dw.pline(rg.map(p => [PX(p[0]), PY(p[1] - sec.h / 2)]), 'STAL', true));
    const an = [];
    if (C0.uk === 'zew') [1, -1].forEach(sz => [1, -1].forEach(sy => an.push([sy * C0.w / 2, sz * C0.zT])));
    else if (C0.nb === 2) [1, -1].forEach(sy => an.push([sy * C0.w / 2, 0]));
    else [1, -1].forEach(sz => [1, -1].forEach(sy => an.push([sy * C0.w / 2, sz * C0.zT])));
    an.forEach(([y, z]) => { Dw.circle(PX(y), PY(z), C0.d0 / 2 / Kp, 'KOTWY'); Dw.circle(PX(y), PY(z), C0.d / 2 / Kp, 'KOTWY'); });
    Dw.line(PX(0), PY(-C0.lp / 2 - 30), PX(0), PY(C0.lp / 2 + 30), 'OSIE'); Dw.line(PX(-C0.bp / 2 - 30), PY(0), PX(C0.bp / 2 + 30), PY(0), 'OSIE');
    Dw.dimH(PX(-C0.bp / 2), PX(C0.bp / 2), PY(C0.lp / 2) + 8, f0(C0.bp, 0));
    Dw.dimV(PX(-C0.bp / 2) - 8, PY(-C0.lp / 2), PY(C0.lp / 2), f0(C0.lp, 0));
    if (an.length > 1) Dw.dimH(PX(-C0.w / 2), PX(C0.w / 2), PY(-C0.lp / 2) - 8, f0(C0.w, 0));
    if (C0.uk === 'zew') Dw.dimV(PX(C0.bp / 2) + 8, PY(-C0.zT), PY(C0.zT), f0(2 * C0.zT, 0));
    Dw.text(PX(0), PY(C0.lp / 2) + 18, 3, `BLACHA PODSTAWY ${f0(C0.tp, 0)}×${f0(C0.bp, 0)}×${f0(C0.lp, 0)} ${C0.gat} – rzut 1:${Kp}`, 'OPISY', 'c');
    Dw.text(PX(0), PY(-C0.lp / 2) - 18, 2.2, `${C0.nb} × ${S.podstawa.kotwy.d} kl. ${S.podstawa.kotwy.kl}, otwory %%c${f0(C0.d0, 0)}; spoiny: pasy a = ${f0(C0.af, 0)}, środnik a = ${f0(C0.aw, 0)}`, 'OPISY', 'c');
    Dw.text(PX(0), PY(-C0.lp / 2) - 23, 2.2, `podlewka ${f0(C0.tg, 0)} mm, beton fundamentu ${S.podstawa.beton}`, 'OPISY', 'c');
  }
  // ---- opis i zestawienie
  const t = W3.takeoff(S, R);
  let ty = -40;
  Dw.text(ox, ty, 3, `${S.meta.nazwa} – ${S.meta.obiekt}`, 'OPISY'); ty -= 6;
  Dw.text(ox, ty, 2.2, `Słup ${sec.nazwa}, stal ${S.material.gatunek}${S.material.podgatunek}; wykonanie ${R.exc ? R.exc.exc : ''} wg PN-EN 1090-2`, 'OPISY'); ty -= 6;
  Dw.text(ox, ty, 2.5, 'ZESTAWIENIE MATERIAŁÓW', 'OPISY'); ty -= 5;
  t.rows.forEach(r => { Dw.text(ox, ty, 2, `${r.poz}. ${r.n} – ${r.mat}, ${r.szt} szt., ${r.wym}, ${f0(r.m, 1)} kg`, 'OPISY'); ty -= 4; });
  Dw.text(ox, ty, 2.2, `Razem: ${f0(t.total, 1)} kg`, 'OPISY');
  Dw.text(ox, ty - 6, 1.8, `${BS.APP} ${BS.VERSION} · ${new Date().toLocaleDateString('pl-PL')}`, 'OPISY');
  const bb = Dw.bbox(), Hd = [];
  const add = (...a) => { for (let i = 0; i < a.length; i += 2) Hd.push(String(a[i]), String(a[i + 1])); };
  add(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$DWGCODEPAGE', 3, 'ANSI_1250', 9, '$INSBASE', 10, 0, 20, 0, 30, 0,
    9, '$EXTMIN', 10, bb[0].toFixed(2), 20, bb[1].toFixed(2), 30, 0, 9, '$EXTMAX', 10, bb[2].toFixed(2), 20, bb[3].toFixed(2), 30, 0,
    9, '$LIMMIN', 10, bb[0].toFixed(2), 20, bb[1].toFixed(2), 9, '$LIMMAX', 10, bb[2].toFixed(2), 20, bb[3].toFixed(2), 9, '$LTSCALE', 40, 1, 9, '$TEXTSTYLE', 7, 'STANDARD', 9, '$INSUNITS', 70, 4, 9, '$MEASUREMENT', 70, 1, 0, 'ENDSEC');
  add(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LTYPE', 70, 3);
  add(0, 'LTYPE', 2, 'CONTINUOUS', 70, 0, 3, 'Solid line', 72, 65, 73, 0, 40, 0);
  add(0, 'LTYPE', 2, 'CENTER', 70, 0, 3, 'Center ____ _ ____', 72, 65, 73, 4, 40, 12, 49, 8, 49, -1.5, 49, 1, 49, -1.5);
  add(0, 'LTYPE', 2, 'DASHED', 70, 0, 3, 'Dashed __ __', 72, 65, 73, 2, 40, 4, 49, 2.5, 49, -1.5);
  add(0, 'ENDTAB', 0, 'TABLE', 2, 'LAYER', 70, LAYERS.length + 1, 0, 'LAYER', 2, '0', 70, 0, 62, 7, 6, 'CONTINUOUS');
  LAYERS.forEach(([nm, col, lt]) => add(0, 'LAYER', 2, nm, 70, 0, 62, col, 6, lt));
  add(0, 'ENDTAB', 0, 'TABLE', 2, 'STYLE', 70, 1, 0, 'STYLE', 2, 'STANDARD', 70, 0, 40, 0, 41, 0.9, 50, 0, 71, 0, 42, 2.5, 3, 'arial.ttf', 4, '', 0, 'ENDTAB', 0, 'ENDSEC');
  add(0, 'SECTION', 2, 'BLOCKS', 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');
  return Hd.concat(Dw.out(), ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n';
};

/* ================================================================ ZAKŁADKA */
W3.open = function (v3) { view3d = !!v3; const a = A(); a.invalidate('elev'); a.selectTab('elev'); };
let view3d = false, v3opt = { loads: true, found: true, mode: 'none' }, hsecX = null;
W3.render = function (el) {
  const a = A(), R = a.R(), S = a.S();
  if (!R || !R.sec || !R.md || !R.env || R.errors.length) { el.innerHTML = '<div class="dsumx"></div>' + `<div class="msgs">${(R && R.errors || ['Brak wyników']).map(e => `<div class="msg err">${esc(e)}</div>`).join('')}</div>`; return; }
  const W2 = Math.max(480, Math.min(760, el.clientWidth - 40 - 340));
  let h = `<div class="dsumx"></div><div class="h2" style="display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin:6px 0 10px"><b style="font-size:14px">Słup i podstawa</b><small class="hint" style="margin:0">przesuń kursor po słupie – obok przekrój i siły na tej wysokości; kliknij słup, podstawę, fundament, stężenie lub podporę, aby zmienić; 2D / 3D – przełącznik w prawym górnym rogu</small><span style="flex:1"></span><button class="btn sm pri" id="elDxf" type="button">Eksport DXF</button></div>`;
  h += `<div class="elevgrid"><div class="box elevbox"><div class="v3sw segsw sm" role="tablist" aria-label="Widok"><button data-v3="2d" class="${view3d ? '' : 'on'}" type="button">2D</button><button data-v3="3d" class="${view3d ? 'on' : ''}" type="button" title="Widok przestrzenny – obrót, przesuw i powiększenie">3D</button></div>`;
  if (view3d) {
    h += `<div class="v3tools segsw sm" role="toolbar" aria-label="Sterowanie widokiem 3D"><button data-v3m="rot" class="${V3.mode === 'pan' ? '' : 'on'}" type="button" title="Przeciąganie lewym przyciskiem obraca widok">⟳ Obrót</button><button data-v3m="pan" class="${V3.mode === 'pan' ? 'on' : ''}" type="button" title="Przeciąganie lewym przyciskiem przesuwa widok">✥ Przesuw</button><button data-v3z="1" type="button" title="Powiększ">+</button><button data-v3z="-1" type="button" title="Pomniejsz">−</button><button data-v3r="1" type="button" title="Widok domyślny">⌂</button><button data-v3v="xz" type="button" title="Widok na płaszczyznę x–z">x–z</button><button data-v3v="xy" type="button" title="Widok na płaszczyznę x–y">x–y</button><button data-v3v="top" type="button" title="Widok z góry">↧</button></div>`;
    h += `<div style="height:36px"></div><canvas class="v3d" width="${Math.round(W2)}" height="700"></canvas>`;
    h += `<div class="rebbar" style="margin:6px 0 0"><label class="chk sm"><input type="checkbox" id="v3L" ${v3opt.loads ? 'checked' : ''}><span>obciążenia</span></label><label class="chk sm"><input type="checkbox" id="v3F" ${v3opt.found ? 'checked' : ''}><span>fundament</span></label><span class="ttl">postać:</span><select id="v3M"><option value="none" ${v3opt.mode === 'none' ? 'selected' : ''}>bez deformacji</option><option value="flexy" ${v3opt.mode === 'flexy' ? 'selected' : ''}>wyboczenie giętne y–y</option><option value="flexz" ${v3opt.mode === 'flexz' ? 'selected' : ''}>wyboczenie giętne z–z</option>${R.sec.kind === 'I' ? `<option value="TF" ${v3opt.mode === 'TF' ? 'selected' : ''}>giętno-skrętna (u, φ)</option><option value="LT" ${v3opt.mode === 'LT' ? 'selected' : ''}>zwichrzenie (u, φ)</option>` : ''}<option value="sgu" ${v3opt.mode === 'sgu' ? 'selected' : ''}>przemieszczenia SGU</option></select></div>`;
    h += `<p class="hint" style="margin:4px 0 0">Lewy przycisk – obrót lub przesuw (wg trybu) · prawy przycisk albo Shift + przeciągnij – przesuw · Ctrl + kółko lub +/− – powiększenie · dwa palce – przesuw i powiększenie · dwuklik – widok domyślny. Postacie z MES dla kombinacji decydującej, w skali powiększonej.</p>`;
  } else h += `<div class="elevwrap">${W3.elevSVG(S, R, { W: W2, H: 720 })}</div>`;
  h += `</div><div style="display:flex;flex-direction:column;gap:12px;min-width:0"><div class="box hsec" id="hsec">${W3.hsecHTML(S, R, hsecX === null ? (BS.S.maxAbs(R.env.My.max).x || 0) : hsecX)}</div></div></div>`;
  h += `<div class="h2" style="margin-top:16px"><b>Zestawienie materiałów</b></div><div class="tscroll">${W3.takeoffHTML(S, R)}</div>`;
  el.innerHTML = h;
  $('#elDxf', el).onclick = () => W3.exportDXF();
  $$('[data-v3]', el).forEach(b => b.addEventListener('click', () => { view3d = b.dataset.v3 === '3d'; W3.render(el); }));
  if (view3d) {
    const cv = $('canvas.v3d', el); W3.draw3D(cv, S, R, v3opt);
    const re = () => W3.draw3D(cv, S, R, v3opt);
    $('#v3L', el).onchange = e => { v3opt.loads = e.target.checked; re(); };
    $('#v3F', el).onchange = e => { v3opt.found = e.target.checked; re(); };
    $('#v3M', el).onchange = e => { v3opt.mode = e.target.value; re(); };
  } else bindElev(el, S, R);
  $$('.dsumx', el).forEach(x => { x.innerHTML = a.dsumHTML(); a.bindDsum(x); });
};
function bindElev(el, S, R) {
  const a = A(), svg = $('svg.elevsvg', el); if (!svg) return;
  const hOf = (ev) => { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, py = (ev.clientY - r.top) * vb.height / r.height; const k = +svg.dataset.k, Hs = vb.height, mb = +svg.dataset.mb, zb = +svg.dataset.zb; return (Hs - mb - py) / k + zb; };
  const cur = $('.hcur', svg);
  $$('.el-col', svg).forEach(g => {
    g.addEventListener('mousemove', ev => {
      const x = Math.max(0, Math.min(R.md.H, hOf(ev))); hsecX = x;
      const hs = $('#hsec', el); if (hs) hs.innerHTML = W3.hsecHTML(S, R, x);
      const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, py = (ev.clientY - r.top) * vb.height / r.height;
      cur.style.display = ''; cur.querySelector('line').setAttribute('y1', py); cur.querySelector('line').setAttribute('y2', py); const t = cur.querySelector('text'); t.setAttribute('y', py - 3); t.textContent = `x = ${fmt(x / 1000, 2)} m`;
    });
    g.addEventListener('mouseleave', () => { cur.style.display = 'none'; });
    g.addEventListener('click', ev => W3.atXPopup(Math.max(0, Math.min(R.md.H, hOf(ev)))));
    g.addEventListener('dblclick', ev => { ev.preventDefault(); a.secPopup(); });
  });
  $$('.el-base, .el-found', svg).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); a.basePopup(); }));
  $$('.el-brace', svg).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); a.bracesPopup(+g.dataset.i); }));
  $$('.el-top', svg).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); a.supportPopup(g.dataset.pl); }));
  svg.addEventListener('contextmenu', ev => { ev.preventDefault(); const x = Math.max(0, Math.min(R.md.H, hOf(ev))); Q.ctxMenu(ev.clientX, ev.clientY, [['at', `Siły i sprawdzenia na x = ${fmt(x / 1000, 2)} m…`], ['load', 'Obciążenie w tym miejscu…'], ['brace', 'Stężenia…'], ['sec', 'Przekrój…'], ['base', 'Podstawa słupa…']], k => { if (k === 'at') W3.atXPopup(x); else if (k === 'load') a.loadPopup(null, { x: Math.round(x / 50) * 0.05 }); else if (k === 'brace') a.bracesPopup(); else if (k === 'sec') a.secPopup(); else a.basePopup(); }); });
}
W3.exportDXF = async function () {
  const a = A(), R = a.R(), S = a.S();
  if (!R || !R.sec || R.errors.length) { Q.toast('Usuń błędy danych przed eksportem DXF.'); return; }
  let txt; try { txt = W3.dxf(S, R); } catch (e) { console.error(e); Q.toast('Błąd tworzenia DXF: ' + e.message); return; }
  const name = a.safeName(' – słup i podstawa.dxf');
  if (a.inHost()) { const r = await a.hostCall('save', { path: '', name, content: txt, filter: 'dxf' }); if (r && r.ok) Q.toast('Zapisano rysunek: ' + a.baseName(r.path)); else if (r && r.err) Q.toast('Błąd: ' + r.err); }
  else a.download(name, txt, 'application/dxf');
};
})();
