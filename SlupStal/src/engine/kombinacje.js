/* =====================================================================
   SłupStal – kombinacje oddziaływań wg PN-EN 1990 (zał. A1)
   SGN STR: 6.10 lub mniej korzystna z 6.10a i 6.10b, obciążenia stałe
   jako niekorzystne (γG,sup) i korzystne (γG,inf) – jednolite źródło;
   zmienne – wszystkie podzbiory z wyborem wiodącego, grupy wykluczające
   się (np. kierunki wiatru); sytuacja wyjątkowa 6.11b, pożarowa (6.11b
   z ψ1,1 lub ψ2,1), SGU: charakterystyczna 6.14b, częsta 6.15b,
   quasi-stała 6.16b, kombinacja do doboru stali (PN-EN 1993-1-10, 2.2(5)).
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, N = BS.N, S = BS.S;
const K = BS.K = {};

K.psi = function (c) {
  if (Array.isArray(c.psi) && c.psi.length === 3 && c.psi.every(v => v !== '' && v !== null && isFinite(+v))) return c.psi.map(Number);
  const R = S.RODZAJE[c.rodzaj];
  if (!R || !R.psiKey) return [1, 1, 1];
  const e = N.PSI[R.psiKey(c)];
  return e ? e.p.slice() : [1, 1, 1];
};
const fmtF = (f) => U.fmt(f, 3).replace(/,?0+$/, '').replace(/,$/, '');

K.generate = function (md, ndp, opt) {
  opt = opt || {};
  const out = [], warn = [];
  const kfi = +ndp.KFI || 1;
  const gS = ndp.gG_sup * kfi, gI = ndp.gG_inf, gQ = ndp.gQ * kfi, xi = ndp.xi;
  const seen = new Set();
  const push = (c) => {
    const key = c.typ + '|' + c.terms.map(t => t.id + '=' + t.f.toFixed(5)).sort().join(';');
    if (seen.has(key)) return; seen.add(key);
    c.id = c.typ + (out.filter(o => o.typ === c.typ).length + 1);
    out.push(c);
  };
  const byId = {}; md.cases.forEach(c => { byId[c.id] = c; });
  const Gc = md.cases.filter(c => S.RODZAJE[c.c.rodzaj] && S.RODZAJE[c.c.rodzaj].stale).map(c => c.id);
  const Ac = md.cases.filter(c => c.c.rodzaj === 'A').map(c => c.id);
  const Vc = md.cases.filter(c => S.RODZAJE[c.c.rodzaj] && !S.RODZAJE[c.c.rodzaj].stale && c.c.rodzaj !== 'A').map(c => c.id);
  const slots = [], grp = {};
  Vc.forEach(k => { const w = (byId[k].c.wyklucz || '').trim(); if (w) { if (!grp[w]) { grp[w] = []; slots.push(grp[w]); } grp[w].push(k); } else slots.push([k]); });
  let choices = [[]];
  const total = slots.reduce((p, sl) => p * (sl.length + 1), 1);
  if (total <= 512) slots.forEach(sl => { const nx = []; choices.forEach(ch => { nx.push(ch); sl.forEach(k => nx.push(ch.concat([k]))); }); choices = nx; });
  else {
    warn.push(`${slots.length} niezależnych oddziaływań zmiennych – ograniczono przegląd podzbiorów (wszystkie razem, pojedynczo, bez zmiennych).`);
    choices = [[]]; slots.forEach(sl => sl.forEach(k => choices.push([k])));
    choices.push(slots.map(sl => sl[0]));
  }
  const lbl = (k) => byId[k].c.id;
  const mk = (typ, gf, lead, acc, accF, leadF, form, sit) => {
    const terms = Gc.map(k => ({ id: k, f: gf }));
    if (lead) terms.push({ id: lead, f: leadF });
    acc.forEach((k, i) => { if (accF[i] > 0) terms.push({ id: k, f: accF[i] }); });
    const ps = [];
    if (Gc.length) ps.push(fmtF(gf) + '·G');
    if (lead) ps.push(fmtF(leadF) + '·' + lbl(lead));
    acc.forEach((k, i) => { if (accF[i] > 0) ps.push(fmtF(accF[i]) + '·' + lbl(k)); });
    return { typ, forma: form, gf, lead: lead || null, terms, sytuacja: sit || (typ === 'SGN' ? 'trwała' : typ), opis: (form ? form + ': ' : '') + (ps.join(' + ') || '—') };
  };
  const psi = (k) => K.psi(byId[k].c);
  const pf = (k) => (ndp.psiAcc === 'psi2' ? psi(k)[2] : psi(k)[1]);
  choices.forEach(ch => {
    // ---- SGN (STR) – obciążenia stałe niekorzystne i korzystne
    [gS, gI].forEach(gf => {
      if (!ch.length) { push(mk('SGN', gf, null, [], [], 0, ndp.komb === '6.10' ? '6.10' : '6.10a')); return; }
      if (ndp.komb === '6.10') ch.forEach(L => { const acc = ch.filter(k => k !== L); push(mk('SGN', gf, L, acc, acc.map(k => gQ * psi(k)[0]), gQ, '6.10')); });
      else {
        push(mk('SGN', gf, null, ch, ch.map(k => gQ * psi(k)[0]), 0, '6.10a'));
        ch.forEach(L => { const acc = ch.filter(k => k !== L); push(mk('SGN', gf === gS ? xi * gS : gI, L, acc, acc.map(k => gQ * psi(k)[0]), gQ, '6.10b')); });
      }
    });
    // ---- SGU
    if (!ch.length) { push(mk('char', 1, null, [], [], 0, '6.14b')); push(mk('czest', 1, null, [], [], 0, '6.15b')); push(mk('qp', 1, null, [], [], 0, '6.16b')); push(mk('kruche', 1, null, [], [], 0, 'PN-EN 1993-1-10, 2.2(5)')); }
    ch.forEach(L => {
      const acc = ch.filter(k => k !== L);
      push(mk('char', 1, L, acc, acc.map(k => psi(k)[0]), 1, '6.14b'));
      push(mk('czest', 1, L, acc, acc.map(k => psi(k)[2]), psi(L)[1], '6.15b'));
      push(mk('kruche', 1, L, acc, acc.map(k => psi(k)[2]), psi(L)[1], 'PN-EN 1993-1-10, 2.2(5)'));
    });
    if (ch.length) push(mk('qp', 1, null, ch, ch.map(k => psi(k)[2]), 0, '6.16b'));
    // ---- pożar
    if (opt.pozar) {
      if (!ch.length) push(mk('poz', 1, null, [], [], 0, '6.11b (pożar)', 'pożarowa'));
      ch.forEach(L => { const acc = ch.filter(k => k !== L); push(mk('poz', 1, L, acc, acc.map(k => psi(k)[2]), pf(L), '6.11b (pożar)', 'pożarowa')); });
    }
    // ---- wyjątkowa
    Ac.forEach(A => {
      const base = (L, acc, accF, lf) => { const c = mk('wyj', 1, L, acc, accF, lf, '6.11b', 'wyjątkowa'); c.terms.push({ id: A, f: 1 }); c.opis = c.opis.replace('6.11b: ', '6.11b: ' + lbl(A) + ' + '); return c; };
      if (!ch.length) push(base(null, [], [], 0));
      ch.forEach(L => { const acc = ch.filter(k => k !== L); push(base(L, acc, acc.map(k => psi(k)[2]), pf(L))); });
    });
  });
  return { list: out, warn };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
