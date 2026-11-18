/* =====================================================================
   SłupStal – okna dialogowe: obciążenie (wiele składników), stężenia,
   warunki podparcia w płaszczyźnie, przekrój (z rysunkiem i tablicą
   kształtowników), projektant podstawy (rysunek + parametry + wyniki),
   parametry krajowe NDP i profil normowy, dane projektu, objaśnienia
   punktów norm i „jak obliczono” (tok obliczeń dla sprawdzenia).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, J = BS.J, N = BS.N, P = BS.P, M = BS.M, D = BS.D, Q = BS.Q, S0 = BS.S, A = BS.A;
const { $, $$, esc, fmt, sym, parseNum, showNum } = Q;
const S = () => A.S(), R = () => A.R();
const closeM = () => { A.setPopRedraw(null); Q.closeModal(); };

/* ---------------------------------------------------------------- obciążenie */
const RODZ_OPT = () => Object.keys(S0.RODZAJE).map(k => [k, S0.RODZAJE[k].n]);
const KAT_OPT = () => Object.keys(N.PSI).filter(k => /^Q-/.test(k)).map(k => [k, N.PSI[k].n]);
const PART_N = { N: 'siła podłużna N', H: 'siła pozioma H', q: 'obciążenie rozłożone q', M: 'moment skupiony M' };
A.loadPopup = function (idx, preset) {
  const st = S();
  const isNew = idx === null || idx === undefined;
  const pl = (preset && preset.pl) || 'y';
  const back = preset && preset.back;
  const done = () => { closeM(); if (back) setTimeout(back, 30); };
  const nextId = (r) => { const used = new Set(st.obciazenia.map(o => o.id)); let i = 1; while (used.has(r + i)) i++; return r + i; };
  let L = isNew ? { id: nextId('Q'), nazwa: 'Nowe obciążenie', rodzaj: 'Q', kat: 'Q-B', wyklucz: '', aktywne: true, sklad: [preset && preset.x !== undefined ? { typ: 'H', x: preset.x, kier: pl === 'y' ? 'z' : 'y', F: 5, wys: 'srodek' } : { typ: 'N', x: '', F: 50, ey: 0, ez: 0 }] } : U.clone(st.obciazenia[idx]);
  const sel = (k, v, opts, cls) => `<select data-p="${k}" ${cls ? `class="${cls}"` : ''}>${opts.map(([a, b]) => `<option value="${esc(a)}" ${String(a) === String(v) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
  const inp = (k, v, w, ph) => `<input class="txt ${w || ''}" data-p="${k}" value="${esc(showNum(v))}" ${ph ? `placeholder="${esc(ph)}"` : ''} autocomplete="off" spellcheck="false">`;
  const partHTML = (p, i) => {
    let h = `<div class="litem" data-pi="${i}"><div class="lrow"><b>${i + 1}.</b> ${sel(`sklad.${i}.typ`, p.typ, Object.keys(PART_N).map(k => [k, PART_N[k]]))}<span style="flex:1"></span><button class="btn sm dng" data-pdel="${i}" type="button" title="Usuń składnik">×</button></div>`;
    if (p.typ === 'N') h += `<div class="lrow">N =${inp(`sklad.${i}.F`, p.F)}<span class="u">kN (+ ściskanie)</span> na x =${inp(`sklad.${i}.x`, p.x, 'sm', 'H')}<span class="u">m</span></div><div class="lrow">mimośród e<sub>z</sub> =${inp(`sklad.${i}.ez`, p.ez, 'sm')}<span class="u">mm (→ M<sub>y</sub>)</span> e<sub>y</sub> =${inp(`sklad.${i}.ey`, p.ey, 'sm')}<span class="u">mm (→ M<sub>z</sub>)</span></div>`;
    else if (p.typ === 'H') h += `<div class="lrow">H =${inp(`sklad.${i}.F`, p.F)}<span class="u">kN</span> w kierunku ${sel(`sklad.${i}.kier`, p.kier, [['z', 'z (→ M_y)'], ['y', 'y (→ M_z)']])} na x =${inp(`sklad.${i}.x`, p.x, 'sm', 'H')}<span class="u">m</span></div><div class="lrow">przyłożenie ${sel(`sklad.${i}.wys`, p.wys || 'srodek', [['srodek', 'środek ścinania'], ['pas+', 'pas +z'], ['pas-', 'pas −z']])}</div>`;
    else if (p.typ === 'q') h += `<div class="lrow">q =${inp(`sklad.${i}.q0`, p.q0)}…${inp(`sklad.${i}.q1`, p.q1, '', '= q₀')}<span class="u">kN/m</span> w kierunku ${sel(`sklad.${i}.kier`, p.kier, [['z', 'z (→ M_y)'], ['y', 'y (→ M_z)']])}</div><div class="lrow">od x =${inp(`sklad.${i}.x0`, p.x0, 'sm', '0')}<span class="u">m</span> do x =${inp(`sklad.${i}.x1`, p.x1, 'sm', 'H')}<span class="u">m</span> przyłożenie ${sel(`sklad.${i}.wys`, p.wys || 'srodek', [['srodek', 'środek ścinania'], ['pas+', 'pas +z'], ['pas-', 'pas −z']])}</div>`;
    else h += `<div class="lrow">M =${inp(`sklad.${i}.M`, p.M)}<span class="u">kNm</span> względem osi ${sel(`sklad.${i}.os`, p.os || 'y', [['y', 'y (M_y)'], ['z', 'z (M_z)']])} na x =${inp(`sklad.${i}.x`, p.x, 'sm', 'H')}<span class="u">m</span></div>`;
    return h + '</div>';
  };
  const draw = () => {
    const psi = BS.K.psi(L);
    const m = Q.modal(`<h3>${isNew ? 'Nowe obciążenie' : 'Obciążenie ' + esc(L.id)}</h3>
      <div class="lrow">ozn.${inp('id', L.id, 'sm')}<input class="txt lname" data-p="nazwa" value="${esc(L.nazwa)}" spellcheck="false"></div>
      <div class="lrow">rodzaj ${sel('rodzaj', L.rodzaj, RODZ_OPT())}${L.rodzaj === 'Q' ? sel('kat', L.kat || 'Q-B', KAT_OPT()) : ''}</div>
      ${S0.RODZAJE[L.rodzaj] && !S0.RODZAJE[L.rodzaj].stale && L.rodzaj !== 'A' ? `<div class="lrow">grupa wykluczająca${inp('wyklucz', L.wyklucz, 'sm', '—')}<span class="u">(np. „W” dla kierunków wiatru)</span> ψ₀/ψ₁/ψ₂ = ${psi.map(v => fmt(v, 2)).join(' / ')}</div>` : ''}
      <div style="margin-top:8px">${L.sklad.map(partHTML).join('')}</div>
      <div class="lrow"><button class="btn sm" data-padd="N" type="button">+ siła N</button><button class="btn sm" data-padd="H" type="button">+ siła H</button><button class="btn sm" data-padd="q" type="button">+ rozłożone q</button><button class="btn sm" data-padd="M" type="button">+ moment M</button></div>
      <p class="hint">Wartości charakterystyczne. N – ściskanie dodatnie (puste x = wierzchołek). Mimośród e<sub>z</sub> > 0 – siła przesunięta w stronę +z (ściska stronę +z). H, q – zwrot zgodny z osią y/z.</p>
      <div class="dbtn">${isNew ? '' : '<button class="btn dng" id="lDel" type="button">Usuń obciążenie</button><button class="btn" id="lDup" type="button">Duplikuj</button>'}<span style="flex:1"></span><button class="btn" id="lCancel" type="button">${back ? '← Lista' : 'Anuluj'}</button><button class="btn pri" id="lOk" type="button">${isNew ? 'Dodaj' : 'Zapisz'}</button></div>`, 'nofocus');
    $$('[data-p]', m).forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.p; let v = el.value;
      if (el.tagName === 'INPUT' && !/^(id|nazwa|wyklucz)$/.test(k)) { if (v.trim() === '') v = ''; else { const n = parseNum(v); if (n === null) { el.classList.add('bad'); return; } v = n; } }
      Q.setP(L, k, v); el.classList.remove('bad');
      if (/typ$|^rodzaj$/.test(k)) { if (/typ$/.test(k)) { const i = +k.split('.')[1]; L.sklad[i] = Object.assign({ typ: v }, v === 'N' ? { x: '', F: 50, ey: 0, ez: 0 } : v === 'H' ? { x: '', kier: 'z', F: 5, wys: 'srodek' } : v === 'q' ? { kier: 'z', q0: 2, q1: '', x0: '', x1: '', wys: 'srodek' } : { x: '', os: 'y', M: 10 }); } draw(); }
    }));
    $$('[data-pdel]', m).forEach(b => b.addEventListener('click', () => { L.sklad.splice(+b.dataset.pdel, 1); draw(); }));
    $$('[data-padd]', m).forEach(b => b.addEventListener('click', () => { const t = b.dataset.padd; L.sklad.push(t === 'N' ? { typ: 'N', x: '', F: 50, ey: 0, ez: 0 } : t === 'H' ? { typ: 'H', x: '', kier: 'z', F: 5, wys: 'srodek' } : t === 'q' ? { typ: 'q', kier: 'z', q0: 2, q1: '', x0: '', x1: '', wys: 'srodek' } : { typ: 'M', x: '', os: 'y', M: 10 }); draw(); }));
    $('#lCancel', m).onclick = done;
    $('#lOk', m).onclick = () => {
      $$('[data-p]', m).forEach(el => el.dispatchEvent(new Event('change')));
      if (!L.sklad.length) { Q.toast('Dodaj co najmniej jeden składnik.'); return; }
      if (st.obciazenia.some((o, i) => o.id === L.id && i !== idx)) { Q.toast('Oznaczenie już istnieje.'); return; }
      if (isNew) st.obciazenia.push(L); else st.obciazenia[idx] = L;
      A.changed(true); done();
    };
    if (!isNew) { $('#lDel', m).onclick = async () => { closeM(); if (await Q.ask(`Usunąć obciążenie ${esc(L.id)}?`, 'Usuń', true)) { st.obciazenia.splice(idx, 1); A.changed(true); } if (back) back(); }; $('#lDup', m).onclick = () => { const c = U.clone(L); c.id = nextId(L.rodzaj === 'Q' ? 'Q' : L.rodzaj); st.obciazenia.splice(idx + 1, 0, c); A.changed(true); done(); }; }
  };
  draw();
};

/* ---------------------------------------------------------------- warunki podparcia w płaszczyźnie */
// warunki podparcia JEDNEJ podpory (podstawa lub wierzchołek) w jednej płaszczyźnie – jak w BelkaŻB
const SUP_OPT = {
  dol: [['utw', 'utwierdzenie', 'obrót zablokowany (podstawa sztywna)'], ['prz', 'przegub', 'obrót swobodny'], ['spr', 'sprężyna obrotowa', 'podatność k<sub>φ</sub> (np. S<sub>j,ini</sub> podstawy)']],
  gora: [['swob', 'swobodny', 'wspornik – wierzchołek bez podparcia'], ['prz', 'przegub nieprzesuwny', 'stężony poziomo, obrót swobodny'], ['utw', 'utwierdzenie nieprzesuwne', 'przesuw i obrót zablokowane'], ['utwp', 'utwierdzenie przesuwne', 'rygiel sztywny – przesuw swobodny, obrót zablokowany'], ['spr', 'podparcie sprężyste', 'sprężyna pozioma k [kN/m]']]
};
const supIcon = (end, t) => {
  const k = '#1b2230', col = `<line x1="22" y1="${end === 'dol' ? 4 : 12}" x2="22" y2="${end === 'dol' ? 30 : 40}" stroke="${k}" stroke-width="3"/>`;
  const hatchH = (y, d) => `<line x1="10" y1="${y}" x2="34" y2="${y}" stroke="${k}" stroke-width="1.6"/>` + [12, 17, 22, 27, 32].map(x => `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 4 * d}" stroke="${k}" stroke-width="0.8"/>`).join('');
  let g = '';
  if (end === 'dol') {
    if (t === 'utw') g = hatchH(30, 1);
    else { g = `<path d="M22,30 l-6,7 h12 z" fill="#fff" stroke="${k}"/>` + `<line x1="12" y1="${t === 'spr' ? 42 : 37}" x2="32" y2="${t === 'spr' ? 42 : 37}" stroke="${k}"/>`; if (t === 'spr') g += `<path d="M30,18 a8,8 0 1,1 0,10" fill="none" stroke="${k}"/>`; }
  } else {
    if (t === 'swob') g = `<circle cx="22" cy="12" r="2" fill="${k}"/>`;
    else if (t === 'prz') g = `<line x1="22" y1="14" x2="38" y2="14" stroke="${k}" stroke-width="1.3"/><circle cx="23" cy="14" r="2" fill="#fff" stroke="${k}"/><line x1="38" y1="8" x2="38" y2="20" stroke="${k}" stroke-width="1.6"/>`;
    else if (t === 'utw') g = hatchH(12, -1);
    else if (t === 'utwp') g = hatchH(6, -1) + `<circle cx="17" cy="9" r="2" fill="#fff" stroke="${k}"/><circle cx="27" cy="9" r="2" fill="#fff" stroke="${k}"/><line x1="12" y1="12" x2="32" y2="12" stroke="${k}" stroke-width="2"/>`;
    else g = `<path d="M22,14 l3,0 l2,-3 l2,6 l2,-6 l2,6 l2,-3 l3,0" fill="none" stroke="${k}"/><line x1="38" y1="8" x2="38" y2="20" stroke="${k}" stroke-width="1.6"/>`;
  }
  return `<svg width="44" height="46" viewBox="0 0 44 46">${col}${g}</svg>`;
};
A.supportPopup = function (pl, end) {
  const st = S(), p = st.podpory;
  pl = pl === 'z' ? 'z' : 'y'; end = end === 'gora' ? 'gora' : 'dol';
  const other = pl === 'y' ? 'z' : 'y';
  const kKey = end === 'dol' ? (pl === 'y' ? 'kry' : 'krz') : (pl === 'y' ? 'khz' : 'khy');
  const w = { v: p[end][pl], k: p[end][kKey], both: false, sk: p[end].skret };
  const SK = end === 'dol' ? S0.SKRET_D : S0.SKRET_G;
  const draw = () => {
    const m = Q.modal(`<h3>${end === 'dol' ? 'Podstawa słupa' : 'Wierzchołek słupa'} – ${pl === 'y' ? 'płaszczyzna x–z (zginanie M<sub>y</sub>, wyboczenie względem y–y)' : 'płaszczyzna x–y (zginanie M<sub>z</sub>, wyboczenie względem z–z)'}</h3>
      <div class="zg supcards">${SUP_OPT[end].map(([v, l, d]) => `<label class="rad ${w.v === v ? 'on' : ''}"><input type="radio" name="spt" value="${v}" ${w.v === v ? 'checked' : ''}>${supIcon(end, v)}<span><b>${l}</b><br><small>${d}</small></span></label>`).join('')}</div>
      ${w.v === 'spr' ? `<div class="zg"><span>${end === 'dol' ? 'Podatność obrotowa k<sub>φ</sub>' : 'Sztywność pozioma k'}</span><input class="txt" id="spK" value="${esc(showNum(w.k))}"><span>${end === 'dol' ? 'kNm/rad' : 'kN/m'}</span></div>` : ''}
      <h4 class="lsec">Skręcanie na tej podporze</h4>
      <div class="zg"><select id="spSk">${Object.keys(SK).map(k => `<option value="${k}" ${String(w.sk) === k ? 'selected' : ''}>${esc(SK[k])}</option>`).join('')}</select></div>
      <label class="chk"><input type="checkbox" id="spBoth" ${w.both ? 'checked' : ''}><span>Zastosuj także w płaszczyźnie ${other === 'y' ? 'x–z (M<sub>y</sub>)' : 'x–y (M<sub>z</sub>)'} (obecnie: ${esc((SUP_OPT[end].find(q => q[0] === p[end][other]) || [0, p[end][other]])[1])})</span></label>
      <p class="hint">Druga podpora i druga płaszczyzna – kliknij je na schemacie. Skręcanie dotyczy obu płaszczyzn (wyboczenie skrętne i zwichrzenie).</p>
      <div class="dbtn"><button class="btn" id="spCancel" type="button">Anuluj</button><button class="btn pri" id="spOk" type="button">Zastosuj</button></div>`, 'suppop nofocus');
    $$('input[name=spt]', m).forEach(r => r.addEventListener('change', () => { w.v = r.value; draw(); }));
    const kk = $('#spK', m); if (kk) kk.addEventListener('change', () => { const v = parseNum(kk.value); w.k = v === null ? '' : v; });
    $('#spSk', m).onchange = (e) => { w.sk = e.target.value; };
    $('#spBoth', m).onchange = (e) => { w.both = e.target.checked; };
    $('#spCancel', m).onclick = closeM;
    $('#spOk', m).onclick = () => {
      if (kk) { const v = parseNum(kk.value); w.k = v === null ? '' : v; }
      p[end][pl] = w.v; if (w.v === 'spr') p[end][kKey] = w.k;
      if (w.both) { p[end][other] = w.v; if (w.v === 'spr') p[end][end === 'dol' ? (other === 'y' ? 'kry' : 'krz') : (other === 'y' ? 'khz' : 'khy')] = w.k; }
      p[end].skret = w.sk;
      st.schemat = J.schemeOf(st); closeM(); A.changed(true);
    };
  };
  draw();
};
// okno „Obciążenia” – lista wszystkich obciążeń słupa (jedyne miejsce zadawania; zmiana w oknie obciążenia)
A.loadsWin = function () {
  const st = S();
  const KINDS = [['G', '+ stałe'], ['Q', '+ użytkowe'], ['S', '+ śnieg'], ['W', '+ wiatr'], ['T', '+ temperatura'], ['M', '+ dźwignice / maszyny'], ['A', '+ wyjątkowe']];
  const add = (k) => {
    const used = new Set(st.obciazenia.map(o => o.id)); let i = 1; while (used.has(k + i)) i++;
    const nm = { G: 'Obciążenie stałe', Q: 'Obciążenie użytkowe', S: 'Śnieg', W: 'Wiatr', T: 'Temperatura', M: 'Dźwignica / maszyny', A: 'Obciążenie wyjątkowe' }[k];
    st.obciazenia.push({ id: k + i, nazwa: nm, rodzaj: k, kat: 'Q-B', wyklucz: k === 'W' ? 'W' : '', aktywne: true, sklad: [k === 'W' ? { typ: 'q', kier: 'z', q0: 2, q1: '', x0: '', x1: '', wys: 'srodek' } : { typ: 'N', x: '', F: k === 'G' ? 100 : 50, ey: 0, ez: 0 }] });
    A.changed(true); A.loadPopup(st.obciazenia.length - 1, { back: A.loadsWin });
  };
  const rows = st.obciazenia.map((o, i) => `<tr data-i="${i}" class="${o.aktywne === false ? 'ldoff' : ''}"><td><input type="checkbox" data-on="${i}" ${o.aktywne !== false ? 'checked' : ''} title="uwzględnij w obliczeniach"></td><td><b style="color:${D.loadColor(o)}">${esc(o.id)}</b></td><td>${esc(o.nazwa || '')}<br><small class="hint">${esc((S0.RODZAJE[o.rodzaj] || { n: o.rodzaj }).n)}${o.wyklucz ? ' · grupa ' + esc(o.wyklucz) : ''}</small></td><td class="hs">${A.skladTxt(o)}</td><td style="white-space:nowrap"><button class="btn sm" data-ed="${i}" type="button">Zmień…</button> <button class="btn sm" data-dup="${i}" type="button" title="Duplikuj">⧉</button> <button class="btn sm dng" data-del="${i}" type="button" title="Usuń">×</button></td></tr>`).join('');
  const m = Q.modal(`<h3>Obciążenia słupa</h3><p class="hint">Wartości charakterystyczne (wyjątkowe – obliczeniowe A<sub>d</sub>). Każde obciążenie może mieć kilka składników: siła N z mimośrodami, siły poziome H, obciążenie rozłożone q, moment M. Kombinacje tworzone automatycznie wg PN-EN 1990; ciężar własny słupa – automatycznie.</p>
    <div class="addbar"><span>Dodaj:</span>${KINDS.map(([k, l]) => `<button class="btn sm" data-add="${k}" type="button">${l}</button>`).join('')}</div>
    <div class="tscroll" style="max-height:56vh;overflow:auto"><table class="ldsum"><thead><tr><th></th><th></th><th>Nazwa · rodzaj</th><th>Składniki</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="lnone">Brak obciążeń – dodaj je przyciskami powyżej.</td></tr>'}</tbody></table></div>
    <div class="dbtn"><span style="flex:1"></span><button class="btn pri" id="lwClose" type="button">Zamknij</button></div>`, 'lpop nofocus');
  m.querySelector('.dlg').style.maxWidth = '900px';
  $('#lwClose', m).onclick = closeM;
  $$('[data-add]', m).forEach(b => b.addEventListener('click', () => add(b.dataset.add)));
  $$('[data-ed]', m).forEach(b => b.addEventListener('click', () => A.loadPopup(+b.dataset.ed, { back: A.loadsWin })));
  $$('tr[data-i] td:nth-child(3), tr[data-i] td:nth-child(4)', m).forEach(td => { td.style.cursor = 'pointer'; td.addEventListener('dblclick', () => A.loadPopup(+td.parentElement.dataset.i, { back: A.loadsWin })); });
  $$('[data-on]', m).forEach(cb => cb.addEventListener('change', () => { st.obciazenia[+cb.dataset.on].aktywne = cb.checked; A.changed(true); A.loadsWin(); }));
  $$('[data-dup]', m).forEach(b => b.addEventListener('click', () => { const i = +b.dataset.dup, L = st.obciazenia[i], c = U.clone(L), used = new Set(st.obciazenia.map(o => o.id)); const r = (L.id.match(/^[A-Za-z]+/) || ['Q'])[0]; let k = 1; while (used.has(r + k)) k++; c.id = r + k; c.nazwa = (L.nazwa || '') + ' (kopia)'; st.obciazenia.splice(i + 1, 0, c); A.changed(true); A.loadsWin(); }));
  $$('[data-del]', m).forEach(b => b.addEventListener('click', async () => { const i = +b.dataset.del; if (await Q.ask(`Usunąć obciążenie ${esc(st.obciazenia[i].id)}?`, 'Usuń', true)) { st.obciazenia.splice(i, 1); A.changed(true); } A.loadsWin(); }));
};
A.bracesPopup = function (focus) {
  const st = S();
  let L = U.clone(st.stezenia || []);
  const draw = () => {
    const rows = L.map((z, i) => `<tr data-i="${i}"><td>S${i + 1}</td><td><input class="txt sm" data-z="x" value="${esc(showNum(z.x))}"></td><td><select data-z="pl">${[['z', 'kierunek y – oś z–z (słaba)'], ['y', 'kierunek z – oś y–y (silna)'], ['yz', 'oba kierunki']].map(([a, b]) => `<option value="${a}" ${z.pl === a ? 'selected' : ''}>${b}</option>`).join('')}</select></td><td><select data-z="wys">${[['srodek', 'środek ścinania'], ['pas+', 'pas +z'], ['pas-', 'pas −z']].map(([a, b]) => `<option value="${a}" ${z.wys === a ? 'selected' : ''}>${b}</option>`).join('')}</select></td><td><input type="checkbox" data-z="skret" ${z.skret ? 'checked' : ''} title="blokada skręcenia"></td><td><button class="btn sm dng" data-del="${i}" type="button">×</button></td></tr>`).join('');
    const m = Q.modal(`<h3>Stężenia pośrednie słupa</h3>
      <table class="mtab"><tr><th></th><th>x [m]</th><th>blokuje przemieszczenie</th><th>na wysokości</th><th>φ</th><th></th></tr>${rows || '<tr><td colspan="6" class="hint">brak stężeń</td></tr>'}</table>
      <div class="lrow"><button class="btn sm" id="bAdd" type="button">+ Stężenie</button><button class="btn sm" id="bEven" type="button">Rozmieść równomiernie…</button></div>
      <p class="hint">Stężenie blokuje przemieszczenie słupa w danym kierunku na wybranej wysokości przekroju (np. rygiel ścienny przy pasie zewnętrznym = „pas +z”). Opcja φ – stężenie skrętne (np. stężenie obu pasów). Stężenia dzielą słup na odcinki wyboczeniowe i zwichrzeniowe; program sprawdza też postać względem osi wymuszonej.</p>
      <div class="dbtn"><button class="btn" id="bCancel" type="button">Anuluj</button><button class="btn pri" id="bOk" type="button">Zastosuj</button></div>`, 'nofocus');
    $$('[data-z]', m).forEach(el => el.addEventListener('change', () => { const i = +el.closest('tr').dataset.i, k = el.dataset.z; L[i][k] = el.type === 'checkbox' ? el.checked : k === 'x' ? parseNum(el.value) : el.value; }));
    $$('[data-del]', m).forEach(b => b.addEventListener('click', () => { L.splice(+b.dataset.del, 1); draw(); }));
    $('#bAdd', m).onclick = () => { L.push({ x: U.num(st.geom.H) / 2, pl: 'z', wys: 'srodek', skret: false }); draw(); };
    $('#bEven', m).onclick = () => { const n = parseNum(prompt('Liczba stężeń (równe odstępy na wysokości):', '2')); if (!(n >= 1 && n <= 20)) return; const H = U.num(st.geom.H); L = []; for (let i = 1; i <= n; i++) L.push({ x: +(H * i / (n + 1)).toFixed(3), pl: 'z', wys: 'pas+', skret: false }); draw(); };
    $('#bCancel', m).onclick = closeM;
    $('#bOk', m).onclick = () => { st.stezenia = L.filter(z => z.x > 0 && z.x < U.num(st.geom.H)).sort((a, b) => a.x - b.x); closeM(); A.changed(true); };
    if (focus !== undefined) { const tr = $(`tr[data-i="${focus}"]`, m); if (tr) Q.flash(tr); }
  };
  draw();
};

/* ---------------------------------------------------------------- przekrój */
const ZONE_K = { fg: ['przekroj.bg', 'przekroj.tg', 'przekroj.nr', 'przekroj.b', 'przekroj.t'], fd: ['przekroj.bd', 'przekroj.td', 'przekroj.nr', 'przekroj.b', 'przekroj.t'], w: ['przekroj.tw', 'przekroj.h', 'przekroj.nr', 'przekroj.t'], all: ['przekroj.nr', 'przekroj.seria', 'przekroj.D', 'przekroj.t', 'przekroj.uklad', 'przekroj.a'], bat: ['przekroj.pa', 'przekroj.pb', 'przekroj.pt', 'przekroj.pc', 'przekroj.pw', 'przekroj.a'] };
A.secPopup = function (focus) {
  const st = S();
  const grp = A.GROUPS.find(g => g.id === 'sec');
  const draw = () => {
    const r = R();
    const fig = r && r.sec ? D.section(r.sec, { size: 250, eff: r.base && (r.base.effN || r.base.effMy) }) : '';
    const m = Q.modal(`<h3>Przekrój słupa</h3><div class="zcols" style="display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px"><div class="fields">${A.fieldsHTML(grp.items.filter(f => f.t !== 'html'), 'secp')}</div><div class="zprev">${fig}${r && r.sec ? BS.Raport.secTable(r.sec) : ''}</div></div>
      <div class="dbtn"><button class="btn" id="sTab" type="button">Tablica kształtowników…</button><button class="btn pri" id="sOk" type="button">Zamknij</button></div>`, 'secpop nofocus');
    A.bindFields(m, () => { A.recalcNow(); draw(); });
    $('#sOk', m).onclick = closeM; $('#sTab', m).onclick = () => A.secTablePopup();
    $$('.zprev .zhit', m).forEach(z => z.addEventListener('click', () => hlZone(m, z.dataset.z)));
  };
  const hlZone = (m, z) => { const ks = ZONE_K[z] || ZONE_K.all; Q.hlg(ks.map(k => $(`[data-k="${k}"]`, m)).filter(Boolean)); };
  A.setPopRedraw(null); draw();
  if (focus) setTimeout(() => { const m = $('#modal'); if (m) hlZone(m, focus); }, 60);
};
/* ---------------------------------------------------------------- schematy typowe */
A.schemesPopup = function () {
  const st = S(), cur = J.schemeOf(st);
  const big = (id) => D.pict(id).replace(/width="54" height="46"/, 'width="86" height="74"');
  const nm = (t) => esc(t).replace(/M_(\w)/g, 'M<sub>$1</sub>');
  const m = Q.modal(`<h3>Schematy typowe</h3><p class="hint">Wybór ustawia warunki podparcia w obu płaszczyznach (x–z: zginanie M<sub>y</sub>, wyboczenie względem y–y; x–y: zginanie M<sub>z</sub>, wyboczenie względem z–z). Wysokość, obciążenia, stężenia i przekrój pozostają bez zmian; podparcie można potem zmienić ręcznie (klik na podporze).</p>
    <div class="schgal">${J.SCHEMATY.map(q => `<button class="card ${q.id === cur ? 'ok' : ''}" data-sch="${q.id}" type="button">${big(q.id)}<span>${nm(q.n)}</span></button>`).join('')}</div>
    <div class="dbtn"><span style="flex:1"></span><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'nofocus');
  m.querySelector('.dlg').style.maxWidth = '860px';
  $('#nClose', m).onclick = closeM; 
  $$('[data-sch]', m).forEach(b => b.addEventListener('click', () => { J.applyScheme(st, b.dataset.sch); closeM(); A.changed(true); Q.toast('Schemat: ' + J.SCHEMATY.find(q => q.id === b.dataset.sch).n); }));
};
A.secTablePopup = function () {
  const st = S();
  const typ = st.przekroj.typ === 'spaw' ? 'walc' : st.przekroj.typ;
  const ser = typ === 'walc' ? (P.SERIE[st.przekroj.seria] ? st.przekroj.seria : 'HEB') : st.przekroj.seria === 'wlasna' ? (typ === 'chs' ? 'CHS' : 'SHS') : st.przekroj.seria;
  const list = P.lista(ser).map(nr => { const d = typ === 'walc' ? { typ, seria: ser, nr } : { typ, seria: ser, nr, wyk: st.przekroj.wyk }; try { return { d, p: P.props(d) }; } catch (e) { return null; } }).filter(Boolean);
  const r = R();
  const rows = list.map((q, i) => `<tr data-i="${i}" style="cursor:pointer" ${String(q.d.nr) === String(st.przekroj.nr) ? 'class="done"' : ''}><td><b>${esc(q.p.nazwa)}</b></td><td>${fmt(q.p.A / 100, 1)}</td><td>${fmt(q.p.Iy / 1e4, 0)}</td><td>${fmt(q.p.Iz / 1e4, 0)}</td><td>${fmt(q.p.Wpl_y / 1e3, 0)}</td><td>${fmt(q.p.iy / 10, 2)}</td><td>${fmt(q.p.iz / 10, 2)}</td><td>${fmt(q.p.masa, 1)}</td></tr>`).join('');
  const m = Q.modal(`<h3>Tablica kształtowników – ${esc(P.SERIA_N[ser] || ser)}</h3><p class="hint">Kliknij wiersz, aby przyjąć kształtownik${r && r.sec ? ` (obecnie ${esc(r.sec.nazwa)}, η = ${fmt(r.uMax * 100, 0)}%)` : ''}.</p>
    <div class="tscroll" style="max-height:60vh;overflow:auto"><table class="ctab"><thead><tr><th>przekrój</th><th>A [cm²]</th><th>I<sub>y</sub> [cm⁴]</th><th>I<sub>z</sub> [cm⁴]</th><th>W<sub>pl,y</sub> [cm³]</th><th>i<sub>y</sub> [cm]</th><th>i<sub>z</sub> [cm]</th><th>m [kg/m]</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="dbtn"><button class="btn" id="tClose" type="button">Zamknij</button></div>`, 'zpop nofocus');
  $$('tr[data-i]', m).forEach(tr => tr.addEventListener('click', () => { st.przekroj = Object.assign({}, st.przekroj, list[+tr.dataset.i].d); closeM(); A.changed(true); }));
  $('#tClose', m).onclick = closeM;
};

/* ---------------------------------------------------------------- projektant podstawy */
/* ---------------------------------------------------------------- rysunek podstawy: klik – parametry elementu, klik na wymiarze – zmiana na rysunku */
const BZ_KEYS = {
  plate: ['podstawa.lp', 'podstawa.bp', 'podstawa.tp', 'podstawa.gat'],
  anch: ['podstawa.kotwy.d', 'podstawa.kotwy.kl', 'podstawa.kotwy.uklad', 'podstawa.kotwy.w', 'podstawa.kotwy.ez', 'podstawa.kotwy.p', 'podstawa.scinanieKotwy'],
  col: ['podstawa.spoiny.pas', 'podstawa.spoiny.srodnik'],
  weld: ['podstawa.spoiny.pas', 'podstawa.spoiny.srodnik'],
  conc: ['podstawa.beton', 'podstawa.bF', 'podstawa.aF', 'podstawa.hF', 'podstawa.kjRecz'],
  grout: ['podstawa.podlewka'],
  tstub: ['podstawa.beton', 'podstawa.podlewka', 'podstawa.kjRecz']
};
const BZ_N = { plate: 'Blacha podstawy…', anch: 'Kotwy…', weld: 'Spoiny słupa z blachą…', conc: 'Fundament i beton…', grout: 'Podlewka…', tstub: 'Strefy docisku…' };
const DERIV = {
  'podstawa.kotwy.eY': (n, st) => ['podstawa.kotwy.w', U.num(st.podstawa.bp) - 2 * n],
  'podstawa.kotwy.eZw': (n, st) => ['podstawa.kotwy.p', U.num(st.podstawa.lp) - 2 * n],
  'podstawa.kotwy.zT2': (n, st) => ['podstawa.kotwy.ez', (U.num(st.podstawa.lp) - n) / 2]
};
function inlineEdit(x, y, key, label, after, bv) {
  const old = $('.inled'); if (old) old.remove();
  const v = bv !== undefined && bv !== null && bv !== '' ? Math.round(+bv * 10) / 10 : Q.getP(S(), key);
  const d = document.createElement('div'); d.className = 'inled';
  d.innerHTML = `<label>${sym(label)}</label><input class="txt" value="${esc(showNum(v))}" autocomplete="off"><span class="u">mm</span><small>Enter – zastosuj, Esc – anuluj</small>`;
  document.body.appendChild(d);
  const r = d.getBoundingClientRect();
  d.style.left = Math.max(4, Math.min(window.innerWidth - r.width - 4, x - 20)) + 'px'; d.style.top = Math.max(4, Math.min(window.innerHeight - r.height - 4, y + 10)) + 'px';
  const inp = d.querySelector('input'); inp.focus(); inp.select();
  let done = false;
  const close = () => { done = true; d.remove(); document.removeEventListener('pointerdown', outside, true); };
  const apply = () => {
    if (done) return;
    const n = parseNum(inp.value);
    if (n === null || !(n > 0)) { inp.classList.add('bad'); return; }
    close();
    if (n === U.num(v)) return;
    if (DERIV[key]) { const [k2, v2] = DERIV[key](n, S()); if (!(v2 > 0)) { Q.toast('Wartość poza zakresem – wymiar wynikowy byłby ≤ 0.'); return; } Q.setP(S(), k2, Math.round(v2 * 10) / 10); }
    else Q.setP(S(), key, n);
    A.changed(true); if (after) after();
  };
  const outside = (e) => { if (!d.contains(e.target)) apply(); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}
A.bindBaseFig = function (root, inPopup) {
  const svg = root.querySelector('svg.basesvg'); if (!svg) return;
  const focus = (z) => {
    if (!inPopup) { A.basePopup(z); return; }
    $$('.bz', svg).forEach(g => g.classList.toggle('sel', g.dataset.bz === z || (z === 'weld' && g.dataset.bz === 'col')));
    const els = (BZ_KEYS[z] || []).map(k => $(`#modal [data-k="${k}"]`)).filter(Boolean);
    if (els.length) { Q.hlg(els); try { els[0].focus({ preventScroll: true }); } catch (e) { /* */ } }
  };
  $$('.bz', svg).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); focus(g.dataset.bz); }));
  $$('.bzd', svg).forEach(rc => rc.addEventListener('click', ev => { ev.stopPropagation(); const t = rc.querySelector('title'); inlineEdit(ev.clientX, ev.clientY, rc.dataset.bk, t ? t.textContent.replace(/ – kliknij.*$/, '') : rc.dataset.bk, null, rc.dataset.bv); }));
  svg.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    const g = ev.target.closest && ev.target.closest('.bz');
    const cur = g && BZ_N[g.dataset.bz] ? g.dataset.bz : null;
    const it = Object.keys(BZ_N).filter(k => k !== 'tstub' && k !== cur).map(k => [k, BZ_N[k]]);
    if (cur) it.unshift([cur, '► ' + BZ_N[cur]], ['-']);
    it.push(['-'], ['des', '⚙ Dobierz podstawę']);
    Q.ctxMenu(ev.clientX, ev.clientY, it, a => { if (a === 'des') A.runDesign('base'); else focus(a); });
  });
};
A.basePopup = function (focusZ) {
  const st = S();
  const o = st.podstawa;
  if (!o.aktywna) { o.aktywna = true; A.changed(true); }
  const F = [
    { k: 'podstawa.typ', t: 'sel', l: 'Rodzaj', o: [['sztywna', 'utwierdzona (kotwy poza pasami)'], ['przegub', 'przegubowa']], wide: true, re: true },
    { k: 'podstawa.lp', t: 'num', l: 'Blacha l_{p} (wzdłuż z / h)', u: 'mm', list: [300, 350, 400, 450, 500, 550, 600, 700, 800], min: 50, re: true },
    { k: 'podstawa.bp', t: 'num', l: 'Blacha b_{p} (wzdłuż y / b)', u: 'mm', list: [200, 250, 300, 350, 400, 450, 500], min: 50, re: true },
    { k: 'podstawa.tp', t: 'num', l: 'Grubość t_{p}', u: 'mm', list: [15, 20, 25, 30, 35, 40, 45, 50, 60], min: 5, re: true },
    { k: 'podstawa.gat', t: 'sel', l: 'Stal blachy', o: () => Object.keys(M.STAL).map(k => [k, k]) },
    { t: 'sub', l: 'Śruby kotwiące' },
    { k: 'podstawa.kotwy.d', t: 'sel', l: 'Średnica', o: () => Object.keys(M.SRUBY).filter(k => M.SRUBY[k].d >= 16).map(k => [k, k]) },
    { k: 'podstawa.kotwy.kl', t: 'sel', l: 'Klasa / materiał', o: () => Object.keys(BS.PB.KOTWY_KL).map(k => [k, BS.PB.KOTWY_KL[k].n]), wide: true },
    { k: 'podstawa.kotwy.uklad', t: 'sel', l: 'Układ', o: [['zew', '2 rzędy poza pasami (4 kotwy)'], ['wew', '4 kotwy między pasami'], ['os', '2 kotwy w osi środnika']], wide: true, re: true },
    { k: 'podstawa.kotwy.ez', t: 'num', l: 'Odległość rzędu od krawędzi e_{z}', u: 'mm', list: [40, 50, 60, 70, 80, 100], min: 20, show: s => s.podstawa.kotwy.uklad === 'zew' },
    { k: 'podstawa.kotwy.w', t: 'num', l: 'Rozstaw kotew w rzędzie w', u: 'mm', list: [120, 150, 180, 200, 220, 250, 280, 300, 350], min: 40 },
    { k: 'podstawa.kotwy.p', t: 'num', l: 'Rozstaw rzędów p (między pasami)', u: 'mm', list: ['', 100, 150, 200, 250, 300], opt: true, ph: 'auto', min: 0, show: s => s.podstawa.kotwy.uklad === 'wew' },
    { k: 'podstawa.scinanieKotwy', t: 'chk', l: 'Kotwy przenoszą ścinanie (podkładki przyspawane)' },
    { t: 'hint', h: () => { const r = R(), g = r && r.pb && r.pb.C && r.pb.C.geo; if (!g) return ''; const c = (v, mn) => `<b style="color:var(--${v + 1e-6 < mn ? 'fail' : 'ok'})">${fmt(v, 0)}</b>`; return `Otwory d₀ = ${fmt(g.d0, 0)} mm (tabl. 3.3): e<sub>y</sub> = ${c(g.eY, g.eMin)}, e<sub>z</sub> = ${c(g.eZ, g.eMin)} ≥ 1,2d₀ = ${fmt(g.eMin, 0)} mm; p₂ = ${c(g.pY, g.p2Min)} ≥ 2,4d₀ = ${fmt(g.p2Min, 0)} mm${g.pZ !== null ? `; p₁ = ${c(g.pZ, g.p1Min)} ≥ 2,2d₀ = ${fmt(g.p1Min, 0)} mm` : ''}; odstęp osi kotwy od słupa ${g.inside ? '<b style="color:var(--fail)">kotwa w obrysie słupa</b>' : c(g.clr, g.cReq)} ≥ ${fmt(g.cReq, 0)} mm (podkładka Ø ≈ 2d, spoina a√2, luz 5 mm). Wymiary e i p można zmieniać na rysunku.`; } },
    { t: 'sub', l: 'Fundament i spoiny' },
    { k: 'podstawa.beton', t: 'sel', l: 'Beton fundamentu', o: () => Object.keys(M.BETON).map(k => [k, k]) },
    { k: 'podstawa.podlewka', t: 'num', l: 'Podlewka t_{g}', u: 'mm', list: [20, 30, 40, 50], min: 0 },
    { k: 'podstawa.bF', t: 'num', l: 'Fundament – długość (z)', u: 'mm', list: [800, 1000, 1200, 1400, 1600, 2000], min: 100 },
    { k: 'podstawa.aF', t: 'num', l: 'Fundament – szerokość (y)', u: 'mm', list: [800, 1000, 1200, 1400, 1600, 2000], min: 100 },
    { k: 'podstawa.hF', t: 'num', l: 'Fundament – wysokość', u: 'mm', list: [500, 600, 800, 1000, 1200], min: 100 },
    { k: 'podstawa.kjRecz', t: 'num', l: 'k_{j} ręcznie', list: ['', 1, 1.5, 2, 2.5, 3], opt: true, ph: 'auto', min: 1, max: 3 },
    { k: 'podstawa.spoiny.pas', t: 'num', l: 'Spoiny pasów a_{f}', u: 'mm', list: [4, 5, 6, 7, 8, 10, 12], min: 3 },
    { k: 'podstawa.spoiny.srodnik', t: 'num', l: 'Spoiny środnika a_{w}', u: 'mm', list: [3, 4, 5, 6, 7, 8], min: 3 },
    { k: 'podstawa.podatna', t: 'chk', l: 'Podatność podstawy w modelu (S_{j,ini})', re: true, show: s => s.podstawa.typ === 'sztywna' }
  ];
  const draw = () => {
    const r = R(), C = r && r.pb && r.pb.C;
    const fig = C && !C.err.length ? D.basePlate(C, r.sec, { W: 560, H: 330, dName: o.kotwy.d, kl: o.kotwy.kl, beton: o.beton }) : (C ? C.err.map(e => `<div class="msg err">${esc(e)}</div>`).join('') : '');
    const cs = r && r.checks ? r.checks.filter(c => /^PB/.test(c.id)) : [];
    const tab = cs.length ? `<table class="ctab"><tbody>${cs.map(c => `<tr class="${c.status === 'ok' || c.info ? 'done' : ''}"><td>${sym(c.n)}</td><td class="val xclick" data-cid="${esc(c.id)}">${c.util !== null && isFinite(c.util) ? fmt(c.util * 100, 0) + '%' : '—'}</td><td><span class="st ${c.info ? 'info' : c.status}">${c.info ? 'info' : c.status === 'fail' ? 'NIE' : 'OK'}</span></td></tr>`).join('')}</tbody></table>` : '';
    const m = Q.modal(`<h3>Projektant podstawy słupa</h3><div class="zcols" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:14px"><div class="fields">${A.fieldsHTML(F, 'bp')}</div><div class="zprev">${fig}${tab}<p class="hint">Rysunek: kliknij element (blacha, kotwy, spoiny, podlewka, fundament) – jego parametry; kliknij wymiar – zmiana wartości wprost na rysunku; prawy przycisk – menu. Tabela: kliknij wartość – tok obliczeń (metoda składnikowa PN-EN 1993-1-8).</p></div></div>
      <div class="dbtn"><button class="btn" id="pDes" type="button">⚙ Dobierz podstawę</button><button class="btn pri" id="pOk" type="button">Zamknij</button></div>`, 'zpop nofocus');
    A.bindFields(m, () => { A.recalcNow(); draw(); });
    $$('[data-cid]', m).forEach(td => td.addEventListener('click', () => { const c = R().checks.find(q => q.id === td.dataset.cid); if (c) A.explainPopup(c, true); }));
    A.bindBaseFig(m, true);
    $('#pOk', m).onclick = closeM;
    $('#pDes', m).onclick = async () => { await A.runDesign('base'); draw(); };
  };
  A.setPopRedraw(draw);
  draw();
  if (focusZ) setTimeout(() => { const g = $(`#modal svg.basesvg .bz[data-bz="${focusZ}"]`); if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, 60);
};

/* ---------------------------------------------------------------- NDP i profil normowy */
A.ndpPopup = function () {
  const st = S(), ndp = st.normy.ndp1, base = N.NDP1_PL;
  const rows = Object.keys(base).map(k => { const b = base[k], v = ndp[k]; const ch = String(v) !== String(b.v); return `<tr ${ch ? 'class="done"' : ''}><td>${esc(b.d)}<br><small>${esc(b.ref)} · ${esc(b.z)}${b.sp ? ' · <b>sprawdź ZK</b>' : ''}</small></td><td><input class="txt" data-ndp="${k}" value="${esc(typeof v === 'number' ? showNum(+v.toPrecision(6)) : v)}" style="width:110px"></td><td><small>${esc(typeof b.v === 'number' ? showNum(+b.v.toPrecision(6)) : b.v)}</small></td></tr>`; }).join('');
  const nrm = R() && R().norm;
  const m = Q.modal(`<h3>Parametry ustalane krajowo (NDP) i profil normowy</h3>
    <p class="hint">${esc(nrm ? nrm.decyzja : '')}</p>
    <div class="lrow">Zestaw zweryfikował: <input class="txt lname" id="nVer" value="${esc(st.normy.zweryfikowal || '')}"> data: <input class="txt" id="nDat" value="${esc(st.normy.dataWeryfikacji || '')}" placeholder="RRRR-MM-DD" style="width:110px"></div>
    <div class="tscroll" style="max-height:55vh;overflow:auto"><table class="ctab"><thead><tr><th>parametr</th><th>wartość</th><th>zalecana / ZK PL</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="dbtn"><button class="btn" id="nReset" type="button">Przywróć wartości ZK</button><span style="flex:1"></span><button class="btn" id="nCancel" type="button">Anuluj</button><button class="btn pri" id="nOk" type="button">Zastosuj</button></div>`, 'norm nofocus');
  $('#nCancel', m).onclick = closeM;
  $('#nReset', m).onclick = () => { Object.keys(base).forEach(k => { ndp[k] = base[k].v; }); closeM(); A.changed(true); };
  $('#nOk', m).onclick = () => {
    $$('[data-ndp]', m).forEach(el => { const k = el.dataset.ndp, b = base[k]; const v = typeof b.v === 'number' ? parseNum(el.value) : el.value.trim(); if (v !== null && v !== '') ndp[k] = v; });
    st.normy.zweryfikowal = $('#nVer', m).value; st.normy.dataWeryfikacji = $('#nDat', m).value;
    closeM(); A.changed(true);
  };
};
A.metaPopup = function () {
  const st = S(), mt = st.meta;
  const fld = (k, l) => `<div class="row wide"><label>${l}</label><input class="txt" data-kt="meta.${k}" value="${esc(mt[k] || '')}"></div>`;
  const m = Q.modal(`<h3>Strona tytułowa raportu</h3><p class="hint">Dane opcjonalne – pojawiają się tylko w nagłówku raportu (puste pola są pomijane).</p>${fld('nazwa', 'Nazwa elementu')}${fld('obiekt', 'Obiekt')}${fld('projektant', 'Projektant')}${fld('nrUprawnien', 'Nr uprawnień')}${fld('sprawdzajacy', 'Sprawdzający')}${fld('data', 'Data')}<div class="row wide"><label>Opis</label><textarea class="txt" data-kt="meta.opis" rows="4" style="height:auto">${esc(mt.opis || '')}</textarea></div><div class="dbtn"><button class="btn pri" id="mOk" type="button">Zamknij</button></div>`, 'nofocus');
  A.bindFields(m);
  $('#mOk', m).onclick = () => { $('#projName').value = st.meta.nazwa; closeM(); A.changed(false); };
};

/* ---------------------------------------------------------------- objaśnienia */
A.normPopup = function (c) {
  const o = BS.OBJ.find(c.ref);
  const m = Q.modal(`<h3>${o ? esc(o.lab) + ' – ' + o.t : esc(c.ref)}</h3><p class="hint">${sym(c.n)}</p>${o ? `<p>${o.s}</p><p><b>${o.f}</b></p>${o.h ? `<p class="hint">${o.h}</p>` : ''}` : '<p class="hint">Brak objaśnienia dla tego punktu.</p>'}<p class="hint">Omówienie własne – nie jest cytatem normy.</p><div class="dbtn"><button class="btn" id="nEx" type="button">Jak obliczono…</button><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'norm');
  $('#nClose', m).onclick = closeM; $('#nEx', m).onclick = () => A.explainPopup(c);
};
const STL = { ok: 'spełniony', warn: 'uwaga', fail: 'niespełniony', info: 'informacja' };
const unitV = (v, u) => (v === null || v === undefined || !isFinite(v) ? '—' : u === 'F' ? fmt(v / 1e3, 2) + ' kN' : u === 'M' ? fmt(v / 1e6, 2) + ' kNm' : u === 'mm' ? fmt(v, 1) + ' mm' : u === 'MPa' ? fmt(v, 1) + ' MPa' : u === '°C' ? fmt(v, 0) + ' °C' : fmt(v, 3));
const ckCond = (c) => c.unit === '-' ? (c.info ? fmt(c.Rd, 2) : `${fmt(c.util, 3)} ≤ 1`) : `${unitV(c.Ed, c.unit)} ${c.util <= 1 ? '≤' : '>'} ${unitV(c.Rd, c.unit)}`;
const utilBar = (c) => { const u = c.util !== null && isFinite(c.util) ? c.util : Infinity, w = Math.min(100, (isFinite(u) ? u : 1) * 100); return `<span style="display:inline-block;width:120px;height:9px;border-radius:5px;background:var(--line2);vertical-align:middle;margin-right:8px;overflow:hidden"><span style="display:block;height:100%;width:${w}%;background:var(--${u > 1 ? 'fail' : u > 0.9 ? 'warn' : 'ok'})"></span></span><b>${isFinite(u) ? fmt(u * 100, 0) + '%' : '∞'}</b>`; };
A.explainPopup = function (c, back) {
  const r = R();
  const html = BS.Raport.frag(c, r, S());
  const st = c.info ? 'info' : c.status;
  const m = Q.modal(`<h3>Jak obliczono: ${sym(c.n)}</h3><p class="hint">${esc(c.grp || '')}${c.ref ? ' · ' + esc(c.ref) : ''}${c.x !== undefined && c.x !== null && isFinite(c.x) ? ` · x = ${fmt(c.x / 1000, 2)} m` : ''}${c.combo ? ' · ' + esc(c.combo) : ''}</p>
    <div class="xbox"><table class="kv"><tr><td>Warunek</td><td class="n"><b>${ckCond(c)}</b></td></tr><tr><td>Wytężenie</td><td>${utilBar(c)}</td></tr><tr><td>Status</td><td><span class="st ${st}">${STL[st] || st}</span></td></tr></table>${c.note ? `<p class="hint">${esc(c.note)}</p>` : ''}</div>
    <div class="rexp xrep">${html}</div><div class="dbtn"><button class="btn" id="nNorm" type="button">Punkt normy…</button><button class="btn" id="nGo" type="button" title="Przejdź do danych / wyników, od których zależy ten warunek">Pokaż miejsce →</button><button class="btn" id="nRep" type="button">W raporcie</button>${back ? '<button class="btn" id="nBack" type="button">← Podstawa</button>' : ''}<span style="flex:1"></span><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'expl');
  $('#nClose', m).onclick = closeM; $('#nNorm', m).onclick = () => A.normPopup(c); $('#nGo', m).onclick = () => A.gotoCheck(c); $('#nRep', m).onclick = () => A.gotoReport(c);
  if (back) $('#nBack', m).onclick = () => A.basePopup();
};
// „pokaż miejsce”: przejście do zakładki / pól danych, od których zależy warunek (jak w BelkaStal)
A.gotoCheck = function (c) {
  const id = c.id || '', grp = c.grp || '', r = R();
  const ci = r && r.checks ? r.checks.indexOf(c) : -1;
  const go = (tab, fn) => { closeM(); A.selectTab(tab); setTimeout(() => { try { if (fn) fn(); } catch (e) { console.error(e); } }, 90); };
  const hl = (sel) => Q.hlg(sel);
  const row = (tab) => () => hl(`#p-${tab} tr[data-ci="${ci}"]`) || hl(`#p-${tab} .box`);
  const fields = (gid, keys) => () => { const d = $(`#inputs details[data-g="${gid}"]`); if (d) d.open = true; const els = keys.map(k => $(`#inputs [data-k="${k}"]`)).filter(Boolean); if (!hl(els)) hl(`#inputs details[data-g="${gid}"] summary`); };
  if (id === 'acr') return go('data', fields('an', ['analiza.metoda', 'analiza.imp.m', 'analiza.imp.phi']));
  if (/^(N|MN|Vy|Vz)$/.test(id)) return go('sec', () => { if (c.x !== undefined && c.x !== null && isFinite(c.x)) A.setSecX(c.x); if (!hl(`#p-sec tr[data-ci="${ci}"]`)) hl('#p-sec .zhit'); });
  if (/^(By|Bz|BT|GM)$|^LT\d|^I6[12]_/.test(id)) return go('stab', row('stab'));
  if (/^w[yz]$/.test(id)) return go('data', fields('sls', ['sgu.typ', id === 'wy' ? 'sgu.lim' : 'sgu.limZ']));
  if (id === 'PBG') return go('data', () => A.basePopup());
  if (/^PB/.test(id) || id === 'KRP') return go('base', row('base'));
  if (id === 'FI' || /^Pożar/.test(grp)) return go('fire', row('fire'));
  if (id === 'KR' || /^Kruche/.test(grp)) return go('data', fields('exe', ['kruche.Tmd', 'kruche.dTr']));
  return A.gotoReport(c);
};
A.gotoReport = function (c) {
  closeM();
  A.selectTab('report');
  setTimeout(() => {
    const rep = $('#report'); if (!rep) return;
    const walker = document.createTreeWalker(rep, NodeFilter.SHOW_COMMENT);
    let n; while ((n = walker.nextNode())) { if (n.nodeValue === 'ck:' + c.id) { const el = n.nextSibling && n.nextSibling.nodeType === 1 ? n.nextSibling : n.parentElement; el.scrollIntoView({ block: 'start' }); Q.flash(el); break; } }
  }, 150);
};
})();
