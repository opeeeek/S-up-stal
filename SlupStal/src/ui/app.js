/* =====================================================================
   SłupStal – interfejs (układ i sposób pracy jak w BelkaStal/SłupŻB):
   chipy sprawdzeń, „Dobierz przekrój / podstawę / wszystko”, grupy pól
   z listami wartości typowych (▾), klikany schemat słupa w dwóch
   płaszczyznach z obciążeniami, wykres przy schemacie, wiele słupów
   w projekcie, pliki (.slupstal / HTML), autozapis, skróty klawiszowe.
   Każdy parametr obliczeń można zmienić ręcznie (pola „auto/ręcznie”).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, J = BS.J, N = BS.N, P = BS.P, M = BS.M, D = BS.D, Q = BS.Q, S0 = BS.S;
const { $, $$, esc, fmt, sym, getP, setP, parseNum, showNum, exDetails } = Q;
const A = BS.A = {};
let S = J.defaultState(), R = null, filePath = '', dirty = false;
let COLS = null, curC = 0;
let diagMode = (() => { try { return localStorage.getItem('ss.diag') || 'M'; } catch (e) { return 'M'; } })();
let rendered = {};
let schCombo = null; // kombinacja na schemacie (indeks R.res) lub null – obwiednia
A.S = () => S; A.R = () => R;

/* ================================================================ DEFINICJE PÓL */
const rng = (a, b, st) => { const r = []; for (let v = a; v <= b + 1e-9; v += st) r.push(+v.toFixed(3)); return r; };
const ND = (k) => `normy.ndp1.${k}`;
const KIND = () => (S.przekroj || {}).typ || 'walc';
const serieOf = (t) => P.RODZAJE[t].serie.map(k => [k, P.SERIA_N[k] || k]);
const DOLO = [['utw', 'utwierdzenie'], ['prz', 'przegub'], ['spr', 'sprężyna obrotowa k']];
const GORO = [['swob', 'swobodny (wspornik)'], ['prz', 'przegub nieprzesuwny'], ['utw', 'utwierdzenie nieprzesuwne'], ['utwp', 'utwierdzenie przesuwne'], ['spr', 'podparcie sprężyste poziome']];
const CURVES = [['auto', 'auto (tabl. 6.2)'], ['a0', 'a₀'], ['a', 'a'], ['b', 'b'], ['c', 'c'], ['d', 'd']];
const isMan = (v) => v !== '' && v !== null && v !== undefined && isFinite(+v) && +v > 0;
const GROUPS = [
  { id: 'geo', title: 'Schemat statyczny i geometria', items: [
    { k: 'schemat', t: 'sel', l: 'Schemat podparcia', o: () => J.SCHEMATY.map(q => [q.id, q.n]).concat([['wlasny', 'własny (warunki poniżej)']]), wide: true, re: true },
    { k: 'geom.H', t: 'num', l: 'Wysokość słupa H', u: 'm', list: [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 12, 14], min: 0.5, re: true },
    { t: 'sub', l: 'Płaszczyzna x–z (zginanie M_{y}, wyboczenie względem y–y)' },
    { k: 'podpory.dol.y', t: 'sel', l: 'Podstawa', o: DOLO, re: true },
    { k: 'podpory.dol.kry', t: 'num', l: 'k podstawy', u: 'kNm/rad', list: [5000, 10000, 20000, 50000, 100000], min: 0, show: s => s.podpory.dol.y === 'spr' },
    { k: 'podpory.gora.y', t: 'sel', l: 'Wierzchołek', o: GORO, re: true },
    { k: 'podpory.gora.khz', t: 'num', l: 'k poziome (kierunek z)', u: 'kN/m', list: [100, 500, 1000, 2000, 5000], min: 0, show: s => s.podpory.gora.y === 'spr' },
    { t: 'sub', l: 'Płaszczyzna x–y (zginanie M_{z}, wyboczenie względem z–z)' },
    { k: 'podpory.dol.z', t: 'sel', l: 'Podstawa', o: DOLO, re: true },
    { k: 'podpory.dol.krz', t: 'num', l: 'k podstawy', u: 'kNm/rad', list: [2000, 5000, 10000, 20000], min: 0, show: s => s.podpory.dol.z === 'spr' },
    { k: 'podpory.gora.z', t: 'sel', l: 'Wierzchołek', o: GORO, re: true },
    { k: 'podpory.gora.khy', t: 'num', l: 'k poziome (kierunek y)', u: 'kN/m', list: [100, 500, 1000, 2000, 5000], min: 0, show: s => s.podpory.gora.z === 'spr' },
    { t: 'sub', l: 'Skręcanie (wyboczenie skrętne, zwichrzenie)' },
    { k: 'podpory.dol.skret', t: 'sel', l: 'Podstawa', o: () => Object.keys(S0.SKRET_D).map(k => [k, S0.SKRET_D[k]]), wide: true },
    { k: 'podpory.gora.skret', t: 'sel', l: 'Wierzchołek', o: () => Object.keys(S0.SKRET_G).map(k => [k, S0.SKRET_G[k]]), wide: true },
    { t: 'html', h: () => `<div class="row wide"><span>Stężenia pośrednie: ${S.stezenia.length ? S.stezenia.map((z, i) => `S${i + 1} (${fmt(U.num(z.x), 2)} m)`).join(', ') : 'brak'}</span><span><button class="btn sm" data-act="braces" type="button">Stężenia…</button></span></div>` },
    { t: 'hint', ex: true, exT: 'Jak dobrać warunki podparcia i stężenia?', h: () => 'Płaszczyzna x–z – zginanie względem osi silnej y–y (obciążenia w kierunku z, np. wiatr na ścianę podłużną hali). Płaszczyzna x–y – zginanie i wyboczenie względem osi słabej z–z. <b>Wierzchołek swobodny</b> = wspornik (postać przechyłowa); <b>przegub nieprzesuwny</b> = górny koniec stężony (np. stężeniem ściennym lub tarczą dachu). <b>Stężenia pośrednie</b> (rygle ścienne, stropy) blokują przemieszczenie w wybranej płaszczyźnie na wysokości pasa lub środka ścinania – stężenie mocowane do jednego pasa może dopuścić wyboczenie względem osi wymuszonej (program to wykrywa).' }
  ] },
  { id: 'sec', title: 'Przekrój i materiał', items: [
    { k: 'przekroj.typ', t: 'sel', l: 'Rodzaj przekroju', o: () => Object.keys(P.RODZAJE).map(k => [k, P.RODZAJE[k].n]), wide: true, re: true },
    { k: 'przekroj.seria', t: 'sel', l: 'Seria', o: () => serieOf(KIND()), show: () => KIND() !== 'spaw', re: true },
    { k: 'przekroj.nr', t: 'sel', l: 'Kształtownik', o: () => P.lista(S.przekroj.seria).map(n => [n, (KIND() === 'walc' ? S.przekroj.seria + ' ' : KIND() === 'chs' ? 'CHS ' : '') + String(n).replace(/x/g, '×')]), num: () => KIND() === 'walc', show: s => KIND() !== 'spaw' && s.przekroj.seria !== 'wlasna', re: true },
    { k: 'przekroj.wyk', t: 'sel', l: 'Wykonanie rury', o: [['gor', 'gorąco wykończona (PN-EN 10210)'], ['zimn', 'formowana na zimno (PN-EN 10219)']], wide: true, show: () => KIND() === 'rura' || KIND() === 'chs' },
    { k: 'przekroj.h', t: 'num', l: 'Wysokość h', u: 'mm', list: () => KIND() === 'rura' ? [100, 120, 150, 160, 200, 250, 300, 350, 400] : [200, 250, 300, 350, 400, 450, 500, 600, 700, 800], min: 20, show: s => KIND() === 'spaw' || (KIND() === 'rura' && s.przekroj.seria === 'wlasna'), re: true },
    { k: 'przekroj.b', t: 'num', l: 'Szerokość b', u: 'mm', list: [100, 120, 150, 200, 250, 300], min: 20, show: s => KIND() === 'rura' && s.przekroj.seria === 'wlasna', re: true },
    { k: 'przekroj.D', t: 'num', l: 'Średnica D', u: 'mm', list: [114.3, 139.7, 168.3, 219.1, 273, 323.9, 355.6, 406.4, 508], min: 20, show: s => KIND() === 'chs' && s.przekroj.seria === 'wlasna', re: true },
    { k: 'przekroj.t', t: 'num', l: 'Grubość ścianki t', u: 'mm', list: [4, 5, 6, 6.3, 8, 10, 12.5, 16, 20], min: 1.5, show: s => (KIND() === 'rura' || KIND() === 'chs') && s.przekroj.seria === 'wlasna', re: true },
    { k: 'przekroj.bg', t: 'num', l: 'Pas (+z) – szerokość b', u: 'mm', list: rng(150, 600, 25), min: 30, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.tg', t: 'num', l: 'Pas (+z) – grubość t_{f}', u: 'mm', list: [8, 10, 12, 15, 16, 18, 20, 22, 25, 28, 30, 35, 40], min: 3, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.bd', t: 'num', l: 'Pas (−z) – szerokość b', u: 'mm', list: rng(150, 600, 25), min: 30, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.td', t: 'num', l: 'Pas (−z) – grubość t_{f}', u: 'mm', list: [8, 10, 12, 15, 16, 18, 20, 22, 25, 28, 30, 35, 40], min: 3, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.tw', t: 'num', l: 'Środnik – grubość t_{w}', u: 'mm', list: [6, 8, 10, 12, 14, 16, 20], min: 3, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.aw', t: 'num', l: 'Spoina pas–środnik a', u: 'mm', list: [3, 4, 5, 6, 7, 8], min: 0, show: () => KIND() === 'spaw' },
    { k: 'material.gatunek', t: 'sel', l: 'Gatunek stali', o: () => Object.keys(M.STAL).map(k => [k, `${k} (${M.STAL[k].norma})`]), wide: true, re: true },
    { k: 'material.podgatunek', t: 'sel', l: 'Podgatunek (udarność)', o: () => (M.STAL[S.material.gatunek] || { pod: ['JR'] }).pod.map(k => [k, `${k} – 27 J w ${M.T27J[k]} °C`]), wide: true },
    { k: 'material.fyRecz', t: 'num', l: 'f_{y} ręcznie (np. ze świadectwa)', u: 'MPa', list: ['', 235, 275, 355, 420, 460], opt: true, ph: 'tabl. 3.1', min: 100 },
    { t: 'hint', h: () => secHint() },
    { t: 'html', h: () => `<div class="row wide"><span></span><span><button class="btn sm" data-act="secwin" type="button">Przekrój…</button> <button class="btn sm" data-act="sectab" type="button">Tablica kształtowników…</button></span></div>` }
  ] },
  { id: 'load', title: 'Obciążenia i kombinacje', items: [
    { t: 'html', h: () => loadListHTML() },
    { k: 'ciezarWlasny.auto', t: 'chk', l: 'Ciężar własny słupa (78,5 kN/m³)', re: true },
    { k: 'ciezarWlasny.dodatek', t: 'num', l: 'Dodatek na blachy, łączniki', u: '%', list: [0, 5, 10, 15, 20], min: 0, show: s => s.ciezarWlasny.auto },
    { t: 'sub', l: 'Kombinacje (PN-EN 1990)' },
    { k: ND('komb'), t: 'sel', l: 'Kombinacja SGN', o: [['6.10ab', 'wzory 6.10a i 6.10b'], ['6.10', 'wzór 6.10']], wide: true },
    { k: ND('gG_sup'), t: 'num', l: 'γ_{G,sup}', list: [1.0, 1.15, 1.35], min: 0 },
    { k: ND('gG_inf'), t: 'num', l: 'γ_{G,inf}', list: [0.9, 1.0], min: 0 },
    { k: ND('gQ'), t: 'num', l: 'γ_{Q}', list: [0, 1.0, 1.5], min: 0 },
    { k: ND('xi'), t: 'num', l: 'ξ (6.10b)', list: [0.85, 0.9, 1.0], min: 0, show: s => s.normy.ndp1.komb !== '6.10' },
    { k: ND('KFI'), t: 'num', l: 'K_{FI} (klasa niezawodności)', list: [0.9, 1.0, 1.1], min: 0.5 },
    { t: 'hint', ex: true, exT: 'Jak zadawać obciążenia?', h: () => 'Każde obciążenie (przypadek) ma rodzaj (stałe, użytkowe kat. A–H, śnieg, wiatr…) i dowolną liczbę składników: <b>siła podłużna N</b> (ściskanie +) z mimośrodami e<sub>y</sub>, e<sub>z</sub> na dowolnej wysokości (np. wspornik suwnicy), <b>siła pozioma</b>, <b>obciążenie rozłożone</b> poziome (wiatr) z wysokością przyłożenia (pas / środek ścinania), <b>moment skupiony</b>. Wartości charakterystyczne – kombinacje tworzy program. Obciążenia wzajemnie wykluczające się (np. kierunki wiatru) – wspólna „grupa”.' }
  ] },
  { id: 'an', title: 'Analiza globalna i imperfekcje', items: [
    { k: 'analiza.metoda', t: 'sel', l: 'Metoda (5.2.2)', o: [['II_glob', 'II rząd + φ; elementy wg 6.3 (L_cr nieprzesuwne)'], ['II_pelna', 'II rząd + φ + e₀; przekroje (6.2) + zwichrzenie'], ['I', 'I rząd; elementy wg 6.3 (L_cr z postaci przechyłowej)']], wide: true, re: true },
    { k: 'analiza.imp.m', t: 'num', l: 'Liczba słupów w rzędzie m (α_{m})', list: [1, 2, 3, 4, 5, 6, 8, 10], min: 1, show: s => s.analiza.metoda !== 'I' },
    { k: 'analiza.imp.phi', t: 'num', l: 'Imperfekcja przechyłowa 1/φ (ręcznie)', list: ['', 150, 200, 250, 300, 400], opt: true, ph: 'auto 5.3.2(3)', min: 50, show: s => s.analiza.metoda !== 'I' },
    { k: 'analiza.imp.pomin015', t: 'chk', l: 'Pomijaj φ, gdy H_{Ed} ≥ 0,15·V_{Ed} (5.3.2(4))', show: s => s.analiza.metoda !== 'I' },
    { k: 'analiza.imp.e0y', t: 'num', l: 'Łuk e_{0}/L w płaszczyźnie x–z: 1/…', list: ['', 150, 200, 250, 300, 350, 400], opt: true, ph: 'auto tabl. 5.1', min: 50, show: s => s.analiza.metoda === 'II_pelna' },
    { k: 'analiza.imp.e0z', t: 'num', l: 'Łuk e_{0}/L w płaszczyźnie x–y: 1/…', list: ['', 150, 200, 250, 300, 350, 400], opt: true, ph: 'auto tabl. 5.1', min: 50, show: s => s.analiza.metoda === 'II_pelna' },
    { k: ND('alfaCr'), t: 'num', l: 'α_{cr,lim} (analiza I rzędu)', list: [10, 15], min: 1 },
    { t: 'hint', h: () => R && R.alphaMin && isFinite(Math.min(R.alphaMin.y, R.alphaMin.z)) ? `α<sub>cr</sub> (MES, postać ${R.md && (R.md.sway.y || R.md.sway.z) ? 'przechyłowa' : 'giętna'}): ${fmt(R.alphaMin.y, 2)} (x–z) / ${fmt(R.alphaMin.z, 2)} (x–y)${R.imp && R.method !== 'I' ? ` · φ = 1/${fmt(1 / R.imp.phi.phi, 0)}` : ''}` : '' },
    { t: 'hint', ex: true, exT: 'Którą metodę wybrać?', h: () => '<b>II rząd + φ</b> (zalecana dla słupów wspornikowych i ram przechyłowych): siły wewnętrzne z analizy II rzędu z imperfekcją przechyłową, sprawdzenie elementu wg 6.3 z długościami wyboczeniowymi postaci nieprzechyłowej. <b>II rząd + φ + e₀</b>: wyboczenie giętne ujęte w analizie – sprawdza się nośność przekrojów na całej wysokości i zwichrzenie. <b>I rząd</b>: klasyczne podejście z długościami wyboczeniowymi z postaci przechyłowej – dopuszczalne, gdy α<sub>cr</sub> ≥ 10 lub z L<sub>cr</sub> postaci globalnej (5.2.2(8)).' }
  ] },
  { id: 'stab', title: 'Stateczność – parametry i nadpisania', items: [
    { k: 'analiza.interMet', t: 'sel', l: 'Współczynniki interakcji k_{ij}', o: () => [['ndp', `wg NDP (zał. ${S.normy.ndp1.interMet})`], ['B', 'zał. B (metoda 2)'], ['A', 'zał. A (metoda 1)']], wide: true },
    { k: ND('ltbMet'), t: 'sel', l: 'Metoda χ_{LT}', o: [['6.3.2.3', '6.3.2.3 – walcowane i spawane równoważne'], ['6.3.2.2', '6.3.2.2 – przypadek ogólny']], wide: true },
    { k: ND('kcMet'), t: 'sel', l: 'Współczynnik k_{c}', o: [['tab66', 'tabl. 6.6 / 1/√C₁ (MES)'], ['1', 'k_c = 1 (f = 1)']], wide: true },
    { k: 'analiza.ogolna', t: 'chk', l: 'Dodatkowo metoda ogólna 6.3.4 (elementy obciążone w płaszczyźnie)' },
    { t: 'sub', l: 'Ręczne nadpisania (puste = automatycznie)' },
    { k: 'analiza.nadp.LcrY', t: 'num', l: 'L_{cr,y}', u: 'm', list: ['', 3, 4, 5, 6, 8, 10, 12], opt: true, ph: 'MES', min: 0.1 },
    { k: 'analiza.nadp.LcrZ', t: 'num', l: 'L_{cr,z}', u: 'm', list: ['', 1, 1.5, 2, 3, 4, 5, 6], opt: true, ph: 'MES', min: 0.1 },
    { k: 'analiza.nadp.muY', t: 'num', l: 'μ_{y} (L_{cr} = μH)', list: ['', 0.5, 0.7, 1, 1.2, 1.5, 2, 2.5], opt: true, ph: 'MES', min: 0.1, show: s => !isMan(s.analiza.nadp.LcrY) },
    { k: 'analiza.nadp.muZ', t: 'num', l: 'μ_{z} (L_{cr} = μH)', list: ['', 0.5, 0.7, 1, 1.2, 1.5, 2], opt: true, ph: 'MES', min: 0.1, show: s => !isMan(s.analiza.nadp.LcrZ) },
    { k: 'analiza.nadp.LcrT', t: 'num', l: 'L_{cr,T} (skrętne)', u: 'm', list: ['', 1, 2, 3, 4, 5, 6], opt: true, ph: 'MES', min: 0.1, show: () => KIND() === 'walc' || KIND() === 'spaw' },
    { k: 'analiza.nadp.krzY', t: 'sel', l: 'Krzywa wyboczeniowa y–y', o: CURVES },
    { k: 'analiza.nadp.krzZ', t: 'sel', l: 'Krzywa wyboczeniowa z–z', o: CURVES },
    { k: 'analiza.nadp.krzLT', t: 'sel', l: 'Krzywa zwichrzenia', o: [['auto', 'auto (tabl. 6.4/6.5)'], ['a', 'a'], ['b', 'b'], ['c', 'c'], ['d', 'd']], show: () => KIND() === 'walc' || KIND() === 'spaw' },
    { k: 'analiza.nadp.Mcr', t: 'num', l: 'M_{cr}', u: 'kNm', list: ['', 100, 200, 500, 1000], opt: true, ph: 'MES', min: 1, show: () => KIND() === 'walc' || KIND() === 'spaw' },
    { k: 'analiza.nadp.kc', t: 'num', l: 'k_{c}', list: ['', 0.6, 0.7, 0.75, 0.8, 0.86, 0.9, 0.94, 1], opt: true, ph: 'auto', min: 0.5, max: 1, show: () => KIND() === 'walc' || KIND() === 'spaw' },
    { k: 'analiza.nadp.Cmy', t: 'num', l: 'C_{my}', list: ['', 0.4, 0.6, 0.8, 0.9, 0.95, 1], opt: true, ph: 'tabl. B.3/A.2', min: 0.2, max: 1.5 },
    { k: 'analiza.nadp.Cmz', t: 'num', l: 'C_{mz}', list: ['', 0.4, 0.6, 0.8, 0.9, 0.95, 1], opt: true, ph: 'tabl. B.3/A.2', min: 0.2, max: 1.5 },
    { k: 'analiza.nadp.CmLT', t: 'num', l: 'C_{mLT}', list: ['', 0.4, 0.6, 0.8, 0.9, 1], opt: true, ph: 'tabl. B.3/A.2', min: 0.2, max: 3, show: () => KIND() === 'walc' || KIND() === 'spaw' },
    { t: 'hint', h: () => stabHint() }
  ] },
  { id: 'base', title: 'Podstawa słupa (PN-EN 1993-1-8)', items: [
    { k: 'podstawa.aktywna', t: 'chk', l: 'Projektuj podstawę słupa', re: true },
    { k: 'podstawa.typ', t: 'sel', l: 'Rodzaj podstawy', o: [['sztywna', 'utwierdzona (kotwy poza pasami)'], ['przegub', 'przegubowa (kotwy wewnątrz)']], wide: true, re: true, show: s => s.podstawa.aktywna },
    { k: 'podstawa.podatna', t: 'chk', l: 'Uwzględnij podatność podstawy w modelu (S_{j,ini})', re: true, show: s => s.podstawa.aktywna && s.podstawa.typ === 'sztywna' },
    { t: 'html', h: () => S.podstawa.aktywna ? baseSummaryHTML() : '' }
  ] },
  { id: 'sls', title: 'SGU – przemieszczenia poziome', items: [
    { k: 'sgu.typ', t: 'sel', l: 'Rodzaj słupa', o: () => Object.keys(N.PRZEM).map(k => [k, N.PRZEM[k].nazwa]), wide: true, re: true },
    { k: 'sgu.lim', t: 'num', l: 'Graniczne w kierunku z: H/…', list: [100, 150, 200, 250, 300, 400, 500], min: 50 },
    { k: 'sgu.limZ', t: 'num', l: 'Graniczne w kierunku y: H/…', list: [100, 150, 200, 250, 300, 400, 500], min: 50 }
  ] },
  { id: 'fire', title: 'Pożar (PN-EN 1993-1-2)', closed: true, items: [
    { k: 'pozar.aktywny', t: 'chk', l: 'Sprawdź odporność ogniową', re: true },
    { k: 'pozar.R', t: 'sel', l: 'Klasa odporności', o: [15, 30, 45, 60, 90, 120].map(v => [v, 'R ' + v]), num: true, show: s => s.pozar.aktywny },
    { k: 'pozar.ekspozycja', t: 'sel', l: 'Ekspozycja', o: [['4', 'ze wszystkich stron'], ['3', 'z trzech stron (pas −z przy ścianie)']], wide: true, show: s => s.pozar.aktywny },
    { k: 'pozar.ochrona', t: 'sel', l: 'Ochrona ogniochronna', o: [['brak', 'brak'], ['natrysk', 'natrysk / farba (konturowa)'], ['plyty', 'płyty (skrzynkowa)']], wide: true, re: true, show: s => s.pozar.aktywny },
    { k: 'pozar.dp', t: 'num', l: 'Grubość ochrony d_{p}', u: 'mm', list: [10, 15, 20, 25, 30, 40, 50], min: 1, show: s => s.pozar.aktywny && s.pozar.ochrona !== 'brak' },
    { k: 'pozar.lp', t: 'num', l: 'λ_{p} ochrony', u: 'W/mK', list: [0.05, 0.08, 0.1, 0.12, 0.15, 0.2], min: 0.01, show: s => s.pozar.aktywny && s.pozar.ochrona !== 'brak' },
    { k: 'pozar.cp', t: 'num', l: 'c_{p}', u: 'J/kgK', list: [1000, 1100, 1200, 1500], min: 100, show: s => s.pozar.aktywny && s.pozar.ochrona !== 'brak' },
    { k: 'pozar.rp', t: 'num', l: 'ρ_{p}', u: 'kg/m³', list: [150, 300, 450, 600, 800], min: 10, show: s => s.pozar.aktywny && s.pozar.ochrona !== 'brak' },
    { k: 'pozar.LcrFi', t: 'num', l: 'L_{cr,fi}/L_{cr} (np. 0,5–0,7 w ramach stężonych)', list: [0.5, 0.7, 1], min: 0.1, max: 1, show: s => s.pozar.aktywny },
    { k: ND('psiAcc'), t: 'sel', l: 'Wiodące zmienne w 6.11b', o: [['psi1', 'ψ₁'], ['psi2', 'ψ₂']], show: s => s.pozar.aktywny }
  ] },
  { id: 'exe', title: 'Kruche pękanie i wykonanie', closed: true, items: [
    { k: 'kruche.Tmd', t: 'num', l: 'T_{md} (PN-EN 1991-1-5)', u: '°C', list: [-15, -20, -25, -30, -35, -40], max: 10 },
    { k: 'kruche.dTr', t: 'num', l: 'ΔT_{r} (promieniowanie)', u: 'K', list: [0, -5, -10], max: 0 },
    { k: 'wykonanie.CC', t: 'sel', l: 'Klasa konsekwencji', o: [['CC1', 'CC1'], ['CC2', 'CC2'], ['CC3', 'CC3']] },
    { k: 'wykonanie.EXC', t: 'sel', l: 'Klasa wykonania', o: [['auto', 'automatycznie (zał. C)'], ['EXC1', 'EXC1'], ['EXC2', 'EXC2'], ['EXC3', 'EXC3'], ['EXC4', 'EXC4']] },
    { k: 'wykonanie.korozja', t: 'sel', l: 'Kategoria korozyjności', o: ['C1', 'C2', 'C3', 'C4', 'C5', 'CX'].map(v => [v, v]) },
    { t: 'html', h: () => `<div class="row wide"><span></span><span><button class="btn sm" data-act="ndp" type="button">Parametry krajowe (NDP) i normy…</button> <button class="btn sm" data-act="meta" type="button">Dane projektu…</button></span></div>` }
  ] }
];
A.GROUPS = GROUPS;

function secHint() {
  if (!R || !R.sec) return '';
  const s = R.sec, b = R.base;
  return `${esc(s.nazwa)}: A = ${fmt(s.A / 100, 2)} cm², I<sub>y</sub> = ${fmt(s.Iy / 1e4, 0)} cm⁴, I<sub>z</sub> = ${fmt(s.Iz / 1e4, 0)} cm⁴, i<sub>y</sub>/i<sub>z</sub> = ${fmt(s.iy / 10, 2)}/${fmt(s.iz / 10, 2)} cm, ${fmt(s.masa, 1)} kg/m · f<sub>y</sub> = ${fmt(R.mat.fy, 0)} MPa · klasa N/M<sub>y</sub>/M<sub>z</sub>: ${b.kN.cls}/${b.kMy.cls}/${b.kMz.cls} · N<sub>c,Rd</sub> = ${fmt(b.Nc / 1e3, 0)} kN, M<sub>c,y,Rd</sub> = ${fmt(b.Mcy / 1e6, 1)} kNm`;
}
function stabHint() {
  if (!R || !R.res || !R.res.length) return '';
  const g = BS.Raport.govMember(R); if (!g) return '';
  const m = g.mem, fy = m.flex.y, fz = m.flex.z;
  return `Kombinacja decydująca (${esc(g.combo.id)}): L<sub>cr,y</sub> = ${isFinite(fy.Lcr) ? fmt(fy.Lcr / 1000, 2) + ' m' : '—'} (λ̄<sub>y</sub> = ${fmt(fy.lam, 2)}, χ<sub>y</sub> = ${fmt(fy.chi, 3)}), L<sub>cr,z</sub> = ${isFinite(fz.Lcr) ? fmt(fz.Lcr / 1000, 2) + ' m' : '—'} (λ̄<sub>z</sub> = ${fmt(fz.lam, 2)}, χ<sub>z</sub> = ${fmt(fz.chi, 3)})${m.segs[0] && isFinite(m.segs[0].Mcr) ? ` · M<sub>cr</sub> = ${fmt(m.segs[0].Mcr / 1e6, 0)} kNm, χ<sub>LT</sub> = ${fmt(m.segs[0].chiLT, 3)}` : ''}. Szczegóły – zakładka <b>Stateczność</b>.`;
}
function loadListHTML() {
  const L = S.obciazenia || [];
  let h = '<div class="ldlist">';
  L.forEach((o, i) => {
    const col = D.loadColor(o);
    const sk = (o.sklad || []).map(p => p.typ === 'N' ? `N ${fmt(U.num(p.F), 1)} kN${U.num(p.ez) || U.num(p.ey) ? ` (e ${fmt(U.num(p.ez), 0)}/${fmt(U.num(p.ey), 0)})` : ''}` : p.typ === 'H' ? `H<sub>${p.kier}</sub> ${fmt(U.num(p.F), 1)} kN` : p.typ === 'q' ? `q<sub>${p.kier}</sub> ${fmt(U.num(p.q0), 2)} kN/m` : `M<sub>${p.os}</sub> ${fmt(U.num(p.M), 1)} kNm`).join(', ');
    h += `<div class="lrow" style="border-left:3px solid ${col};padding-left:6px"><input type="checkbox" data-lon="${i}" ${o.aktywne !== false ? 'checked' : ''} title="uwzględnij w obliczeniach"><b style="color:${col};min-width:30px">${esc(o.id)}</b><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(o.nazwa)}">${esc(o.nazwa)} <small>– ${sk}</small></span><button class="btn sm" data-ledit="${i}" type="button">Zmień…</button></div>`;
  });
  h += `<div class="lrow"><button class="btn sm pri" data-act="addload" type="button">+ Obciążenie…</button></div></div>`;
  return h;
}
function baseSummaryHTML() {
  const o = S.podstawa, k = o.kotwy || {};
  const pb = R && R.pb && R.pb.C;
  let w = '';
  if (R && R.checks) { const cs = R.checks.filter(c => /^PB/.test(c.id) && !c.info); if (cs.length) { const m = cs.reduce((a, c) => (c.util > a.util ? c : a)); w = ` · η<sub>max</sub> = <b style="color:var(--${m.status === 'fail' ? 'fail' : 'ok'})">${fmt(m.util * 100, 0)}%</b> (${esc(m.n)})`; } }
  return `<div class="hint">Blacha ${fmt(U.num(o.lp), 0)} × ${fmt(U.num(o.bp), 0)} × ${fmt(U.num(o.tp), 0)} mm ${esc(o.gat)}; kotwy ${pb ? pb.nb : ''} × ${esc(k.d)} kl. ${esc(k.kl)}; beton ${esc(o.beton)}${w}</div><div class="row wide"><span></span><span><button class="btn sm" data-act="basewin" type="button">Projektant podstawy…</button></span></div>`;
}
const optsOf = (f) => (typeof f.o === 'function' ? f.o(S) : f.o);
function hintHTML(f) { const h = f.h(S); if (!h) return ''; return f.ex ? exDetails(h, f.exT) : h; }
function fieldsHTML(items, gid) {
  let html = '';
  items.forEach((f, i) => {
    if (f.show && !f.show(S)) return;
    const id = `f_${gid}_${i}`;
    if (f.t === 'hint') { const h = hintHTML(f); if (h) html += `<div class="hint">${h}</div>`; return; }
    if (f.t === 'sub') { html += `<div class="lsub">${sym(f.l)}</div>`; return; }
    if (f.t === 'html') { html += f.h(S); return; }
    if (f.t === 'sel') {
      const v = getP(S, f.k), num = typeof f.num === 'function' ? f.num() : f.num;
      const sel = optsOf(f).map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`).join('');
      html += `<div class="row ${f.wide ? 'wide' : ''}"><label for="${id}">${sym(f.l)}</label><select id="${id}" data-k="${f.k}" data-num="${num ? 1 : ''}" data-re="${f.re ? 1 : ''}">${sel}</select>${f.wide ? '' : '<span></span>'}</div>`;
    } else if (f.t === 'num') {
      const v = getP(S, f.k), list = typeof f.list === 'function' ? f.list() : (f.list || []);
      html += `<div class="row"><label for="${id}">${sym(f.l)}</label><div class="combo"><input id="${id}" data-k="${f.k}" value="${esc(showNum(v))}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} data-opt="${f.opt ? 1 : ''}" data-min="${f.min !== undefined ? f.min : ''}" data-max="${f.max !== undefined ? f.max : ''}" data-re="${f.re ? 1 : ''}" autocomplete="off" spellcheck="false"><button tabindex="-1" type="button" data-list="${esc(JSON.stringify(list))}" aria-label="lista">▾</button></div><span class="unit">${f.u || ''}</span></div>`;
    } else if (f.t === 'chk') {
      html += `<label class="chk"><input type="checkbox" data-k="${f.k}" data-re="${f.re ? 1 : ''}" ${getP(S, f.k) ? 'checked' : ''}><span>${sym(f.l)}</span></label>`;
    }
  });
  return html;
}
A.fieldsHTML = fieldsHTML;
let openG = null;
function isOpen(g) {
  if (!openG) { try { openG = JSON.parse(localStorage.getItem('ss.grp') || 'null'); } catch (e) { openG = null; } }
  if (openG && g.id in openG) return openG[g.id];
  return !g.closed;
}
function renderInputs() {
  const el = $('#inputs'); if (!el) return;
  const sc = el.closest('.dleft') ? el.closest('.dleft').scrollTop : 0;
  el.innerHTML = GROUPS.filter(g => !g.show || g.show(S)).map(g => `<details class="grp" data-g="${g.id}" ${isOpen(g) ? 'open' : ''}><summary>${esc(g.title)}</summary><div class="fields">${fieldsHTML(g.items, g.id)}</div></details>`).join('');
  bindFields(el);
  $$('details.grp', el).forEach(d => d.addEventListener('toggle', () => { openG = openG || {}; openG[d.dataset.g] = d.open; try { localStorage.setItem('ss.grp', JSON.stringify(openG)); } catch (e) { /* */ } }));
  renderAutoBar(); renderDsum(); renderDataSide();
  if (el.closest('.dleft')) el.closest('.dleft').scrollTop = sc;
}
A.renderInputs = renderInputs;

/* skutki zmian pól */
function onSet(k, v) {
  if (k === 'schemat' && v !== 'wlasny') J.applyScheme(S, v);
  if (/^podpory\./.test(k)) S.schemat = J.schemeOf(S);
  if (k === 'sgu.typ' && N.PRZEM[v]) { S.sgu.lim = N.PRZEM[v].lim; S.sgu.limZ = N.PRZEM[v].lim; }
  if (k === 'przekroj.typ') {
    const d = S.przekroj;
    if (v === 'walc') Object.assign(d, { seria: 'HEB', nr: 240 });
    else if (v === 'rura') Object.assign(d, { seria: 'SHS', nr: '200x10', wyk: d.wyk || 'gor', h: d.h || 200, b: d.b || 200, t: d.t || 10 });
    else if (v === 'chs') Object.assign(d, { seria: 'CHS', nr: '219.1x8', wyk: d.wyk || 'gor', D: d.D || 219.1, t: d.t || 8 });
    else if (v === 'spaw') Object.assign(d, { h: U.num(d.h) > 150 ? d.h : 400, bg: d.bg || 300, tg: d.tg || 16, bd: d.bd || d.bg || 300, td: d.td || 16, tw: d.tw || 10, aw: d.aw || 5 });
  }
  if (k === 'przekroj.seria') { const L = P.lista(v); if (L.length && !L.map(String).includes(String(S.przekroj.nr))) S.przekroj.nr = L[Math.floor(L.length / 2)]; }
  if (k === 'material.gatunek') { const pods = (M.STAL[v] || { pod: ['JR'] }).pod; if (!pods.includes(S.material.podgatunek)) S.material.podgatunek = pods[pods.length - 1]; }
  if (k === 'podstawa.typ') { S.podstawa.kotwy.uklad = v === 'sztywna' ? 'zew' : 'wew'; }
}
A.onSet = onSet;
function numInput(el, final) {
  const raw = el.value.trim(), opt = !!el.dataset.opt;
  const min = el.dataset.min !== '' && el.dataset.min !== undefined ? parseFloat(el.dataset.min) : null, max = el.dataset.max ? parseFloat(el.dataset.max) : null;
  if (raw === '' && opt) { el.classList.remove('bad'); setP(S, el.dataset.k, ''); changed(final && !!el.dataset.re); return; }
  const v = parseNum(raw);
  const bad = v === null || (min !== null && v < min) || (max !== null && v > max);
  el.classList.toggle('bad', bad);
  if (bad) { if (final && v !== null) Q.toast(`Dopuszczalny zakres: ${min !== null ? 'od ' + showNum(min) : ''}${max !== null ? ' do ' + showNum(max) : ''}`, 4500); return; }
  setP(S, el.dataset.k, v); onSet(el.dataset.k, v);
  if (final) el.value = showNum(v);
  changed(final && !!el.dataset.re);
}
A.numInput = numInput;
function bindFields(host, after) {
  const done = (re) => { if (!after) return; if (!re) { after(false); return; } if (host.__pend) return; host.__pend = true; setTimeout(() => { host.__pend = false; after(true); }, 0); };
  $$('select[data-k]', host).forEach(el => el.addEventListener('change', () => {
    let v = el.value; if (el.dataset.num) v = parseNum(v);
    setP(S, el.dataset.k, v); onSet(el.dataset.k, v); changed(!!el.dataset.re || el.dataset.k === 'schemat'); done(!!el.dataset.re);
  }));
  $$('.combo input[data-k]', host).forEach(el => {
    el.addEventListener('input', () => { numInput(el, false); done(false); });
    el.addEventListener('change', () => { numInput(el, true); done(!!el.dataset.re); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { numInput(el, true); done(!!el.dataset.re); } });
  });
  $$('.combo button', host).forEach(b => b.addEventListener('click', () => Q.openList(b, inp => { numInput(inp, true); done(!!inp.dataset.re); })));
  $$('input[type=checkbox][data-k]', host).forEach(el => el.addEventListener('change', () => { setP(S, el.dataset.k, el.checked); onSet(el.dataset.k, el.checked); changed(!!el.dataset.re); done(!!el.dataset.re); }));
  $$('input[data-kt], textarea[data-kt]', host).forEach(el => el.addEventListener('input', () => { setP(S, el.dataset.kt, el.value); changed(false); done(false); }));
  $$('[data-lon]', host).forEach(cb => cb.addEventListener('change', () => { S.obciazenia[+cb.dataset.lon].aktywne = cb.checked; changed(true); }));
  $$('[data-ledit]', host).forEach(b => b.addEventListener('click', () => A.loadPopup(+b.dataset.ledit)));
}
A.bindFields = bindFields;

/* ================================================================ OBLICZENIA */
let tmr = null, popRedraw = null;
A.setPopRedraw = (f) => { popRedraw = f; };
function changed(rerender) {
  dirty = true; updateTitle();
  if (rerender) renderInputs();
  clearTimeout(tmr); tmr = setTimeout(recalc, 120);
  autosave();
}
A.changed = changed;
function recalc() {
  try { R = J.run(S); } catch (e) { console.error(e); R = { errors: ['Błąd obliczeń: ' + e.message], warnings: [], checks: [], info: [] }; }
  rendered = {};
  renderStatus(); renderDsum(); refreshHints(); renderDataSide(); renderActive();
  if (popRedraw && Q.isModal()) { try { popRedraw(); } catch (e) { console.error(e); } }
}
A.recalc = recalc;
A.recalcNow = () => { clearTimeout(tmr); recalc(); };
function refreshHints() {
  const el = $('#inputs'); if (!el) return;
  GROUPS.forEach(g => {
    const d = $(`details[data-g="${g.id}"] .fields`, el); if (!d || d.contains(document.activeElement)) return;
    if (!g.items.some(f => f.t === 'hint' || f.t === 'html')) return;
    const open = d.parentElement.open; d.innerHTML = fieldsHTML(g.items, g.id); bindFields(d); d.parentElement.open = open;
  });
}
function renderStatus() {
  const el = $('#status');
  if (!R || (R.errors && R.errors.length)) { el.className = 'fail'; el.textContent = '✖ Błąd danych'; return; }
  const fails = R.checks.filter(c => c.status === 'fail' && !c.info).length, warns = R.checks.filter(c => c.status === 'warn').length;
  if (fails) { el.className = 'fail'; el.textContent = `✖ Niespełnione warunki: ${fails}`; }
  else if (warns) { el.className = 'warn'; el.textContent = `✔ Nośność OK · uwagi: ${warns} · η = ${fmt(R.uMax * 100, 0)}%`; }
  else { el.className = 'ok'; el.textContent = `✔ Wszystkie warunki spełnione · η = ${fmt(R.uMax * 100, 0)}%`; }
}

/* ---------------------------------------------------------- chipy sprawdzeń */
const DSUM = [
  ['SGN', 'przekrój', c => /^Nośność przekroju/.test(c.grp)],
  ['', 'wyboczenie', c => /^B[yzT]$/.test(c.id)],
  ['', 'zwichrzenie', c => /^LT\d/.test(c.id)],
  ['', 'interakcja N–M', c => /^I6[12]/.test(c.id) || c.id === 'GM'],
  ['', 'analiza globalna', c => c.id === 'acr'],
  ['SGU', 'przemieszczenia', c => /^w[yz]$/.test(c.id)],
  ['', 'podstawa', c => /^PB/.test(c.id)],
  ['', 'pożar', c => c.id === 'FI'],
  ['', 'kruche pękanie', c => /^KR/.test(c.id)]
];
function dsumHTML() {
  if (!R || !R.checks) return '';
  if (R.errors && R.errors.length) return `<div class="dsum"><button class="dsb fail" data-dgerr="1">✖ błąd danych – ${esc(R.errors[0]).slice(0, 110)}</button></div>`;
  let h = '<div class="dsum">';
  DSUM.forEach(([a, l, pr], gi) => {
    const cs = R.checks.filter(pr); if (!cs.length) return;
    const real = cs.filter(x => !x.info);
    const st = cs.some(x => x.status === 'fail') ? 'fail' : cs.some(x => x.status === 'warn') ? 'warn' : 'ok';
    const rv = x => (x.util !== null && isFinite(x.util) ? x.util : (x.status === 'fail' ? 9.99 : 0)), w = (real.length ? real : cs).reduce((p, q) => (rv(q) > rv(p) ? q : p));
    const bad = cs.filter(x => x.status === 'fail').length;
    const pc = gi === 4 ? `α<sub>cr</sub> = ${fmt(Math.min(R.alphaMin.y, R.alphaMin.z), 1)}` : (w.util !== null && isFinite(w.util) ? fmt(w.util * 100, 0) + '%' : (w.status === 'fail' ? '∞' : ''));
    h += `<button class="dsb ${st}" data-dg="${gi}" title="${esc(w.n)} · kliknij, aby przejść do Podsumowania"><span class="ic">${st === 'fail' ? '✖' : st === 'warn' ? '!' : '✔'}</span>${a ? `<b>${a}</b> ` : ''}${sym(l)}<span class="pc">${pc}</span>${bad ? `<span class="nb">${bad}</span>` : ''}</button>`;
  });
  return h + '</div>';
}
function bindDsum(el) {
  $$('[data-dgerr]', el).forEach(b => b.addEventListener('click', () => A.selectTab('sum')));
  $$('[data-dg]', el).forEach(b => b.addEventListener('click', () => {
    const pr = DSUM[+b.dataset.dg][2], c = R.checks;
    const x = c.find(q => pr(q) && q.status === 'fail') || c.find(q => pr(q) && q.status === 'warn') || c.filter(pr).reduce((a, q) => (!a || (q.util || 0) > (a.util || 0) ? q : a), null);
    A.selectTab('sum'); setTimeout(() => { const i = c.indexOf(x); const tr = $(`#p-sum tr[data-ci="${i}"]`); if (tr) { tr.scrollIntoView({ block: 'center' }); Q.flash(tr); } }, 60);
  }));
}
function renderDsum() {
  const el = $('#dsum'); if (el) { el.innerHTML = dsumHTML(); bindDsum(el); }
  $$('.dsumx').forEach(x => { x.innerHTML = dsumHTML(); bindDsum(x); });
}
A.dsumHTML = dsumHTML; A.bindDsum = bindDsum;

/* ---------------------------------------------------------- dobór (pasek nad danymi) */
function renderAutoBar() {
  const el = $('#autobar'); if (!el) return;
  const eta = (S.design && S.design.eta) || 100;
  el.innerHTML = `<div class="autobar"><button class="btn sm" id="adSec" type="button" title="Najlżejszy kształtownik tego samego rodzaju i serii (dla dwuteownika spawanego – grubości pasów i środnika), dla którego spełnione są wszystkie warunki: nośność przekroju, wyboczenie, zwichrzenie, interakcja, SGU – z wytężeniem ≤ η">⚙ Dobierz przekrój</button>
    <button class="btn sm" id="adBase" type="button" title="Blacha podstawy (wymiary, grubość), kotwy (średnica, klasa) – najmniejsza masa przy wytężeniu ≤ η">⚙ Dobierz podstawę</button>
    <button class="btn sm pri" id="adAll" type="button" title="Przekrój, a następnie podstawa (z iteracją przy podstawie podatnej)">⚙ Dobierz wszystko</button>
    <label class="adeta" title="Wymagane wytężenie w doborze: E_d / R_d ≤ η">wytężenie ≤ <input class="txt sm" id="adEta" value="${eta}" inputmode="numeric" autocomplete="off" spellcheck="false"> %</label></div>`;
  const inp = $('#adEta', el);
  inp.addEventListener('change', () => { const v = parseNum(inp.value); const ok = v !== null && v >= 50 && v <= 100; inp.classList.toggle('bad', !ok); if (ok) { S.design = Object.assign({}, S.design, { eta: Math.round(v) }); dirty = true; autosave(); } });
  $('#adSec', el).onclick = () => A.runDesign('sec');
  $('#adBase', el).onclick = () => A.runDesign('base');
  $('#adAll', el).onclick = () => A.runDesign('all');
}
A.runDesign = async function (kind) {
  const eta = (S.design && S.design.eta) || 100;
  const wait = (t) => new Promise(r => setTimeout(r, t));
  Q.toast('Dobór w toku…', 20000); await wait(30);
  const old = U.clone(S);
  const msgs = [];
  try {
    for (let it = 0; it < 3; it++) {
      if (kind === 'sec' || kind === 'all') {
        const r = J.designSection(S, eta);
        if (r.err) { msgs.push(r.err); break; }
        const prev = P.props(S.przekroj).nazwa; S.przekroj = r.d; const now = P.props(r.d).nazwa;
        if (it === 0 || prev !== now) msgs.push(`przekrój: ${now} (${fmt(r.masa, 1)} kg/m)`);
      }
      if ((kind === 'base' || kind === 'all') && S.podstawa.aktywna) {
        const R1 = J.run(S);
        const b = J.designBase(S, R1, eta);
        if (b.err) { msgs.push(b.err); break; }
        Object.assign(S.podstawa, { lp: b.lp, bp: b.bp, tp: b.tp }); Object.assign(S.podstawa.kotwy, { d: b.d, kl: b.kl, ez: b.ez, w: b.w, uklad: b.uklad }); S.podstawa.spoiny = { pas: b.af, srodnik: b.aw };
        msgs.push(`podstawa: ${b.lp}×${b.bp}×${b.tp} mm, kotwy ${b.d} kl. ${b.kl}, spoiny ${b.af}/${b.aw} mm`);
      }
      if (kind !== 'all') break;
      const R2 = J.run(S);
      if (J.passes(R2, eta)) break;
    }
  } catch (e) { console.error(e); msgs.push('Błąd doboru: ' + e.message); S = old; }
  dirty = true; renderInputs(); recalc(); updateTitle(); autosave();
  const ok = R && J.passes(R, eta);
  Q.toast((ok ? '✔ ' : '! ') + msgs.slice(-3).join(' · ') + (ok ? '' : ' – sprawdź Podsumowanie'), 6000);
};

/* ================================================================ PANEL BOCZNY – SCHEMAT */
function colTabsHTML() {
  if (!COLS || COLS.length < 2) return `<div class="schtools" style="display:flex;gap:6px;align-items:center"><button class="btab on" data-btab="0" type="button"><span>1 ${esc((S.meta.nazwa || '').slice(0, 14))}</span></button><button class="btn sm" data-badd="1" type="button" title="Dodaj słup do projektu">+</button></div>`;
  return `<div class="schtools" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${COLS.map((b, i) => `<button class="btab ${i === curC ? 'on' : ''}" data-btab="${i}" type="button"><span>${i + 1} ${esc((b.meta.nazwa || '').slice(0, 14))}</span>${COLS.length > 1 ? `<i data-bdel="${i}" title="Usuń słup">×</i>` : ''}</button>`).join('')}<button class="btn sm" data-badd="1" type="button">+</button></div>`;
}
function renderDataSide() {
  const el = $('#dataside'); if (!el) return;
  const W = Math.max(250, Math.min(360, (el.clientWidth || 640) / 2 - 22));
  const ok = R && R.res && !R.errors.length;
  const gv = ok ? BS.Raport.govMember(R) : null;
  const secName = R && R.sec ? `${R.sec.nazwa} · ${S.material.gatunek}${S.material.podgatunek}` : '';
  if (!ok || (schCombo !== null && !R.res[schCombo])) schCombo = null;
  const sf = schF();
  const DG = [['M', 'M', 'Momenty zginające M_Ed'], ['V', 'V', 'Siły poprzeczne V_Ed'], ['N', 'N', 'Siła podłużna N_Ed'], ['w', 'przemieszczenie', 'Przemieszczenia poziome (SGU)'], ['buck', 'wyboczenie', 'Postać wyboczenia i L_cr'], ['none', 'bez wykresu', 'Tylko schemat i obciążenia']];
  let h = colTabsHTML();
  h += `<div class="box"><div class="schhead"><h4>Schemat statyczny i obciążenia</h4><div class="schtools"><button class="btn sm" data-act="addload" type="button" title="Nowe obciążenie (wiele składników: N, H, q, M)">+ Obciążenie</button><button class="btn sm" data-stool="sup" type="button" title="Warunki podparcia w obu płaszczyznach">Podparcie</button><button class="btn sm" data-act="braces" type="button" title="Stężenia boczne i skrętne na wysokości słupa">Stężenia</button><button class="btn sm" data-act="secwin" type="button" title="Przekrój: rodzaj, kształtownik, wymiary, dobór">Przekrój</button><button class="btn sm" data-act="basewin" type="button" title="Projektant podstawy słupa">Podstawa</button><button class="btn sm" data-stool="schemes" type="button" title="Typowe schematy podparcia słupa">Schematy typowe…</button><button class="btn sm" data-stool="v3d" type="button" title="Widok przestrzenny słupa z podstawą, obciążeniami i postaciami wyboczenia (zakładka „Słup i podstawa”)">Widok 3D</button></div></div>`;
  h += `<div class="schsel"><span class="mut">Kliknij obciążenie – zmiana; podporę – warunki podparcia; stężenie – edycja; słup – przekrój; dwuklik na słupie – obciążenie na tej wysokości; wykres – siły i sprawdzenia na tej wysokości; prawy przycisk – menu.</span></div>`;
  h += legendHTML();
  h += `<div class="schpair" id="schPair">${['y', 'z'].map(pl => `<div class="schemewrap">${D.scheme(S, R, pl, { W, H: 470, diag: diagMode, gov: gv, secName, loadsOn: null, F: sf ? sf.F : null, Flab: sf ? sf.lab : '' })}</div>`).join('')}</div>`;
  const comboSel = ok ? `<select id="schCombo" class="cmbsel" title="Kombinacja pokazana na wykresach schematu"><option value="">obwiednia SGN (wszystkie kombinacje)</option>${R.res.map((cr, i) => `<option value="${i}" ${schCombo === i ? 'selected' : ''}>${esc(cr.combo.id)} – ${esc((cr.combo.opis || '').slice(0, 70))}</option>`).join('')}</select>` : '';
  h += `<div class="schunder"><div class="segsw sm">${DG.map(([k, l, t]) => `<button class="${diagMode === k ? 'on' : ''}" data-diag="${k}" type="button" title="${esc(t)}">${l}</button>`).join('')}</div>${comboSel}</div>`;
  if (sf) h += `<div class="combsum"><b>${esc(sf.cr.combo.id)}</b>: ${esc(sf.cr.combo.opis || '')}${sf.cr.variants.length > 1 ? ` <small>· wariant ${esc(sf.v.lab)}</small>` : ''} · N<sub>Ed,max</sub> = ${fmt(maxA(sf.F.N) / 1e3, 1)} kN, |M<sub>y,Ed</sub>|<sub>max</sub> = ${fmt(maxA(sf.F.y.M) / 1e6, 1)} kNm, |M<sub>z,Ed</sub>|<sub>max</sub> = ${fmt(maxA(sf.F.z.M) / 1e6, 1)} kNm, η = <b>${fmt(uOf(sf.v) * 100, 0)}%</b> <button class="lnk" id="schEnv" type="button">obwiednia</button></div>`;
  if (R && R.errors && R.errors.length) h += R.errors.map(e => `<div class="msg err" style="margin-top:6px">${esc(e)}</div>`).join('');
  h += '</div>';
  h += loadTableHTML();
  if (ok) h += combosBoxHTML();
  // podsumowanie sił na fundament
  if (R && R.baseForces && R.baseForces.length) {
    const bf = R.baseForces, mx = (fn) => bf.reduce((a, q) => (Math.abs(fn(q)) > Math.abs(fn(a)) ? q : a));
    const qN = bf.reduce((a, q) => (q.N > a.N ? q : a)), qM = mx(q => q.My), qMz = mx(q => q.Mz), qV = bf.reduce((a, q) => (Math.hypot(q.Vy, q.Vz) > Math.hypot(a.Vy, a.Vz) ? q : a));
    const row = (l, q) => `<tr data-selcid="${esc(q.combo.id)}" title="Pokaż tę kombinację na schemacie"><td>${l}</td><td class="n">${fmt(q.N / 1e3, 1)}</td><td class="n">${fmt(q.My / 1e6, 1)}</td><td class="n">${fmt(q.Mz / 1e6, 1)}</td><td class="n">${fmt(Math.hypot(q.Vy, q.Vz) / 1e3, 1)}</td><td><small>${esc(q.combo.id)}</small></td></tr>`;
    h += `<div class="box"><div class="schhead"><h4>Siły na fundament (obliczeniowe)</h4><button class="btn sm" data-act="basewin" type="button">Podstawa…</button></div><div class="tscroll"><table class="ldsum"><thead><tr><th></th><th>N [kN]</th><th>M<sub>y</sub> [kNm]</th><th>M<sub>z</sub> [kNm]</th><th>V [kN]</th><th>komb.</th></tr></thead><tbody>${row('max N', qN)}${row('max |M<sub>y</sub>|', qM)}${row('max |M<sub>z</sub>|', qMz)}${row('max V', qV)}</tbody></table></div></div>`;
  }
  el.innerHTML = h;
  bindSide(el);
  Q.zoomApply(el);
}
A.renderDataSide = renderDataSide;
const uOf = v => (v && v.mem ? Math.max(0, ...v.mem.segs.map(s => s.u)) : 0);
const maxA = a => (a ? Array.from(a).reduce((m, v) => Math.max(m, Math.abs(v)), 0) : 0);
// siły wybranej kombinacji (wariant decydujący) – do wykresów schematu
function schF() {
  if (schCombo === null || !R || !R.res || !R.res[schCombo]) return null;
  const cr = R.res[schCombo], v = cr.variants.reduce((a, q) => (uOf(q) > uOf(a) ? q : a), cr.variants[0]);
  if (!v || !v.F || !v.F.y) return null;
  return { cr, v, F: v.F, lab: cr.combo.id };
}
A.schF = schF;
A.setSchCombo = (i) => { schCombo = i; renderDataSide(); };
const skladTxt = (o) => (o.sklad || []).map(p => p.typ === 'N' ? `N ${fmt(U.num(p.F), 1)} kN${p.x !== '' && p.x !== undefined ? ` @ ${fmt(U.num(p.x), 2)} m` : ''}${U.num(p.ez) || U.num(p.ey) ? ` (e<sub>z</sub> ${fmt(U.num(p.ez), 0)}, e<sub>y</sub> ${fmt(U.num(p.ey), 0)} mm)` : ''}` : p.typ === 'H' ? `H<sub>${p.kier}</sub> ${fmt(U.num(p.F), 1)} kN${p.x !== '' && p.x !== undefined ? ` @ ${fmt(U.num(p.x), 2)} m` : ''}` : p.typ === 'q' ? `q<sub>${p.kier}</sub> ${fmt(U.num(p.q0), 2)}${p.q1 !== '' && p.q1 !== undefined ? '…' + fmt(U.num(p.q1), 2) : ''} kN/m` : `M<sub>${p.os}</sub> ${fmt(U.num(p.M), 1)} kNm${p.x !== '' && p.x !== undefined ? ` @ ${fmt(U.num(p.x), 2)} m` : ''}`).join('; ');
function legendHTML() {
  const L = S.obciazenia || [];
  if (!L.length) return '';
  return `<div class="legend">${L.map((o, i) => `<span class="lgi ${o.aktywne === false ? 'off' : ''}" title="${esc(o.nazwa || '')}"><input type="checkbox" data-lgon="${i}" ${o.aktywne !== false ? 'checked' : ''} title="uwzględnij w obliczeniach"><i style="background:${D.loadColor(o)}"></i><button class="lnk" data-lgopen="${i}" type="button">${esc(o.id)}</button></span>`).join('')}<span class="hint" style="margin:0">wartości charakterystyczne</span></div>`;
}
function loadTableHTML() {
  const L = S.obciazenia || [];
  const rows = L.map((o, i) => {
    const R0 = S0.RODZAJE[o.rodzaj] || { n: o.rodzaj }, psi = BS.K && BS.K.psi ? BS.K.psi(o) : null;
    return `<tr data-openload="${i}" class="${o.aktywne === false ? 'ldoff' : ''}"><td><input type="checkbox" class="ldon" data-loff="${i}" ${o.aktywne !== false ? 'checked' : ''} title="uwzględnij w obliczeniach"></td><td><b style="color:${D.loadColor(o)}">${esc(o.id)}</b></td><td>${esc(o.nazwa || '(bez nazwy)')}<small> · ${esc(R0.n)}${o.rodzaj === 'Q' && N.PSI[o.kat] ? ' ' + esc(o.kat) : ''}${o.wyklucz ? ` · grupa ${esc(o.wyklucz)}` : ''}</small></td><td class="hs">${skladTxt(o)}</td><td class="n">${psi && !R0.stale && o.rodzaj !== 'A' ? psi.map(v => fmt(v, 1)).join(' / ') : '—'}</td></tr>`;
  }).join('');
  return `<div class="box"><div class="schhead"><h4>Zestawienie obciążeń (wartości charakterystyczne)</h4><span class="hint" style="margin:0">${L.filter(o => o.aktywne !== false).length} z ${L.length} uwzględnionych</span></div>
    <div class="tscroll"><table class="ldsum"><thead><tr><th></th><th></th><th>Nazwa · rodzaj</th><th>Składniki</th><th>ψ₀ / ψ₁ / ψ₂</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="lnone">Brak obciążeń – dodaj je przyciskami poniżej.</td></tr>'}</tbody></table></div>
    <div class="addbar">${[['G', '+ stałe'], ['Q', '+ użytkowe'], ['S', '+ śnieg'], ['W', '+ wiatr'], ['T', '+ inne zmienne']].map(([k, l]) => `<button class="btn sm" data-addl="${k}" type="button">${l}</button>`).join('')}</div>
    <p class="hint">Kliknij wiersz – edycja składników; prawy przycisk – menu (duplikuj, wyłącz, usuń). Ciężar własny słupa dodawany automatycznie jako obciążenie stałe. Kombinacje tworzone automatycznie wg PN-EN 1990 (grupy wykluczające się – np. kierunki wiatru).</p></div>`;
}
function combosBoxHTML() {
  const res = R.res || []; if (!res.length) return '';
  const rk = res.map((cr, i) => { const v = cr.variants.reduce((a, q) => (uOf(q) > uOf(a) ? q : a), cr.variants[0]); return { i, cr, v, u: uOf(v) }; }).sort((a, b) => b.u - a.u).slice(0, 6);
  return `<div class="box"><div class="schhead"><h4>Kombinacje decydujące</h4><span class="hint" style="margin:0">${res.length} kombinacji SGN · ${esc(R.method === 'I' ? 'analiza I rzędu' : 'analiza II rzędu')}</span></div><div class="tscroll"><table class="ldsum"><thead><tr><th>Kombinacja</th><th>N<sub>Ed,max</sub> [kN]</th><th>|M<sub>y</sub>|<sub>max</sub> [kNm]</th><th>|M<sub>z</sub>|<sub>max</sub> [kNm]</th><th>η<sub>elem.</sub></th></tr></thead><tbody>${rk.map(q => `<tr data-selc="${q.i}" class="${schCombo === q.i ? 'sel' : ''}" style="cursor:pointer" title="Pokaż na schemacie"><td><b>${esc(q.cr.combo.id)}</b> <small>${esc((q.cr.combo.opis || '').slice(0, 60))}</small></td><td class="n">${q.v.F && q.v.F.N ? fmt(maxA(q.v.F.N) / 1e3, 1) : '—'}</td><td class="n">${q.v.F && q.v.F.y ? fmt(maxA(q.v.F.y.M) / 1e6, 1) : '—'}</td><td class="n">${q.v.F && q.v.F.z ? fmt(maxA(q.v.F.z.M) / 1e6, 1) : '—'}</td><td class="n"><b style="color:var(--${q.u > 1 ? 'fail' : 'ok'})">${fmt(q.u * 100, 0)}%</b></td></tr>`).join('')}</tbody></table></div><p class="hint">Kliknij wiersz – wykresy schematu dla tej kombinacji (wariant imperfekcji decydujący).</p></div>`;
}
function loadMenu(i, x, y) {
  const L = S.obciazenia[i]; if (!L) return;
  Q.ctxMenu(x, y, [['edit', `Zmień ${esc(L.id)}…`], ['dup', 'Duplikuj'], ['onoff', L.aktywne === false ? 'Włącz (uwzględnij w obliczeniach)' : 'Wyłącz (pomiń w obliczeniach)'], ['-'], ['del', 'Usuń…']], async a => {
    if (a === 'edit') A.loadPopup(i);
    else if (a === 'dup') { const c = U.clone(L), used = new Set(S.obciazenia.map(o => o.id)); const r = (L.id.match(/^[A-Za-z]+/) || ['Q'])[0]; let k = 1; while (used.has(r + k)) k++; c.id = r + k; c.nazwa = (L.nazwa || '') + ' (kopia)'; S.obciazenia.splice(i + 1, 0, c); changed(true); }
    else if (a === 'onoff') { L.aktywne = L.aktywne === false; changed(true); }
    else if (a === 'del') { if (await Q.ask(`Usunąć obciążenie ${esc(L.id)}?`, 'Usuń', true)) { S.obciazenia.splice(i, 1); changed(true); } }
  });
}
function addLoadOf(k) {
  const used = new Set(S.obciazenia.map(o => o.id)); const r = k === 'T' ? 'T' : k; let i = 1; while (used.has(r + i)) i++;
  const nm = { G: 'Obciążenie stałe', Q: 'Obciążenie użytkowe', S: 'Śnieg', W: 'Wiatr', T: 'Temperatura / inne' }[k];
  const L = { id: r + i, nazwa: nm, rodzaj: k, kat: 'Q-B', wyklucz: k === 'W' ? 'W' : '', aktywne: true, sklad: [k === 'W' ? { typ: 'q', kier: 'z', q0: 2, q1: '', x0: '', x1: '', wys: 'srodek' } : { typ: 'N', x: '', F: k === 'G' ? 100 : 50, ey: 0, ez: 0 }] };
  S.obciazenia.push(L); changed(true); A.loadPopup(S.obciazenia.length - 1);
}
// wysokość x [mm] w miejscu kliknięcia na schemacie
const xOfEv = (svg, ev) => { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, py = vb.y + (ev.clientY - r.top) * vb.height / r.height; const mt = +svg.dataset.mt, hh = +svg.dataset.hh, Hmm = +svg.dataset.h; return Math.max(0, Math.min(Hmm, (1 - (py - mt) / hh) * Hmm)); };
function bindSide(el) {
  $$('[data-diag]', el).forEach(b => b.addEventListener('click', () => { diagMode = b.dataset.diag; try { localStorage.setItem('ss.diag', diagMode); } catch (e) { /* */ } renderDataSide(); }));
  $$('[data-act]', el).forEach(b => b.addEventListener('click', () => doAct(b.dataset.act)));
  $$('[data-stool]', el).forEach(b => b.addEventListener('click', () => { const k = b.dataset.stool; if (k === 'sup') A.supportPopup('y'); else if (k === 'schemes') A.schemesPopup(); else if (k === 'v3d') BS.W3.open(true); }));
  const cs = $('#schCombo', el); if (cs) cs.addEventListener('change', () => A.setSchCombo(cs.value === '' ? null : +cs.value));
  const se = $('#schEnv', el); if (se) se.onclick = () => A.setSchCombo(null);
  $$('[data-selc]', el).forEach(tr => tr.addEventListener('click', () => A.setSchCombo(schCombo === +tr.dataset.selc ? null : +tr.dataset.selc)));
  $$('[data-selcid]', el).forEach(tr => tr.addEventListener('click', () => { const i = R.res.findIndex(cr => cr.combo.id === tr.dataset.selcid); if (i >= 0) A.setSchCombo(i); }));
  // obciążenia: klik – zmiana, prawy – menu
  $$('.ld', el).forEach(g => { g.addEventListener('click', ev => { ev.stopPropagation(); A.loadPopup(+g.dataset.li); }); g.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); loadMenu(+g.dataset.li, ev.clientX, ev.clientY); }); });
  $$('.supp', el).forEach(g => { g.addEventListener('click', ev => { ev.stopPropagation(); A.supportPopup(g.dataset.sup); }); g.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); const pl = g.dataset.sup; Q.ctxMenu(ev.clientX, ev.clientY, [['sup', `Warunki podparcia (${pl === 'y' ? 'x–z' : 'x–y'})…`], ['schemes', 'Schematy typowe…'], ['base', 'Podstawa słupa…']], a => { if (a === 'sup') A.supportPopup(pl); else if (a === 'schemes') A.schemesPopup(); else A.basePopup(); }); }); });
  $$('.brace', el).forEach(g => { g.addEventListener('click', ev => { ev.stopPropagation(); A.bracesPopup(+g.dataset.brace); }); g.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); const i = +g.dataset.brace; Q.ctxMenu(ev.clientX, ev.clientY, [['edit', `Zmień stężenie S${i + 1}…`], ['del', 'Usuń stężenie']], a => { if (a === 'edit') A.bracesPopup(i); else { S.stezenia.splice(i, 1); changed(true); } }); }); });
  $$('.schcol', el).forEach(g => {
    g.addEventListener('click', ev => { if (ev.detail > 1) return; A.secPopup(); });
    g.addEventListener('dblclick', ev => { const svg = g.closest('svg'); A.loadPopup(null, { x: Math.round(xOfEv(svg, ev) / 50) * 0.05, pl: svg.dataset.pl }); });
  });
  // wykresy: klik – siły i sprawdzenia na wysokości x
  $$('.schemesvg .mhit, .schemesvg .dgm', el).forEach(r => r.addEventListener('click', ev => { ev.stopPropagation(); const svg = r.closest('svg'); BS.W3.atXPopup(xOfEv(svg, ev)); }));
  $$('svg.schemesvg', el).forEach(svg => svg.addEventListener('contextmenu', ev => { ev.preventDefault(); const x = xOfEv(svg, ev), pl = svg.dataset.pl; Q.ctxMenu(ev.clientX, ev.clientY, [['at', `Siły i sprawdzenia na x = ${fmt(x / 1000, 2)} m…`], ['load', 'Dodaj obciążenie w tym miejscu…'], ['brace', 'Dodaj stężenie w tym miejscu…'], ['-'], ['sup', `Warunki podparcia (${pl === 'y' ? 'x–z' : 'x–y'})…`], ['schemes', 'Schematy typowe…'], ['sec', 'Przekrój…'], ['base', 'Podstawa słupa…']], a => {
    if (a === 'at') BS.W3.atXPopup(x); else if (a === 'load') A.loadPopup(null, { x: Math.round(x / 50) * 0.05, pl }); else if (a === 'brace') { S.stezenia.push({ x: Math.round(x / 50) * 0.05, pl, wys: 'srodek', skret: false }); changed(true); A.bracesPopup(S.stezenia.length - 1); } else if (a === 'sup') A.supportPopup(pl); else if (a === 'schemes') A.schemesPopup(); else if (a === 'sec') A.secPopup(); else A.basePopup();
  }); }));
  // legenda i zestawienie obciążeń
  $$('[data-lgon]', el).forEach(cb => cb.addEventListener('change', () => { const L = S.obciazenia[+cb.dataset.lgon]; if (L) { L.aktywne = cb.checked; changed(true); } }));
  $$('[data-lgopen]', el).forEach(b => { b.addEventListener('click', () => A.loadPopup(+b.dataset.lgopen)); b.addEventListener('contextmenu', ev => { ev.preventDefault(); loadMenu(+b.dataset.lgopen, ev.clientX, ev.clientY); }); });
  $$('[data-openload]', el).forEach(tr => { tr.addEventListener('click', e => { if (e.target.closest('input')) return; A.loadPopup(+tr.dataset.openload); }); tr.addEventListener('contextmenu', ev => { ev.preventDefault(); loadMenu(+tr.dataset.openload, ev.clientX, ev.clientY); }); });
  $$('[data-loff]', el).forEach(cb => cb.addEventListener('change', () => { S.obciazenia[+cb.dataset.loff].aktywne = cb.checked; changed(true); }));
  $$('[data-addl]', el).forEach(b => b.addEventListener('click', () => addLoadOf(b.dataset.addl)));
}

/* ================================================================ ZAKŁADKI */
function renderActive() {
  const on = $('.tabs button.on'); if (!on) return;
  const t = on.dataset.tab;
  if (t === 'data') return;
  if (rendered[t]) return;
  const el = $('#p-' + t); if (!el) return;
  try { BS.V[t](el); } catch (e) { console.error(e); el.innerHTML = `<div class="msg err">Błąd widoku: ${esc(e.message)}</div>`; }
  rendered[t] = true;
}
A.renderActive = renderActive;
A.invalidate = (t) => { if (t) rendered[t] = false; else rendered = {}; };
A.selectTab = (t) => { const b = $(`.tabs button[data-tab="${t}"]`); if (b) b.click(); };

/* ================================================================ PLIKI, SŁUPY */
const pending = {}; let reqId = 0;
window.__hostReply = (id, res) => { const p = pending[id]; if (p) { delete pending[id]; p(res); } };
function hostCall(op, args) { return new Promise(res => { const id = ++reqId; pending[id] = res; try { window.hostRequest(JSON.stringify(Object.assign({ id, op }, args))); } catch (e) { delete pending[id]; res({ ok: false, err: String(e) }); } }); }
const inHost = () => typeof window.hostRequest === 'function';
A.hostCall = hostCall; A.inHost = inHost;
const baseName = (p) => (p || '').split(/[\\/]/).pop();
const safeName = (ext) => (S.meta.nazwa || 'slup').replace(/[\\/:*?"<>|]+/g, '_').trim() + ext;
A.safeName = safeName; A.baseName = baseName;
function updateTitle() {
  const fn = filePath ? baseName(filePath) : 'bez nazwy';
  $('#fileName').textContent = (dirty ? '● ' : '') + fn;
  const t = `SłupStal – ${S.meta.nazwa || 'słup'} [${fn}${dirty ? ' *' : ''}]`;
  document.title = t;
  if (typeof window.hostTitle === 'function') { try { window.hostTitle(t); } catch (e) { /* */ } }
}
const colsSync = () => { if (!COLS) COLS = [S]; COLS[curC] = S; };
const colsOut = () => { colsSync(); return COLS.length > 1 ? { cols: COLS, cur: curC } : {}; };
function colsIn(o, st) {
  if (o && Array.isArray(o.cols) && o.cols.length > 1) { COLS = o.cols.slice(0, 20).map(b => J.normalize(b)); curC = U.clamp(+o.cur || 0, 0, COLS.length - 1); return COLS[curC]; }
  COLS = null; curC = 0; return J.normalize(st);
}
function switchCol(i) { colsSync(); if (i === curC || !COLS[i]) return; curC = i; S = COLS[i]; $('#projName').value = S.meta.nazwa || ''; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave(); }
function addCol() { colsSync(); if (COLS.length >= 20) { Q.toast('Maksymalnie 20 słupów w projekcie.'); return; } const n = U.clone(S); n.meta.nazwa = `Słup S-${COLS.length + 1}`; COLS.push(J.normalize(n)); dirty = true; switchCol(COLS.length - 1); }
function delCol(i) { colsSync(); if (COLS.length < 2) return; COLS.splice(i, 1); if (i < curC) curC--; curC = Math.min(curC, COLS.length - 1); S = COLS[curC]; dirty = true; $('#projName').value = S.meta.nazwa || ''; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave(); }
document.addEventListener('click', async e => {
  const d = e.target.closest && e.target.closest('[data-bdel]'); if (d) { e.stopPropagation(); const i = +d.dataset.bdel; if (await Q.ask(`Usunąć słup „${esc(COLS[i].meta.nazwa || i + 1)}” z projektu?`, 'Usuń', true)) delCol(i); return; }
  const t = e.target.closest && e.target.closest('[data-btab]'); if (t) { switchCol(+t.dataset.btab); return; }
  if (e.target.closest && e.target.closest('[data-badd]')) addCol();
});
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#inputs [data-act]'); if (b) { e.preventDefault(); doAct(b.dataset.act); } });
let asT = null;
function autosave() {
  clearTimeout(asT);
  asT = setTimeout(() => {
    const data = JSON.stringify(Object.assign({ state: S, filePath }, colsOut()));
    if (typeof window.hostStore === 'function') { try { window.hostStore(data); } catch (e) { /* */ } }
    else { try { localStorage.setItem('slupstal-autosave', data); } catch (e) { /* */ } }
  }, 600);
}
A.autosave = autosave;
A.markDirty = () => { dirty = true; updateTitle(); autosave(); };
function projectJSON() { return JSON.stringify(Object.assign({ format: BS.FORMAT, program: `${BS.APP} ${BS.VERSION}`, silnik: BS.ENGINE, zapisano: new Date().toISOString(), sha256: J.hash(S), state: S }, colsOut()), null, 1); }
A.projectJSON = projectJSON;
function download(name, content, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
A.download = download;
async function saveFile(as) {
  colsSync();
  if (inHost()) {
    const r = await hostCall('save', { path: as ? '' : filePath, name: safeName('.slupstal'), content: projectJSON(), filter: 'project' });
    if (r && r.ok) { filePath = r.path; dirty = false; updateTitle(); autosave(); Q.toast('Zapisano: ' + baseName(r.path)); }
    else if (r && r.err) Q.toast('Błąd zapisu: ' + r.err);
    return;
  }
  download(safeName('.slupstal'), projectJSON(), 'application/json'); dirty = false; updateTitle(); autosave();
}
function loadProject(text, path) {
  let o;
  try {
    const m = /<script type="application\/json" id="slupstal-data">([\s\S]*?)<\/script>/.exec(text);
    o = JSON.parse(m ? m[1].replace(/<\\\//g, '</') : text);
  } catch (e) { Q.toast('Nieprawidłowy plik projektu.'); return; }
  const st = o.state || o;
  if (!st || !st.geom) { Q.toast('Plik nie zawiera danych SłupStal.'); return; }
  S = colsIn(o, st); filePath = path || ''; dirty = false;
  $('#projName').value = S.meta.nazwa || ''; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave();
  if (o.sha256 && o.sha256 !== J.hash(st)) Q.toast('Uwaga: suma kontrolna danych różni się od zapisanej (plik zmieniany poza programem).', 6000);
  else Q.toast('Wczytano: ' + (baseName(path) || 'projekt'));
}
A.loadProject = loadProject;
async function openFile() {
  if (dirty && !(await Q.ask('Niezapisane zmiany zostaną utracone. Otworzyć inny projekt?', 'Otwórz'))) return;
  if (inHost()) { const r = await hostCall('open', { filter: 'project' }); if (r && r.ok) loadProject(r.content, r.path); else if (r && r.err) Q.toast('Błąd odczytu: ' + r.err); return; }
  const inp = $('#fileIn'); inp.value = ''; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => loadProject(rd.result, f.name); rd.readAsText(f); }; inp.click();
}
// nowy projekt: pusty lub przykład (jak w BelkaStal: Ctrl+N)
function startState(kind) {
  const st = J.defaultState();
  if (kind === 'empty') {
    st.meta = Object.assign(st.meta, { nazwa: 'Słup S-1', obiekt: '', opis: '' });
    st.obciazenia = []; st.stezenia = [];
  } else if (kind === 'pp') {
    st.meta = Object.assign(st.meta, { nazwa: 'Słup S-2', obiekt: 'Budynek – słup wewnętrzny', opis: 'Słup wewnętrzny przegubowy, rama stężona; reakcje z podciągów z mimośrodem.' });
    J.applyScheme(st, 'pp'); st.geom.H = 4.2;
    st.przekroj = Object.assign({}, st.przekroj, { typ: 'walc', seria: 'HEB', nr: P.lista('HEB').includes(200) ? 200 : P.lista('HEB')[0] });
    st.stezenia = [];
    st.obciazenia = [
      { id: 'G1', nazwa: 'Stropy i ściany (reakcje podciągów)', rodzaj: 'G', kat: 'Q-B', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 420, ey: 0, ez: 100 }] },
      { id: 'Q1', nazwa: 'Użytkowe – biura', rodzaj: 'Q', kat: 'Q-B', wyklucz: '', aktywne: true, sklad: [{ typ: 'N', x: '', F: 260, ey: 0, ez: 100 }] },
    ];
    st.podstawa.aktywna = false;
  }
  return J.normalize(st);
}
async function newProject() {
  if (dirty && !(await Q.ask('Niezapisane zmiany zostaną utracone. Utworzyć nowy projekt?', 'Nowy projekt'))) return;
  const card = (k, t, s) => `<button class="card" data-np="${k}" type="button" style="text-align:left;cursor:pointer;display:block;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"><b>${t}</b><br><small class="hint">${s}</small></button>`;
  const m = Q.modal(`<h3>Nowy projekt</h3><div style="display:grid;gap:8px">${card('ex', 'Przykład – słup hali (utwierdzony, wiatr, dźwigar)', 'HEA 280, H = 6 m, obciążenia stałe, śnieg i wiatr (dwa kierunki), stężenie pasa, podstawa utwierdzona z kotwami.')}${card('pp', 'Przykład – słup wewnętrzny przegubowy', 'HEB 200, H = 4,2 m, rama stężona, reakcje z podciągów z mimośrodem 100 mm.')}${card('empty', 'Pusty projekt', 'Domyślny przekrój i schemat, bez obciążeń (ciężar własny – automatycznie). Obciążenia dodaj przyciskiem „+ Obciążenie” lub w zestawieniu.')}</div><div class="dbtn"><span style="flex:1"></span><button class="btn" id="npC" type="button">Anuluj</button></div>`, 'sm');
  $('#npC', m).onclick = Q.closeModal;
  $$('[data-np]', m).forEach(b => b.addEventListener('click', () => {
    Q.closeModal();
    S = startState(b.dataset.np); COLS = null; curC = 0; filePath = ''; dirty = false; schCombo = null;
    $('#projName').value = S.meta.nazwa; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave(); A.selectTab('data');
  }));
}
function doPrint() { A.selectTab('report'); setTimeout(() => BS.V.printReport(), 150); }
function about() {
  Q.modal(`<h3>SłupStal ${esc(BS.VERSION)}</h3><p>Projektowanie słupów stalowych według Eurokodów: PN-EN 1990, PN-EN 1991, PN-EN 1993-1-1 (analiza I/II rzędu, imperfekcje, klasyfikacja, nośność przekroju, wyboczenie giętne, skrętne i giętno-skrętne, zwichrzenie, interakcja wg zał. A i B, metoda ogólna), PN-EN 1993-1-5 (klasa 4), PN-EN 1993-1-8 (podstawa słupa – metoda składnikowa), PN-EN 1993-1-2 (pożar), PN-EN 1993-1-10 (kruche pękanie), PN-EN 1090-2 (klasa wykonania).</p>
  <p>Obciążenia krytyczne, długości wyboczeniowe, moment krytyczny i analiza II rzędu – metoda elementów skończonych (pręt Eulera–Bernoulliego, teoria Własowa) dla rzeczywistych warunków podparcia, stężeń i rozkładów sił. Każdy wynik ma tok obliczeń (wzór, podstawienie, punkt normy); każdy parametr można nadpisać ręcznie.</p>
  <p><small>Silnik: ${esc(BS.ENGINE)} · format pliku: ${esc(BS.FORMAT)}. Program jest narzędziem wspomagającym – odpowiedzialność za przyjęte założenia i wyniki ponosi projektant.</small></p>
  <p><small>Skróty: Ctrl+N nowy, Ctrl+O otwórz, Ctrl+S zapisz, Ctrl+Shift+S zapisz jako, Ctrl+P drukuj, F2 raport.</small></p>
  <div class="dbtn"><button class="btn pri" id="abOk" type="button">Zamknij</button></div>`, 'sm');
  $('#abOk').onclick = Q.closeModal;
}
function doAct(a) {
  ({ new: newProject, open: openFile, save: () => saveFile(false), saveas: () => saveFile(true), print: doPrint, exporthtml: () => BS.V.exportHTML(), about,
    secwin: () => A.secPopup(), sectab: () => A.secTablePopup(), addload: () => A.loadPopup(null), braces: () => A.bracesPopup(), basewin: () => A.basePopup(), ndp: () => A.ndpPopup(), meta: () => A.metaPopup() }[a] || (() => {}))();
}
A.doAct = doAct;

/* ================================================================ START */
function init() {
  let saved = window.__AUTOSAVE || null;
  if (!saved) { try { saved = JSON.parse(localStorage.getItem('slupstal-autosave') || 'null'); } catch (e) { saved = null; } }
  if (saved && saved.state) { try { S = colsIn(saved, saved.state); filePath = saved.filePath || ''; } catch (e) { S = J.defaultState(); } }
  $('#projName').value = S.meta.nazwa || '';
  $('#projName').addEventListener('input', e => { S.meta.nazwa = e.target.value; dirty = true; updateTitle(); autosave(); rendered.report = false; const bt = $(`.btab[data-btab="${curC}"] span`); if (bt) bt.textContent = (curC + 1) + ' ' + S.meta.nazwa.slice(0, 14); });
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.tab));
    renderActive();
  }));
  $$('#top [data-act]').forEach(b => b.addEventListener('click', () => doAct(b.dataset.act)));
  $('#status').addEventListener('click', () => A.selectTab('sum'));
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (Q.isModal() && e.key !== 'Escape') return;
    if (e.ctrlKey && k === 's') { e.preventDefault(); saveFile(e.shiftKey); }
    else if (e.ctrlKey && k === 'o') { e.preventDefault(); openFile(); }
    else if (e.ctrlKey && k === 'n') { e.preventDefault(); newProject(); }
    else if (e.ctrlKey && k === 'p') { e.preventDefault(); doPrint(); }
    else if (e.key === 'F2') { e.preventDefault(); A.selectTab('report'); }
    else if (e.key === 'Escape') { Q.closeList(); Q.closeCtx(); if (Q.isModal()) Q.closeModal(); }
  });
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') Q.closeModal(); });
  const wrap = () => $('#p-data .datawrap'), setDsl = v => { const w = wrap(); if (w) w.style.setProperty('--dsl', v); };
  try { const v = localStorage.getItem('ss.dsl'); if (v) setDsl(v); } catch (e) { /* */ }
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest && e.target.closest('#dsplit'); if (!h) return;
    e.preventDefault(); const w = wrap(), r = w.getBoundingClientRect(); h.classList.add('drag'); document.body.classList.add('dsdrag');
    const mv = ev => { const pc = Math.max(25, Math.min(75, (ev.clientX - r.left) / r.width * 100)); setDsl(pc.toFixed(1) + '%'); };
    const up = () => { h.classList.remove('drag'); document.body.classList.remove('dsdrag'); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); try { localStorage.setItem('ss.dsl', w.style.getPropertyValue('--dsl')); } catch (e2) { /* */ } renderDataSide(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  let rz = null, lastW = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(() => { rendered = {}; renderDataSide(); renderActive(); }, 150); });
  renderInputs(); recalc(); renderInputs(); updateTitle();
  if (window.__hostOpenFile) loadProject(window.__hostOpenFile.content, window.__hostOpenFile.path);
}
A.init = init;
})();
