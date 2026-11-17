/* =====================================================================
   SłupStal – raport obliczeń (jak w BelkaStal/SłupŻB):
   • raport pełny – tok obliczeń „wzór = podstawienie = wynik [punkt
     normy]” dla każdego sprawdzenia, rysunki, tabele;
   • raport „Statyka” – dane, obciążenia, kombinacje, siły wewnętrzne,
     reakcje;
   • fragmenty „jak obliczono” dla pojedynczych sprawdzeń (okno
     objaśnienia) – to samo źródło co raport;
   • odtwarzalność: wersja programu i silnika, SHA-256 danych.
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, D = BS.D, N = BS.N, S0 = BS.S, M = BS.M, T = BS.T;
const RP = BS.Raport = {};
const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fm = (v, dp) => BS.Q.fmt(v, dp);
const f = (v, n) => fm(v, n === undefined ? 2 : n);
const kN = (v) => fm(v / 1e3, 2), kNm = (v) => fm(v / 1e6, 2), cm2 = (v) => fm(v / 100, 2), cm4 = (v) => fm(v / 1e4, 1), cm3 = (v) => fm(v / 1e3, 1);
const sym = (s) => esc(s).replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>').replace(/_([0-9A-Za-ząćęłńóśźżθφλαβγχψ]+(?:,[0-9A-Za-ząćęłńóśźżθ.]+)*)/g, '<sub>$1</sub>');
RP.sym = sym;

// indeksy w wyrażeniach (bez escapowania – wyrażenia są HTML programu)
const symF = (s) => String(s).replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>').replace(/_([0-9A-Za-ząćęłńóśźżθφλαβγχψ]+(?:,[0-9A-Za-ząćęłńóśźżθ.]+)*)/g, '<sub>$1</sub>');
RP.symF = symF;
const eq = (lhs, fx, sb, val, unit, ref, stt) => {
  let s = `<div class="eq">${sym(lhs)}`;
  if (fx) s += ` = ${symF(fx)}`;
  if (sb) s += ` = ${symF(sb)}`;
  if (val !== undefined && val !== null && val !== '') s += ` = <b>${val}</b>`;
  if (unit) s += ` ${unit}`;
  if (stt) s += ` <span class="${stt[0]}">${stt[1]}</span>`;
  if (ref) s += `<span class="r">[${ref}]</span>`;
  return s + '</div>';
};
const line = (t, ref) => `<div class="eq">${symF(t)}${ref ? `<span class="r">[${esc(ref)}]</span>` : ''}</div>`;
const okS = (u) => (u === null || u === undefined ? '' : u <= 1 + 1e-9 ? ' <span class="ok">✔ warunek spełniony</span>' : ' <span class="fail">✖ warunek NIESPEŁNIONY</span>');
const verd = (Ed, Rd, u, unit) => `<div class="eq"><b>${Ed} ${unit || ''} ${u <= 1 + 1e-9 ? '≤' : '>'} ${Rd} ${unit || ''}</b> → η = <b>${fm(u * 100, 1)}%</b>${okS(u)}</div>`;
const tbl = (head, rows) => `<table class="rtab"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const mk = (id, html) => `<!--ck:${id}-->${html}<!--/ck:${id}-->`;
const pre = (gen) => N.refPrefix(gen || 1) + '1993-1-1';
const nm = (o) => (o && o.mono ? 'N_{cr,TF}' : 'N_{cr,T}');
void nm;

/* ---------------------------------------------------------------- pomocnicze opisy */
RP.secTable = function (sec) {
  const r = [['A', cm2(sec.A), 'cm²'], ['I<sub>y</sub>', cm4(sec.Iy), 'cm⁴'], ['I<sub>z</sub>', cm4(sec.Iz), 'cm⁴'], ['W<sub>el,y</sub>', cm3(Math.min(sec.Wel_t, sec.Wel_b)), 'cm³'], ['W<sub>pl,y</sub>', cm3(sec.Wpl_y), 'cm³'],
    ['W<sub>el,z</sub>', cm3(sec.Wel_z), 'cm³'], ['W<sub>pl,z</sub>', cm3(sec.Wpl_z), 'cm³'], ['i<sub>y</sub>', fm(sec.iy / 10, 2), 'cm'], ['i<sub>z</sub>', fm(sec.iz / 10, 2), 'cm'], ['I<sub>t</sub>', cm4(sec.It), 'cm⁴'],
    ['I<sub>w</sub>', fm(sec.Iw / 1e9, 2), '·10³ cm⁶'], ['A<sub>v,z</sub>', cm2(sec.Avz), 'cm²'], ['A<sub>v,y</sub>', cm2(sec.Avy), 'cm²'], ['masa', fm(sec.masa, 1), 'kg/m']];
  if (sec.kind === 'I' && !sec.sym) r.push(['z<sub>0</sub> (ŚŚ – ŚC)', fm(sec.z0, 1), 'mm'], ['β<sub>z</sub>', fm(sec.betaZ, 1), 'mm']);
  if (sec.kind === 'CC') r.push(['gałąź', esc(sec.ch.nazwa), ''], ['A<sub>ch</sub>', cm2(sec.A_ch), 'cm²'], ['I<sub>ch</sub> (oś własna ∥ z)', cm4(sec.I_ch), 'cm⁴'], ['i<sub>min</sub>', fm(sec.i_ch / 10, 2), 'cm'], ['I<sub>y,ch</sub>', cm4(sec.Iy_ch), 'cm⁴'], ['e (ŚC gałęzi od grzbietu)', fm(sec.e, 1), 'mm'], ['h<sub>0</sub> (rozstaw osi gałęzi)', fm(sec.h0, 1), 'mm'], ['B (szerokość)', fm(sec.B, 0), 'mm'], [sec.bu && !sec.buPack ? 'przewiązki b<sub>b</sub> × t<sub>b</sub> / rozstaw a' : 'przekładki – rozstaw a', sec.bu && !sec.buPack ? `${fm(sec.pb, 0)} × ${fm(sec.pt, 0)} / ${fm(sec.pa, 0)}` : fm(sec.pa, 0), 'mm']);
  return tbl(['wielkość', 'wartość', 'jedn.'], r);
};
RP.classTable = function (k) {
  return tbl(['ścianka', 'typ', 'c [mm]', 't [mm]', 'c/t', 'α / ψ', 'granice kl. 1 / 2 / 3', 'klasa'], k.all.map(p => [esc(p.n), esc(p.typ), fm(p.c, 1), fm(p.t, 1), fm(p.ct, 2), p.tension ? 'rozciągana' : `${p.alpha !== undefined ? fm(p.alpha, 3) : '—'} / ${p.psi !== undefined && isFinite(p.psi) ? fm(p.psi, 3) : '—'}`, p.tension ? '—' : p.lim.map(v => isFinite(v) ? fm(v, 1) : '∞').join(' / '), `<b>${p.cls}</b>`]));
};
const cmb = (c) => c ? esc(c.opis || c) : '';

/* ---------------------------------------------------------------- tok sprawdzeń */
RP.tok = function (c, R, S) {
  const sec = R.sec, b = R.base, ndp = R.ndp, mat = R.mat, fy = mat.fy, d = c.d || {};
  const g0 = ndp.gM0, g1 = ndp.gM1;
  let h = '';
  const head = (t) => `<h3>${symF(t)}</h3>`;
  switch (true) {
    case c.id === 'acr': {
      const a = d.alphaMin;
      h += head('Mnożnik obciążenia krytycznego α<sub>cr</sub>');
      h += line(`Wartość własna MES: K<sub>E</sub>·φ = α<sub>cr</sub>·K<sub>G</sub>(N<sub>Ed</sub>(x))·φ, rozkład N<sub>Ed</sub>(x) kombinacji ${cmb(a.combo)}`, '5.2.1(3)');
      h += eq('α_{cr,y}', '', '', fm(a.y, 2), '', '5.2.1') + eq('α_{cr,z}', '', '', fm(a.z, 2), '', '5.2.1');
      h += line(`α<sub>cr</sub> = min = ${fm(Math.min(a.y, a.z), 2)} ${Math.min(a.y, a.z) >= ndp.alfaCr ? '≥' : '<'} ${fm(ndp.alfaCr, 0)} → ${Math.min(a.y, a.z) >= ndp.alfaCr ? 'efekty II rzędu można pominąć (analiza I rzędu dopuszczalna)' : 'efekty II rzędu istotne – ' + (R.method === 'I' ? 'przyjęto analizę I rzędu z długościami wyboczeniowymi z postaci przechyłowej (5.2.2(8))' : 'uwzględnione w analizie II rzędu')}`);
      break;
    }
    case c.id === 'N': {
      const e = d.e, Nn = e.N;
      h += head(Nn >= 0 ? 'Ściskanie – nośność przekroju' : 'Rozciąganie – nośność przekroju');
      h += line(`x = ${fm(d.x / 1000, 2)} m; kombinacja ${cmb(d.combo)}`);
      if (Nn >= 0) {
        if (b.effN) h += eq('N_{c,Rd}', 'A_{eff}·f_y/γ_{M0}', `${cm2(b.Aeff)}·10²·${fm(fy, 0)}/${fm(g0, 2)}`, kN(b.Nc), 'kN', '6.2.4 (6.11)');
        else h += eq('N_{c,Rd}', 'A·f_y/γ_{M0}', `${cm2(sec.A)}·10²·${fm(fy, 0)}/${fm(g0, 2)}`, kN(b.Nc), 'kN', '6.2.4 (6.10)');
        h += verd(kN(Nn), kN(b.Nc), c.util, 'kN');
      } else {
        h += eq('N_{pl,Rd}', 'A·f_y/γ_{M0}', `${cm2(sec.A)}·10²·${fm(fy, 0)}/${fm(g0, 2)}`, kN(b.Npl), 'kN', '6.2.3 (6.6)');
        h += verd(kN(-Nn), kN(b.Npl), c.util, 'kN');
      }
      break;
    }
    case c.id === 'MN': {
      const p = d.p, e = d.e, cx = d.cx;
      h += head('Zginanie z siłą podłużną – nośność przekroju');
      h += line(`x = ${fm(d.x / 1000, 2)} m; ${cmb(d.combo)}${d.vr && R.method !== 'I' ? ' · ' + esc(d.vr) : ''}`);
      h += eq('N_{Ed}', '', '', kN(e.N), 'kN') + eq('M_{y,Ed}', '', '', kNm(e.My), 'kNm') + eq('M_{z,Ed}', '', '', kNm(e.Mz), 'kNm') + eq('V_{z,Ed}', '', '', kN(e.Vz), 'kN') + eq('V_{y,Ed}', '', '', kN(e.Vy), 'kN');
      h += line(`Klasa przekroju przy N<sub>Ed</sub> = ${kN(cx.N)} kN, M<sub>y</sub> = ${kNm(cx.My)} kNm, M<sub>z</sub> = ${kNm(cx.Mz)} kNm (najbardziej wytężone miejsca kombinacji): <b>klasa ${p.cls}</b>`, '5.5, tabl. 5.2') + RP.classTable(cx.k);
      if (p.cls <= 2) {
        h += eq('n', 'N_{Ed}/N_{pl,Rd}', `${kN(Math.abs(e.N))}/${kN(b.Npl)}`, fm(p.n, 4), '', '6.2.9.1');
        if (p.rhoZ > 0) h += eq('ρ_z', '(2V_{z,Ed}/V_{pl,z,Rd} − 1)²', '', fm(p.rhoZ, 4), '', '6.2.8 (6.29)') + eq('M_{pl,y,V,Rd}', '(W_{pl,y} − ρA_w²/(4t_w))·f_y/γ_{M0}', '', kNm(p.MplyV), 'kNm', '6.2.8 (6.30)');
        if (sec.kind === 'I') {
          h += eq('a', '(A − 2bt_f)/A ≤ 0,5', '', fm(p.a, 4), '', '6.2.9.1(5)');
          h += p.noRedY ? line(`N<sub>Ed</sub> ≤ 0,25·N<sub>pl,Rd</sub> i N<sub>Ed</sub> ≤ 0,5·h<sub>w</sub>t<sub>w</sub>f<sub>y</sub>/γ<sub>M0</sub> → bez redukcji: M<sub>N,y,Rd</sub> = M<sub>pl,y,Rd</sub> = <b>${kNm(p.MNy)} kNm</b>`, '6.2.9.1(4) (6.33), (6.34)')
            : eq('M_{N,y,Rd}', 'M_{pl,y,Rd}·(1 − n)/(1 − 0,5a) ≤ M_{pl,y,Rd}', `${kNm(p.MplyV)}·(1 − ${fm(p.n, 4)})/(1 − 0,5·${fm(p.a, 4)})`, kNm(p.MNy), 'kNm', '6.2.9.1(5) (6.36)');
          h += p.noRedZ || p.n <= p.a ? line(`${p.noRedZ ? 'N<sub>Ed</sub> ≤ h<sub>w</sub>t<sub>w</sub>f<sub>y</sub>/γ<sub>M0</sub>' : 'n ≤ a'} → M<sub>N,z,Rd</sub> = M<sub>pl,z,Rd</sub> = <b>${kNm(p.MNz)} kNm</b>`, '6.2.9.1 (6.35), (6.37)')
            : eq('M_{N,z,Rd}', 'M_{pl,z,Rd}·[1 − ((n − a)/(1 − a))²]', `${kNm(p.MplzV)}·[1 − ((${fm(p.n, 4)} − ${fm(p.a, 4)})/(1 − ${fm(p.a, 4)}))²]`, kNm(p.MNz), 'kNm', '6.2.9.1(5) (6.38)');
        } else if (sec.kind === 'RHS') {
          h += eq('a_w', '(A − 2bt)/A ≤ 0,5', '', fm(p.aw, 4)) + eq('a_f', '(A − 2ht)/A ≤ 0,5', '', fm(p.af, 4));
          h += eq('M_{N,y,Rd}', 'M_{pl,y,Rd}(1 − n)/(1 − 0,5a_w) ≤ M_{pl,y,Rd}', '', kNm(p.MNy), 'kNm', '6.2.9.1(5) (6.39)') + eq('M_{N,z,Rd}', 'M_{pl,z,Rd}(1 − n)/(1 − 0,5a_f) ≤ M_{pl,z,Rd}', '', kNm(p.MNz), 'kNm', '6.2.9.1(5) (6.40)');
        } else h += eq('M_{N,Rd}', 'M_{pl,Rd}·(1 − n^{1,7})', `${kNm(p.MplyV)}·(1 − ${fm(p.n, 4)}^{1,7})`, kNm(p.MNy), 'kNm', '6.2.9.1(6)');
        if (p.biax && sec.kind !== 'CHS') {
          h += line(`α = ${fm(p.al, 3)}; β = ${fm(p.be, 3)}${sec.kind === 'I' ? ' (β = 5n ≥ 1)' : ' (1,66/(1 − 1,13n²) ≤ 6)'}`, '6.2.9.1(6)');
          h += eq('η', '[M_{y,Ed}/M_{N,y,Rd}]^α + [M_{z,Ed}/M_{N,z,Rd}]^β', `[${kNm(Math.abs(e.My))}/${kNm(p.MNy)}]^${fm(p.al, 2)} + [${kNm(Math.abs(e.Mz))}/${kNm(p.MNz)}]^${fm(p.be, 2)}`, fm(p.uMN, 3), '', '6.2.9.1(6) (6.41)');
        } else if (sec.kind === 'CHS') h += eq('η', '√(M_{y,Ed}² + M_{z,Ed}²)/M_{N,Rd}', `√(${kNm(e.My)}² + ${kNm(e.Mz)}²)/${kNm(p.MNy)}`, fm(p.uMN, 3), '', '6.2.9.1(6)');
        else if (Math.abs(e.Mz) > Math.abs(e.My) * 1e-3 && Math.abs(e.My) < 1) h += eq('η', 'M_{z,Ed}/M_{N,z,Rd}', `${kNm(Math.abs(e.Mz))}/${kNm(p.MNz)}`, fm(p.uMN, 3), '', '6.2.9.1 (6.31)');
        else h += eq('η', 'M_{y,Ed}/M_{N,y,Rd}', `${kNm(Math.abs(e.My))}/${kNm(p.MNy)}`, fm(p.uMN, 3), '', '6.2.9.1 (6.31)');
      } else {
        h += line(p.cls === 4 ? `Przekrój klasy 4: A<sub>eff</sub> = ${cm2(p.Aeff)} cm², W<sub>eff,y</sub> = ${cm3(p.Wy)} cm³, W<sub>eff,z</sub> = ${cm3(p.Wz)} cm³, e<sub>N,y</sub> = ${fm(p.eNy, 1)} mm (${esc(cx.effNote || '')})` : `Przekrój klasy 3: W<sub>el,y</sub> = ${cm3(p.Wy)} cm³, W<sub>el,z</sub> = ${cm3(p.Wz)} cm³`, p.cls === 4 ? '6.2.2.5, PN-EN 1993-1-5 4.4' : '6.2.1');
        h += eq('σ_{x,Ed}', p.cls === 4 ? 'N_{Ed}/A_{eff} + (M_{y,Ed} + N_{Ed}e_{N,y})/W_{eff,y} + M_{z,Ed}/W_{eff,z}' : 'N_{Ed}/A + M_{y,Ed}/W_{el,y} + M_{z,Ed}/W_{el,z}', `${fm(p.sN, 1)} + ${fm(p.sMy, 1)} + ${fm(p.sMz, 1)}`, fm(p.sx, 1), 'MPa', p.cls === 4 ? '6.2.9.3 (6.44)' : '6.2.9.2 (6.42)');
        h += eq('η', 'σ_{x,Ed}/(f_y/γ_{M0})', `${fm(p.sx, 1)}/${fm(fy / g0, 1)}`, fm(p.uMN, 3));
      }
      h += `<div class="eq">→ η = <b>${fm(c.util * 100, 1)}%</b>${okS(c.util)}</div>`;
      break;
    }
    case c.id === 'Vz' || c.id === 'Vy': {
      const z = c.id === 'Vz', e = d.e;
      h += head(`Ścinanie V<sub>${z ? 'z' : 'y'}</sub>`);
      h += line(`x = ${fm(d.x / 1000, 2)} m; ${cmb(d.combo)}`);
      h += eq(`A_{v,${z ? 'z' : 'y'}}`, '', '', cm2(z ? b.Avz : b.Avy), 'cm²', '6.2.6(3)');
      h += eq(`V_{pl,${z ? 'z' : 'y'},Rd}`, 'A_v·(f_y/√3)/γ_{M0}', `${cm2(z ? b.Avz : b.Avy)}·10²·(${fm(fy, 0)}/√3)/${fm(g0, 2)}`, kN(z ? b.Vplz : b.Vply), 'kN', '6.2.6 (6.18)');
      h += verd(kN(Math.abs(z ? e.Vz : e.Vy)), kN(z ? b.Vplz : b.Vply), c.util, 'kN');
      break;
    }
    case c.id === 'Vb': {
      const sb = d.sb;
      h += head('Wyboczenie środnika przy ścinaniu');
      h += line(`h<sub>w</sub>/t<sub>w</sub> = ${fm(sb.ht, 1)} > 72ε/η = ${fm(sb.limit, 1)} → wymagane sprawdzenie`, 'PN-EN 1993-1-5, 5.1(2)');
      h += eq('λ̄_w', 'h_w/(86,4·t·ε)', '', fm(sb.lw, 3), '', 'PN-EN 1993-1-5, 5.3') + eq('χ_w', '', '', fm(sb.chi, 3), '', 'tabl. 5.1') + eq('V_{b,Rd}', 'χ_w·f_{yw}·h_w·t/(√3·γ_{M1})', '', kN(sb.Vb), 'kN', '5.2');
      h += verd(kN(c.Ed), kN(c.Rd), c.util, 'kN');
      break;
    }
    case c.id === 'BUs': {
      h += head('Słup złożony z dwóch ceowników – warunek pręta jednolitego');
      h += line(`${esc(sec.nazwa)}; gałęzie połączone przekładkami co a = ${fm(sec.pa, 0)} mm; i<sub>min</sub> gałęzi = ${fm(sec.i_ch, 1)} mm`, '6.4.4');
      h += eq('a_{max}', '15·i_{min}', `15·${fm(sec.i_ch, 1)}`, fm(sec.lim15, 0), 'mm', 'tabl. 6.9');
      h += sec.buPack ? line(`a = ${fm(sec.pa, 0)} mm > ${fm(sec.lim15, 0)} mm – warunek tabl. 6.9 niespełniony: słup sprawdzany jak pręt z przewiązkami (przekładki jako przewiązki, S<sub>v</sub> = 2π²EI<sub>ch</sub>/a²), 6.4.4(2)`, '6.4.4(2)')
        : line(`a = ${fm(sec.pa, 0)} mm ≤ ${fm(sec.lim15, 0)} mm – słup sprawdzany jako pręt jednolity (bez wpływu podatności na ścinanie): wyboczenie względem osi z–z z I<sub>z</sub> = ${cm4(sec.Iz)} cm⁴, krzywa c`, '6.4.4(1)') + verd(fm(sec.pa, 0), fm(sec.lim15, 0), c.util, 'mm');
      break;
    }
    case c.id === 'BU1' || c.id === 'BU2' || c.id === 'BUb' || c.id === 'BUw' || c.id === 'BUp': {
      const q = d.bu, E = 210000;
      h += head(c.id === 'BU1' ? 'Słup złożony – gałąź między przewiązkami (wyboczenie względem osi niematerialnej z–z wg 6.4)' : c.id === 'BU2' ? 'Słup złożony – gałąź: wyboczenie względem osi materiałowej y–y' : c.id === 'BUb' ? 'Słup złożony – przewiązki' : c.id === 'BUw' ? 'Słup złożony – spoiny przewiązek' : 'Słup złożony – warunki konstrukcyjne');
      h += line(`${esc(sec.nazwa)}; kombinacja ${cmb(d.combo)}${d.vr ? ' · ' + esc(d.vr) : ''}`);
      h += line(`Gałąź ${esc(sec.ch.nazwa)}: A<sub>ch</sub> = ${cm2(q.Ach)} cm², I<sub>ch</sub> = ${cm4(q.Ich)} cm⁴ (oś własna gałęzi równoległa do z), h<sub>0</sub> = ${fm(q.h0, 1)} mm, a = ${fm(q.a, 0)} mm, n = ${q.n} płaszczyzny przewiązek`, '6.4.1, 6.4.3');
      if (c.id === 'BU1' || c.id === 'BU2') {
        h += line(`Długość wyboczeniowa względem osi niematerialnej L = L<sub>cr,z</sub> = ${fm(q.L / 1000, 3)} m (MES – rzeczywiste podparcie i stężenia); N<sub>Ed</sub> = ${kN(q.NEd)} kN; M<sub>Ed</sub><sup>I</sup> = ${kNm(q.MI)} kNm (moment I rzędu względem osi z–z${R.method === 'II_glob' ? ', z efektem φ' : ''})`, '6.4.1(6)');
        h += eq('I_1', '0,5·h_0²·A_{ch} + 2·I_{ch}', `0,5·${fm(q.h0, 1)}²·${fm(q.Ach, 0)} + 2·${cm4(q.Ich)}·10⁴`, cm4(q.I1), 'cm⁴', 'tabl. 6.8');
        h += eq('i_0', '√(I_1/(2A_{ch}))', '', fm(q.i0, 1), 'mm') + eq('λ', 'L/i_0', `${fm(q.L, 0)}/${fm(q.i0, 1)}`, fm(q.lam, 1), '') + eq('μ', q.lam <= 75 ? '1,0 (λ ≤ 75)' : q.lam >= 150 ? '0 (λ ≥ 150)' : '2 − λ/75', '', fm(q.mu, 3), '', 'tabl. 6.8');
        h += eq('I_{eff}', '0,5·h_0²·A_{ch} + 2μ·I_{ch}', '', cm4(q.Ieff), 'cm⁴', '(6.74)');
        if (q.pack) h += eq('S_v', '2π²·E·I_{ch}/a²', `2π²·${E}·${cm4(q.Ich)}·10⁴/${fm(q.a, 0)}²`, kN(q.Sv), 'kN', '(6.73) – przekładki');
        else h += eq('I_b', 't_b·b_b³/12', `${fm(sec.pt, 0)}·${fm(sec.pb, 0)}³/12`, cm4(q.Ib), 'cm⁴') + eq('S_v', '24·E·I_{ch}/[a²·(1 + 2I_{ch}h_0/(n·I_b·a))] ≤ 2π²EI_{ch}/a²', `min(${kN(q.Sv1)}; ${kN(q.Sv2)})`, kN(q.Sv), 'kN', '(6.73)');
        h += eq('N_{cr}', 'π²·E·I_{eff}/L²', '', kN(q.Ncr), 'kN', '(6.72)') + eq('e_0', 'L/500', '', fm(q.e0, 1), 'mm', '6.4.1(1)');
        h += eq('M_{Ed}', '(N_{Ed}·e_0 + M_{Ed}^I)/(1 − N_{Ed}/N_{cr} − N_{Ed}/S_v)', `(${kN(q.NEd)}·${fm(q.e0 / 1000, 4)} + ${kNm(q.MI)})/(1 − ${kN(q.NEd)}/${kN(q.Ncr)} − ${kN(q.NEd)}/${kN(q.Sv)})`, isFinite(q.MEd) ? kNm(q.MEd) : '∞', 'kNm', '(6.69)');
        h += eq('N_{ch,Ed}', '0,5·N_{Ed} + M_{Ed}·h_0·A_{ch}/(2·I_{eff})', '', kN(q.Nch), 'kN', '(6.69)');
        h += eq('V_{Ed}', 'max(π·M_{Ed}/L; V_{y,Ed}^I)', `max(${kN(q.VEd6)}; ${kN(q.VEd - 0 > q.VEd6 ? q.VEd : 0)})`, kN(q.VEd), 'kN', '(6.70)');
      }
      if (c.id === 'BU1') {
        const lam1 = Math.PI * Math.sqrt(E / fy);
        h += line(`Wyboczenie gałęzi między przewiązkami: L<sub>ch</sub> = a = ${fm(q.a, 0)} mm, względem osi własnej gałęzi (i<sub>min</sub> = ${fm(sec.i_ch, 1)} mm), krzywa c`, 'rys. 6.9, tabl. 6.2');
        h += eq('λ̄_{ch}', 'a/(i_{min}·λ_1)', `${fm(q.a, 0)}/(${fm(sec.i_ch, 1)}·${fm(lam1, 1)})`, fm(q.lamCh, 4), '') + eq('χ_{ch}', '', '', fm(q.chiCh, 4), '', '6.3.1.2');
        h += eq('N_{b,Rd,ch}', 'χ_{ch}·A_{ch}·f_y/γ_{M1}', '', kN(q.NbCh), 'kN', '6.3.1.1');
        h += eq('M_{ch,Ed}', 'V_{Ed}·a/4', `${kN(q.VEd)}·${fm(q.a / 1000, 3)}/4`, kNm(q.Mch), 'kNm', 'rys. 6.11') + eq('M_{ch,Rd}', 'W_{el,min,ch}·f_y/γ_{M0}', `${cm3(sec.Wel_z_ch)}·10³·${fm(fy, 0)}/${fm(g0, 2)}`, kNm(q.MchRd), 'kNm');
        h += eq('η', 'N_{ch,Ed}/N_{b,Rd,ch} + M_{ch,Ed}/M_{ch,Rd}', `${kN(q.Nch)}/${kN(q.NbCh)} + ${kNm(q.Mch)}/${kNm(q.MchRd)}`, fm(c.util, 3), '≤ 1', '6.4.3.1(2)', c.util <= 1 ? ['ok', '✔'] : ['fail', '✖']);
      }
      if (c.id === 'BU2') {
        h += line(`Wyboczenie gałęzi względem osi materiałowej y–y na długości L<sub>cr,y</sub> = ${fm(q.Lcry / 1000, 3)} m (krzywa c); gałąź przenosi połowę momentu M<sub>y,Ed</sub> = ${kNm(2 * q.MyCh)} kNm; k<sub>yy</sub> = ${fm(q.kyy, 3)} (z interakcji pręta)`, '6.4.1, 6.3.3');
        h += eq('χ_{y,ch}', '', `λ̄ = ${fm(q.lamY, 4)}`, fm(q.chiY, 4), '') + eq('N_{b,y,Rd,ch}', 'χ_{y,ch}·A_{ch}·f_y/γ_{M1}', '', kN(q.NbY), 'kN');
        h += eq('M_{y,Rd,ch}', 'W_{el,y,ch}·f_y/γ_{M1}', `${cm3(sec.Wel_y_ch)}·10³·${fm(fy, 0)}/${fm(g1, 2)}`, kNm(q.MyRdCh), 'kNm');
        h += eq('η', 'N_{ch,Ed}/N_{b,y,Rd,ch} + k_{yy}·(M_{y,Ed}/2)/M_{y,Rd,ch}', `${kN(q.Nch)}/${kN(q.NbY)} + ${fm(q.kyy, 3)}·${kNm(q.MyCh)}/${kNm(q.MyRdCh)}`, fm(c.util, 3), '≤ 1', '6.3.3', c.util <= 1 ? ['ok', '✔'] : ['fail', '✖']);
      }
      if (c.id === 'BUb') {
        h += line(`V<sub>Ed</sub> = ${kN(q.VEd)} kN (wg 6.70, kombinacja jak wyżej); przewiązka ${fm(sec.pb, 0)} × ${fm(sec.pt, 0)} mm w każdej z n = 2 płaszczyzn`, 'rys. 6.11');
        h += eq('T_b', 'V_{Ed}·a/(n·h_0)', `${kN(q.VEd)}·${fm(q.a, 0)}/(2·${fm(q.h0, 1)})`, kN(q.Tb), 'kN') + eq('M_b', 'V_{Ed}·a/(2n)', '', kNm(q.Mb), 'kNm');
        h += eq('σ', 'M_b/(t_b·b_b²/6)', '', fm(q.sb, 1), 'MPa') + eq('τ', '1,5·T_b/(t_b·b_b)', '', fm(q.tb, 1), 'MPa') + eq('σ_{red}', '√(σ² + 3τ²)', '', fm(q.sred, 1), 'MPa', '6.2.1(5)');
        h += verd(fm(q.sred, 1), fm(q.fyd, 1), c.util, 'MPa');
      }
      if (c.id === 'BUw') {
        const w = q.weld;
        h += line(`Spoiny pachwinowe a = ${fm(w.aw, 0)} mm: dwie wzdłuż zakładu c = ${fm(w.c, 0)} mm i jedna na krawędzi przewiązki (b<sub>b</sub> = ${fm(sec.pb, 0)} mm); metoda sprężysta (biegunowy moment bezwładności grupy spoin)`, 'PN-EN 1993-1-8, 4.5.3.3');
        h += eq('A_w', 'a·(2c + b_b)', '', fm(w.Aw, 0), 'mm²') + eq('I_0', 'I_u + I_v', '', fm(w.Ip / 1e4, 1), 'cm⁴') + eq('τ_{max}', '√[(M_b·v/I_0)² + (T_b/A_w + M_b·u/I_0)²]', `T_b = ${kN(q.Tb)} kN, M_b = ${kNm(q.Mb)} kNm`, fm(w.tw, 1), 'MPa');
        h += eq('f_{vw,d}', 'f_u/(√3·β_w·γ_{M2})', `${fm(w.fu, 0)}/(√3·${fm(w.bw, 2)}·${fm(ndp.gM2, 2)})`, fm(w.fvw, 1), 'MPa', '(4.4)');
        h += verd(fm(w.tw, 1), fm(w.fvw, 1), c.util, 'MPa');
      }
      if (c.id === 'BUp') {
        h += eq('H/a', '', `${fm(R.md.H, 0)}/${fm(q.a, 0)}`, fm(q.panels, 2), '≥ 3', '6.4.1(1)', q.panels >= 3 ? ['ok', '✔'] : ['warn', 'za mało przedziałów']);
        h += eq('n·I_b/h_0', '', '', fm(q.nIb, 0), 'mm³') + eq('10·I_{ch}/a', '', '', fm(q.ich10, 0), 'mm³', '6.4.3.1', q.stiffOk ? ['ok', '✔ przewiązki sztywne'] : ['warn', 'przewiązki podatne – S_v zmniejszone']);
      }
      break;
    }
    case c.id === 'By' || c.id === 'Bz': {
      const pl = c.id === 'By' ? 'y' : 'z', fo = d.f, I = pl === 'y' ? sec.Iy : sec.Iz;
      h += head(`Wyboczenie giętne względem osi ${pl}–${pl}`);
      h += line(`Kombinacja ${cmb(d.combo)}; N<sub>Ed</sub> = ${kN(d.NEd)} kN (największa siła ściskająca)`);
      if (fo.manual) h += eq(`L_{cr,${pl}}`, '', '', fm(fo.Lcr / 1000, 3), 'm', 'przyjęto ręcznie') + eq(`N_{cr,${pl}}`, `π²EI_${pl}/L_{cr,${pl}}²`, `π²·210000·${cm4(I)}·10⁴/${fm(fo.Lcr, 0)}²`, kN(fo.Ncr), 'kN');
      else {
        h += line(`N<sub>cr,${pl}</sub> z analizy MES (${esc(fo.src)}): N<sub>cr,${pl}</sub> = α<sub>cr,${pl}</sub>·N<sub>Ed,max</sub> = <b>${kN(fo.Ncr)} kN</b> (α<sub>cr,${pl}</sub> = ${fm(fo.alphaCr, 3)})`, '5.2.1, 6.3.1.2');
        h += eq(`L_{cr,${pl}}`, `π·√(EI_${pl}/N_{cr,${pl}})`, `π·√(210000·${cm4(I)}·10⁴/${kN(fo.Ncr)}·10³)`, fm(fo.Lcr / 1000, 3), 'm') + line(`μ<sub>${pl}</sub> = L<sub>cr,${pl}</sub>/H = ${fm(fo.mu, 3)}; smukłość λ<sub>${pl}</sub> = L<sub>cr</sub>/i<sub>${pl}</sub> = ${fm(fo.lamE, 1)}`);
      }
      h += eq(`λ̄_${pl}`, `√(A${b.effN ? '_{eff}' : ''}·f_y/N_{cr,${pl}})`, `√(${cm2(b.Aeff)}·10²·${fm(fy, 0)}/(${kN(fo.Ncr)}·10³))`, fm(fo.lam, 4), '', '6.3.1.2 (6.49)');
      h += line(`Krzywa wyboczeniowa <b>${fo.curve}</b> (${esc(fo.curveWhy || '')}${fo.curve !== fo.curveAuto ? '; przyjęto ręcznie' : ''}): α = ${fm(T.ALPHA[fo.curve], 2)}`, 'tabl. 6.1, 6.2');
      h += eq('Φ', '0,5·[1 + α(λ̄ − 0,2) + λ̄²]', `0,5·[1 + ${fm(T.ALPHA[fo.curve], 2)}·(${fm(fo.lam, 4)} − 0,2) + ${fm(fo.lam, 4)}²]`, fm(fo.phi, 4), '', '6.3.1.2');
      h += eq(`χ_${pl}`, '1/(Φ + √(Φ² − λ̄²)) ≤ 1', '', fm(fo.chi, 4), '', '6.3.1.2 (6.49)');
      h += eq(`N_{b,${pl},Rd}`, `χ_${pl}·A${b.effN ? '_{eff}' : ''}·f_y/γ_{M1}`, `${fm(fo.chi, 4)}·${cm2(b.Aeff)}·10²·${fm(fy, 0)}/${fm(g1, 2)}`, kN(fo.NbRd), 'kN', '6.3.1.1 (6.47)');
      h += verd(kN(d.NEd), kN(fo.NbRd), c.util, 'kN');
      break;
    }
    case c.id === 'BT': {
      const t = d.f;
      h += head(esc(c.n));
      h += line(`i<sub>0</sub>² = (I<sub>y</sub> + I<sub>z</sub>)/A + z<sub>0</sub>² = ${fm(t.i02 / 100, 2)} cm²`);
      if (t.manual) h += eq('N_{cr,T}', '(GI_t + π²EI_w/L_{cr,T}²)/i_0²', `(81000·${cm4(sec.It)}·10⁴ + π²·210000·${fm(sec.Iw / 1e9, 2)}·10⁹/${fm(t.LcrT, 0)}²)/${fm(t.i02, 0)}`, kN(t.NcrT), 'kN', 'L_cr,T ręcznie');
      else h += line(`N<sub>cr,T</sub> (postać skrętna, MES – teoria Własowa): <b>${kN(t.NcrT)} kN</b>${isFinite(t.LcrT) ? `, L<sub>cr,T</sub> ≈ ${fm(t.LcrT / 1000, 2)} m` : ''}; N<sub>cr,TF</sub> (postać sprzężona u–φ ze stężeniami na wysokości pasa): <b>${kN(t.NcrTF)} kN</b>`, '6.3.1.4');
      h += line(t.tfGov ? `N<sub>cr,TF</sub> &lt; N<sub>cr,z</sub> → miarodajna postać giętno-skrętna (względem osi wymuszonej / monosymetria): N<sub>cr</sub> = min(N<sub>cr,T</sub>; N<sub>cr,TF</sub>) = <b>${kN(t.Ncr)} kN</b>` : `N<sub>cr</sub> = N<sub>cr,T</sub> = <b>${kN(t.Ncr)} kN</b>`);
      h += eq('λ̄_T', '√(A·f_y/N_{cr})', '', fm(t.lam, 4), '', '6.3.1.4 (6.52)') + line(`krzywa jak dla osi z–z: <b>${t.curve}</b>`, '6.3.1.4(1)') + eq('χ_T', '', '', fm(t.chi, 4)) + eq('N_{b,T,Rd}', 'χ_T·A·f_y/γ_{M1}', '', kN(t.NbRd), 'kN');
      h += verd(kN(d.NEd), kN(t.NbRd), c.util, 'kN');
      break;
    }
    case /^LT\d+$/.test(c.id): {
      const s = d.s, l = s.ltb;
      h += head(`Zwichrzenie – odcinek ${fm(s.sg.x0 / 1000, 2)}–${fm(s.sg.x1 / 1000, 2)} m`);
      h += line(`${cmb(d.combo)}; M<sub>y,Ed</sub> = ${kNm(s.MyEd)} kNm${s.dMy ? ` + ΔM = N·e<sub>N</sub> = ${kNm(s.dMy)} kNm` : ''}; klasa ${s.cls}: W<sub>y</sub> = ${cm3(s.Wy)} cm³`);
      h += isFinite(s.Mcr) ? line(`M<sub>cr</sub> – ${R.st.analiza.nadp && +R.st.analiza.nadp.Mcr > 0 ? 'przyjęto ręcznie' : 'MES (u, u′, φ, φ′) dla rozkładu M<sub>y</sub>(x) kombinacji, z wysokością przyłożenia obciążeń, stężeniami i warunkami skrętnymi końców'}: <b>M<sub>cr</sub> = ${kNm(s.Mcr)} kNm</b>`, '6.3.2.2(2)') : line('M<sub>cr</sub> = ∞ (brak postaci zwichrzenia)');
      h += eq('λ̄_{LT}', '√(W_y·f_y/M_{cr})', `√(${cm3(s.Wy)}·10³·${fm(fy, 0)}/(${kNm(s.Mcr)}·10⁶))`, fm(s.lamLT, 4), '', '6.3.2.2 (6.56)');
      if (l.skip) h += line(`λ̄<sub>LT</sub> ≤ λ̄<sub>LT,0</sub> = ${fm(l.lam0, 2)} lub M<sub>Ed</sub>/M<sub>cr</sub> ≤ λ̄<sub>LT,0</sub>² → χ<sub>LT</sub> = 1 (zwichrzenie można pominąć)`, '6.3.2.2(4), 6.3.2.3');
      else {
        h += line(`metoda ${l.met}, krzywa zwichrzenia <b>${l.curve}</b>: α<sub>LT</sub> = ${fm(l.alLT, 2)}${l.met === '6.3.2.3' ? `; λ̄<sub>LT,0</sub> = ${fm(l.lam0, 2)}, β = ${fm(l.beta, 2)}` : ''}`, l.met === '6.3.2.3' ? 'tabl. 6.5' : 'tabl. 6.4');
        h += eq('Φ_{LT}', l.met === '6.3.2.3' ? '0,5·[1 + α_{LT}(λ̄_{LT} − λ̄_{LT,0}) + β·λ̄_{LT}²]' : '0,5·[1 + α_{LT}(λ̄_{LT} − 0,2) + λ̄_{LT}²]', '', fm(l.phi, 4));
        h += eq('χ_{LT}', l.met === '6.3.2.3' ? '1/(Φ_{LT} + √(Φ_{LT}² − β·λ̄_{LT}²)) ≤ min(1; 1/λ̄_{LT}²)' : '1/(Φ_{LT} + √(Φ_{LT}² − λ̄_{LT}²)) ≤ 1', '', fm(l.chi, 4), '', l.met === '6.3.2.3' ? '(6.57)' : '(6.56)');
        if (l.met === '6.3.2.3') { h += line(`k<sub>c</sub> = ${fm(s.kc, 3)} – ${esc(l.kcSrc || '')}`, 'tabl. 6.6'); h += eq('f', '1 − 0,5(1 − k_c)[1 − 2(λ̄_{LT} − 0,8)²] ≤ 1', '', fm(l.f, 4), '', '(6.58)') + eq('χ_{LT,mod}', 'χ_{LT}/f ≤ 1', '', fm(l.chimod, 4)); }
      }
      h += eq('M_{b,Rd}', 'χ_{LT}·W_y·f_y/γ_{M1}', `${fm(s.chiLT, 4)}·${cm3(s.Wy)}·10³·${fm(fy, 0)}/${fm(g1, 2)}`, kNm(s.MbRd), 'kNm', '6.3.2.1 (6.55)');
      h += verd(kNm(s.MyEd + s.dMy), kNm(s.MbRd), c.util, 'kNm');
      break;
    }
    case /^I6[12]_\d+$/.test(c.id): {
      const s = d.s, is61 = /^I61/.test(c.id), mem = d.mem;
      h += head(`Interakcja – wzór (${is61 ? '6.61' : '6.62'}), odcinek ${fm(s.sg.x0 / 1000, 2)}–${fm(s.sg.x1 / 1000, 2)} m (zał. ${s.meth})`);
      h += line(`${cmb(d.combo)}${d.vr && R.method !== 'I' ? ' · ' + esc(d.vr) : ''}`);
      h += eq('N_{Ed}', '', '', kN(s.NEd), 'kN') + eq('M_{y,Ed}', '', '', kNm(s.MyEd), 'kNm', `x = ${fm(s.xMy / 1000, 2)} m`) + eq('M_{z,Ed}', '', '', kNm(s.MzEd), 'kNm', `x = ${fm(s.xMz / 1000, 2)} m`);
      h += line(`Klasa przekroju ${s.cls}: N<sub>Rk</sub> = ${kN(s.NRk)} kN, M<sub>y,Rk</sub> = ${kNm(s.MyRk)} kNm, M<sub>z,Rk</sub> = ${kNm(s.MzRk)} kNm${s.dMy ? `, ΔM<sub>y,Ed</sub> = ${kNm(s.dMy)} kNm` : ''}`, 'tabl. 6.7');
      h += line(`χ<sub>y</sub> = ${fm(s.chiy, 4)} (λ̄<sub>y</sub> = ${fm(s.lamy, 3)}), χ<sub>z</sub> = ${fm(s.chiz, 4)} (λ̄<sub>z</sub> = ${fm(s.lamz, 3)}${s.chiz < s.chiz0 - 1e-9 ? '; przyjęto χ<sub>T</sub> < χ<sub>z</sub>' : ''}), χ<sub>LT</sub> = ${fm(s.chiLT, 4)}${R.method === 'II_pelna' ? ' (wyboczenie giętne ujęte imperfekcjami – χ<sub>y</sub> = χ<sub>z</sub> = 1)' : ''}`, '6.3.1, 6.3.2');
      if (s.meth === 'B') {
        h += line(`C<sub>my</sub> = <b>${fm(s.Cmy, 3)}</b> (${esc(s.cmy.f)}; wykres M<sub>y</sub> na ${fm(s.sgY.x0 / 1000, 2)}–${fm(s.sgY.x1 / 1000, 2)} m)`, 'tabl. B.3');
        h += line(`C<sub>mz</sub> = <b>${fm(s.Cmz, 3)}</b> (${esc(s.cmz.f)}; wykres M<sub>z</sub> na ${fm(s.sgZ.x0 / 1000, 2)}–${fm(s.sgZ.x1 / 1000, 2)} m)`, 'tabl. B.3');
        h += line(`C<sub>mLT</sub> = <b>${fm(s.CmLT, 3)}</b> (${esc(s.cmlt.f)})`, 'tabl. B.3');
        h += eq('n_y', 'N_{Ed}/(χ_y·N_{Rk}/γ_{M1})', `${kN(s.NEd)}/(${fm(s.chiy, 4)}·${kN(s.NRk)}/${fm(g1, 2)})`, fm(s.ny, 4)) + eq('n_z', 'N_{Ed}/(χ_z·N_{Rk}/γ_{M1})', `${kN(s.NEd)}/(${fm(s.chiz, 4)}·${kN(s.NRk)}/${fm(g1, 2)})`, fm(s.nz, 4));
        const c12 = s.cls <= 2;
        h += eq('k_{yy}', c12 ? 'C_{my}·[1 + (λ̄_y − 0,2)·n_y] ≤ C_{my}·(1 + 0,8n_y)' : 'C_{my}·(1 + 0,6λ̄_y·n_y) ≤ C_{my}·(1 + 0,6n_y)', '', fm(s.kyy, 4), '', `tabl. ${s.tab}`);
        h += eq('k_{zz}', c12 ? (sec.kind === 'I' ? 'C_{mz}·[1 + (2λ̄_z − 0,6)·n_z] ≤ C_{mz}·(1 + 1,4n_z)' : 'C_{mz}·[1 + (λ̄_z − 0,2)·n_z] ≤ C_{mz}·(1 + 0,8n_z)') : 'C_{mz}·(1 + 0,6λ̄_z·n_z) ≤ C_{mz}·(1 + 0,6n_z)', '', fm(s.kzz, 4), '', `tabl. ${s.tab}`);
        h += eq('k_{yz}', c12 ? '0,6·k_{zz}' : 'k_{zz}', '', fm(s.kyz, 4), '', `tabl. ${s.tab}`);
        h += eq('k_{zy}', s.tab === 'B.1' ? (c12 ? '0,6·k_{yy}' : '0,8·k_{yy}') : (c12 ? (s.lamz < 0.4 ? '0,6 + λ̄_z ≤ 1 − 0,1λ̄_z·n_z/(C_{mLT} − 0,25)' : '[1 − 0,1λ̄_z·n_z/(C_{mLT} − 0,25)] ≥ [1 − 0,1n_z/(C_{mLT} − 0,25)]') : '[1 − 0,05λ̄_z·n_z/(C_{mLT} − 0,25)] ≥ [1 − 0,05n_z/(C_{mLT} − 0,25)]'), '', fm(s.kzy, 4), '', `tabl. ${s.tab}`);
      } else {
        h += line(`Zał. A: N<sub>cr,y</sub> = ${kN(mem.flex.y.Ncr)} kN, N<sub>cr,z</sub> = ${kN(mem.flex.z.Ncr)} kN${mem.tors.relevant ? `, N<sub>cr,T</sub> = ${kN(mem.tors.NcrT)} kN, N<sub>cr,TF</sub> = ${kN(mem.tors.NcrTF)} kN` : ''}`, 'tabl. A.1');
        h += eq('μ_y', '(1 − N_{Ed}/N_{cr,y})/(1 − χ_y·N_{Ed}/N_{cr,y})', '', fm(s.muy, 4)) + eq('μ_z', '(1 − N_{Ed}/N_{cr,z})/(1 − χ_z·N_{Ed}/N_{cr,z})', '', fm(s.muz, 4));
        h += eq('w_y', 'W_{pl,y}/W_{el,y} ≤ 1,5', '', fm(s.wy, 3)) + eq('w_z', 'W_{pl,z}/W_{el,z} ≤ 1,5', '', fm(s.wz, 3)) + eq('n_{pl}', 'N_{Ed}/(N_{Rk}/γ_{M1})', '', fm(s.npl, 4)) + eq('a_{LT}', '1 − I_t/I_y ≥ 0', '', fm(s.aLT, 4));
        h += eq('λ̄_0', '√(W_y·f_y/M_{cr,0}) (moment stały)', '', fm(s.lam0, 4)) + line(`C<sub>1</sub> = M<sub>cr</sub>/M<sub>cr,0</sub> = ${fm(s.C1a, 3)}; ${esc(s.Afall || '')}`, 'tabl. A.2');
        h += line(`C<sub>my,0</sub> = ${fm(s.cmy0.v, 4)} (${esc(s.cmy0.f)}); C<sub>mz,0</sub> = ${fm(s.cmz0.v, 4)} (${esc(s.cmz0.f)})`, 'tabl. A.2');
        h += line(`C<sub>my</sub> = <b>${fm(s.Cmy, 4)}</b>, C<sub>mz</sub> = <b>${fm(s.Cmz, 4)}</b>, C<sub>mLT</sub> = <b>${fm(s.CmLT, 4)}</b>${s.cmNote ? ' – ' + esc(s.cmNote) : ''}`, 'tabl. A.2');
        if (s.cls <= 2) h += line(`C<sub>yy</sub> = ${fm(s.Cyy, 4)}, C<sub>yz</sub> = ${fm(s.Cyz, 4)}, C<sub>zy</sub> = ${fm(s.Czy, 4)}, C<sub>zz</sub> = ${fm(s.Czz, 4)} (b<sub>LT</sub> = ${fm(s.bLT, 4)}, c<sub>LT</sub> = ${fm(s.cLT, 4)}, d<sub>LT</sub> = ${fm(s.dLT, 4)}, e<sub>LT</sub> = ${fm(s.eLT, 4)}, λ̄<sub>max</sub> = ${fm(s.lmax, 3)})`, 'tabl. A.1');
        h += eq('k_{yy}', s.cls <= 2 ? 'C_{my}C_{mLT}·μ_y/(1 − N_{Ed}/N_{cr,y})·1/C_{yy}' : 'C_{my}C_{mLT}·μ_y/(1 − N_{Ed}/N_{cr,y})', '', fm(s.kyy, 4), '', 'tabl. A.1');
        h += eq('k_{yz}', s.cls <= 2 ? 'C_{mz}·μ_y/(1 − N_{Ed}/N_{cr,z})·1/C_{yz}·0,6√(w_z/w_y)' : 'C_{mz}·μ_y/(1 − N_{Ed}/N_{cr,z})', '', fm(s.kyz, 4));
        h += eq('k_{zy}', s.cls <= 2 ? 'C_{my}C_{mLT}·μ_z/(1 − N_{Ed}/N_{cr,y})·1/C_{zy}·0,6√(w_y/w_z)' : 'C_{my}C_{mLT}·μ_z/(1 − N_{Ed}/N_{cr,y})', '', fm(s.kzy, 4));
        h += eq('k_{zz}', s.cls <= 2 ? 'C_{mz}·μ_z/(1 − N_{Ed}/N_{cr,z})·1/C_{zz}' : 'C_{mz}·μ_z/(1 − N_{Ed}/N_{cr,z})', '', fm(s.kzz, 4));
      }
      if (is61) h += eq('η_{6.61}', 'N_{Ed}/(χ_y·N_{Rk}/γ_{M1}) + k_{yy}·(M_{y,Ed} + ΔM_{y,Ed})/(χ_{LT}·M_{y,Rk}/γ_{M1}) + k_{yz}·M_{z,Ed}/(M_{z,Rk}/γ_{M1})', `${fm(s.tN_y, 4)} + ${fm(s.kyy, 4)}·${fm(s.tMy, 4)} + ${fm(s.kyz, 4)}·${fm(s.tMz, 4)}`, fm(s.u61, 4), '', '6.3.3 (6.61)');
      else h += eq('η_{6.62}', 'N_{Ed}/(χ_z·N_{Rk}/γ_{M1}) + k_{zy}·(M_{y,Ed} + ΔM_{y,Ed})/(χ_{LT}·M_{y,Rk}/γ_{M1}) + k_{zz}·M_{z,Ed}/(M_{z,Rk}/γ_{M1})', `${fm(s.tN_z, 4)} + ${fm(s.kzy, 4)}·${fm(s.tMy, 4)} + ${fm(s.kzz, 4)}·${fm(s.tMz, 4)}`, fm(s.u62, 4), '', '6.3.3 (6.62)');
      h += `<div class="eq">→ η = <b>${fm(c.util * 100, 1)}%</b>${okS(c.util)}</div>`;
      break;
    }
    case c.id === 'GM': {
      const g = d;
      h += head('Metoda ogólna (6.3.4)');
      h += line(`Kombinacja ${cmb(g.combo)}; siły w płaszczyźnie z analizy II rzędu z imperfekcjami w płaszczyźnie x–z.`);
      h += eq('α_{ult,k}', 'min mnożnik obciążeń do osiągnięcia nośności charakterystycznej przekroju (γ_{M0} = 1)', '', fm(g.aUlt, 3), '', `6.3.4(4), x = ${fm((g.at || 0) / 1000, 2)} m`);
      h += eq('α_{cr,op}', 'MES – postać z płaszczyzny (u, φ) przy N(x) i M_y(x)', '', fm(g.aCr, 3), '', '6.3.4(4)');
      h += eq('λ̄_{op}', '√(α_{ult,k}/α_{cr,op})', '', fm(g.lop, 4), '', '(6.64)');
      h += line(`χ<sub>z</sub>(λ̄<sub>op</sub>) = ${fm(g.chiZ, 4)} (krzywa ${g.curveZ}), χ<sub>LT</sub>(λ̄<sub>op</sub>) = ${fm(g.chiLT, 4)} (krzywa ${g.curveLT}, 6.3.2.2) → χ<sub>op</sub> = min = <b>${fm(g.chiOp, 4)}</b>`, '6.3.4(4)a');
      h += eq('χ_{op}·α_{ult,k}/γ_{M1}', '', `${fm(g.chiOp, 4)}·${fm(g.aUlt, 3)}/${fm(g1, 2)}`, fm(g.chiOp * g.aUlt / g1, 3), '', '(6.63)');
      h += `<div class="eq">→ η = γ<sub>M1</sub>/(χ<sub>op</sub>·α<sub>ult,k</sub>) = <b>${fm(c.util * 100, 1)}%</b>${okS(c.util)}</div>`;
      break;
    }
    case /^w[yz]$/.test(c.id): {
      h += head('Przemieszczenie poziome (SGU)');
      h += line(`kombinacja charakterystyczna ${cmb(d.combo)}; analiza ${d.order === 2 ? 'II rzędu (bez imperfekcji)' : 'I rzędu'}`);
      h += eq('w_{max}', '', '', fm(Math.abs(d.w), 2), 'mm', `x = ${fm((d.x || 0) / 1000, 2)} m`);
      h += eq('w_{lim}', `H/${fm(d.lim, 0)}`, `${fm(R.md.H, 0)}/${fm(d.lim, 0)}`, fm(d.wLim, 2), 'mm', 'PN-EN 1990 A1.4.3; ZK PN-EN 1993-1-1 7.2.2');
      h += verd(fm(Math.abs(d.w), 2), fm(d.wLim, 2), c.util, 'mm');
      break;
    }
    case /^PB/.test(c.id): h += RP.tokBase(c, R, S); break;
    case c.id === 'FI': h += RP.tokFire(c, R, S); break;
    case c.id === 'KR' || c.id === 'KRP': {
      const br = R.brittle || {};
      h += head(c.id === 'KR' ? 'Dobór stali ze względu na kruche pękanie – słup' : 'Dobór stali ze względu na kruche pękanie – blacha podstawy');
      if (c.id === 'KR') {
        h += line(`T<sub>Ed</sub> = T<sub>md</sub> + ΔT<sub>r</sub> + ΔT<sub>R</sub> = <b>${fm(br.TEd, 0)} °C</b>`, 'PN-EN 1993-1-10, 2.2(5)');
        h += line(`σ<sub>Ed</sub>/f<sub>y</sub>(t) = ${fm(br.rmax, 3)}${br.rmax < 0.25 ? ' < 0,25 → przyjęto 0,25' : ''} (kombinacja ${cmb(br.combo)})`, '2.2(4)');
        h += line(`tabl. 2.1 dla ${esc(R.mat.gatunek + R.mat.podgatunek)} (${esc(br.tm.key)}): t<sub>max</sub> = <b>${fm(br.tm.t, 0)} mm</b> (σ = 0,75/0,50/0,25 f<sub>y</sub>: ${fm(br.tm.v75, 0)} / ${fm(br.tm.v50, 0)} / ${fm(br.tm.v25, 0)} mm)`, 'tabl. 2.1');
        h += verd(fm(br.tCol, 1), fm(br.tm.t, 0), c.util, 'mm');
      } else { h += line(`t<sub>max</sub> (σ<sub>Ed</sub> = 0,75·f<sub>y</sub>, T<sub>Ed</sub> = ${fm(d.TEd, 0)} °C) = <b>${fm(d.tm.t, 0)} mm</b>`, 'tabl. 2.1'); h += verd(fm(c.Ed, 0), fm(d.tm.t, 0), c.util, 'mm'); }
      break;
    }
    default: h += line(sym(c.n));
  }
  return h;
};

/* ---------------------------------------------------------------- podstawa */
RP.tokBase = function (c, R, S) {
  const C = R.pb.C, ndp = R.ndp, d = c.d || {}, r = d.r || {}, fo = d.f || {};
  let h = `<h3>${sym(c.n)}</h3>`;
  if (d.f) h += line(`${cmb(fo.combo)}${fo.vr && R.method !== 'I' ? ' · ' + esc(fo.vr) : ''}: N<sub>Ed</sub> = ${kN(fo.N)} kN (+ ściskanie), M<sub>y,Ed</sub> = ${kNm(fo.My)} kNm, M<sub>z,Ed</sub> = ${kNm(fo.Mz)} kNm, V<sub>y,Ed</sub> = ${kN(fo.Vy)} kN, V<sub>z,Ed</sub> = ${kN(fo.Vz)} kN`);
  const fjd = () => eq('f_{cd}', 'α_{cc}·f_{ck}/γ_c', `${fm(ndp.acc, 2)}·${fm(C.fck, 0)}/${fm(ndp.gc, 2)}`, fm(C.fcd, 2), 'MPa', 'PN-EN 1992-1-1, 3.1.6') +
    (C.kjMan ? eq('k_j', '', '', fm(C.kj, 3), '', 'przyjęto ręcznie') : eq('k_j', '√(A_{c1}/A_{c0}) ≤ 3', `√(${fm(Math.max(C.a1, C.lp), 0)}·${fm(Math.max(C.b1, C.bp), 0)}/(${fm(C.lp, 0)}·${fm(C.bp, 0)}))`, fm(C.kj, 3), '', 'PN-EN 1992-1-1, 6.7')) +
    eq('f_{jd}', 'β_j·k_j·f_{cd}', `${fm(C.betaJ, 3)}·${fm(C.kj, 3)}·${fm(C.fcd, 2)}`, fm(C.fjd, 2), 'MPa', '6.2.5(7) (6.6)') +
    eq('c', 't_p·√(f_y/(3·f_{jd}·γ_{M0}))', `${fm(C.tp, 0)}·√(${fm(C.fyP, 0)}/(3·${fm(C.fjd, 2)}·${fm(ndp.gM0, 2)}))`, fm(C.c, 1), 'mm', '6.2.5(4) (6.5)');
  switch (c.id) {
    case 'PBN':
      h += fjd();
      if (C.kind === 'CHS') h += eq('A_{eff}', 'pierścień o szerokości t + 2c (ograniczony krawędziami blachy)', '', cm2(C.Aeff), 'cm²', '6.2.5(3)');
      else h += line(`Króciec pod pasem: b<sub>eff</sub> = ${fm(C.Tf.beff, 1)} mm, l<sub>eff</sub> = ${fm(C.Tf.leff, 1)} mm (×2); pod środnikiem: ${fm(C.Tw.beff, 1)} × ${fm(C.Tw.leff, 1)} mm`, '6.2.5(3), rys. 6.4') + eq('A_{eff}', '', '', cm2(C.Aeff), 'cm²');
      h += eq('N_{j,Rd}', 'A_{eff}·f_{jd}', `${cm2(C.Aeff)}·10²·${fm(C.fjd, 2)}`, kN(C.NjRd), 'kN', '6.2.5 (6.4), 6.2.8.2');
      h += verd(kN(r.N), kN(C.NjRd), c.util, 'kN');
      break;
    case 'PBNt': {
      const t = C.Tt;
      h += line(`Rozciąganie (wyrywanie): ${t.inner ? 'blacha między pasami – króciec z m = ' + fm(t.m, 1) + ' mm' : 'blacha wysięgu – króciec teowy z m<sub>x</sub> = ' + fm(t.mx, 1) + ' mm'}`, '6.2.6.11');
      h += eq('F_{t,Rd}', 'k_2·f_{ub}·A_s/γ_{M2}', `${fm(C.k2, 2)}·${fm(C.fub, 0)}·${fm(C.As, 0)}/${fm(ndp.gM2, 2)}`, kN(C.FtRd), 'kN', 'tabl. 3.4');
      h += eq('N_{t,Rd}', '', '', kN(r.NtRd), 'kN', `6.2.6.11 – ${esc(t.mode)}`);
      h += verd(kN(-r.N), kN(r.NtRd), c.util, 'kN');
      break;
    }
    case 'PBM': {
      const t = C.Tt, m = r.mjy;
      h += fjd();
      h += `<h3>Strona ściskana – króciec teowy pod pasem słupa</h3>`;
      h += line(`b<sub>eff</sub> = t<sub>f</sub> + c + min(c; …) = ${fm(C.Tf.beff, 1)} mm; l<sub>eff</sub> = b + 2·min(c; (b<sub>p</sub> − b)/2) = ${fm(C.Tf.leff, 1)} mm`, '6.2.5(3)');
      h += eq('F_{c,pl,Rd}', 'f_{jd}·b_{eff}·l_{eff}', `${fm(C.fjd, 2)}·${fm(C.Tf.beff, 1)}·${fm(C.Tf.leff, 1)}`, kN(C.FcplRd), 'kN', '6.2.5 (6.4)');
      h += eq('F_{c,fc,Rd}', 'M_{c,Rd}/(h − t_f)', `${kNm(R.base.Mcy)}/(${fm(C.h, 0)} − ${fm(C.tf, 1)})`, kN(C.FcfcRd), 'kN', '6.2.6.7 (6.21)');
      h += eq('F_{C,Rd}', 'min(F_{c,pl,Rd}; F_{c,fc,Rd})', '', kN(C.FC), 'kN', '6.2.8.3');
      h += `<h3>Strona rozciągana – blacha podstawy zginana i kotwy</h3>`;
      h += line(`Kotwy ${esc(C.kt.d)} kl. ${esc(C.kt.kl)} (${esc(C.kl.n)}): A<sub>s</sub> = ${fm(C.As, 0)} mm², f<sub>ub</sub> = ${fm(C.fub, 0)} MPa; rząd 2 kotew w rozstawie w = ${fm(C.w, 0)} mm, e = ${fm(t.e, 1)} mm, e<sub>x</sub> = ${fm(t.ex, 1)} mm`);
      h += eq('m_x', 'x − 0,8·a_f·√2', `${fm(t.x, 1)} − 0,8·${fm(C.af, 0)}·√2`, fm(t.mx, 2), 'mm', 'rys. 6.10');
      h += line(`l<sub>eff,cp</sub> = min(2πm<sub>x</sub>; πm<sub>x</sub> + w; πm<sub>x</sub> + 2e) = <b>${fm(t.lcp, 1)} mm</b>; l<sub>eff,nc</sub> = min(4m<sub>x</sub> + 1,25e<sub>x</sub>; e + 2m<sub>x</sub> + 0,625e<sub>x</sub>; 0,5b<sub>p</sub>; 0,5w + 2m<sub>x</sub> + 0,625e<sub>x</sub>) = <b>${fm(t.lnc, 1)} mm</b>`, 'tabl. 6.6 (wysięg blachy)');
      h += eq('l_{eff,1}', 'min(l_{eff,cp}; l_{eff,nc})', '', fm(t.leff1, 1), 'mm') + eq('M_{pl,1,Rd}', '0,25·Σl_{eff,1}·t_p²·f_y/γ_{M0}', `0,25·${fm(t.leff1, 1)}·${fm(C.tp, 0)}²·${fm(C.fyP, 0)}/${fm(ndp.gM0, 2)}`, kNm(t.Mpl1), 'kNm');
      h += eq('L_b', '8d + t_g + t_p + t_w + 0,5·m', '', fm(t.Lb, 1), 'mm', '6.2.6.12') + eq('L_b*', '8,8·m_x³·A_s·n_b/(Σl_{eff,1}·t_p³)', '', fm(t.LbStar, 1), 'mm', 'tabl. 6.2');
      h += line(t.prying ? 'L<sub>b</sub> ≤ L<sub>b</sub>* → mogą wystąpić siły dźwigni (postacie 1, 2, 3)' : 'L<sub>b</sub> > L<sub>b</sub>* → brak sił dźwigni (postać 1-2 i 3)', 'tabl. 6.2');
      h += eq('F_{t,Rd}', 'k_2·f_{ub}·A_s/γ_{M2}', `${fm(C.k2, 2)}·${fm(C.fub, 0)}·${fm(C.As, 0)}/${fm(ndp.gM2, 2)}`, kN(C.FtRd), 'kN', 'tabl. 3.4');
      if (t.prying) h += eq('F_{T,1,Rd}', '4M_{pl,1,Rd}/m_x', '', kN(t.FT1), 'kN') + eq('F_{T,2,Rd}', '(2M_{pl,2,Rd} + n·ΣF_{t,Rd})/(m_x + n)', '', kN(t.FT2), 'kN');
      else h += eq('F_{T,1-2,Rd}', '2M_{pl,1,Rd}/m_x', `2·${kNm(t.Mpl1)}·10⁶/${fm(t.mx, 2)}`, kN(t.FT12), 'kN', 'tabl. 6.2');
      h += eq('F_{T,3,Rd}', 'ΣF_{t,Rd}', `2·${kN(C.FtRd)}`, kN(t.FT3), 'kN');
      h += eq('F_{T,Rd}', 'min', '', kN(t.FTpl), 'kN', `6.2.6.11 – ${esc(t.mode)}`);
      h += `<h3>Nośność podstawy przy N + M</h3>`;
      h += line(`z<sub>T</sub> = ${fm(C.zT, 1)} mm (oś słupa → rząd kotew), z<sub>C</sub> = ${fm(C.zC, 1)} mm (oś słupa → środek pasa ściskanego)`, '6.2.8.3, rys. 6.18');
      if (m) {
        h += line(`e = M<sub>Ed</sub>/N<sub>Ed</sub> = ${isFinite(m.e) ? fm(m.e, 1) + ' mm' : '∞'} (N > 0 – rozciąganie); przypadek: <b>${esc(m.cas)}</b>, z = ${fm(m.z, 1)} mm`, 'tabl. 6.7');
        h += eq('M_{j,y,Rd}', m.f, `min(${kNm(m.a)}; ${isFinite(m.b) ? kNm(m.b) : '∞'})`, kNm(m.Mj), 'kNm', 'tabl. 6.7');
        h += eq('η_y', 'M_{y,Ed}/M_{j,y,Rd}', `${kNm(Math.abs(fo.My))}/${kNm(m.Mj)}`, fm(r.uMy, 3));
      }
      if (r.mjz) { h += line(`M<sub>z</sub>: model uproszczony (rozciągane 2 kotwy po stronie y, ściskanie pod krawędziami pasów): F<sub>T</sub> = ${kN(r.mjz.FT)} kN, F<sub>C</sub> = ${kN(r.mjz.FC)} kN, z<sub>T</sub> = ${fm(r.mjz.zT, 0)} mm, z<sub>C</sub> = ${fm(r.mjz.zC, 0)} mm → M<sub>j,z,Rd</sub> = <b>${kNm(r.mjz.Mj)} kNm</b>; interakcja liniowa M<sub>y</sub>/M<sub>j,y,Rd</sub> + M<sub>z</sub>/M<sub>j,z,Rd</sub> (założenie projektowe)`); h += eq('η', 'η_y + η_z', `${fm(r.uMy, 3)} + ${fm(r.uMz, 3)}`, fm(r.uM, 3)); }
      h += `<div class="eq">→ η = <b>${fm(c.util * 100, 1)}%</b>${okS(c.util)}</div>`;
      break;
    }
    case 'PBV':
      h += eq('F_{f,Rd}', 'C_{f,d}·N_{c,Ed}', `${fm(ndp.Cfd, 2)}·${kN(Math.max(0, r.N))}`, kN(r.FfRd), 'kN', '6.2.2(6) (6.1)');
      h += line(C.kotwyScin ? `kotwy przenoszą ścinanie (podkładki przyspawane / otwory normalne)` : 'kotwy nie przenoszą ścinania (otwory powiększone bez podkładek przyspawanych)');
      if (C.kotwyScin) { h += eq('α_{bc}', '0,44 − 0,0003·f_{yb}', `0,44 − 0,0003·${fm(C.fyb, 0)}`, fm(C.abc, 4), '', '6.2.2(7)') + eq('F_{2,vb,Rd}', 'α_{bc}·f_{ub}·A_s/γ_{M2}', '', kN(C.F2vb), 'kN', '(6.3)') + eq('F_{1,vb,Rd}', 'docisk blachy (tabl. 3.4)', '', kN(C.F1vb), 'kN') + eq('F_{vb,Rd}', 'min(F_{1,vb,Rd}; F_{2,vb,Rd})', '', kN(C.Fvb), 'kN'); }
      h += eq('F_{v,Rd}', 'F_{f,Rd} + n·F_{vb,Rd}', `${kN(r.FfRd)} + ${C.kotwyScin ? C.nb : 0}·${kN(C.Fvb)}`, kN(r.FvRd), 'kN', '6.2.2(8) (6.2)');
      h += verd(kN(r.V), kN(r.FvRd), c.util, 'kN');
      break;
    case 'PBTV':
      h += line(`siła rozciągająca na kotwę F<sub>t,Ed</sub> = ${kN(r.Ft1)} kN; ścinająca F<sub>v,Ed</sub> = (V<sub>Ed</sub> − F<sub>f,Rd</sub>)/n = ${kN(r.Fv1)} kN`);
      h += eq('η', 'F_{v,Ed}/F_{2,vb,Rd} + F_{t,Ed}/(1,4·F_{t,Rd})', `${kN(r.Fv1)}/${kN(C.F2vb)} + ${kN(r.Ft1)}/(1,4·${kN(C.FtRd)})`, fm(r.uTV, 3), '', 'tabl. 3.4');
      h += `<div class="eq">→ η = <b>${fm(c.util * 100, 1)}%</b>${okS(c.util)}</div>`;
      break;
    case 'PBWf': case 'PBWw':
      h += eq('f_{vw,d}', 'f_u/√3/(β_w·γ_{M2})', '', fm(C.fvwd, 1), 'MPa', '4.5.3.3 (4.4)');
      if (c.id === 'PBWf') { h += eq('F_f', '|M_{y,Ed}|/(h − t_f) + |N_{Ed}|·A_f/A', '', kN(r.wf.Ff1), 'kN', 'metoda uproszczona') + eq('f_w', '√[(F_f/(a_f·l_{wf}))² + (V_y/(2a_f·l_{wf}))²]', `a_f = ${fm(C.af, 0)} mm, l<sub>wf</sub> = ${fm(C.lwf, 0)} mm`, fm(r.wf.fw, 1), 'MPa', '4.5.3.3'); h += verd(fm(r.wf.fw, 1), fm(C.fvwd, 1), c.util, 'MPa'); }
      else { h += eq('f_w', 'V_{z,Ed}/(a_w·l_{ww})', `${kN(fo.Vz)}·10³/(${fm(C.aw, 0)}·${fm(C.lww, 0)})`, fm(r.wf.fvz, 1), 'MPa'); h += verd(fm(r.wf.fvz, 1), fm(C.fvwd, 1), c.util, 'MPa'); }
      break;
    case 'PBS': {
      const s1 = d, st = C.stiff;
      h += line(`k<sub>13</sub> (beton) = E<sub>c</sub>√(b<sub>eff</sub>l<sub>eff</sub>)/(1,275E) = ${fm(st.k13, 2)} mm; k<sub>15</sub> (blacha) = ${fm(st.k15, 3)} mm; k<sub>16</sub> (kotwy) = ${fm(st.k16, 3)} mm`, 'tabl. 6.11');
      h += eq('S_{j,ini}', 'E·z²/(1/k_T + 1/k_C)·e/(e + e_k)', '', fm(s1.Sj / 1e9, 2), 'MNm/rad', '6.3.4 (6.27)') + eq('30·EI_c/L_c', '', '', fm(30 * s1.EIL / 1e9, 2), 'MNm/rad', '5.2.2.5(4)');
      h += line(`klasyfikacja: <b>${esc(s1.cls)}</b>${s1.inModel ? '; podatność uwzględniona w modelu jako sprężyna obrotowa k = ' + fm(s1.inModel.Sj / 1e9, 2) + ' MNm/rad (czyste zginanie)' : ''}`);
      break;
    }
    default: break;
  }
  return h;
};

/* ---------------------------------------------------------------- pożar */
RP.tokFire = function (c, R, S) {
  const fr = R.fire, a = fr.atR, E = fr.Efi;
  let h = `<h3>Odporność ogniowa R ${fr.Rreq}</h3>`;
  h += line(`Kombinacja w sytuacji pożarowej ${cmb(fr.combo)}: N<sub>fi,Ed</sub> = ${kN(E.N)} kN, M<sub>y,fi,Ed</sub> = ${kNm(E.My)} kNm, M<sub>z,fi,Ed</sub> = ${kNm(E.Mz)} kNm`, 'PN-EN 1990, 6.4.3.3');
  h += line(`Wskaźnik ekspozycji A<sub>m</sub>/V = ${fm(fr.sf.AmV, 1)} m⁻¹ (pudełkowy ${fm(fr.sf.AmVb, 1)} m⁻¹)${fr.prot ? `, A<sub>p</sub>/V = ${fm(fr.sf.ApV, 1)} m⁻¹ – ochrona d<sub>p</sub> = ${esc(S.pozar.dp)} mm, λ<sub>p</sub> = ${esc(S.pozar.lp)} W/mK` : `, k<sub>sh</sub> = ${fm(fr.ksh, 3)}`}`, fr.prot ? 'PN-EN 1993-1-2, 4.2.5.2' : 'PN-EN 1993-1-2, 4.2.5.1');
  h += line(`Temperatura stali po ${fr.Rreq} min (krzywa ISO 834, krok 2 s): <b>θ<sub>a</sub> = ${fm(fr.thR, 0)} °C</b>`, '4.2.5');
  if (fr.cls4) h += line('Przekrój klasy 4 w pożarze – temperatura krytyczna θ<sub>cr</sub> = 350 °C', '4.2.3.6');
  else {
    h += line(`w θ<sub>a</sub> = ${fm(fr.thR, 0)} °C: k<sub>y,θ</sub> = ${fm(a.ky, 3)}, k<sub>E,θ</sub> = ${fm(a.kE, 3)}; klasa w pożarze (ε = 0,85√(235/f<sub>y</sub>)): <b>${a.cls}</b>`, '3.2.1, 4.2.2');
    h += line(`α = 0,65√(235/f<sub>y</sub>) = ${fm(a.al, 3)}; λ̄<sub>y,θ</sub> = ${fm(a.lyT, 3)}, λ̄<sub>z,θ</sub> = ${fm(a.lzT, 3)} → χ<sub>y,fi</sub> = ${fm(a.cy, 3)}, χ<sub>z,fi</sub> = ${fm(a.cz, 3)}${a.cLT < 1 ? `; λ̄<sub>LT,θ</sub> = ${fm(a.lLTt, 3)} → χ<sub>LT,fi</sub> = ${fm(a.cLT, 3)}` : ''}`, '4.2.3.2, 4.2.3.3');
    h += line(`β<sub>M,y</sub> = ${fm(a.bMy.v, 3)}, β<sub>M,z</sub> = ${fm(a.bMz.v, 3)}; μ<sub>y</sub> = ${fm(a.muy, 3)}, μ<sub>z</sub> = ${fm(a.muz, 3)}, k<sub>y</sub> = ${fm(a.kyF, 3)}, k<sub>z</sub> = ${fm(a.kzF, 3)}, k<sub>LT</sub> = ${fm(a.kLT, 3)}`, '4.2.3.5, rys. 4.2');
    h += eq('η_{fi,a}', 'N/(χ_{min,fi}A k_{y,θ}f_y/γ_{M,fi}) + k_y M_y/(W_y k_{y,θ} f_y/γ_{M,fi}) + k_z M_z/(W_z k_{y,θ} f_y/γ_{M,fi})', '', fm(a.ua, 3), '', '(4.21a/c)');
    h += eq('η_{fi,b}', 'N/(χ_{z,fi}A k_{y,θ}f_y/γ_{M,fi}) + k_{LT}M_y/(χ_{LT,fi}W_y k_{y,θ} f_y/γ_{M,fi}) + k_z M_z/(W_z k_{y,θ} f_y/γ_{M,fi})', '', fm(a.ub, 3), '', '(4.21b/d)');
    h += line(`temperatura krytyczna (η<sub>fi</sub>(θ<sub>cr</sub>) = 1, bisekcja): <b>θ<sub>cr</sub> = ${fm(fr.thcr, 0)} °C</b>; porównawczo wg 4.2.4 (μ<sub>0</sub> = ${fm(fr.mu0, 3)}): ${fm(fr.thcr424, 0)} °C`, '4.2.4');
  }
  h += line(`czas osiągnięcia θ<sub>cr</sub>: ${fr.tcr === null ? `> ${fm(Math.max(fr.Rreq * 1.5, 120), 0)} min` : '<b>' + fm(fr.tcr, 1) + ' min</b>'}`);
  h += verd(fm(fr.thR, 0), fm(fr.thcr, 0), c.util, '°C');
  return h;
};

/* ---------------------------------------------------------------- raport pełny */
RP.build = function (S, R, opt) {
  opt = opt || {};
  if (!R || !R.sec) return '<p>Brak wyników – usuń błędy danych.</p>';
  const sec = R.sec, mat = R.mat, b = R.base, md = R.md, ndp = R.ndp, gen = R.norm ? R.norm.genStosowana : 1;
  const P = (s) => pre(gen) + ', ' + s;
  void P;
  let h = `<h1>Obliczenia statyczno-wytrzymałościowe słupa stalowego – ${esc(S.meta.nazwa)}</h1>`;
  h += `<p>Obiekt: ${esc(S.meta.obiekt)}</p>`;
  if (S.meta.projektant || S.meta.sprawdzajacy) h += `<p>Projektant: ${esc(S.meta.projektant)}${S.meta.nrUprawnien ? ' (upr. ' + esc(S.meta.nrUprawnien) + ')' : ''}${S.meta.sprawdzajacy ? ' · Sprawdzający: ' + esc(S.meta.sprawdzajacy) : ''}${S.meta.data ? ' · Data: ' + esc(S.meta.data) : ''}</p>`;
  // 1. dane
  h += '<h2>1. Dane wejściowe</h2>';
  const bc = md.bc;
  h += line(`Wysokość słupa H = <b>${fm(md.H / 1000, 3)} m</b>`);
  h += line(`Płaszczyzna x–z (zginanie M<sub>y</sub>, wyboczenie względem y–y): podstawa – ${esc(S0.DOL[bc.dol.y])}${bc.dol.y === 'spr' ? ` (k = ${fm(bc.dol.kry / 1e9, 2)} MNm/rad${R.baseSpring ? ', z podatności podstawy' : ''})` : ''}; wierzchołek – ${esc(S0.GORA[bc.gora.y])}`);
  h += line(`Płaszczyzna x–y (zginanie M<sub>z</sub>, wyboczenie względem z–z): podstawa – ${esc(S0.DOL[bc.dol.z])}; wierzchołek – ${esc(S0.GORA[bc.gora.z])}`);
  h += line(`Warunki skrętne: podstawa – ${esc(S0.SKRET_D[bc.dol.skret])}; wierzchołek – ${esc(S0.SKRET_G[bc.gora.skret])}`);
  h += line(md.stez.length ? 'Stężenia pośrednie: ' + md.stez.map((z, i) => `S${i + 1}: x = ${fm(z.x / 1000, 2)} m – blokada ${z.pl === 'yz' ? 'w obu płaszczyznach' : z.pl === 'z' ? 'przemieszczeń w kierunku y (wyboczenie względem z–z)' : 'przemieszczeń w kierunku z (wyboczenie względem y–y)'}${z.wys !== 'srodek' ? `, na wysokości pasa ${z.wys === 'pas+' ? '+z' : '−z'}` : ''}${z.skret ? ', skrętne' : ''}`).join('; ') : 'Stężenia pośrednie: brak');
  h += line(`Przekrój: <b>${esc(sec.nazwa)}</b> – ${sec.opis}`);
  h += line(`Stal: <b>${esc(mat.gatunek + mat.podgatunek)}</b> wg ${esc((M.STAL[mat.gatunek] || {}).norma || '')}; f<sub>y</sub> = ${fm(mat.fy, 0)} MPa, f<sub>u</sub> = ${fm(mat.fu, 0)} MPa (${esc(mat.zr)}); E = 210 000 MPa, G = 81 000 MPa`, '3.2');
  h += line(`Metoda analizy: <b>${R.method === 'I' ? 'analiza I rzędu, stateczność wg 6.3 z długościami wyboczeniowymi z analizy wyboczeniowej (5.2.2(8))' : R.method === 'II_glob' ? 'analiza II rzędu z imperfekcją przechyłową φ; stateczność elementu wg 6.3 z długościami wyboczeniowymi postaci nieprzechyłowej (5.2.2(3)b)' : 'analiza II rzędu z imperfekcjami przechyłową φ i łukowymi e₀; nośność przekroju (6.2) + zwichrzenie / wyboczenie skrętne wg 6.3 (5.2.2(3)a, 5.3.2)'}</b>`, '5.2.2');
  h += line(`Interakcja N–M: metoda ${R.res && R.res[0] && R.res[0].variants[0].mem && R.res[0].variants[0].mem.segs[0] ? 'zał. ' + R.res[0].variants[0].mem.segs[0].meth : '—'}; zwichrzenie: ${esc(ndp.ltbMet)}`, '6.3.3(5)');
  if (S.meta.opis) h += `<p class="note">${esc(S.meta.opis)}</p>`;
  // 2. podstawa normowa
  h += '<h2>2. Podstawa normowa</h2>';
  (R.norm ? R.norm.dokumenty : []).forEach(d => { h += `<div class="eq"><b>${esc(d.oznaczenie)}</b> – ${esc(d.tytul)}${d.zmiany.length ? '; zmiany: ' + esc(d.zmiany.join(', ')) : ''}${d.poprawki.length ? '; poprawki: ' + esc(d.poprawki.join(', ')) : ''}${d.zk ? '; ZK: ' + esc(d.zk) : ''} – ${esc(d.zakres)}</div>`; });
  if (R.norm) h += `<p class="note">${esc(R.norm.decyzja)}</p>`;
  const ndpL = ['gM0', 'gM1', 'gM2', 'gG_sup', 'gG_inf', 'gQ', 'xi', 'komb', 'phi0', 'alfaCr', 'lamLT0', 'betaLT', 'ltbMet', 'interMet', 'eta', 'Cfd', 'betaJ', 'gc', 'gMfi'];
  h += tbl(['parametr', 'wartość', 'źródło'], ndpL.map(k => [esc(N.NDP1_PL[k] ? N.NDP1_PL[k].d : k), typeof ndp[k] === 'number' ? fm(ndp[k], 3) : esc(ndp[k]), esc(N.NDP1_PL[k] ? N.NDP1_PL[k].ref : '') + ((R.norm && R.norm.ndpZmienione || []).includes(k) ? ' <b>(zmieniono)</b>' : '')]));
  // 3. przekrój
  h += '<h2>3. Przekrój i nośności obliczeniowe</h2>';
  h += `<div class="fig">${D.section(sec, { size: 230, eff: b.effN || b.effMy })}<div>${RP.secTable(sec)}</div></div>`;
  h += line(`Klasa przy ściskaniu: <b>${b.kN.cls}</b>; przy zginaniu M<sub>y</sub>: <b>${b.kMy.cls}</b>; przy zginaniu M<sub>z</sub>: <b>${b.kMz.cls}</b> (ε = ${fm(b.eps, 3)})`, '5.5, tabl. 5.2');
  h += RP.classTable(b.kN);
  h += eq('N_{pl,Rd}', 'A·f_y/γ_{M0}', `${cm2(sec.A)}·10²·${fm(mat.fy, 0)}/${fm(ndp.gM0, 2)}`, kN(b.Npl), 'kN', '6.2.3');
  if (b.effN) h += eq('N_{c,Rd}', 'A_{eff}·f_y/γ_{M0}', `${cm2(b.Aeff)}·10²·${fm(mat.fy, 0)}/${fm(ndp.gM0, 2)}`, kN(b.Nc), 'kN', '6.2.4');
  h += eq('M_{c,y,Rd}', `W_y·f_y/γ_{M0} (${b.kMy.cls <= 2 ? 'W_{pl,y}' : b.kMy.cls === 3 ? 'W_{el,y}' : 'W_{eff,y}'})`, `${cm3(b.Wy)}·10³·${fm(mat.fy, 0)}/${fm(ndp.gM0, 2)}`, kNm(b.Mcy), 'kNm', '6.2.5');
  h += eq('M_{c,z,Rd}', `W_z·f_y/γ_{M0}`, `${cm3(b.Wz)}·10³·${fm(mat.fy, 0)}/${fm(ndp.gM0, 2)}`, kNm(b.Mcz), 'kNm', '6.2.5');
  h += eq('V_{pl,z,Rd}', 'A_{v,z}·(f_y/√3)/γ_{M0}', '', kN(b.Vplz), 'kN', '6.2.6') + eq('V_{pl,y,Rd}', 'A_{v,y}·(f_y/√3)/γ_{M0}', '', kN(b.Vply), 'kN', '6.2.6');
  // 4. obciążenia
  h += '<h2>4. Obciążenia i kombinacje</h2>';
  h += tbl(['ozn.', 'nazwa', 'rodzaj', 'ψ₀ / ψ₁ / ψ₂', 'składniki (wartości charakterystyczne)'], md.cases.map(c => {
    const ps = BS.K.psi(c.c);
    const sk = c.parts.map(p => p.typ === 'N' ? `N = ${fm(p.F / 1e3, 2)} kN na x = ${fm(p.x / 1000, 2)} m${p.ey || p.ez ? ` (e<sub>y</sub> = ${fm(p.ey, 0)}, e<sub>z</sub> = ${fm(p.ez, 0)} mm)` : ''}` : p.typ === 'Nq' ? `ciężar ${fm(p.q, 3)} kN/m` : p.typ === 'H' ? `H<sub>${p.kier}</sub> = ${fm(p.F / 1e3, 2)} kN na x = ${fm(p.x / 1000, 2)} m` : p.typ === 'q' ? `q<sub>${p.kier}</sub> = ${fm(p.q0, 2)}${p.q1 !== p.q0 ? '…' + fm(p.q1, 2) : ''} kN/m na ${fm(p.x0 / 1000, 2)}–${fm(p.x1 / 1000, 2)} m${p.wys !== 'srodek' ? ` (pas ${p.wys === 'pas+' ? '+z' : '−z'})` : ''}` : `M<sub>${p.os}</sub> = ${fm(p.M / 1e6, 2)} kNm na x = ${fm(p.x / 1000, 2)} m`).join('; ');
    return [esc(c.c.id), esc(c.c.nazwa), esc((S0.RODZAJE[c.c.rodzaj] || {}).n || c.c.rodzaj) + (c.c.wyklucz ? ` <small>(grupa „${esc(c.c.wyklucz)}”)</small>` : ''), S0.RODZAJE[c.c.rodzaj] && S0.RODZAJE[c.c.rodzaj].stale ? '—' : ps.map(v => fm(v, 2)).join(' / '), sk];
  }));
  const cnt = (t) => R.combos.filter(c => c.typ === t).length;
  h += line(`Kombinacje wg PN-EN 1990: SGN ${cnt('SGN')} (${ndp.komb === '6.10' ? '6.10' : '6.10a/6.10b'}, γ<sub>G,sup</sub> = ${fm(ndp.gG_sup, 2)}, γ<sub>G,inf</sub> = ${fm(ndp.gG_inf, 2)}, γ<sub>Q</sub> = ${fm(ndp.gQ, 2)}, ξ = ${fm(ndp.xi, 2)}), charakterystyczne ${cnt('char')}, częste ${cnt('czest')}, quasi-stałe ${cnt('qp')}${cnt('poz') ? ', pożarowe ' + cnt('poz') : ''}${cnt('wyj') ? ', wyjątkowe ' + cnt('wyj') : ''}`, 'PN-EN 1990, 6.4.3, 6.5.3, zał. A1');
  if (opt.combos !== false) h += `<details><summary>Lista kombinacji SGN</summary>${tbl(['nr', 'kombinacja'], R.combos.filter(c => c.typ === 'SGN' || c.typ === 'wyj').map(c => [c.id, esc(c.opis)]))}</details>`;
  // 5. analiza globalna
  h += '<h2>5. Analiza globalna, imperfekcje, siły wewnętrzne</h2>';
  h += mk('acr', RP.tok(R.checks.find(c => c.id === 'acr'), R, S));
  const im = R.imp, ph = im.phi;
  if (R.method !== 'I') {
    h += `<h3>Imperfekcja przechyłowa</h3>`;
    h += ph.manual ? eq('φ', '', '', `1/${fm(1 / ph.phi, 0)}`, '', 'przyjęto ręcznie') : eq('φ', 'φ_0·α_h·α_m', `(1/${fm(1 / ph.phi0, 0)})·${fm(ph.ah, 3)}·${fm(ph.am, 3)}`, `${fm(ph.phi, 5)} = 1/${fm(1 / ph.phi, 0)}`, '', '5.3.2(3) (5.5)');
    if (!ph.manual) h += line(`α<sub>h</sub> = 2/√h = 2/√${fm(ph.h, 2)} (2/3 ≤ α<sub>h</sub> ≤ 1) = ${fm(ph.ah, 3)}; α<sub>m</sub> = √(0,5(1 + 1/m)), m = ${ph.m} → ${fm(ph.am, 3)}`, '5.3.2(3)');
    h += line(`Imperfekcję przechyłową stosuje się w płaszczyznach z postacią przechyłową (${['y', 'z'].filter(p => md.sway[p]).map(p => S0.PLS[p]).join(', ') || 'brak'}), w jednym kierunku naraz, z oboma zwrotami; pomijana, gdy H<sub>Ed</sub> ≥ ${fm(ndp.HV015, 2)}·V<sub>Ed</sub>${(S.analiza.imp || {}).pomin015 === false ? ' (opcja wyłączona)' : ''}. Wprowadzona jako geometria początkowa d₀ = φ·x (obciążenie zastępcze K<sub>G</sub>·d₀).`, '5.3.2(4), (7), (8)');
  }
  if (R.method === 'II_pelna') {
    h += `<h3>Imperfekcje łukowe</h3>`;
    ['y', 'z'].forEach(pl => { h += line(`${S0.PLS[pl]}: ${esc(im.e0Src[pl])}; odcinki: ${im.bow[pl].map(s => `${fm(s.x0 / 1000, 2)}–${fm(s.x1 / 1000, 2)} m (e₀ = ${fm((s.x1 - s.x0) / im.e0L[pl], 1)} mm)`).join(', ')}`, '5.3.2(3)b, tabl. 5.1'); });
  }
  // wykresy obwiedni
  const Hm = md.H / 1000, xs = Array.from(R.an.xs3).map(x => x / 1000);
  const hc = (title, arrs, col, k, unit) => D.heightChart({ W: 220, H: 330, Hm, title, unit, series: arrs.map((a, j) => ({ x: xs, v: Array.from(a).map(v => v / k), c: col, dash: j ? '5 3' : '', fill: col })) });
  h += `<div class="fig">${hc('N_Ed [kN]', [R.env.Nmax, R.env.Nmin], '#155e2c', 1e3, 'kN')}${hc('M_y,Ed [kNm]', [R.env.My.max, R.env.My.min], '#c0262d', 1e6, 'kNm')}${hc('M_z,Ed [kNm]', [R.env.Mz.max, R.env.Mz.min], '#6a3fb5', 1e6, 'kNm')}${hc('V_z,Ed [kN]', [R.env.Vz.max, R.env.Vz.min], '#1d5bb8', 1e3, 'kN')}</div>`;
  h += `<p class="note">Obwiednie SGN ze wszystkich kombinacji ${R.method !== 'I' ? 'i wariantów imperfekcji (analiza II rzędu)' : '(analiza I rzędu)'}; linia ciągła – maksimum, przerywana – minimum.</p>`;
  // reakcje
  if (R.baseForces && R.baseForces.length) {
    const bf = R.baseForces;
    const pick = (fn) => bf.reduce((a, q) => (fn(q) > fn(a) ? q : a));
    const rows = [['max N', pick(q => q.N)], ['min N', pick(q => -q.N)], ['max |M_y|', pick(q => Math.abs(q.My))], ['max |M_z|', pick(q => Math.abs(q.Mz))], ['max |V|', pick(q => Math.hypot(q.Vy, q.Vz))]];
    h += '<h3>Siły na fundament (podstawa, wartości obliczeniowe)</h3>' + tbl(['kryterium', 'N [kN]', 'M<sub>y</sub> [kNm]', 'M<sub>z</sub> [kNm]', 'V<sub>z</sub> [kN]', 'V<sub>y</sub> [kN]', 'kombinacja'], rows.map(([l, q]) => [sym(l), fm(q.N / 1e3, 1), fm(q.My / 1e6, 1), fm(q.Mz / 1e6, 1), fm(q.Vz / 1e3, 1), fm(q.Vy / 1e3, 1), esc(q.combo.opis) + (R.method !== 'I' ? ' · ' + esc(q.vr) : '')]));
  }
  // 6–…: sprawdzenia
  const grps = [];
  R.checks.forEach(c => { if (c.id === 'acr') return; let g = grps.find(q => q.n === c.grp); if (!g) { g = { n: c.grp, c: [] }; grps.push(g); } g.c.push(c); });
  let no = 6;
  grps.forEach(g => {
    h += `<h2>${no++}. ${esc(g.n)}</h2>`;
    if (/^Stateczność/.test(g.n)) {
      const gv = RP.govMember(R);
      if (gv) h += `<div class="fig">${D.modes(R, gv.mem, { W: 640, H: 300 })}</div>`;
    }
    if (/^Podstawa/.test(g.n) && R.pb && R.pb.C) h += `<div class="fig">${D.basePlate(R.pb.C, R.sec, { W: 660, H: 340, dName: S.podstawa.kotwy.d, kl: S.podstawa.kotwy.kl, beton: S.podstawa.beton })}</div>`;
    if (/^Pożar/.test(g.n) && R.fire) h += `<div class="fig">${D.fire(R.fire, { width: 640 })}</div>`;
    g.c.forEach(c => { h += mk(c.id, RP.tok(c, R, S)); });
  });
  // wykonanie
  if (R.exc) {
    h += `<h2>${no++}. Klasa wykonania i wymagania wykonawcze</h2>`;
    h += line(`<b>${esc(R.exc.exc)}</b> – ${R.exc.why.map(esc).join('; ')}`, 'PN-EN 1993-1-1/A1, zał. C; PN-EN 1090-2');
    h += tbl(['zakres', 'wymaganie'], R.exc.req.map(([a, b2]) => [esc(a), esc(b2)]));
  }
  // podsumowanie
  h += `<h2>${no++}. Zestawienie wyników</h2>`;
  h += tbl(['sprawdzenie', 'punkt normy', 'wykorzystanie', 'status'], R.checks.map(c => [sym(c.n), esc(c.ref), c.util !== null && isFinite(c.util) ? fm(c.util * 100, 1) + '%' : '∞', c.info ? (c.status === 'warn' ? '<span class="warn">uwaga</span>' : '<span class="info">informacja</span>') : c.status === 'fail' ? '<span class="fail">niespełniony</span>' : c.status === 'warn' ? '<span class="warn">uwaga</span>' : '<span class="ok">spełniony</span>']));
  const fails = R.checks.filter(c => c.status === 'fail' && !c.info).length;
  h += `<div class="verdict">${fails ? `<span class="fail">✖ Niespełnione warunki: ${fails}</span>` : `<span class="ok">✔ Wszystkie warunki nośności i użytkowalności spełnione – maksymalne wytężenie η = ${fm(R.uMax * 100, 1)}%</span>`}</div>`;
  if (R.warnings.length) h += '<h3>Uwagi</h3>' + R.warnings.map(w => `<div class="eq warn">${esc(w)}</div>`).join('');
  if (R.info.length) h += R.info.map(w => `<div class="eq">${esc(w)}</div>`).join('');
  h += `<p class="note">Odtwarzalność: ${esc(BS.APP)} ${esc(BS.VERSION)}, silnik ${esc(R.engine)}; SHA-256 danych (kanoniczny JSON): ${esc(R.hash)}; obliczono ${new Date().toLocaleString('pl-PL')}; czas obliczeń ${R.time} ms.</p>`;
  if (opt.refs === false) h = h.replace(/<span class="r">\[[^\]]*\]<\/span>/g, '');
  return h;
};
// kombinacja z najwyższą interakcją (do postaci wyboczenia)
RP.govMember = function (R) {
  let best = null;
  (R.res || []).forEach(cr => cr.variants.forEach(v => { if (!v.mem) return; const u = Math.max(0, ...v.mem.segs.map(s => s.u)); if (!best || u > best.u) best = { u, mem: v.mem, combo: cr.combo, lab: v.lab, F: v.F }; }));
  return best;
};
// fragment „jak obliczono” dla sprawdzenia
RP.frag = function (c, R, S) {
  try { return RP.tok(c, R, S); } catch (e) { return `<p class="hint">Brak toku obliczeń: ${esc(e.message)}</p>`; }
};

/* ---------------------------------------------------------------- raport „Statyka” */
RP.statics = function (S, R) {
  const full = RP.build(S, R, { combos: true });
  const cut = full.indexOf('<h2>6.');
  return (cut > 0 ? full.slice(0, cut) : full) + `<p class="note">${esc(BS.APP)} ${esc(BS.VERSION)} · SHA-256: ${esc(R.hash)}</p>`;
};

})();
