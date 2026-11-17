/* =====================================================================
   SłupStal – widoki zakładek wyników: przekrój i nośność, wykresy na
   wysokości (obwiednie lub wybrana kombinacja, I i II rząd), stateczność
   (N_cr, L_cr, χ, M_cr, χ_LT, C_m, k_ij, metoda ogólna, postacie),
   podstawa, pożar, podsumowanie (karty + tabela sprawdzeń z tokiem),
   raport (pełny / statyka, HTML z danymi, .odt, druk/PDF).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, D = BS.D, Q = BS.Q, A = BS.A, RP = BS.Raport, S0 = BS.S;
const { $, $$, esc, fmt, sym } = Q;
const V = BS.V = {};
const R = () => A.R(), S = () => A.S();
const kN = v => fmt(v / 1e3, 1), kNm = v => fmt(v / 1e6, 1);
const head = (el, title, sub) => `<div class="dsumx"></div><div style="display:flex;align-items:baseline;gap:10px;margin:6px 0 10px"><b style="font-size:14px">${title}</b><span class="hint" style="margin:0">${sub || ''}</span></div>`;
const bindHead = (el) => { $$('.dsumx', el).forEach(x => { x.innerHTML = A.dsumHTML(); A.bindDsum(x); }); };
const errBox = () => { const r = R(); return `<div class="msgs">${(r && r.errors || []).map(e => `<div class="msg err">${esc(e)}</div>`).join('') || '<div class="msg">Brak wyników.</div>'}</div>`; };
const stc = (c) => `<span class="st ${c.info ? (c.status === 'warn' ? 'warn' : 'info') : c.status}">${c.info ? (c.status === 'warn' ? 'uwaga' : 'info') : c.status === 'fail' ? 'niespełniony' : c.status === 'warn' ? 'uwaga' : 'spełniony'}</span>`;
const unitV = (v, u) => (v === null || v === undefined || !isFinite(v) ? '—' : u === 'F' ? fmt(v / 1e3, 2) + ' kN' : u === 'M' ? fmt(v / 1e6, 2) + ' kNm' : u === 'mm' ? fmt(v, 1) + ' mm' : u === 'MPa' ? fmt(v, 1) + ' MPa' : u === '°C' ? fmt(v, 0) + ' °C' : fmt(v, 3));
const checkRows = (cs, all) => cs.map(c => { const i = all.indexOf(c); return `<tr class="${c.status === 'ok' || c.info ? 'done' : ''}" data-ci="${i}"><td>${sym(c.n)}${c.combo ? `<br><small class="hint">${esc(c.combo)}</small>` : ''}</td><td><button class="nref lnk" data-ref="${i}" type="button">${esc(c.ref)}</button></td><td class="val" style="text-align:right">${c.unit === '-' ? fmt(c.util, 3) + ' ≤ 1' : `${unitV(c.Ed, c.unit)} ${c.util <= 1 ? '≤' : '>'} ${unitV(c.Rd, c.unit)}`}</td><td class="bar"><b>${c.util !== null && isFinite(c.util) ? fmt(c.util * 100, 0) + '%' : '∞'}</b></td><td>${stc(c)}</td></tr>`; }).join('');
const bindChecks = (el) => {
  const c = R().checks;
  $$('[data-ref]', el).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); A.normPopup(c[+b.dataset.ref]); }));
  $$('tr[data-ci] td.val, tr[data-ci] td.bar, tr[data-ci] td:first-child', el).forEach(td => { td.classList.add('xclick'); td.title = 'Kliknij – jak obliczono (wzór, podstawienie, punkt normy)'; td.addEventListener('click', () => A.explainPopup(c[+td.closest('tr').dataset.ci])); });
};
const tableChecks = (cs) => `<div class="tscroll"><table class="ctab"><thead><tr><th>Sprawdzenie</th><th>Punkt normy</th><th style="text-align:right">Warunek</th><th>Wykorzystanie</th><th>Status</th></tr></thead><tbody>${checkRows(cs, R().checks)}</tbody></table></div>`;

/* ================================================================ PRZEKRÓJ */
V.sec = function (el) {
  const r = R();
  if (!r || !r.sec) { el.innerHTML = head(el, 'Przekrój i nośność') + errBox(); bindHead(el); return; }
  const sec = r.sec, b = r.base, mat = r.mat;
  const q = r.checks.find(c => c.id === 'MN');
  const e = q && q.d ? q.d.e : { N: 0, My: 0, Mz: 0 };
  let h = head(el, 'Przekrój i nośność', 'kliknij pas / środnik – wymiary tej części; wiersz sprawdzenia – tok obliczeń; wykres η(x) – przekrój na tej wysokości');
  h += `<div class="rebbar"><button class="btn sm pri" id="dsSec" type="button">⚙ Dobierz przekrój</button><button class="btn sm" data-act="secwin" type="button">Przekrój i materiał…</button><button class="btn sm" data-act="sectab" type="button">Tablica kształtowników…</button></div>`;
  h += `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">`;
  h += `<div class="box"><h4>${esc(sec.nazwa)} · ${esc(mat.gatunek + mat.podgatunek)} · f<sub>y</sub> = ${fmt(mat.fy, 0)} MPa</h4>${D.section(sec, { size: 260, zones: true, sigma: q ? { N: e.N, My: e.My, Mz: e.Mz } : null, fy: mat.fy, eff: b.effN || b.effMy })}<p class="hint">σ – naprężenia sprężyste w miejscu najbardziej wytężonym (N + M<sub>y</sub>; przerywana – z M<sub>z</sub>).</p>${RP.secTable(sec)}</div>`;
  h += `<div class="box" style="flex:1;min-width:340px"><h4>Nośności obliczeniowe</h4><table class="kv"><tbody>
    <tr><td>N<sub>pl,Rd</sub></td><td>${kN(b.Npl)}</td><td>kN</td></tr><tr><td>N<sub>c,Rd</sub>${b.effN ? ' (A<sub>eff</sub>)' : ''}</td><td>${kN(b.Nc)}</td><td>kN</td></tr>
    <tr><td>M<sub>c,y,Rd</sub> (kl. ${b.kMy.cls})</td><td>${kNm(b.Mcy)}</td><td>kNm</td></tr><tr><td>M<sub>c,z,Rd</sub> (kl. ${b.kMz.cls})</td><td>${kNm(b.Mcz)}</td><td>kNm</td></tr>
    <tr><td>M<sub>pl,y,Rd</sub> / M<sub>pl,z,Rd</sub></td><td>${kNm(b.Mply)} / ${kNm(b.Mplz)}</td><td>kNm</td></tr>
    <tr><td>V<sub>pl,z,Rd</sub> / V<sub>pl,y,Rd</sub></td><td>${kN(b.Vplz)} / ${kN(b.Vply)}</td><td>kN</td></tr></tbody></table>
    <h4 style="margin-top:12px">Klasa przekroju · ε = ${fmt(b.eps, 3)}</h4><p class="hint">Ściskanie: klasa ${b.kN.cls} · zginanie M<sub>y</sub>: ${b.kMy.cls} · zginanie M<sub>z</sub>: ${b.kMz.cls}${q ? ` · w miejscu decydującym (N + M): <b>${q.d.p.cls}</b>` : ''}</p>${RP.classTable(q ? q.d.cx.k : b.kN)}</div></div>`;
  // wytężenie przekroju na wysokości
  const xs = Array.from(r.an.xs3).map(x => x / 1000), Hm = r.md.H / 1000;
  const x0 = secX === null ? (r.checks.find(c => c.id === 'MN') || {}).x : secX;
  const hsBox = `<div class="box hsec" style="min-width:300px;max-width:420px"><div class="secx"><b>Przekrój na wysokości</b> x =<input class="txt" id="secX" value="${fmt((x0 || 0) / 1000, 2)}" autocomplete="off"> m <button class="btn sm" data-sx="max" type="button">miejsce decydujące</button><button class="btn sm" data-sx="0" type="button">podstawa</button><button class="btn sm" data-sx="H" type="button">głowica</button><span class="hint" style="margin:0">lub kliknij wykres η(x)</span></div><div id="secHs">${BS.W3.hsecHTML(S(), r, x0 || 0).replace(/<h4>.*?<\/h4>/, "")}</div></div>`;
  h += `<div class="fig" style="margin-top:12px">${D.heightChart({ W: 300, H: 380, Hm, title: 'Wytężenie przekroju η(x) – obwiednia', unit: 'η [%]', dp: 0, series: [{ x: xs, v: Array.from(r.env.uSec).map(v => v * 100), c: '#c0262d', fill: '#c0262d', l: 'η' }], vlines: [{ v: 100, c: '#1d7f3c', l: '100%' }] })}${hsBox}<div style="flex:1;min-width:360px"><h4>Sprawdzenia przekroju (PN-EN 1993-1-1, 6.2)</h4>${tableChecks(r.checks.filter(c => /^Nośność przekroju/.test(c.grp)))}</div></div>`;
  el.innerHTML = h; bindHead(el); bindChecks(el);
  const setX = (xmm) => { const r2 = R(); xmm = Math.max(0, Math.min(r2.md.H, xmm)); secX = xmm; const i = $('#secX', el); if (i) i.value = fmt(xmm / 1000, 2); const hs = $('#secHs', el); if (hs) { hs.innerHTML = BS.W3.hsecHTML(S(), r2, xmm).replace(/<h4>.*?<\/h4>/, ""); Q.flash(hs); } };
  A.setSecX = setX;
  D.bindHeight(el, ym => setX(ym * 1000));
  $$('svg.hchart', el).forEach(svg => svg.addEventListener('click', ev => { if (ev.target.closest('.pinlab')) return; const c = D.HCH[svg.dataset.cid]; if (!c) return; const rr = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, py = (ev.clientY - rr.top) * vb.height / rr.height, ym = (1 - (py - c.mt) / (c.H - c.mt - c.mb)) * c.Hm; if (ym >= 0 && ym <= c.Hm) setX(ym * 1000); }));
  const si = $('#secX', el); if (si) si.addEventListener('change', () => { const v = Q.parseNum(si.value); if (v !== null) setX(v * 1000); });
  $$('[data-sx]', el).forEach(b => b.addEventListener('click', () => { const k = b.dataset.sx, r2 = R(); setX(k === 'max' ? ((r2.checks.find(c => c.id === 'MN') || {}).x || 0) : k === 'H' ? r2.md.H : 0); }));
  $$('[data-act]', el).forEach(bt => bt.addEventListener('click', () => A.doAct(bt.dataset.act)));
  const ds = $('#dsSec', el); if (ds) ds.onclick = () => A.runDesign('sec');
  $$('.zhit', el).forEach(z => { z.addEventListener('click', ev => { ev.stopPropagation(); A.secPopup(z.dataset.z); }); z.addEventListener('contextmenu', ev => { ev.preventDefault(); Q.ctxMenu(ev.clientX, ev.clientY, [['sec', 'Przekrój i materiał…'], ['tab', 'Tablica kształtowników…'], ['des', '⚙ Dobierz przekrój']], a => { if (a === 'sec') A.secPopup(z.dataset.z); else if (a === 'tab') A.secTablePopup(); else A.runDesign('sec'); }); }); });
};

/* ================================================================ WYKRESY */
let chCombo = 'env', chVar = 0, secX = null;
V.chart = function (el) {
  const r = R();
  if (!r || !r.res || !r.res.length) { el.innerHTML = head(el, 'Wykresy') + errBox(); bindHead(el); return; }
  const xs = Array.from(r.an.xs3).map(x => x / 1000), Hm = r.md.H / 1000;
  const opts = `<option value="env" ${chCombo === 'env' ? 'selected' : ''}>obwiednia SGN (wszystkie kombinacje i warianty)</option>` + r.res.map((cr, i) => `<option value="${i}" ${String(chCombo) === String(i) ? 'selected' : ''}>${esc(cr.combo.id)}: ${esc(cr.combo.opis)}</option>`).join('');
  let h = head(el, 'Wykresy sił wewnętrznych i przemieszczeń na wysokości słupa', 'najedź kursorem – wartości na wszystkich wykresach; kliknij – znacznik (ponownie – usuń); kliknij etykietę znacznika – siły i sprawdzenia w tym miejscu');
  h += `<div class="rebbar"><span class="ttl">Kombinacja:</span><select id="chC">${opts}</select>`;
  const cr = chCombo === 'env' ? null : r.res[+chCombo];
  if (cr && cr.variants.length > 1) h += `<select id="chV">${cr.variants.map((v, i) => `<option value="${i}" ${i === chVar ? 'selected' : ''}>${esc(v.lab)}</option>`).join('')}</select>`;
  h += `<button class="btn sm" id="pinClr" type="button" title="Usuń wszystkie znaczniki z wykresów (także prawy przycisk na wykresie)">Usuń znaczniki</button><button class="btn sm" id="chSch" type="button" title="Pokaż tę kombinację na schemacie w zakładce Dane">Na schemacie →</button></div>`;
  const W = 236, H = 400;
  const hc = (o) => D.heightChart(Object.assign({ W, H, Hm }, o));
  let charts = '';
  if (!cr) {
    const s2 = (a, k) => Array.from(a).map(v => v / k);
    charts += hc({ title: 'N_Ed [kN]', unit: 'kN', series: [{ x: xs, v: s2(r.env.Nmax, 1e3), c: '#155e2c', fill: '#155e2c', l: 'max' }, { x: xs, v: s2(r.env.Nmin, 1e3), c: '#155e2c', dash: '5 3', l: 'min' }] });
    charts += hc({ title: 'M_y,Ed [kNm]', unit: 'kNm', series: [{ x: xs, v: s2(r.env.My.max, 1e6), c: '#c0262d', fill: '#c0262d', l: 'max' }, { x: xs, v: s2(r.env.My.min, 1e6), c: '#c0262d', dash: '5 3', l: 'min' }], vlines: [{ v: r.base.Mcy / 1e6, c: '#1d7f3c', l: 'M_c,y,Rd' }, { v: -r.base.Mcy / 1e6, c: '#1d7f3c' }] });
    charts += hc({ title: 'M_z,Ed [kNm]', unit: 'kNm', series: [{ x: xs, v: s2(r.env.Mz.max, 1e6), c: '#6a3fb5', fill: '#6a3fb5', l: 'max' }, { x: xs, v: s2(r.env.Mz.min, 1e6), c: '#6a3fb5', dash: '5 3', l: 'min' }] });
    charts += hc({ title: 'V_z,Ed [kN]', unit: 'kN', series: [{ x: xs, v: s2(r.env.Vz.max, 1e3), c: '#1d5bb8', fill: '#1d5bb8', l: 'max' }, { x: xs, v: s2(r.env.Vz.min, 1e3), c: '#1d5bb8', dash: '5 3', l: 'min' }] });
    charts += hc({ title: 'V_y,Ed [kN]', unit: 'kN', series: [{ x: xs, v: s2(r.env.Vy.max, 1e3), c: '#0b7285', fill: '#0b7285', l: 'max' }, { x: xs, v: s2(r.env.Vy.min, 1e3), c: '#0b7285', dash: '5 3', l: 'min' }] });
  } else {
    const v = cr.variants[Math.min(chVar, cr.variants.length - 1)], F = v.F, F1 = cr.c1;
    const ar = (a, k) => Array.from(a).map(q => q / k);
    const two = r.method !== 'I';
    charts += hc({ title: 'N_Ed [kN]', unit: 'kN', series: [{ x: xs, v: ar(F.N, 1e3), c: '#155e2c', fill: '#155e2c', l: 'N' }] });
    charts += hc({ title: 'M_y,Ed [kNm]', unit: 'kNm', series: [{ x: xs, v: ar(F.y.M, 1e6), c: '#c0262d', fill: '#c0262d', l: two ? 'II rząd' : 'M_y' }].concat(two ? [{ x: xs, v: ar(F1.y.M, 1e6), c: '#1d5bb8', dash: '5 3', l: 'I rząd' }] : []) });
    charts += hc({ title: 'M_z,Ed [kNm]', unit: 'kNm', series: [{ x: xs, v: ar(F.z.M, 1e6), c: '#6a3fb5', fill: '#6a3fb5', l: two ? 'II rząd' : 'M_z' }].concat(two ? [{ x: xs, v: ar(F1.z.M, 1e6), c: '#1d5bb8', dash: '5 3', l: 'I rząd' }] : []) });
    charts += hc({ title: 'V_z / V_y [kN]', unit: 'kN', series: [{ x: xs, v: ar(F.y.V, 1e3), c: '#1d5bb8', l: 'V_z' }, { x: xs, v: ar(F.z.V, 1e3), c: '#0b7285', dash: '5 3', l: 'V_y' }] });
    charts += hc({ title: 'przemieszczenia [mm]', unit: 'mm', series: [{ x: xs, v: Array.from(F.y.w), c: '#1d7f3c', l: 'w (z)' }, { x: xs, v: Array.from(F.z.w), c: '#a35d00', dash: '5 3', l: 'v (y)' }] });
    h += `<p class="hint">α<sub>cr</sub>: ${fmt(cr.aC.y, 2)} (x–z) / ${fmt(cr.aC.z, 2)} (x–y) · H<sub>Ed</sub>/V<sub>Ed</sub>: ${fmt(cr.hv.y.r, 3)} / ${fmt(cr.hv.z.r, 3)}${r.method !== 'I' ? ` · imperfekcja przechyłowa φ: ${cr.phiAct.y ? 'x–z ' : ''}${cr.phiAct.z ? 'x–y' : ''}${!cr.phiAct.y && !cr.phiAct.z ? 'pominięta (H_Ed ≥ 0,15 V_Ed lub brak postaci przechyłowej)' : ''}` : ''}</p>`;
  }
  h += `<div class="fig">${charts}</div>`;
  el.innerHTML = h; bindHead(el); D.bindHeight(el, ym => BS.W3.atXPopup(ym * 1000));
  $('#chSch', el).onclick = () => { A.setSchCombo(chCombo === 'env' ? null : +chCombo); A.selectTab('data'); };
  $('#chC', el).addEventListener('change', e => { chCombo = e.target.value; chVar = 0; A.invalidate('chart'); A.renderActive(); });
  const cv = $('#chV', el); if (cv) cv.addEventListener('change', e => { chVar = +e.target.value; A.invalidate('chart'); A.renderActive(); });
};

/* ================================================================ STATECZNOŚĆ */
V.stab = function (el) {
  const r = R();
  if (!r || !r.res || !r.res.length) { el.innerHTML = head(el, 'Stateczność') + errBox(); bindHead(el); return; }
  const g = RP.govMember(r);
  let h = head(el, 'Stateczność słupa (PN-EN 1993-1-1, 6.3)', 'kombinacja decydująca dla interakcji; kliknij wiersz sprawdzenia – tok obliczeń');
  if (!g) { el.innerHTML = h + '<div class="msg">Brak sprawdzeń stateczności.</div>'; bindHead(el); return; }
  const m = g.mem;
  h += `<p class="hint">Kombinacja: <b>${esc(g.combo.id)}</b> – ${esc(g.combo.opis)}${r.method !== 'I' ? ' · ' + esc(g.lab) : ''} · N<sub>Ed,max</sub> = ${kN(m.Nmax)} kN · metoda analizy: ${r.method === 'I' ? 'I rząd' : r.method === 'II_glob' ? 'II rząd + φ' : 'II rząd + φ + e₀'}</p>`;
  const fr = (pl) => { const f = m.flex[pl]; return `<tr><td>${pl}–${pl}</td><td>${isFinite(f.Ncr) ? kN(f.Ncr) : '∞'}</td><td>${isFinite(f.alphaCr) ? fmt(f.alphaCr, 2) : '∞'}</td><td>${isFinite(f.Lcr) && f.Lcr > 0 ? fmt(f.Lcr / 1000, 3) : '—'}</td><td>${isFinite(f.Lcr) && f.Lcr > 0 ? fmt(f.Lcr / r.md.H, 3) : '—'}</td><td>${fmt(f.lamE, 1)}</td><td>${fmt(f.lam, 3)}</td><td>${f.curve}</td><td>${fmt(f.chi, 3)}</td><td><b>${kN(f.NbRd)}</b></td><td><small>${esc(f.manual ? 'ręcznie' : f.covered ? 'e₀ w analizie' : 'MES')}</small></td></tr>`; };
  h += `<div class="box"><h4>Wyboczenie giętne i skrętne</h4><div class="tscroll"><table class="ctab"><thead><tr><th>oś</th><th>N<sub>cr</sub> [kN]</th><th>α<sub>cr</sub></th><th>L<sub>cr</sub> [m]</th><th>μ</th><th>λ</th><th>λ̄</th><th>krzywa</th><th>χ</th><th>N<sub>b,Rd</sub> [kN]</th><th>źródło</th></tr></thead><tbody>${fr('y')}${fr('z')}${m.tors.relevant ? `<tr><td>skrętne</td><td>${isFinite(m.tors.Ncr) ? kN(m.tors.Ncr) : '∞'}</td><td>${isFinite(m.tors.Ncr) && m.Nmax ? fmt(m.tors.Ncr / m.Nmax, 2) : '∞'}</td><td>${isFinite(m.tors.LcrT) ? fmt(m.tors.LcrT / 1000, 3) : '—'}</td><td></td><td></td><td>${fmt(m.tors.lam, 3)}</td><td>${m.tors.curve}</td><td>${fmt(m.tors.chi, 3)}</td><td><b>${kN(m.tors.NbRd)}</b></td><td><small>${m.tors.tfGov ? 'giętno-skrętne (u–φ)' : 'skrętne'}; N<sub>cr,T</sub> = ${kN(m.tors.NcrT)}, N<sub>cr,TF</sub> = ${isFinite(m.tors.NcrTF) ? kN(m.tors.NcrTF) : '∞'}</small></td></tr>` : ''}</tbody></table></div>
    <p class="hint">N<sub>cr</sub> – wartości własne MES dla rozkładu N<sub>Ed</sub>(x) tej kombinacji (przekrój z N<sub>Ed,max</sub>); L<sub>cr</sub> = π√(EI/N<sub>cr</sub>). Nadpisanie: grupa „Stateczność – parametry i nadpisania”.</p></div>`;
  // zwichrzenie i interakcja
  if (m.segs.length) {
    h += `<div class="box" style="margin-top:12px"><h4>Zwichrzenie i interakcja – odcinki między stężeniami bocznymi</h4><div class="tscroll"><table class="ctab"><thead><tr><th>odcinek [m]</th><th>N<sub>Ed</sub></th><th>M<sub>y,Ed</sub></th><th>M<sub>z,Ed</sub></th><th>M<sub>cr</sub></th><th>λ̄<sub>LT</sub></th><th>χ<sub>LT</sub></th><th>C<sub>my</sub></th><th>C<sub>mz</sub></th><th>C<sub>mLT</sub></th><th>k<sub>yy</sub></th><th>k<sub>yz</sub></th><th>k<sub>zy</sub></th><th>k<sub>zz</sub></th><th>(6.61)</th><th>(6.62)</th></tr></thead><tbody>${m.segs.map(s => `<tr><td>${fmt(s.sg.x0 / 1000, 2)}–${fmt(s.sg.x1 / 1000, 2)}</td><td>${kN(s.NEd)}</td><td>${kNm(s.MyEd)}</td><td>${kNm(s.MzEd)}</td><td>${isFinite(s.Mcr) ? kNm(s.Mcr) : '∞'}</td><td>${fmt(s.lamLT, 3)}</td><td>${fmt(s.chiLT, 3)}</td><td>${fmt(s.Cmy, 3)}</td><td>${fmt(s.Cmz, 3)}</td><td>${fmt(s.CmLT, 3)}</td><td>${fmt(s.kyy, 3)}</td><td>${fmt(s.kyz, 3)}</td><td>${fmt(s.kzy, 3)}</td><td>${fmt(s.kzz, 3)}</td><td><b>${fmt(s.u61, 3)}</b></td><td><b>${fmt(s.u62, 3)}</b></td></tr>`).join('')}</tbody></table></div>
      <p class="hint">Współczynniki interakcji wg zał. ${esc(m.segs[0].meth)}; M<sub>cr</sub> – MES (u, u′, φ, φ′) dla rozkładu M<sub>y</sub>(x) z wysokością przyłożenia obciążeń poziomych; ${m.ltbSus ? '' : 'przekrój zamknięty – nie podlega zwichrzeniu.'}</p></div>`;
  }
  h += `<div class="fig" style="margin-top:12px">${D.modes(r, m, { W: 620, H: 320 })}</div>`;
  h += `<h4>Sprawdzenia stateczności</h4>${tableChecks(r.checks.filter(c => /^Stateczność|^Metoda ogólna|^Analiza globalna/.test(c.grp)))}`;
  if (r.general) h += `<p class="hint">Metoda ogólna: α<sub>ult,k</sub> = ${fmt(r.general.aUlt, 3)}, α<sub>cr,op</sub> = ${fmt(r.general.aCr, 3)}, λ̄<sub>op</sub> = ${fmt(r.general.lop, 3)}, χ<sub>op</sub> = ${fmt(r.general.chiOp, 3)}.</p>`;
  el.innerHTML = h; bindHead(el); bindChecks(el);
};

/* ================================================================ SŁUP I PODSTAWA (2D / 3D) */
V.elev = function (el) { BS.W3.render(el); };

/* ================================================================ PODSTAWA */
V.base = function (el) {
  const r = R(), st = S();
  let h = head(el, 'Podstawa słupa (PN-EN 1993-1-8)', 'metoda składnikowa; rysunek: kliknij element – parametry, wymiar – zmiana na rysunku; wiersz – tok obliczeń');
  if (!st.podstawa.aktywna) { el.innerHTML = h + '<div class="msg">Podstawa nie jest projektowana – włącz w grupie „Podstawa słupa”.</div><button class="btn pri" id="pbOn" type="button">Projektuj podstawę</button>'; bindHead(el); $('#pbOn', el).onclick = () => { st.podstawa.aktywna = true; A.changed(true); }; return; }
  if (!r || !r.pb || !r.pb.C) { el.innerHTML = h + errBox(); bindHead(el); return; }
  const C = r.pb.C;
  h += `<div class="rebbar"><button class="btn sm pri" id="pbDes" type="button">⚙ Dobierz podstawę</button><button class="btn sm" data-act="basewin" type="button">Projektant podstawy…</button></div>`;
  if (C.err.length) h += C.err.map(e => `<div class="msg err">${esc(e)}</div>`).join('');
  else {
    h += `<div class="fig">${D.basePlate(C, r.sec, { W: 700, H: 360, dName: st.podstawa.kotwy.d, kl: st.podstawa.kotwy.kl, beton: st.podstawa.beton })}</div>`;
    const t = C.Tt || {};
    h += `<div style="display:flex;flex-wrap:wrap;gap:12px"><div class="box"><h4>Docisk i ściskanie</h4><table class="kv"><tbody><tr><td>f<sub>cd</sub> / k<sub>j</sub> / f<sub>jd</sub></td><td>${fmt(C.fcd, 2)} / ${fmt(C.kj, 2)} / ${fmt(C.fjd, 2)}</td><td>MPa</td></tr><tr><td>c</td><td>${fmt(C.c, 1)}</td><td>mm</td></tr><tr><td>A<sub>eff</sub></td><td>${fmt(C.Aeff / 100, 1)}</td><td>cm²</td></tr><tr><td>N<sub>j,Rd</sub></td><td>${kN(C.NjRd)}</td><td>kN</td></tr><tr><td>F<sub>C,Rd</sub> (strona)</td><td>${kN(C.FC)}</td><td>kN</td></tr></tbody></table></div>
      <div class="box"><h4>Kotwy i blacha (rozciąganie)</h4><table class="kv"><tbody><tr><td>F<sub>t,Rd</sub> (1 kotwa)</td><td>${kN(C.FtRd)}</td><td>kN</td></tr>${t.leff1 ? `<tr><td>l<sub>eff,1</sub> / m<sub>x</sub></td><td>${fmt(t.leff1, 1)} / ${fmt(t.mx || t.m, 1)}</td><td>mm</td></tr>` : ''}<tr><td>F<sub>T,Rd</sub> (rząd)</td><td>${kN(t.FTpl || 0)}</td><td>kN</td></tr><tr><td>postać</td><td colspan="2" style="text-align:left;font-weight:400">${esc(t.mode || '')}</td></tr><tr><td>L<sub>b</sub> / L<sub>b</sub>*</td><td>${fmt(t.Lb || 0, 0)} / ${t.LbStar ? fmt(t.LbStar, 0) : '—'}</td><td>mm</td></tr></tbody></table></div>
      ${r.pb.stiff ? `<div class="box"><h4>Sztywność</h4><table class="kv"><tbody><tr><td>S<sub>j,ini</sub></td><td>${fmt(r.pb.stiff.Sj / 1e9, 2)}</td><td>MNm/rad</td></tr><tr><td>30EI<sub>c</sub>/L<sub>c</sub></td><td>${fmt(30 * r.pb.stiff.EIL / 1e9, 2)}</td><td>MNm/rad</td></tr><tr><td>klasyfikacja</td><td colspan="2" style="text-align:left">${esc(r.pb.stiff.cls)}</td></tr></tbody></table></div>` : ''}</div>`;
  }
  h += `<h4 style="margin-top:12px">Sprawdzenia podstawy</h4>${tableChecks(r.checks.filter(c => /^Podstawa/.test(c.grp) || c.id === 'KRP'))}`;
  el.innerHTML = h; bindHead(el); bindChecks(el);
  A.bindBaseFig(el, false);
  $$('[data-act]', el).forEach(bt => bt.addEventListener('click', () => A.doAct(bt.dataset.act)));
  const d = $('#pbDes', el); if (d) d.onclick = () => A.runDesign('base');
};

/* ================================================================ POŻAR */
V.fire = function (el) {
  const r = R(), st = S();
  let h = head(el, 'Pożar (PN-EN 1993-1-2)', '');
  if (!st.pozar.aktywny) { el.innerHTML = h + '<div class="msg">Sprawdzenie odporności ogniowej wyłączone – włącz w grupie „Pożar”.</div><button class="btn pri" id="fiOn" type="button">Sprawdź odporność ogniową</button>'; bindHead(el); $('#fiOn', el).onclick = () => { st.pozar.aktywny = true; A.changed(true); }; return; }
  if (!r || !r.fire) { el.innerHTML = h + errBox(); bindHead(el); return; }
  const f = r.fire;
  h += `<div class="cards"><div class="card ${f.ok ? 'ok' : 'fail'}"><div class="t">θ<sub>a</sub> po R${f.Rreq}</div><div class="v">${fmt(f.thR, 0)} °C</div><div class="s">θ<sub>cr</sub> = ${fmt(f.thcr, 0)} °C</div></div><div class="card"><div class="t">czas do θ<sub>cr</sub></div><div class="v">${f.tcr === null ? '> ' + fmt(Math.max(f.Rreq * 1.5, 120), 0) : fmt(f.tcr, 0)} min</div><div class="s">${f.prot ? 'z ochroną' : 'bez ochrony'}; A<sub>m</sub>/V = ${fmt(f.sf.AmV, 0)} m⁻¹</div></div><div class="card"><div class="t">wytężenie w pożarze</div><div class="v">${fmt(f.uR * 100, 0)}%</div><div class="s">w θ<sub>a</sub>(R${f.Rreq})</div></div></div>`;
  h += `<div class="fig">${D.fire(f, { width: 680 })}</div>`;
  h += tableChecks(r.checks.filter(c => c.id === 'FI'));
  el.innerHTML = h; bindHead(el); bindChecks(el);
};

/* ================================================================ PODSUMOWANIE */
V.sum = function (el) {
  const r = R();
  if (!r || !r.checks || (r.errors.length && !r.checks.length)) { el.innerHTML = head(el, 'Podsumowanie') + errBox(); bindHead(el); return; }
  const c = r.checks, st = S();
  const worst = (pred) => { const a = c.filter(pred).filter(x => !x.info && x.util !== null); return a.length ? a.reduce((p, q) => ((q.util || 0) > (p.util || 0) ? q : p)) : null; };
  const card = (t, v, s2, ck) => `<div class="card ${ck ? ck.status : ''}" ${ck ? `data-gck="${esc(ck.id)}" style="cursor:pointer"` : ''}><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s2}</div></div>`;
  const wS = worst(x => /^Nośność przekroju/.test(x.grp)), wI = worst(x => /^I6[12]/.test(x.id)), wB = worst(x => /^B[yzT]$/.test(x.id)), wW = worst(x => /^w[yz]$/.test(x.id)), wP = worst(x => /^PB/.test(x.id));
  let cards = '';
  if (wS) cards += card('Nośność przekroju', fmt(wS.util * 100, 0) + '%', sym(wS.n), wS);
  if (wB) cards += card('Wyboczenie', fmt(wB.util * 100, 0) + '%', `${sym(wB.n)} · N<sub>Ed</sub> = ${kN(wB.Ed)} kN`, wB);
  if (wI) cards += card('Interakcja N + M', fmt(wI.util * 100, 0) + '%', sym(wI.n.replace(/ – odcinek.*/, '')), wI);
  if (wW) cards += card('Przemieszczenie', `${fmt(wW.Ed, 1)} mm`, `≤ ${fmt(wW.Rd, 1)} mm (H/${fmt(wW.d.lim, 0)})`, wW);
  if (wP) cards += card('Podstawa', fmt(wP.util * 100, 0) + '%', sym(wP.n), wP);
  if (r.sec) cards += card('Przekrój', esc(r.sec.nazwa), `${esc(st.material.gatunek + st.material.podgatunek)} · ${fmt(r.sec.masa, 1)} kg/m · ${fmt(r.sec.masa * r.md.H / 1000, 0)} kg · ${r.exc ? r.exc.exc : ''}`, null);
  if (r.alphaMin) cards += card('Mnożnik α<sub>cr</sub>', fmt(Math.min(r.alphaMin.y, r.alphaMin.z), 2), `x–z: ${fmt(r.alphaMin.y, 2)} · x–y: ${fmt(r.alphaMin.z, 2)}`, c.find(x => x.id === 'acr'));
  let h = head(el, 'Podsumowanie') + `<div class="cards">${cards}</div>`;
  const msgs = [...r.errors.map(e => `<div class="msg err">${esc(e)}</div>`), ...r.warnings.map(e => `<div class="msg wrn">${esc(e)}</div>`), ...r.info.map(e => `<div class="msg">${esc(e)}</div>`)];
  if (msgs.length) h += `<div class="msgs">${msgs.join('')}</div>`;
  const nF = c.filter(x => x.status === 'fail' && !x.info);
  if (nF.length) h += `<div class="failnav">Niespełnione warunki: ${c.map((x, i) => x.status === 'fail' && !x.info ? `<button class="goto" data-goto="${i}" type="button">${sym(x.n)}</button>` : '').join('')}</div>`;
  const isOk = (x) => x.info || x.status === 'ok', nOk = c.filter(isOk).length;
  h += `<div class="tickbar"><span>Spełnione: <b>${nOk}</b> z ${c.length}</span><span class="hint">Znaczniki ✓ ustawiane automatycznie przy każdej zmianie danych. Kliknij punkt normy – objaśnienie; kliknij warunek – jak obliczono (wzór, podstawienie, wynik).</span></div>`;
  h += `<div class="tscroll"><table class="ctab"><thead><tr><th class="tk">✓</th><th>Sprawdzenie</th><th>Punkt normy</th><th style="text-align:right">Warunek</th><th>Wykorzystanie</th><th>Status</th><th></th></tr></thead><tbody>`;
  let grp = '';
  c.forEach((x, i) => {
    if (x.grp !== grp) { grp = x.grp; h += `<tr class="g"><td colspan="7">${esc(grp)}</td></tr>`; }
    const on = isOk(x);
    const u = x.util !== null && isFinite(x.util) ? x.util : (x.status === 'fail' ? Infinity : 0);
    const bw = Math.min(100, (isFinite(u) ? u : 1) * 100);
    h += `<tr class="${on ? 'done' : ''}" data-ci="${i}"><td class="tk"><input type="checkbox" data-tick="${i}" ${on ? 'checked' : ''} tabindex="-1" aria-readonly="true"></td><td>${sym(x.n)}${x.combo ? `<br><small class="hint">${esc(x.combo)}</small>` : ''}</td><td><button class="nref lnk" data-ref="${i}" type="button">${esc(x.ref)}</button></td><td class="val" style="text-align:right">${x.unit === '-' ? (x.info ? fmt(x.Rd, 2) : fmt(x.util, 3) + ' ≤ 1') : `${unitV(x.Ed, x.unit)} ${u <= 1 ? '≤' : '>'} ${unitV(x.Rd, x.unit)}`}</td><td class="bar"><span style="display:inline-block;width:90px;height:8px;border-radius:4px;background:var(--line2);vertical-align:middle;margin-right:6px;overflow:hidden"><span style="display:block;height:100%;width:${bw}%;background:var(--${x.info ? 'info' : u > 1 ? 'fail' : u > 0.9 ? 'warn' : 'ok'})"></span></span><b>${isFinite(u) ? fmt(u * 100, 0) + '%' : '∞'}</b></td><td>${stc(x)}</td><td class="go"><button class="gobtn" data-gom="${i}" type="button" title="Przejdź do danych / wyników, od których zależy ten warunek">pokaż →</button></td></tr>`;
  });
  h += '</tbody></table></div>';
  el.innerHTML = h; bindHead(el); bindChecks(el);
  $$('[data-tick]', el).forEach(cb => cb.addEventListener('click', ev => ev.preventDefault()));
  $$('[data-goto]', el).forEach(b => b.addEventListener('click', () => A.explainPopup(c[+b.dataset.goto])));
  $$('[data-gom]', el).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); A.gotoCheck(c[+b.dataset.gom]); }));
  $$('[data-gck]', el).forEach(d => d.addEventListener('click', () => { const x = c.find(q => q.id === d.dataset.gck); if (x) A.explainPopup(x); }));
};

/* ================================================================ RAPORT */
/* raport: pełny / statyka / własny (edytowalny, zapisywany w projekcie); druk w oknie programu (nagłówek/stopka stron przez tabelę .pwrap) */
const wrapPrint = (html) => `<table class="pwrap"><thead><tr><td><div class="psp"></div></td></tr></thead><tfoot><tr><td><div class="psp"></div></td></tr></tfoot><tbody><tr><td class="pbody">${html}</td></tr></tbody></table>`;
const repMode = () => (S().meta.repMode === 'stat' ? 'stat' : 'full');
const repView = () => (S().meta.repMode === 'own' ? 'own' : repMode());
const refsOn = () => S().meta.repRefs !== false;
const repOk = () => { const r = R(); return !!(r && r.sec && r.md && r.env && !r.errors.length); };
const repBuild = (mode) => { const m = mode || repMode(), r = R(), st = S(); const h = m === 'stat' ? RP.statics(st, r) : RP.build(st, r, { refs: refsOn() }); return !refsOn() && BS.ODT.noRefs ? BS.ODT.noRefs(h) : h; };
function cleanHTML(html) {
  const t = document.createElement('template'); t.innerHTML = html || '';
  t.content.querySelectorAll('script, iframe, object, embed, link, meta, base, form, input, button, select, textarea').forEach(n => n.remove());
  t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) || a.name === 'contenteditable') n.removeAttribute(a.name); }));
  return t.innerHTML;
}
const printNow = () => { A.selectTab('report'); setTimeout(() => window.print(), 80); };
V.report = function (el) {
  const view = repView();
  const seg = `<div class="segsw" role="tablist" aria-label="Rodzaj raportu"><button data-rm="full" class="${view === 'full' ? 'on' : ''}" type="button" title="Pełny tok obliczeń: dane, podstawa normowa, przekrój, obciążenia i kombinacje, analiza globalna, wszystkie sprawdzenia SGN i SGU ze wzorami i podstawieniami, podstawa, pożar, zestawienie">Raport pełny</button><button data-rm="stat" class="${view === 'stat' ? 'on' : ''}" type="button" title="Tylko statyka: dane, schemat, obciążenia, kombinacje, siły wewnętrzne i reakcje">Statyka</button><button data-rm="own" class="${view === 'own' ? 'on' : ''}" type="button" title="Raport do własnej edycji: pisz, usuwaj fragmenty, wstawiaj raport obliczeń; zapisywany w pliku projektu">Raport własny</button></div>`;
  const bindSeg = () => {
    $$('[data-rm]', el).forEach(b => b.addEventListener('click', () => { S().meta.repMode = b.dataset.rm; A.markDirty(); V.report(el); }));
    const rf = $('#rRefs', el); if (rf) rf.onchange = () => { S().meta.repRefs = rf.checked; A.markDirty(); V.report(el); };
  };
  if (view === 'own') { renderOwn(el, seg); bindSeg(); return; }
  if (!repOk()) { el.innerHTML = `<div class="rtools">${seg}</div>` + errBox(); bindSeg(); return; }
  let body;
  try { body = repBuild(); } catch (e) { console.error(e); body = `<div class="msg err">Błąd raportu: ${esc(e.message)}</div>`; }
  el.innerHTML = `<div class="rtools">${seg}<span class="sp" style="flex:1"></span><label class="chk sm" title="Odwołania do punktów, tablic i wzorów norm w raporcie"><input type="checkbox" id="rRefs" ${refsOn() ? 'checked' : ''}><span>z odwołaniami do norm</span></label><button class="btn" id="rHtml" type="button" title="Raport HTML z danymi projektu (można go otworzyć w programie)">Zapisz raport HTML…</button><button class="btn" id="rOdt" type="button" title="OpenDocument Text (.odt) – LibreOffice Writer, MS Word">Zapisz .odt (edytowalny)…</button><button class="btn pri" id="rPrint" type="button" title="Drukowanie raportu (także zapis do PDF – drukarka „Microsoft Print to PDF” / „Zapisz jako PDF”)">Drukuj / zapisz PDF</button></div><div id="report">${wrapPrint(body)}</div>`;
  bindSeg();
  $('#rHtml', el).onclick = () => V.exportHTML(); $('#rOdt', el).onclick = () => V.exportODT(); $('#rPrint', el).onclick = printNow;
};
let ownT = 0;
const OWN_ON = 'Raport własny – zapisywany w projekcie przy każdej zmianie; nie zmienia się po zmianie danych (aktualne obliczenia: „Wstaw raport pełny” / „Wstaw statykę”).';
function renderOwn(el, seg) {
  const own = S().meta.ownOn === true;
  if (!own && !repOk()) { el.innerHTML = `<div class="rtools">${seg}</div>` + errBox(); return; }
  const B = (cmd, lab, tit, val) => `<button data-oc="${cmd}"${val ? ` data-ov="${val}"` : ''} title="${tit}" type="button">${lab}</button>`;
  el.innerHTML = `<div class="rtools">${seg}<span class="sp" style="flex:1"></span><button class="btn" id="oExp" type="button">Zapisz HTML…</button><button class="btn" id="oOdt" type="button" title="OpenDocument Text – LibreOffice Writer, MS Word">Zapisz .odt…</button><button class="btn pri" id="oPrint" type="button">Drukuj / PDF</button></div><div class="rtools owntools">
      <span class="grp">${B('bold', '<b>B</b>', 'Pogrubienie (Ctrl+B)')}${B('italic', '<i>I</i>', 'Kursywa (Ctrl+I)')}${B('underline', '<u>U</u>', 'Podkreślenie (Ctrl+U)')}${B('removeFormat', 'T̸', 'Usuń formatowanie zaznaczenia')}</span>
      <span class="grp">${B('formatBlock', 'H1', 'Tytuł', 'h1')}${B('formatBlock', 'H2', 'Nagłówek rozdziału', 'h2')}${B('formatBlock', 'H3', 'Podtytuł', 'h3')}${B('formatBlock', '¶', 'Zwykły akapit', 'p')}${B('insertUnorderedList', '•', 'Lista punktowana')}${B('insertOrderedList', '1.', 'Lista numerowana')}</span>
      <span class="grp">${B('undo', '↶', 'Cofnij (Ctrl+Z)')}${B('redo', '↷', 'Ponów (Ctrl+Y)')}</span>
      <button class="btn sm" id="oIns" type="button" title="Wstawia pełny raport obliczeń (aktualne dane) za akapitem z kursorem">Wstaw raport pełny</button>
      <button class="btn sm" id="oInsS" type="button" title="Wstawia raport statyki (aktualne dane) za akapitem z kursorem">Wstaw statykę</button>
      <button class="btn sm" id="oSum" type="button" title="Wstawia tabelę wyników (wszystkie warunki z wytężeniem)">Wstaw zestawienie wyników</button>
      <button class="btn sm" id="oDate" type="button" title="Wstawia datę i nazwę elementu w miejscu kursora">Wstaw datę</button>
      <button class="btn sm" id="oReset" type="button" ${own ? '' : 'disabled'} title="Usuwa własne zmiany – raport własny znowu pokazuje bieżący raport obliczeń">Przywróć raport obliczeń</button>
      <button class="btn sm" id="oClr" type="button" title="Usuwa całą treść raportu własnego">Wyczyść</button></div>
    <p class="ownstate" id="oState">${own ? OWN_ON : 'Podgląd bieżącego raportu obliczeń – kliknij w tekst i pisz albo usuwaj (zaznacz i Delete); po pierwszej zmianie raport staje się Twoją kopią zapisywaną w projekcie.'}</p>
    <div class="ownwrap">${wrapPrint(`<div id="ownrep" contenteditable="true" spellcheck="true" lang="pl">${own ? cleanHTML(S().meta.own || '') : repBuild('full')}</div>`)}</div>`;
  const ed = $('#ownrep', el), st = $('#oState', el);
  const save = () => { clearTimeout(ownT); ownT = setTimeout(() => { S().meta.own = ed.innerHTML; S().meta.ownOn = true; A.markDirty(); st.textContent = OWN_ON; const rb = $('#oReset', el); if (rb) rb.disabled = false; }, 350); };
  ed.addEventListener('input', save);
  ed.addEventListener('focus', () => { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* */ } });
  $$('[data-oc]', el).forEach(b => { b.addEventListener('mousedown', ev => ev.preventDefault()); b.addEventListener('click', () => { ed.focus(); try { document.execCommand(b.dataset.oc, false, b.dataset.ov ? `<${b.dataset.ov}>` : null); } catch (e) { /* */ } save(); }); });
  const insertAtCaret = (html) => {
    const sel = window.getSelection(), inEd = sel && sel.rangeCount && ed.contains(sel.getRangeAt(0).commonAncestorContainer);
    const t = document.createElement('template'); t.innerHTML = html; const frag = t.content;
    const isBlock = [...frag.childNodes].some(n => n.nodeType === 1 && /^(h[1-6]|div|table|p|ul|ol)$/i.test(n.tagName) && !(frag.childNodes.length === 1 && /^p$/i.test(n.tagName)));
    if (inEd && isBlock) { let top = sel.getRangeAt(0).startContainer; while (top && top.parentNode !== ed) top = top.parentNode; if (top && top !== ed) { const empty = top.nodeType === 1 ? !top.textContent.trim() && !top.querySelector('svg, img, table') : !top.nodeValue.trim(); ed.insertBefore(frag, top.nextSibling); if (empty) top.remove(); } else ed.appendChild(frag); }
    else if (inEd) { const rg = sel.getRangeAt(0); rg.deleteContents(); rg.insertNode(frag); rg.collapse(false); } else ed.appendChild(frag);
    save();
  };
  const insRep = (kind) => { if (!repOk()) { Q.toast('Usuń błędy danych – raport obliczeń jest niedostępny.'); return; } insertAtCaret(repBuild(kind)); Q.toast(kind === 'stat' ? 'Wstawiono raport statyki.' : 'Wstawiono raport obliczeń.', 1800); };
  const sumTable = () => { const r = R(); if (!repOk()) return ''; return `<h2>Zestawienie wyników</h2><table class="rtab"><thead><tr><th>Sprawdzenie</th><th>Punkt normy</th><th>Wykorzystanie</th><th>Status</th></tr></thead><tbody>${r.checks.map(c => `<tr><td>${sym(c.n)}</td><td>${esc(c.ref || '')}</td><td>${c.util !== null && isFinite(c.util) ? fmt(c.util * 100, 0) + '%' : '—'}</td><td>${c.info ? 'informacja' : c.status === 'fail' ? 'niespełniony' : c.status === 'warn' ? 'uwaga' : 'spełniony'}</td></tr>`).join('')}</tbody></table>`; };
  $('#oIns', el).onclick = () => insRep('full'); $('#oInsS', el).onclick = () => insRep('stat');
  $('#oSum', el).onclick = () => { const h = sumTable(); if (h) insertAtCaret(h); else Q.toast('Brak wyników.'); };
  $('#oDate', el).onclick = () => insertAtCaret(`<p>${esc(S().meta.nazwa || '')} – ${new Date().toLocaleDateString('pl-PL')}</p>`);
  const rerender = () => { renderOwn(el, seg); $$('[data-rm]', el).forEach(b => b.addEventListener('click', () => { S().meta.repMode = b.dataset.rm; A.markDirty(); V.report(el); })); };
  $('#oReset', el).onclick = async () => { if (!(await Q.ask('Usunąć własne zmiany? Raport własny znowu pokaże bieżący raport obliczeń.', 'Przywróć', true))) return; S().meta.own = ''; S().meta.ownOn = false; A.markDirty(); rerender(); };
  $('#oClr', el).onclick = async () => { if (!(await Q.ask('Usunąć całą treść raportu własnego?', 'Wyczyść', true))) return; S().meta.own = ''; S().meta.ownOn = true; A.markDirty(); rerender(); };
  $('#oPrint', el).onclick = printNow;
  $('#oExp', el).onclick = () => exportOwn('html');
  $('#oOdt', el).onclick = () => exportOwn('odt');
}
function ownHTML() { const ed = $('#ownrep'); return ed ? ed.innerHTML : (S().meta.ownOn ? cleanHTML(S().meta.own || '') : (repOk() ? repBuild('full') : '')); }
function reportDoc(body, title) {
  const css = $('#appcss').textContent;
  const st = S();
  const data = JSON.stringify({ format: BS.FORMAT, program: `${BS.APP} ${BS.VERSION}`, silnik: BS.ENGINE, sha256: BS.J.hash(st), state: st }).replace(/<\//g, '<\\/');
  return `<!doctype html><html lang="pl" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title || 'Raport – ' + st.meta.nazwa)}</title><style>${css}\nhtml,body{height:auto}body{overflow:auto;padding:20px 16px;background:#fff}.rtools{margin-bottom:14px}@media print{body{padding:0}.rtools{display:none}}</style></head><body>` +
    `<div class="rtools"><button class="btn pri" onclick="window.print()">Drukuj / zapisz PDF</button><span class="hint">Plik zawiera dane projektu – można go otworzyć w programie SłupStal (Otwórz).</span></div><div id="report">${wrapPrint(body)}</div><script type="application/json" id="slupstal-data">${data}<\/script></body></html>`;
}
async function saveText(name, content, filter) {
  if (A.inHost()) { const res = await A.hostCall('save', { path: '', name, content, filter }); if (res && res.ok) Q.toast('Zapisano raport: ' + A.baseName(res.path)); else if (res && res.err) Q.toast('Błąd zapisu: ' + res.err); return; }
  A.download(name, content, 'text/html');
}
async function saveODT(name, html, title) {
  Q.toast('Tworzenie pliku .odt…', 4000);
  let u; try { u = await BS.ODT.odt(html, title); } catch (e) { console.error(e); Q.toast('Błąd tworzenia .odt: ' + e.message); return; }
  if (A.inHost()) { let b = ''; for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); const res = await A.hostCall('save', { path: '', name, content: btoa(b), b64: true, filter: 'odt' }); if (res && res.ok) Q.toast('Zapisano raport: ' + A.baseName(res.path)); else if (res && res.err) Q.toast('Błąd: ' + res.err); return; }
  A.download(name, new Blob([u], { type: 'application/vnd.oasis.opendocument.text' }));
}
function exportOwn(kind) {
  const html = ownHTML(), title = (S().meta.nazwa || 'Słup') + ' – raport';
  if (kind === 'html') return saveText(A.safeName(' – raport własny.html'), reportDoc(html, title), 'html');
  return saveODT(A.safeName(' – raport własny.odt'), html, title);
}
V.exportHTML = function () {
  if (S().meta.repMode === 'own') return exportOwn('html');
  if (!repOk()) { Q.toast('Usuń błędy danych przed eksportem raportu.'); return; }
  const stt = repMode() === 'stat';
  return saveText(A.safeName(stt ? ' – statyka.html' : ' – raport.html'), reportDoc(repBuild(), (S().meta.nazwa || 'Słup') + (stt ? ' – statyka' : ' – raport obliczeń')), 'html');
};
V.exportODT = function () {
  if (S().meta.repMode === 'own') return exportOwn('odt');
  if (!repOk()) { Q.toast('Usuń błędy danych przed eksportem raportu.'); return; }
  const stt = repMode() === 'stat';
  return saveODT(A.safeName(stt ? ' – statyka.odt' : ' – raport.odt'), repBuild(), (S().meta.nazwa || 'Słup') + (stt ? ' – statyka' : ' – raport obliczeń'));
};
// druk: w oknie programu (WebView2 – okno drukowania systemu; PDF przez drukarkę PDF)
V.printReport = function () { if (S().meta.repMode !== 'own' && !repOk()) { Q.toast('Brak wyników do wydruku – usuń błędy danych.'); return; } printNow(); };
})();
