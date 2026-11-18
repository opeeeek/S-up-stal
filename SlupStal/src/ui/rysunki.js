/* =====================================================================
   SłupStal – rysunki SVG (styl jak w BelkaStal/SłupŻB):
   • przekrój z osiami, wymiarami, częściami nieefektywnymi klasy 4
     i wykresem naprężeń σ(N, M_y),
   • schemat słupa w płaszczyźnie (podpory, stężenia, obciążenia
     charakterystyczne każdego przypadku – klikane) z wykresem obok
     (M, V, N, przemieszczenia, postać wyboczenia),
   • wykresy wartości na wysokości słupa (z kursorem), wykres liniowy,
   • postacie wyboczenia i zwichrzenia, podstawa słupa (rzut i widok),
     krzywa temperatury w pożarze.
   Kolory stałe (#rrggbb) – motyw ciemny przez zmienne --sv-*.
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, Q = BS.Q;
const D = BS.D = {};
const { esc, fmt, tx, svgOpen, dimH, dimV } = Q;
const KC = D.KC = { G: '#4a5466', Q: '#1d5bb8', S: '#0e8fa8', W: '#1d7f3c', T: '#5d7a2e', Qc: '#a35d00', M: '#b5651d', A: '#c0262d', sw: '#4a5466' };
D.loadColor = (c) => KC[c.rodzaj] || '#6a3fb5';
const C = { ink: '#1b2230', ink2: '#4a5466', mut: '#7a8494', red: '#c0262d', vio: '#6a3fb5', grn: '#155e2c', blu: '#1d5bb8', ok: '#1d7f3c', warn: '#a35d00', steel: '#c9d4e6', grid: '#eef0f3', grid2: '#f3f4f6', axis: '#39414f' };
D.C = C;
const sub = (s) => esc(s).replace(/_\{([^}]*)\}|_([0-9A-Za-ząćęłńóśźżθφλα]+(?:,[0-9A-Za-ząćęłńóśźż]+)*)/g, (m, a, b) => `<tspan baseline-shift="sub" font-size="75%">${a || b}</tspan>`);
D.sub = sub;
D.niceTicks = function (a, b, n) {
  const span = b - a; if (!(span > 0)) return [a];
  const st0 = span / n, p = Math.pow(10, Math.floor(Math.log10(st0))), r = st0 / p;
  const st = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
  const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
  return out;
};
const arrowL = (x1, y1, x2, y2, col, w, hs) => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = hs || 6;
  const p1 = [x2 - h * Math.cos(a) + h * 0.45 * Math.sin(a), y2 - h * Math.sin(a) - h * 0.45 * Math.cos(a)], p2 = [x2 - h * Math.cos(a) - h * 0.45 * Math.sin(a), y2 - h * Math.sin(a) + h * 0.45 * Math.cos(a)];
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x2 - 0.8 * h * Math.cos(a)).toFixed(1)}" y2="${(y2 - 0.8 * h * Math.sin(a)).toFixed(1)}" stroke="${col}" stroke-width="${w || 1.4}"/><path d="M${x2.toFixed(1)},${y2.toFixed(1)} L${p1[0].toFixed(1)},${p1[1].toFixed(1)} L${p2[0].toFixed(1)},${p2[1].toFixed(1)} Z" fill="${col}"/>`;
};
D.arrowL = arrowL;
const hatch = (x, y, w, dir, col) => { let p = `<line x1="${x - w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y}" stroke="${col || C.ink}" stroke-width="1.8"/>`; for (let i = 0; i <= 6; i++) { const xx = x - w / 2 + i * w / 6; p += `<line x1="${xx}" y1="${y}" x2="${xx - 6}" y2="${y + (dir < 0 ? -7 : 7)}" stroke="${C.ink2}" stroke-width="0.9"/>`; } return p; };
const hatchV = (x, y, h, dir) => { let p = `<line x1="${x}" y1="${y - h / 2}" x2="${x}" y2="${y + h / 2}" stroke="${C.ink}" stroke-width="1.8"/>`; for (let i = 0; i <= 4; i++) { const yy = y - h / 2 + i * h / 4; p += `<line x1="${x}" y1="${yy}" x2="${x + (dir > 0 ? 7 : -7)}" y2="${yy + 6}" stroke="${C.ink2}" stroke-width="0.9"/>`; } return p; };

/* ------------------------------------------------------------ przekrój */
D.section = function (sec, o) {
  o = o || {};
  const S0 = o.size || 260, pad = 36;
  const bmax = sec.ymax - sec.ymin;
  const sc = (S0 - 2 * pad) / Math.max(sec.h, bmax);
  const wSig = o.sigma ? 160 : 0;
  const ccPt = sec.kind === 'CC' ? Math.max(3, (sec.bu && !sec.buPack ? sec.pt : 0)) : 0;
  const W = bmax * sc + 2 * pad + 50 + wSig, H = sec.h * sc + 2 * pad + 18 + (sec.kind === 'CC' ? 24 : 0);
  const cx = pad + 26 - sec.ymin * sc, X = (y) => cx + y * sc, Y = (z) => H - pad - (sec.kind === 'CC' ? 14 : 0) - z * sc;
  let g = '';
  const path = sec.rings.map(r => r.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ') + ' Z').join(' ');
  g += `<path d="${path}" fill="${C.steel}" fill-rule="evenodd" stroke="${C.ink}" stroke-width="1.2"/>`;
  // słup z dwóch ceowników: przewiązki (w płaszczyznach półek) / przekładka między grzbietami
  if (sec.kind === 'CC') {
    if (sec.bu && !sec.buPack) {
      const yb = sec.h0 / 2 + (sec.pz || 40) / 2;
      [[sec.h, sec.h + sec.pt], [-sec.pt, 0]].forEach(([z0, z1]) => { g += `<rect class="ccbat" x="${X(-yb)}" y="${Y(z1)}" width="${2 * yb * sc}" height="${Math.max(2, (z1 - z0) * sc)}" fill="#c9d3e3" stroke="${C.ink}" stroke-width="0.8" stroke-dasharray="4 2"/>`; });
    } else if (sec.uklad === 'plecy') g += `<rect x="${X(-sec.a / 2)}" y="${Y(sec.h * 0.8)}" width="${sec.a * sc}" height="${sec.h * 0.6 * sc}" fill="#c9d3e3" stroke="${C.ink}" stroke-width="0.8" stroke-dasharray="4 2"/>`;
    // osie gałęzi i rozstaw h0
    [-1, 1].forEach(sg => { g += `<line x1="${X(sg * sec.h0 / 2)}" y1="${Y(sec.h) - 6}" x2="${X(sg * sec.h0 / 2)}" y2="${Y(0) + 6}" stroke="${C.vio}" stroke-dasharray="3 3" stroke-width="0.7"/>`; });
    g += dimH(X(-sec.h0 / 2), X(sec.h0 / 2), Y(0) + 16, `h<tspan baseline-shift="sub" font-size="75%">0</tspan> = ${fmt(sec.h0, 1)}`, { below: true });
    g += dimH(X(sec.ymin), X(sec.ymax), Y(sec.h) - 12 - (sec.bu && !sec.buPack ? sec.pt * sc : 0), `B = ${fmt(sec.B, 0)}`);
  }
  // części nieefektywne (klasa 4)
  const eff = o.eff;
  if (eff && eff.info) eff.info.forEach(inf => {
    if (inf.hole) BS.P.rects(sec).filter(r => r.id === 'w').forEach(w => { g += `<rect x="${X(w.y0)}" y="${Y(inf.hole[1])}" width="${(w.y1 - w.y0) * sc}" height="${(inf.hole[1] - inf.hole[0]) * sc}" fill="#e6b3b3" stroke="${C.red}" stroke-width="1" stroke-dasharray="3 2"/>`; });
  });
  if (eff && eff.rects) {
    BS.P.rects(sec).filter(r => r.id === 'fg' || r.id === 'fd').forEach(f => {
      const kept = eff.rects.filter(r => r.id.startsWith(f.id)); let segs = [[f.y0, f.y1]];
      kept.forEach(r => { segs = segs.flatMap(([a, b]) => (r.y1 <= a || r.y0 >= b) ? [[a, b]] : [[a, Math.max(a, r.y0)], [Math.min(b, r.y1), b]].filter(([p, q]) => q - p > 1e-6)); });
      if (kept.length) segs.forEach(([a, b]) => { g += `<rect x="${X(a)}" y="${Y(f.z1)}" width="${(b - a) * sc}" height="${(f.z1 - f.z0) * sc}" fill="#e6b3b3" stroke="${C.red}" stroke-dasharray="3 2"/>`; });
    });
  }
  const yL = X(sec.ymin) - 12, yR = X(sec.ymax) + 12;
  g += `<line x1="${yL}" y1="${Y(sec.zc)}" x2="${yR}" y2="${Y(sec.zc)}" stroke="${C.blu}" stroke-dasharray="6 3 1 3" stroke-width="0.8"/>` + tx(yR + 3, Y(sec.zc) + 3, 'y', { a: 'start', fs: 10, c: C.blu });
  g += `<line x1="${X(sec.yc || 0)}" y1="${Y(sec.h) - 12}" x2="${X(sec.yc || 0)}" y2="${Y(0) + 12}" stroke="${C.blu}" stroke-dasharray="6 3 1 3" stroke-width="0.8"/>` + tx(X(sec.yc || 0) + 3, Y(0) + 20, 'z', { a: 'start', fs: 10, c: C.blu });
  if (sec.kind === 'I' && !sec.sym) g += `<circle cx="${X(0)}" cy="${Y(sec.zs)}" r="3.2" fill="none" stroke="${C.red}"/>` + tx(X(0) - 5, Y(sec.zs) - 5, 'ŚŚ', { a: 'end', fs: 9, c: C.red });
  g += dimV(X(sec.ymin) - 18, Y(0), Y(sec.h), sec.kind === 'CHS' ? `D = ${fmt(sec.D, 1)}` : `h = ${fmt(sec.h, 0)}`);
  if (sec.kind === 'I' || sec.kind === 'RHS') g += dimH(X(-sec.bg / 2), X(sec.bg / 2), Y(sec.h) - 10, `b = ${fmt(sec.bg, 0)}`);
  if (sec.kind === 'I' && !sec.sym) g += dimH(X(-sec.bd / 2), X(sec.bd / 2), Y(0) + 14, `b = ${fmt(sec.bd, 0)}`, { below: true });
  if (sec.kind === 'I') {
    g += tx(X(sec.tw / 2) + 4, Y(sec.h * 0.42), `t<tspan font-size="8" dy="2">w</tspan><tspan dy="-2"> = ${fmt(sec.tw, 1)}</tspan>`, { a: 'start', fs: 10, c: '#3d4656' });
    g += tx(X(sec.bg / 2) + 4, Y(sec.h - sec.tg / 2) + 3, `t<tspan font-size="8" dy="2">f</tspan><tspan dy="-2"> = ${fmt(sec.tg, 1)}</tspan>`, { a: 'start', fs: 10, c: '#3d4656' });
  } else if (sec.kind === 'CC') g += tx(X(sec.ymax) + 4, Y(sec.h * 0.25), `t_w = ${fmt(sec.tw, 1)}, t_f = ${fmt(sec.tf, 1)}`.replace(/_(\w)/g, '<tspan font-size="8" dy="2">$1</tspan><tspan dy="-2"></tspan>'), { a: 'start', fs: 10, c: '#3d4656' });
  else g += tx(X(sec.ymax) + 4, Y(sec.h * 0.25), `t = ${fmt(sec.t, 1)}`, { a: 'start', fs: 10, c: '#3d4656' });
  // +z / −z
  g += tx(X(sec.ymin) - 2, Y(sec.h) + 4, '+z', { a: 'end', fs: 9, c: C.mut }) + tx(X(sec.ymin) - 2, Y(0) - 1, '−z', { a: 'end', fs: 9, c: C.mut });
  if (o.zones) {
    const zone = (z, x0, x1, y0, y1, t) => `<rect class="zhit" data-z="${z}" x="${Math.min(x0, x1)}" y="${Math.min(y0, y1)}" width="${Math.abs(x1 - x0)}" height="${Math.abs(y1 - y0)}" fill="#ffffff" fill-opacity="0" stroke="none"><title>${esc(t)}</title></rect>`;
    if (sec.kind === 'I') {
      g += zone('fg', X(-sec.bg / 2) - 3, X(sec.bg / 2) + 3, Y(sec.h) - 3, Y(sec.h - sec.tg) + 2, `Pas (+z) ${fmt(sec.bg, 0)}×${fmt(sec.tg, 1)} – kliknij, aby zmienić (seria, kształtownik lub wymiary)`);
      g += zone('fd', X(-sec.bd / 2) - 3, X(sec.bd / 2) + 3, Y(sec.td) - 2, Y(0) + 3, `Pas (−z) ${fmt(sec.bd, 0)}×${fmt(sec.td, 1)} – kliknij, aby zmienić`);
      g += zone('w', X(-sec.tw / 2) - 7, X(sec.tw / 2) + 7, Y(sec.h - sec.tg) + 2, Y(sec.td) - 2, `Środnik t_w = ${fmt(sec.tw, 1)} – kliknij, aby zmienić`);
    } else if (sec.kind === 'CC') {
      const half = sec.uklad === 'wew' ? sec.ch.b : sec.ch.b + sec.tw;
      g += zone('all', X(sec.ymin) - 3, X(sec.ymin + half) + 3, Y(sec.h) + 2, Y(0) - 2, `Gałąź ${sec.ch.nazwa} – kliknij: ceownik, układ, rozstaw`);
      g += zone('all', X(sec.ymax - half) - 3, X(sec.ymax) + 3, Y(sec.h) + 2, Y(0) - 2, `Gałąź ${sec.ch.nazwa} – kliknij: ceownik, układ, rozstaw`);
      if (sec.bu && !sec.buPack) g += zone('bat', X(-sec.h0 / 2), X(sec.h0 / 2), Y(sec.h + sec.pt) - 4, Y(sec.h) + 4, `Przewiązki ${fmt(sec.pb, 0)}×${fmt(sec.pt, 0)} co ${fmt(sec.pa, 0)} mm – kliknij, aby zmienić`) + zone('bat', X(-sec.h0 / 2), X(sec.h0 / 2), Y(0) - 4, Y(-sec.pt) + 4, 'Przewiązki – kliknij, aby zmienić');
      else g += zone('bat', X(-sec.a / 2) - 4, X(sec.a / 2) + 4, Y(sec.h * 0.8), Y(sec.h * 0.2), `Przekładki co ${fmt(sec.pa, 0)} mm – kliknij, aby zmienić`);
    } else g += zone('all', X(sec.ymin) - 3, X(sec.ymax) + 3, Y(sec.h) - 3, Y(0) + 3, 'Przekrój – kliknij, aby zmienić');
  }
  if (o.sigma) {
    const { My, N, Mz } = o.sigma, fy = o.fy || 355, x0 = X(sec.ymax) + 54, wS = 120;
    const sig = (z) => (N || 0) / sec.A + (My || 0) * (z - sec.zc) / sec.Iy;
    const sz = Math.abs(Mz || 0) * (sec.ymax) / sec.Iz;
    const sT = sig(sec.h) + sz, sB = sig(0) + sz, sT2 = sig(sec.h) - sz, sB2 = sig(0) - sz;
    const sm = Math.max(Math.abs(sT), Math.abs(sB), Math.abs(sT2), Math.abs(sB2), fy);
    const k = (wS / 2) / sm, xm = x0 + wS / 2;
    g += `<line x1="${xm}" y1="${Y(sec.h) - 4}" x2="${xm}" y2="${Y(0) + 4}" stroke="${C.axis}" stroke-width="0.8"/>`;
    if (sz > 1e-6) g += `<polygon points="${xm},${Y(sec.h)} ${xm + sT2 * k},${Y(sec.h)} ${xm + sB2 * k},${Y(0)} ${xm},${Y(0)}" fill="${C.vio}" fill-opacity="0.08" stroke="${C.vio}" stroke-dasharray="3 2"/>`;
    g += `<polygon points="${xm},${Y(sec.h)} ${xm + sT * k},${Y(sec.h)} ${xm + sB * k},${Y(0)} ${xm},${Y(0)}" fill="${C.red}" fill-opacity="0.15" stroke="${C.red}"/>`;
    [fy, -fy].forEach(f => { g += `<line x1="${xm + f * k}" y1="${Y(sec.h) - 4}" x2="${xm + f * k}" y2="${Y(0) + 4}" stroke="${C.warn}" stroke-dasharray="3 3" stroke-width="0.8"/>`; });
    g += tx(xm + sT * k, Y(sec.h) - 6, fmt(sT, 0), { fs: 9.5, c: C.red }) + tx(xm + sB * k, Y(0) + 13, fmt(sB, 0), { fs: 9.5, c: C.red }) + tx(xm, Y(sec.h) - 20, 'σ [MPa] (+ ściskanie)', { fs: 9.5, c: C.ink2 });
  }
  return svgOpen(W, H, `class="secsvg${o.zones ? ' secedit' : ''}"`) + g + '</svg>';
};

/* ------------------------------------------------------------ wykres liniowy (poziomy) z kursorem */
let chartSeq = 0;
D.CHARTS = {};
D.lineChart = function (o) {
  const W = o.W || 820, narrow = W < 640, H = (o.H || 230) + 14, ml = narrow ? 46 : 62, mr = narrow ? 70 : 120, mt = narrow ? 52 : 40, mb = 34;
  const xs = o.series.flatMap(s => s.x), ys = o.series.flatMap(s => s.y).concat((o.hl || []).map(h => h.y)).concat([0]);
  const xmin = o.xmin !== undefined ? o.xmin : Math.min(...xs), xmax = o.xmax !== undefined ? o.xmax : Math.max(...xs);
  let ymin = Math.min(...ys.filter(isFinite)), ymax = Math.max(...ys.filter(isFinite));
  if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
  const pad = (ymax - ymin) * 0.1; ymin -= pad; ymax += pad;
  const X = x => ml + (x - xmin) / Math.max(1e-9, xmax - xmin) * (W - ml - mr);
  const Y = y => H - mb - (y - ymin) / (ymax - ymin) * (H - mt - mb);
  const cid = 'c' + (++chartSeq);
  D.CHARTS[cid] = { ml, mr, W, H, mt, mb, xmin, xmax, ymin, ymax, series: o.series, unit: o.unit || '', dp: o.dp !== undefined ? o.dp : 1, xu: o.xu || 'm' };
  let s = svgOpen(W, H, `class="lchart" data-cid="${cid}"`);
  s += tx(narrow ? 4 : ml, 14, sub(o.title || ''), { a: 'start', fs: narrow ? 11 : 12, w: 650 });
  const ticks = D.niceTicks(ymin, ymax, 6);
  ticks.forEach(t => { s += `<line x1="${ml}" y1="${Y(t)}" x2="${W - mr}" y2="${Y(t)}" stroke="${C.grid}"/>` + tx(ml - 6, Y(t) + 3.5, fmt(t, Math.abs((ticks[1] || 1) - (ticks[0] || 0)) < 1 ? 1 : 0), { a: 'end', fs: 10, c: C.mut }); });
  const xt = D.niceTicks(xmin, xmax, narrow ? 5 : 10);
  xt.forEach(t => { s += `<line x1="${X(t)}" y1="${mt}" x2="${X(t)}" y2="${H - mb}" stroke="${C.grid2}"/>` + tx(X(t), H - mb + 14, fmt(t, (xt[1] - xt[0]) < 1 ? 1 : 0), { fs: 10, c: C.mut }); });
  s += tx((ml + W - mr) / 2, H - 4, sub(o.xl || 'x [m]'), { fs: 10.5, c: C.ink2 }) + tx(14, (mt + H - mb) / 2, sub(o.yl || ''), { fs: 10.5, c: C.ink2, rot: -90 });
  (o.vl || []).forEach(v => { s += `<line x1="${X(v.x)}" y1="${mt}" x2="${X(v.x)}" y2="${H - mb}" stroke="#9aa3b0" stroke-width="0.8" stroke-dasharray="4 3"/>` + (v.l ? tx(X(v.x), mt - 3, sub(v.l), { fs: 9.5, c: '#5b6576', w: 600 }) : ''); });
  s += `<line x1="${ml}" y1="${Y(0)}" x2="${W - mr}" y2="${Y(0)}" stroke="${C.axis}" stroke-width="1"/>`;
  o.series.forEach(se => {
    const pts = se.x.map((x, i) => `${X(x).toFixed(1)},${Y(se.y[i]).toFixed(1)}`).join(' ');
    if (se.fill) s += `<polygon points="${X(se.x[0]).toFixed(1)},${Y(0).toFixed(1)} ${pts} ${X(se.x[se.x.length - 1]).toFixed(1)},${Y(0).toFixed(1)}" fill="${se.fill}"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${se.c}" stroke-width="${se.w || 1.6}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>`;
  });
  (o.hl || []).forEach(h => { s += `<line x1="${ml}" y1="${Y(h.y)}" x2="${W - mr}" y2="${Y(h.y)}" stroke="${h.c}" stroke-width="1.2" stroke-dasharray="6 4"/>` + (h.l ? tx(W - mr + 4, Y(h.y) + 3.5, sub(h.l), { a: 'start', fs: 10, c: h.c }) : ''); });
  (o.marks || []).forEach(mk => { const px = X(mk.x), py = Y(mk.y); s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${mk.c}"/>` + (mk.l ? tx(Math.max(ml + 10, Math.min(W - mr - 10, px)), py + (mk.y < 0 ? 14 : -7), mk.l, { fs: 10, c: mk.c, w: 650 }) : ''); });
  let lx = W - mr; o.series.filter(se => se.l).reverse().forEach(se => { const tw = se.l.length * 5.6 + 30; lx -= tw; s += `<line x1="${lx}" y1="26" x2="${lx + 18}" y2="26" stroke="${se.c}" stroke-width="2" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>` + tx(lx + 22, 29.5, sub(se.l), { a: 'start', fs: 10 }); });
  return s + '</svg>';
};

/* ------------------------------------------------------------ wykres na wysokości słupa (pionowy) */
// o: { W, H, Hm (wysokość [m]), title, unit, series: [{ x: [m], v: [], c, l, dash, fill }], vlines: [{ v, c, l }], marks: [{ x, v, c, l }], hlines: [{ x, l }] }
D.HCH = {};
let hSeq = 0;
D.heightChart = function (o) {
  const W = o.W || 260, H = o.H || 400, ml = 40, mr = 14, mt = o.mt || 44, mb = 38;
  const all = o.series.flatMap(s => Array.from(s.v)).concat((o.vlines || []).map(v => v.v)).concat([0]).filter(isFinite);
  let vmin = Math.min(...all), vmax = Math.max(...all); if (vmax - vmin < 1e-9) { vmax += 1; vmin -= 1; }
  const pad = (vmax - vmin) * 0.12; vmin -= pad; vmax += pad;
  const Hm = o.Hm || 1;
  const X = v => ml + (v - vmin) / (vmax - vmin) * (W - ml - mr), Y = x => mt + (1 - x / Hm) * (H - mt - mb);
  const cid = 'h' + (++hSeq);
  D.HCH[cid] = { W, H, ml, mr, mt, mb, vmin, vmax, Hm, unit: o.unit || '', dp: o.dp !== undefined ? o.dp : 1, series: o.series.map(s => ({ x: Array.from(s.x), v: Array.from(s.v), c: s.c, l: s.l || '' })) };
  let s = svgOpen(W, H, `class="hchart" data-cid="${cid}"`);
  s += tx(6, 14, sub(o.title || ''), { fs: 11.5, w: 650, a: 'start' });
  D.niceTicks(vmin, vmax, 4).forEach(t => { s += `<line x1="${X(t)}" y1="${mt}" x2="${X(t)}" y2="${H - mb}" stroke="${C.grid}"/>` + tx(X(t), H - mb + 13, fmt(t, Math.abs(vmax - vmin) < 10 ? 1 : 0), { fs: 9.5, c: C.mut }); });
  D.niceTicks(0, Hm, 6).forEach(t => { const y = Y(t); s += `<line x1="${ml}" y1="${y}" x2="${W - mr}" y2="${y}" stroke="${C.grid2}"/>` + tx(ml - 4, y + 3.5, fmt(t, 1), { fs: 9.5, c: C.mut, a: 'end' }); });
  (o.hlines || []).forEach(h => { s += `<line x1="${ml}" y1="${Y(h.x)}" x2="${W - mr}" y2="${Y(h.x)}" stroke="#9aa3b0" stroke-dasharray="4 3" stroke-width="0.8"/>` + (h.l ? tx(W - mr - 2, Y(h.x) - 3, sub(h.l), { fs: 8.5, a: 'end', c: C.mut }) : ''); });
  s += `<line x1="${X(0)}" y1="${mt}" x2="${X(0)}" y2="${H - mb}" stroke="${C.axis}" stroke-width="1.1"/>`;
  s += tx((ml + W - mr) / 2, H - 6, sub(o.unit || ''), { fs: 10, c: C.ink2 }) + tx(11, (mt + H - mb) / 2, 'x [m] od podstawy', { fs: 9.5, c: C.ink2, rot: -90 });
  (o.vlines || []).forEach(v => { if (!isFinite(v.v)) return; s += `<line x1="${X(v.v)}" y1="${mt}" x2="${X(v.v)}" y2="${H - mb}" stroke="${v.c}" stroke-width="1.2" stroke-dasharray="6 3"/>` + (v.l ? tx(X(v.v) + (v.v >= 0 ? -3 : 3), mt + 10, sub(v.l), { fs: 9, c: v.c, a: v.v >= 0 ? 'end' : 'start' }) : ''); });
  o.series.forEach(se => {
    const pts = Array.from(se.v).map((v, i) => `${X(v).toFixed(1)},${Y(se.x[i]).toFixed(1)}`).join(' ');
    if (se.fill) s += `<polygon points="${X(0)},${Y(se.x[0])} ${pts} ${X(0)},${Y(se.x[se.x.length - 1])}" fill="${se.fill}" fill-opacity="0.13"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${se.c}" stroke-width="${se.w || 1.6}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>`;
  });
  (o.marks || []).forEach(mk => { const xx = X(mk.v), yy = Y(mk.x); s += `<circle cx="${xx}" cy="${yy}" r="2.8" fill="${mk.c}"/>` + tx(Math.max(ml + 2, Math.min(W - mr - 2, xx + (mk.v >= 0 ? 5 : -5))), yy + (mk.x > Hm * 0.92 ? 12 : mk.x < Hm * 0.06 ? -4 : 4), mk.l, { fs: 9.5, c: mk.c, a: mk.v >= 0 ? 'start' : 'end', w: 650 }); });
  let lx = 6; const ly = 29;
  o.series.filter(se => se.l).forEach(se => { s += `<line x1="${lx}" y1="${ly}" x2="${lx + 14}" y2="${ly}" stroke="${se.c}" stroke-width="2" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>` + tx(lx + 17, ly + 3.5, sub(se.l), { fs: 9, a: 'start', c: C.ink2 }); lx += se.l.length * 5 + 28; });
  s += `<g class="cur" style="display:none;pointer-events:none"><line class="curl" x1="${ml}" x2="${W - mr}" y1="0" y2="0" stroke="${C.blu}" stroke-width="1" stroke-dasharray="3 2"/><rect class="curbg" x="0" y="0" width="10" height="10" rx="3" fill="#ffffff" fill-opacity="0.93" stroke="#c9ced6"/><text class="curtx" x="0" y="0" font-size="10" fill="#1b2230"></text></g>`;
  return s + '</svg>';
};
D.hAt = function (se, xm) { const x = se.x, v = se.v; for (let i = 1; i < x.length; i++) if (xm <= x[i] + 1e-9) { const a = x[i - 1], b = x[i]; return b - a < 1e-9 ? v[i] : v[i - 1] + (v[i] - v[i - 1]) * (xm - a) / (b - a); } return v[v.length - 1]; };
// kursor na wykresach wysokościowych (wspólny dla zakładki)
D.bindHeight = function (root, onPick) {
  const svgs = Array.from(root.querySelectorAll('svg.hchart'));
  const show = (ym) => svgs.forEach(svg => {
    const c = D.HCH[svg.dataset.cid]; if (!c) return;
    const g = svg.querySelector('.cur'); if (!g) return;
    if (ym === null || ym < 0 || ym > c.Hm) { g.style.display = 'none'; return; }
    const y = c.mt + (1 - ym / c.Hm) * (c.H - c.mt - c.mb);
    g.style.display = '';
    g.querySelector('.curl').setAttribute('y1', y); g.querySelector('.curl').setAttribute('y2', y);
    const t = g.querySelector('.curtx');
    const txt = `x = ${fmt(ym, 2)} m: ` + c.series.map(se => `${se.l ? se.l.replace(/_\{?([^}\s]*)\}?/g, '$1') + ' ' : ''}${fmt(D.hAt(se, ym), c.dp)}`).join(' · ') + (c.unit ? '' : '');
    t.textContent = txt; t.setAttribute('x', c.ml + 4); t.setAttribute('y', y - 5);
    const bb = t.getBBox ? t.getBBox() : { x: c.ml, y: y - 15, width: 100, height: 12 };
    const bg = g.querySelector('.curbg'); bg.setAttribute('x', bb.x - 3); bg.setAttribute('y', bb.y - 1); bg.setAttribute('width', bb.width + 6); bg.setAttribute('height', bb.height + 2);
  });
  const yOf = (svg, ev) => { const c = D.HCH[svg.dataset.cid]; const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, py = (ev.clientY - r.top) * vb.height / r.height; const ym = (1 - (py - c.mt) / (c.H - c.mt - c.mb)) * c.Hm; return ym < -1e-9 || ym > c.Hm + 1e-9 ? null : Math.max(0, Math.min(c.Hm, ym)); };
  const drawPins = (svg) => {
    const c = D.HCH[svg.dataset.cid]; if (!c) return;
    let g = svg.querySelector('g.pins'); if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'pins'); svg.insertBefore(g, svg.querySelector('g.cur')); }
    const X = v => c.ml + (v - c.vmin) / (c.vmax - c.vmin) * (c.W - c.ml - c.mr);
    let h = '';
    D.hPins.forEach(ym => {
      if (ym < 0 || ym > c.Hm) return;
      const y = c.mt + (1 - ym / c.Hm) * (c.H - c.mt - c.mb);
      h += `<line x1="${c.ml}" y1="${y.toFixed(1)}" x2="${c.W - c.mr}" y2="${y.toFixed(1)}" stroke="#a35d00" stroke-width="0.8" stroke-dasharray="2 3" pointer-events="none"/>`;
      const seen = [];
      c.series.forEach((se, k) => {
        const v = D.hAt(se, ym); if (!isFinite(v) || seen.some(q => Math.abs(q - v) < 1e-9)) return; seen.push(v);
        const px = X(v), lab = fmt(v, c.dp), tw = lab.length * 5.6 + 6, bx = Math.max(c.ml, Math.min(c.W - c.mr - tw, px + (v >= 0 ? 4 : -tw - 4))), by = y - 13 - k * 12;
        h += `<circle cx="${px.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${se.c}" stroke="#ffffff" stroke-width="0.8" pointer-events="none"/><g class="pinlab" data-ym="${ym}" style="cursor:pointer"><title>x = ${fmt(ym, 2)} m: ${lab} – kliknij: siły i sprawdzenia w tym miejscu</title><rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${tw.toFixed(1)}" height="11" rx="2" fill="#ffffff" fill-opacity="0.9" stroke="${se.c}" stroke-width="0.5"/>${tx(bx + tw / 2, by + 8.5, lab, { fs: 9.5, c: se.c, w: 650 })}</g>`;
      });
      const xt = `x = ${fmt(ym, 2)}`, xw = xt.length * 5.2 + 6;
      h += `<rect x="${c.ml + 1}" y="${(y + 2).toFixed(1)}" width="${xw}" height="11" rx="2" fill="#a35d00" fill-opacity="0.9" pointer-events="none"/>` + tx(c.ml + 1 + xw / 2, y + 10.5, xt, { fs: 9, c: '#ffffff', w: 600 });
    });
    g.innerHTML = h;
  };
  const upd = () => { const b = root.querySelector('#pinClr'); if (b) b.style.display = D.hPins.length ? '' : 'none'; };
  svgs.forEach(svg => {
    svg.style.cursor = 'crosshair';
    svg.addEventListener('mousemove', ev => { const c = D.HCH[svg.dataset.cid]; if (!c) return; show(yOf(svg, ev)); });
    svg.addEventListener('mouseleave', () => show(null));
    svg.addEventListener('click', ev => {
      const lab = ev.target.closest && ev.target.closest('.pinlab'); if (lab) { if (onPick) onPick(+lab.dataset.ym); return; }
      const c = D.HCH[svg.dataset.cid]; if (!c) return; const ym = yOf(svg, ev); if (ym === null) return;
      const tol = 7 * c.Hm / (c.H - c.mt - c.mb), j = D.hPins.findIndex(v => Math.abs(v - ym) <= tol);
      if (j >= 0) D.hPins.splice(j, 1); else { D.hPins.push(+ym.toFixed(3)); if (D.hPins.length > 8) D.hPins.shift(); }
      svgs.forEach(drawPins); upd();
    });
    svg.addEventListener('contextmenu', ev => { if (!D.hPins.length) return; ev.preventDefault(); D.hPins.length = 0; svgs.forEach(drawPins); upd(); Q.toast('Usunięto znaczniki z wykresów.', 1500); });
  });
  svgs.forEach(drawPins); upd();
  const pc = root.querySelector('#pinClr'); if (pc) pc.onclick = () => { D.hPins.length = 0; svgs.forEach(drawPins); upd(); };
};
D.hPins = [];

/* ------------------------------------------------------------ schemat słupa w płaszczyźnie */
// pl: 'y' (M_y, obciążenia w kierunku z) | 'z' (M_z, obciążenia w kierunku y); o: { W, H, diag: 'M'|'V'|'N'|'w'|'buck', loadsOn: Set, sel }
D.scheme = function (St, R, pl, o) {
  o = o || {};
  const W = o.W || 300, H = o.H || 470, mt = 104, mb = 62, hh = H - mt - mb, cx = W * (o.cxf || 0.38), cw = 13;
  const Hm = U.num(St.geom.H) || 1, Hmm = Hm * 1000;
  const Y = x => mt + (1 - x / Hmm) * hh;
  const md = R && R.md, bc = St.podpory || {};
  const dl = (bc.dol || {})[pl], gr = (bc.gora || {})[pl];
  const kier = pl === 'y' ? 'z' : 'y';
  let s = svgOpen(W, H, `class="schemesvg" data-pl="${pl}" data-mt="${mt}" data-hh="${hh}" data-h="${Hmm}"`);
  s += tx(8, 16, pl === 'y' ? 'Płaszczyzna x–z – zginanie M<tspan baseline-shift="sub" font-size="75%">y</tspan>' : 'Płaszczyzna x–y – zginanie M<tspan baseline-shift="sub" font-size="75%">z</tspan>', { fs: 11.5, w: 650, a: 'start' });
  s += tx(8, 30, `wyboczenie względem osi ${pl}–${pl}; obciążenia w kierunku ${kier}`, { fs: 9.5, a: 'start', c: C.ink2 });
  // słup
  s += `<g class="schcol" data-col="${pl}" style="cursor:pointer"><title>Lewy przycisk – zaznacz słup; dwuklik – obciążenie na tej wysokości; prawy – menu</title><rect x="${cx - cw / 2}" y="${Y(Hmm)}" width="${cw}" height="${hh}" fill="${o.sel ? '#dbe7fb' : C.steel}" stroke="${C.ink}" stroke-width="1.2"/></g>`;
  // podpory
  let sup = '', supT = '';
  const springSym = (x, y) => `<path d="M${x},${y} l0,4 l-5,3 l10,3 l-10,3 l5,3 l0,4" fill="none" stroke="${C.ink}" stroke-width="1"/>`;
  if (dl === 'utw') sup += hatch(cx, Y(0), cw + 30, 1);
  else { sup += `<path d="M${cx},${Y(0)} l-9,13 h18 z" fill="#ffffff" stroke="${C.ink}" stroke-width="1.3"/>` + hatch(cx, Y(0) + 13 + (dl === 'spr' ? 20 : 0), 30, 1); if (dl === 'spr') sup += springSym(cx, Y(0) + 13) + tx(cx + 18, Y(0) + 26, `k = ${fmt(U.num(pl === 'y' ? bc.dol.kry : bc.dol.krz), 0)} kNm/rad`, { fs: 8.5, a: 'start', c: C.mut }); }
  const yT = Y(Hmm);
  if (gr === 'prz') supT += `<line x1="${cx + cw / 2}" y1="${yT + 4}" x2="${cx + cw / 2 + 26}" y2="${yT + 4}" stroke="${C.ink}" stroke-width="1.4"/><circle cx="${cx + cw / 2 + 2}" cy="${yT + 4}" r="2.4" fill="#fff" stroke="${C.ink}"/><circle cx="${cx + cw / 2 + 24}" cy="${yT + 4}" r="2.4" fill="#fff" stroke="${C.ink}"/>` + hatchV(cx + cw / 2 + 27, yT + 4, 22, 1) + tx(cx + cw / 2 + 36, yT - 8, 'przegub nieprzesuwny', { fs: 8.5, a: 'start', c: C.mut });
  else if (gr === 'utw') supT += hatch(cx, yT, cw + 30, -1) + tx(cx + cw / 2 + 18, yT - 10, 'utwierdzenie', { fs: 8.5, a: 'start', c: C.mut });
  else if (gr === 'utwp') supT += hatch(cx, yT - 8, cw + 30, -1) + `<circle cx="${cx - 7}" cy="${yT - 4}" r="3" fill="none" stroke="${C.ink}"/><circle cx="${cx + 7}" cy="${yT - 4}" r="3" fill="none" stroke="${C.ink}"/>` + tx(cx + cw / 2 + 18, yT - 10, 'utwierdzenie przesuwne', { fs: 8.5, a: 'start', c: C.mut });
  else if (gr === 'spr') supT += `<path d="M${cx + cw / 2},${yT + 4} l6,0 l3,-5 l3,10 l3,-10 l3,10 l3,-5 l6,0" fill="none" stroke="${C.ink}"/>` + hatchV(cx + cw / 2 + 28, yT + 4, 22, 1) + tx(cx + cw / 2 + 36, yT - 8, `sprężyna k = ${fmt(U.num(pl === 'y' ? bc.gora.khz : bc.gora.khy), 0)} kN/m`, { fs: 8.5, a: 'start', c: C.mut });
  else supT += tx(cx + cw / 2 + 6, yT + 12, 'swobodny', { fs: 8.5, a: 'start', c: C.mut });
  const dN = { utw: 'utwierdzenie', prz: 'przegub', spr: 'sprężyna obrotowa' }[dl] || dl, gN = { swob: 'swobodny', prz: 'przegub nieprzesuwny', utw: 'utwierdzenie nieprzesuwne', utwp: 'utwierdzenie przesuwne', spr: 'podparcie sprężyste' }[gr] || gr;
  s += `<g class="supp" data-sup="${pl}" data-end="dol" style="cursor:pointer"><title>Podstawa (${pl === 'y' ? 'x–z' : 'x–y'}): ${dN} – kliknij, aby zaznaczyć; dwuklik lub prawy przycisk – zmiana</title>${sup}<rect x="${cx - 40}" y="${Y(0)}" width="80" height="34" fill="transparent"/></g>`;
  s += `<g class="supp" data-sup="${pl}" data-end="gora" style="cursor:pointer"><title>Wierzchołek (${pl === 'y' ? 'x–z' : 'x–y'}): ${gN} – kliknij, aby zaznaczyć; dwuklik lub prawy przycisk – zmiana</title>${supT}<rect x="${cx - 40}" y="${yT - 24}" width="110" height="26" fill="transparent"/></g>`;
  // stężenia w płaszczyźnie
  (St.stezenia || []).forEach((z, i) => {
    if (!(z.pl === pl || z.pl === 'yz')) return;
    const y = Y(U.num(z.x) * 1000), x0 = cx - cw / 2;
    s += `<g class="brace" data-brace="${i}" style="cursor:pointer"><title>Stężenie S${i + 1}: x = ${fmt(U.num(z.x), 2)} m – kliknij – zaznacz; dwuklik – zmień; prawy przycisk – menu</title><line x1="${x0 - 22}" y1="${y}" x2="${x0}" y2="${y}" stroke="${C.warn}" stroke-width="1.6"/><circle cx="${x0 - 1}" cy="${y}" r="2.2" fill="#fff" stroke="${C.warn}"/><circle cx="${x0 - 21}" cy="${y}" r="2.2" fill="#fff" stroke="${C.warn}"/>${hatchV(x0 - 23, y, 18, -1)}` + tx(x0 - 32, y - 6, `S${i + 1}${z.wys === 'pas+' ? ' (pas +z)' : z.wys === 'pas-' ? ' (pas −z)' : ''}${z.skret ? ' +φ' : ''}`, { fs: 8.5, a: 'end', c: C.warn }) + '</g>';
  });
  (St.stezenia || []).forEach((z, i) => { if (z.pl === pl || z.pl === 'yz') return; if (z.skret) { const y = Y(U.num(z.x) * 1000); s += tx(cx - cw / 2 - 4, y + 3, '⟲', { fs: 9, a: 'end', c: C.warn }); } void i; });
  // obciążenia charakterystyczne
  const loads = St.obciazenia || [];
  const on = o.loadsOn;
  let nTop = 0;
  const sL = s.length;
  loads.forEach((L, li) => {
    if (L.aktywne === false || (on && !on.has(li))) return;
    const col = D.loadColor(L);
    (L.sklad || []).forEach((p, pi) => {
      const g0 = `<g class="ld" data-li="${li}" data-pi="${pi}" style="cursor:pointer"><title>${esc(L.id)} – ${esc(L.nazwa || '')}: kliknij – zaznacz; dwuklik – zmień; prawy przycisk – menu</title>`;
      if (p.typ === 'N') {
        const x = p.x === '' || p.x === undefined ? Hmm : U.num(p.x) * 1000, y = Y(x);
        const e = U.num(pl === 'y' ? p.ez : p.ey, 0);
        const off = e ? Math.sign(e) * Math.min(cw / 2 + 10, 6 + Math.abs(e) / 40) : 0;
        const k = nTop++, dx = (k % 4) * 9 - 13, xa = cx + dx + off;
        const F = U.num(p.F);
        const top = x >= Hmm - 1, yl = top ? y - 30 - (k % 3) * 11 : y - 30;
        s += g0 + (F >= 0 ? arrowL(xa, top ? y - 28 : y - 26, xa, y - 2, col, 1.6) : arrowL(xa, y - 2, xa, top ? y - 28 : y - 26, col, 1.6)) + (top ? `<line x1="${xa}" y1="${y - 28}" x2="${xa}" y2="${yl + 3}" stroke="${col}" stroke-width="0.6" stroke-dasharray="2 2"/>` : '') + tx(xa + (k % 2 ? 3 : -3), yl, `${esc(L.id)} ${fmt(Math.abs(F), 0)}${e ? ` (e ${fmt(e, 0)})` : ''}`, { fs: 9, c: col, w: 650, a: k % 2 ? 'start' : 'end' }) + '</g>';
      } else if (p.typ === 'H' && p.kier === kier) {
        const x = p.x === '' || p.x === undefined ? Hmm : U.num(p.x) * 1000, y = Y(x), F = U.num(p.F), d = F >= 0 ? 1 : -1;
        const x0 = cx - cw / 2 - 4 - 30, x1 = cx - cw / 2 - 2;
        s += g0 + (d > 0 ? arrowL(x0, y, x1, y, col, 1.7) : arrowL(x1 + cw + 34, y, cx + cw / 2 + 2, y, col, 1.7)) + tx(d > 0 ? x0 - 2 : x1 + cw + 36, y + 3, `${esc(L.id)} ${fmt(Math.abs(F), 1)}`, { fs: 9, c: col, a: d > 0 ? 'end' : 'start', w: 650 }) + '</g>';
      } else if (p.typ === 'q' && p.kier === kier) {
        const x0 = p.x0 === '' || p.x0 === undefined ? 0 : U.num(p.x0) * 1000, x1 = p.x1 === '' || p.x1 === undefined ? Hmm : U.num(p.x1) * 1000;
        const q0 = U.num(p.q0), q1 = p.q1 === '' || p.q1 === undefined ? q0 : U.num(p.q1);
        const qm = Math.max(Math.abs(q0), Math.abs(q1), 1e-9), len = 26, d = (q0 + q1) >= 0 ? 1 : -1;
        const xb = d > 0 ? cx - cw / 2 - 3 : cx + cw / 2 + 3;
        let g = '';
        const n = Math.max(3, Math.round((Y(x0) - Y(x1)) / 22));
        for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, q = q0 + (q1 - q0) * t, l = len * Math.abs(q) / qm, y = Y(x); if (l < 2) continue; g += d > 0 ? arrowL(xb - l, y, xb, y, col, 0.9, 4) : arrowL(xb + l, y, xb, y, col, 0.9, 4); }
        g += `<line x1="${xb - d * len * Math.abs(q0) / qm}" y1="${Y(x0)}" x2="${xb - d * len * Math.abs(q1) / qm}" y2="${Y(x1)}" stroke="${col}" stroke-width="1"/>`;
        s += g0 + g + tx(xb - d * (len + 4), (Y(x0) + Y(x1)) / 2, `${esc(L.id)} ${fmt(Math.abs(q0), 2)}${q1 !== q0 ? '…' + fmt(Math.abs(q1), 2) : ''}`, { fs: 9, c: col, a: d > 0 ? 'end' : 'start', w: 650, rot: 0 }) + '</g>';
      } else if (p.typ === 'M' && p.os === pl) {
        const x = p.x === '' || p.x === undefined ? Hmm : U.num(p.x) * 1000, y = Y(x), Mv = U.num(p.M);
        s += g0 + `<path d="M${cx + cw / 2 + 6},${y - 12} a12,12 0 1,${Mv >= 0 ? 1 : 0} 0,24" fill="none" stroke="${col}" stroke-width="1.5"/>` + tx(cx + cw / 2 + 22, y + 4, `${esc(L.id)} ${fmt(Math.abs(Mv), 1)} kNm`, { fs: 9, c: col, a: 'start', w: 650 }) + '</g>';
      }
    });
  });
  // obciążenia rysowane na wierzchu wykresów (klikalne)
  const ldS = s.slice(sL); s = s.slice(0, sL);
  // wykres
  const r = R && R.env && !R.errors.length ? R : null;
  const mode = o.diag || 'M';
  if (r) {
    const xs = Array.from(r.an.xs3);
    const xr = cx + cw / 2 + 4, wr = W - xr - 30;
    const series = (arrs, col, dp, unit, k) => {
      const all = arrs.flatMap(a => Array.from(a)); const mx = Math.max(...all.map(Math.abs), 1e-9);
      const sc = wr / mx * 0.9;
      let g = '';
      arrs.forEach((a, j) => {
        const pts = xs.map((x, i) => `${(cx + a[i] * sc).toFixed(1)},${Y(x).toFixed(1)}`).join(' ');
        g += `<polygon class="dgm" points="${cx},${Y(xs[0])} ${pts} ${cx},${Y(xs[xs.length - 1])}" fill="${col}" fill-opacity="${j ? 0.06 : 0.12}" stroke="none" style="cursor:crosshair"/><polyline class="dgm" points="${pts}" fill="none" stroke="${col}" stroke-width="1.5" ${j ? 'stroke-dasharray="5 3"' : ''}/>`;
      });
      // wartości skrajne
      const marks = [];
      arrs.forEach(a => { let im = 0; a.forEach((v, i) => { if (Math.abs(v) > Math.abs(a[im])) im = i; }); if (Math.abs(a[im]) > 1e-9 * k) marks.push([im, a[im]]); if (Math.abs(a[0]) > 0.05 * Math.abs(a[im]) && im !== 0) marks.push([0, a[0]]); });
      marks.forEach(([i, v]) => { const xx = cx + v * sc, yy = Y(xs[i]); g += `<circle cx="${xx}" cy="${yy}" r="2.5" fill="${col}"/>` + tx(Math.min(W - 4, Math.max(4, xx + (v >= 0 ? 4 : -4))), yy + (i === 0 ? -5 : xs[i] > Hmm * 0.9 ? 12 : 4), fmt(v / k, dp), { fs: 9.5, c: col, a: v >= 0 ? 'start' : 'end', w: 650 }); });
      void unit;
      return g;
    };
    const F = o.F, src = F ? 'kombinacja ' + (o.Flab || '') : 'obwiednia SGN';
    if (['M', 'V', 'N'].includes(mode)) s += `<rect class="mhit" data-pl="${pl}" x="${cx + cw / 2 + 1}" y="${Y(Hmm)}" width="${Math.max(10, W - cx - cw / 2 - 7)}" height="${hh}" fill="transparent" style="cursor:crosshair"><title>Kliknij – wartości na tej wysokości (znacznik); dwuklik – siły i sprawdzenia; prawy – menu</title></rect>`;
    if (mode === 'M') { const e = pl === 'y' ? r.env.My : r.env.Mz; s += series(F ? [F[pl].M] : [e.max, e.min], pl === 'y' ? C.red : C.vio, 1, 'kNm', 1e6); s += tx(8, H - 38, `M_${pl === 'y' ? 'y' : 'z'},Ed [kNm] – ${src}${r.method !== 'I' ? ' (II rząd)' : ''}`.replace(/_(\w+),Ed/, '<tspan baseline-shift="sub" font-size="75%">$1,Ed</tspan>'), { fs: 9.5, a: 'start', c: C.ink2 }); }
    else if (mode === 'V') { const e = pl === 'y' ? r.env.Vz : r.env.Vy; s += series(F ? [F[pl].V] : [e.max, e.min], C.blu, 1, 'kN', 1e3); s += tx(8, H - 38, `V [kN] – ${src} (siła w kierunku ${kier})`, { fs: 9.5, a: 'start', c: C.ink2 }); }
    else if (mode === 'N') { s += series(F ? [F.N] : [r.env.Nmax, r.env.Nmin], C.grn, 0, 'kN', 1e3); s += tx(8, H - 38, `N_Ed [kN] – ${src} (+ ściskanie)`.replace('_Ed', '<tspan baseline-shift="sub" font-size="75%">Ed</tspan>'), { fs: 9.5, a: 'start', c: C.ink2 }); }
    else if (mode === 'w') {
      const q = r.sgu && r.sgu[pl];
      if (q) { let F; try { F = r.method === 'I' ? BS.S.combine1(r.md, r.an, q.combo) : BS.S.combine2(r.md, r.an, r.sec, q.combo, { phi: 0 }); } catch (e) { F = null; } if (F && F[pl]) { s += series([F[pl].w], C.ok, 1, 'mm', 1); s += tx(8, H - 38, `przemieszczenie [mm] – ${q.combo.opis.slice(0, 40)}`, { fs: 9, a: 'start', c: C.ink2 }); } }
    } else if (mode === 'buck') {
      const g = o.gov, mem = g && g.mem, f = mem && mem.flex[pl];
      const md2 = r.md;
      if (f && f.mode && f.mode.w) {
        const xsM = f.mode.xs, wv = f.mode.w, amp = Math.min(40, wr * 0.5);
        const pts = xsM.map((x, i) => `${(cx + wv[i] * amp).toFixed(1)},${Y(x).toFixed(1)}`).join(' ');
        s += `<polyline points="${pts}" fill="none" stroke="${C.warn}" stroke-width="1.6" stroke-dasharray="6 3"/>`;
        s += tx(8, H - 38, `postać wyboczenia: L_cr = ${fmt(f.Lcr / 1000, 2)} m (μ = ${fmt(f.Lcr / md2.H, 2)}), α_cr = ${fmt(f.alphaCr, 2)}`.replace(/_cr/g, '<tspan baseline-shift="sub" font-size="75%">cr</tspan>'), { fs: 9.5, a: 'start', c: C.warn, w: 600 });
      } else if (f) s += tx(8, H - 38, f.covered ? 'wyboczenie ujęte imperfekcjami e₀ (II rząd)' : `L_cr = ${fmt(f.Lcr / 1000, 2)} m (przyjęte ręcznie)`, { fs: 9.5, a: 'start', c: C.warn });
    }
  }
  s += ldS;
  if (o.dims) {
    const xsD = [0, Hmm];
    (St.stezenia || []).forEach(z => { if (z.pl === pl || z.pl === 'yz') xsD.push(U.num(z.x) * 1000); });
    loads.forEach((L, li) => { if (L.aktywne === false) return; (L.sklad || []).forEach(p => { const xx = p.typ === 'q' ? [p.x0, p.x1] : [p.x]; xx.forEach(v => { if (v !== '' && v !== undefined && v !== null) xsD.push(U.num(v) * 1000); }); }); });
    const xu = Array.from(new Set(xsD.filter(v => v >= 0 && v <= Hmm).map(v => Math.round(v)))).sort((a2, b2) => a2 - b2);
    if (xu.length > 2) { const xd = cx - cw / 2 - 52; s += `<g class="dimch">`; for (let k = 0; k < xu.length - 1; k++) { const y0 = Y(xu[k]), y1 = Y(xu[k + 1]); s += `<line x1="${xd}" y1="${y0}" x2="${xd}" y2="${y1}" stroke="${C.mut}" stroke-width="0.7"/><line x1="${xd - 3}" y1="${y0 + 3}" x2="${xd + 3}" y2="${y0 - 3}" stroke="${C.mut}"/>` + (y0 - y1 > 14 ? tx(xd - 3, (y0 + y1) / 2, fmt((xu[k + 1] - xu[k]) / 1000, 2), { fs: 8.5, rot: -90, c: C.ink2 }) : ''); } s += `<line x1="${xd - 3}" y1="${Y(Hmm) + 3}" x2="${xd + 3}" y2="${Y(Hmm) - 3}" stroke="${C.mut}"/></g>`; }
  }
  s += Q.dimV(26, Y(Hmm), Y(0), `H = ${fmt(Hm, 2)} m`, { fs: 10 });
  if (o.secName) s += tx(cx + 3, Y(Hmm * 0.5), esc(o.secName), { fs: 8.5, rot: -90, c: C.ink2, w: 600 });
  return s + '</svg>';
};

/* ------------------------------------------------------------ postacie wyboczenia (pionowo) */
D.modes = function (R, mem, o) {
  o = o || {};
  const W = o.W || 520, H = o.H || 330, mt = 40, mb = 34, md = R.md, Hmm = md.H, hh = H - mt - mb;
  const cols = [];
  ['y', 'z'].forEach(pl => { const f = mem.flex[pl]; if (f && f.mode && f.mode.w) cols.push({ t: `giętna ${pl}–${pl}`, sub: `N_cr,${pl} = ${fmt(f.Ncr / 1e3, 0)} kN`, xs: f.mode.xs, v: f.mode.w, c: pl === 'y' ? C.red : C.vio }); });
  if (mem.tors && mem.tors.relevant && mem.nc && mem.nc.TF && mem.nc.TF.mode) { const m = mem.nc.TF.mode; cols.push({ t: 'giętno-skrętna (u, φ)', sub: `N_cr,TF = ${fmt(mem.tors.NcrTF / 1e3, 0)} kN`, xs: m.xs, v: m.u, v2: m.phi, c: C.blu }); }
  if (mem.mcr && mem.mcr.mode) { const m = mem.mcr.mode; cols.push({ t: 'zwichrzenie (u, φ)', sub: 'M_cr', xs: m.xs, v: m.u, v2: m.phi, c: C.warn }); }
  if (!cols.length) return '';
  const cw = W / cols.length;
  let s = svgOpen(W, H, 'class="modesvg"');
  s += tx(6, 14, o.title || 'Postacie utraty stateczności (MES, znormalizowane)', { fs: 11.5, w: 650, a: 'start' });
  cols.forEach((c, k) => {
    const x0 = k * cw + cw / 2, Y = x => mt + (1 - x / Hmm) * hh;
    s += `<line x1="${x0}" y1="${Y(0)}" x2="${x0}" y2="${Y(Hmm)}" stroke="#9aa3b0" stroke-width="3"/>`;
    const nrm = (a) => { const m = Math.max(...a.map(Math.abs), 1e-30); const sg = Math.abs(Math.min(...a)) > Math.max(...a) ? -1 : 1; return a.map(v => sg * v / m); };
    const v = nrm(c.v), amp = cw * 0.32;
    s += `<polyline points="${c.xs.map((x, i) => `${(x0 + v[i] * amp).toFixed(1)},${Y(x).toFixed(1)}`).join(' ')}" fill="none" stroke="${c.c}" stroke-width="1.8"/>`;
    if (c.v2) { const v2 = nrm(c.v2); s += `<polyline points="${c.xs.map((x, i) => `${(x0 + v2[i] * amp).toFixed(1)},${Y(x).toFixed(1)}`).join(' ')}" fill="none" stroke="${C.red}" stroke-width="1.2" stroke-dasharray="4 3"/>`; }
    s += tx(x0, H - 18, c.t, { fs: 10, w: 650 }) + tx(x0, H - 5, sub(c.sub), { fs: 9.5, c: C.ink2 });
    md.stez.forEach(z => { s += `<circle cx="${x0}" cy="${Y(z.x)}" r="2.5" fill="${C.warn}"/>`; });
  });
  s += tx(W - 6, 28, 'linia ciągła – przemieszczenie, przerywana – skręcenie φ', { fs: 9, a: 'end', c: C.mut });
  return s + '</svg>';
};

/* ------------------------------------------------------------ podstawa słupa: rzut i widok */
D.basePlate = function (C0, sec, o) {
  o = o || {};
  if (!C0 || !C0.lp) return '';
  const W = o.W || 620, Hh = o.H || 360;
  const { lp, bp, tp } = C0;
  // rzut: z pionowo (l_p), y poziomo (b_p)
  const scP = Math.min((W * 0.5 - 110) / bp, (Hh - 128) / lp);
  const cxP = 60 + bp * scP / 2, cyP = Hh / 2 - 8;
  const X = (y) => cxP + y * scP, Y = (z) => cyP - z * scP;
  let s = svgOpen(W, Hh, 'class="basesvg" style="max-width:100%;height:auto"');
  const ed = (k, x, y, w, h, t, bv) => `<rect class="bzd" data-bk="${k}"${bv !== undefined ? ` data-bv="${bv}"` : ''} x="${x}" y="${y}" width="${Math.max(12, w)}" height="${Math.max(12, h)}" fill="transparent" style="cursor:text"><title>${t} – kliknij, aby zmienić na rysunku</title></rect>`;
  const gz = (z, t, inner) => `<g class="bz" data-bz="${z}" style="cursor:pointer"><title>${t}</title>${inner}</g>`;
  s += tx(8, 16, 'Podstawa słupa – rzut', { fs: 11.5, w: 650, a: 'start' });
  s += gz('plate', 'Blacha podstawy – kliknij: wymiary, grubość, stal', `<rect x="${X(-bp / 2)}" y="${Y(lp / 2)}" width="${bp * scP}" height="${lp * scP}" fill="#e3e8f0" stroke="${C.ink}" stroke-width="1.2"/>`);
  // strefy docisku (króćce teowe)
  if (C0.Tf && sec.kind !== 'CHS') {
    const zf = C0.zC, bf = C0.Tf.beff, lf = C0.Tf.leff;
    let tz = '';
    [1, -1].forEach(sg => { tz += `<rect x="${X(-lf / 2)}" y="${Y(sg * zf + bf / 2)}" width="${lf * scP}" height="${bf * scP}" fill="${C.warn}" fill-opacity="0.18" stroke="${C.warn}" stroke-dasharray="3 2" stroke-width="0.8"/>`; });
    if (C0.Tw && C0.Tw.A > 0) tz += `<rect x="${X(-C0.Tw.beff / 2)}" y="${Y(C0.Tw.leff / 2)}" width="${C0.Tw.beff * scP}" height="${C0.Tw.leff * scP}" fill="${C.warn}" fill-opacity="0.12" stroke="${C.warn}" stroke-dasharray="3 2" stroke-width="0.8"/>`;
    s += gz('tstub', 'Strefy docisku (króćce teowe, szerokość c) – kliknij: beton, podlewka, k_j', tz);
  }
  // przekrój słupa
  const path = sec.rings.map(r => r.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1] - sec.zc).toFixed(1)).join(' ') + ' Z').join(' ');
  s += gz('col', `Słup ${esc(sec.nazwa)} – kliknij: spoiny słupa z blachą`, `<path d="${path}" fill="${C.steel}" fill-rule="evenodd" stroke="${C.ink}" stroke-width="1"/>`);
  // kotwy
  const anchors = [];
  if (C0.uk === 'zew') [1, -1].forEach(sg => [1, -1].forEach(sy => anchors.push([sy * C0.w / 2, sg * C0.zT])));
  else if (C0.nb === 2) [1, -1].forEach(sy => anchors.push([sy * C0.w / 2, 0]));
  else [1, -1].forEach(sg => [1, -1].forEach(sy => anchors.push([sy * C0.w / 2, sg * C0.zT])));
  let an = '';
  anchors.forEach(([y, z]) => { an += `<circle cx="${X(y)}" cy="${Y(z)}" r="${Math.max(3, C0.d0 / 2 * scP)}" fill="#ffffff" stroke="${C.red}" stroke-width="1.3"/><circle cx="${X(y)}" cy="${Y(z)}" r="${Math.max(1.5, C0.d / 2 * scP)}" fill="${C.red}" fill-opacity="0.5"/>`; });
  s += gz('anch', 'Kotwy – kliknij: średnica, klasa, układ, rozstaw', an);
  s += Q.dimH(X(-bp / 2), X(bp / 2), Y(lp / 2) - 12, `b<tspan baseline-shift="sub" font-size="75%">p</tspan> = ${fmt(bp, 0)}`);
  s += Q.dimV(X(-bp / 2) - 14, Y(-lp / 2), Y(lp / 2), `l<tspan baseline-shift="sub" font-size="75%">p</tspan> = ${fmt(lp, 0)}`);
  s += ed('podstawa.bp', X(-bp / 2), Y(lp / 2) - 26, bp * scP, 18, 'Szerokość blachy b_p') + ed('podstawa.lp', X(-bp / 2) - 32, Y(lp / 2), 22, lp * scP, 'Długość blachy l_p');
  // łańcuchy wymiarowe osi otworów: e_y | w | e_y (wzdłuż b_p) oraz e_z | p | e_z (wzdłuż l_p); czerwone – poniżej minimum tabl. 3.3
  const G = C0.geo || {}, sub = (a, b2) => `${a}<tspan baseline-shift="sub" font-size="75%">${b2}</tspan>`;
  const bad = (v, mn) => (v < mn - 1e-6 ? { c: C.red, w: 700 } : {});
  if (anchors.length) {
    const yA = Math.max(...anchors.map(a => a[0])), yB = Math.min(...anchors.map(a => a[0])), yD = Y(-lp / 2) + 14;
    const eY = (bp - C0.w) / 2, eOk = bad(eY, G.eMin || 0), pOk = bad(C0.w, G.p2Min || 0);
    s += Q.dimH(X(-bp / 2), X(yB), yD, `${fmt(eY, 0)}`, Object.assign({ below: true, fs: 9.5 }, eOk)) + Q.dimH(X(yB), X(yA), yD, `w = ${fmt(C0.w, 0)}`, Object.assign({ below: true }, pOk)) + Q.dimH(X(yA), X(bp / 2), yD, `${fmt(eY, 0)}`, Object.assign({ below: true, fs: 9.5 }, eOk));
    s += ed('podstawa.kotwy.eY', X(-bp / 2), yD - 6, X(yB) - X(-bp / 2), 22, 'Odległość osi otworu od krawędzi blachy e_y', eY) + ed('podstawa.kotwy.w', X(yB), yD - 6, X(yA) - X(yB), 22, 'Rozstaw kotew w rzędzie w (p₂)') + ed('podstawa.kotwy.eY', X(yA), yD - 6, X(bp / 2) - X(yA), 22, 'Odległość osi otworu od krawędzi blachy e_y', eY);
    const zAx = Math.max(...anchors.map(a => a[1])), xD = X(bp / 2) + 14, eZ = lp / 2 - zAx, ezOk = bad(eZ, G.eMin || 0);
    const kEz = C0.uk === 'zew' ? 'podstawa.kotwy.ez' : zAx > 0 ? 'podstawa.kotwy.eZw' : null;
    s += Q.dimV(xD, Y(lp / 2), Y(zAx), `${fmt(eZ, 0)}`, Object.assign({ right: true, fs: 9.5 }, ezOk));
    if (zAx > 0) s += Q.dimV(xD, Y(zAx), Y(-zAx), C0.uk === 'zew' ? `${sub('2z', 'T')} = ${fmt(2 * zAx, 0)}` : `p = ${fmt(2 * zAx, 0)}`, Object.assign({ right: true }, bad(2 * zAx, G.p1Min || 0)));
    s += Q.dimV(xD, Y(-zAx), Y(-lp / 2), `${fmt(eZ, 0)}`, Object.assign({ right: true, fs: 9.5 }, ezOk));
    if (kEz) s += ed(kEz, xD - 6, Y(lp / 2), 34, Y(zAx) - Y(lp / 2), 'Odległość osi otworu od krawędzi blachy e_z', eZ) + ed(kEz, xD - 6, Y(-zAx), 34, Y(-lp / 2) - Y(-zAx), 'Odległość osi otworu od krawędzi blachy e_z', eZ);
    if (zAx > 0) s += ed(C0.uk === 'zew' ? 'podstawa.kotwy.zT2' : 'podstawa.kotwy.p', xD - 6, Y(zAx), 60, Y(-zAx) - Y(zAx), C0.uk === 'zew' ? 'Rozstaw rzędów kotew 2z_T (p₁)' : 'Rozstaw rzędów kotew p (p₁)', 2 * zAx);
    if (G.eMin) s += tx(X(-bp / 2) - 30, Y(-lp / 2) + 44, `min. (tabl. 3.3): e ≥ 1,2d₀ = ${fmt(G.eMin, 0)}; p₁ ≥ 2,2d₀ = ${fmt(G.p1Min, 0)}; p₂ ≥ 2,4d₀ = ${fmt(G.p2Min, 0)} mm (d₀ = ${fmt(G.d0, 0)})`, { fs: 8.5, a: 'start', c: (G.uE > 1 || G.uP > 1) ? C.red : C.mut });
  }
  s += tx(X(bp / 2) + 6, Y(lp / 2) - 26, `${C0.nb} × ${o.dName || ''} kl. ${o.kl || ''}`, { fs: 9.5, c: C.red, a: 'start' });
  // widok z boku
  const x0 = W * 0.56, wv = W - x0 - 80, scV = Math.min(wv / lp, 1.2 * scP);
  const cxV = x0 + wv / 2, yP = Hh * 0.52;
  const XV = (z) => cxV + z * scV;
  s += tx(x0, 16, 'Widok (płaszczyzna x–z)', { fs: 11.5, w: 650, a: 'start' });
  const tpv = Math.max(4, tp * scV), tgv = Math.max(3, C0.tg * scV);
  s += gz('conc', `Fundament – beton ${esc(o.beton || '')}: kliknij – beton, wymiary fundamentu, k_j`, `<rect x="${XV(-lp / 2) - 20}" y="${yP + tpv + tgv}" width="${lp * scV + 40}" height="${60}" fill="#eef0f3" stroke="${C.mut}"/>`);
  s += gz('grout', 'Podlewka – kliknij: grubość t_g', `<rect x="${XV(-lp / 2)}" y="${yP + tpv}" width="${lp * scV}" height="${tgv}" fill="#d9dde3" stroke="${C.mut}" stroke-dasharray="3 2"/>`);
  s += gz('plate', 'Blacha podstawy – kliknij: wymiary, grubość, stal', `<rect x="${XV(-lp / 2)}" y="${yP}" width="${lp * scV}" height="${tpv}" fill="#b9c3d3" stroke="${C.ink}"/>`);
  const h2 = sec.h / 2, tf = sec.kind === 'I' ? sec.tg : sec.kind === 'CC' ? sec.tf : sec.t;
  s += gz('col', `Słup ${esc(sec.nazwa)} – kliknij: spoiny słupa z blachą`, `<rect x="${XV(-h2)}" y="${yP - 120}" width="${sec.h * scV}" height="120" fill="${C.steel}" fill-opacity="0.5" stroke="${C.ink}"/>`);
  if (sec.kind !== 'CHS') s += `<line x1="${XV(-h2 + tf)}" y1="${yP - 120}" x2="${XV(-h2 + tf)}" y2="${yP}" stroke="${C.ink}" stroke-width="0.8"/><line x1="${XV(h2 - tf)}" y1="${yP - 120}" x2="${XV(h2 - tf)}" y2="${yP}" stroke="${C.ink}" stroke-width="0.8"/>`;
  // spoiny
  let wl = '';
  [-h2, h2].forEach(z => { const sg = z > 0 ? 1 : -1, a = Math.max(3, C0.af * scV * 1.4); wl += `<path d="M${XV(z)},${yP} l${sg * a},0 l${-sg * a},${-a} z" fill="${C.ink}"/>`; });
  s += gz('weld', 'Spoiny słupa z blachą – kliknij: grubości a_f, a_w', wl + `<rect x="${XV(-h2) - 10}" y="${yP - 14}" width="20" height="16" fill="transparent"/><rect x="${XV(h2) - 10}" y="${yP - 14}" width="20" height="16" fill="transparent"/>`);
  let an2 = '';
  if (C0.uk === 'zew') [1, -1].forEach(sg => { const xx = XV(sg * C0.zT); an2 += `<line x1="${xx}" y1="${yP - 16}" x2="${xx}" y2="${yP + tpv + tgv + 56}" stroke="${C.red}" stroke-width="${Math.max(1.5, C0.d * scV)}"/><rect x="${xx - 6}" y="${yP - 10}" width="12" height="7" fill="${C.red}" fill-opacity="0.7"/>`; });
  if (an2) s += gz('anch', 'Kotwy – kliknij: średnica, klasa, układ, rozstaw', an2);
  s += Q.dimV(XV(lp / 2) + 26, yP, yP + tpv, `t<tspan baseline-shift="sub" font-size="75%">p</tspan> = ${fmt(tp, 0)}`, { right: true }) + tx(XV(lp / 2) + 26, yP + tpv + tgv + 12, `podlewka ${fmt(C0.tg, 0)}`, { fs: 9, a: 'start', c: C.mut });
  s += ed('podstawa.tp', XV(lp / 2) + 20, yP - 4, 40, tpv + 8, 'Grubość blachy t_p') + ed('podstawa.podlewka', XV(lp / 2) + 22, yP + tpv + tgv + 2, 70, 14, 'Grubość podlewki t_g');
  s += tx(XV(0), yP + tpv + tgv + 76, `beton ${esc(o.beton || '')}: f_jd = ${fmt(C0.fjd, 1)} MPa`.replace('_jd', '<tspan baseline-shift="sub" font-size="75%">jd</tspan>'), { fs: 9.5, c: C.ink2 });
  s += tx(8, Hh - 6, 'kliknij element – jego parametry; kliknij wymiar – zmiana wartości na rysunku; prawy przycisk – menu', { fs: 9, a: 'start', c: C.mut });
  return s + '</svg>';
};

/* ------------------------------------------------------------ pożar: θ(t) */
D.fire = function (fr, o) {
  o = o || {};
  const t = fr.hist.map(r => r[0]);
  return D.lineChart({ W: o.width || 640, H: o.height || 230, title: 'Temperatura gazów (ISO 834) i stali θ_a(t)', yl: 'θ [°C]', xl: 't [min]', dp: 0, xmin: 0,
    hl: [{ y: fr.thcr, c: C.warn, l: `θ_a,cr = ${fmt(fr.thcr, 0)} °C` }], vl: [{ x: fr.Rreq, l: 'R' + fr.Rreq }],
    series: [{ x: t, y: fr.hist.map(r => r[2]), c: C.red, dash: '5 3', l: 'gazy ISO 834' }, { x: t, y: fr.hist.map(r => r[1]), c: C.blu, l: 'stal θ_a' }] });
};

/* ------------------------------------------------------------ piktogram schematu (lista) */
D.pict = function (id) {
  const s = (BS.J.SCHEMATY || []).find(q => q.id === id); if (!s) return '';
  const W = 54, H = 46, cx1 = 15, cx2 = 39, y0 = 40, y1 = 6;
  const one = (cx, d, g) => `<line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y1}" stroke="#1b2230" stroke-width="2"/>` + (d === 'utw' ? `<line x1="${cx - 6}" y1="${y0}" x2="${cx + 6}" y2="${y0}" stroke="#1b2230" stroke-width="2"/>` : `<path d="M${cx},${y0} l-4,5 h8 z" fill="#fff" stroke="#1b2230"/>`) + (g === 'prz' ? `<path d="M${cx},${y1} l-4,-4 h8 z" fill="#fff" stroke="#1b2230"/>` : g === 'utw' || g === 'utwp' ? `<line x1="${cx - 6}" y1="${y1}" x2="${cx + 6}" y2="${y1}" stroke="#1b2230" stroke-width="2"/>` : '');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${one(cx1, s.dol.y, s.gora.y)}${one(cx2, s.dol.z, s.gora.z)}<text x="${cx1}" y="${H}" font-size="7" text-anchor="middle">y</text><text x="${cx2}" y="${H}" font-size="7" text-anchor="middle">z</text></svg>`;
};

})();
