'use strict';
/* Algebraic topology: fundamental group (Seifert–van Kampen / CW presentations) and
 * homology (cellular chain complex + Smith normal form) of common spaces, written out
 * step by step.  Spaces are built as CW complexes with a single 0-cell; the homology is
 * computed from the boundary matrices, never looked up, so numeric variants
 * (e.g. a disk glued along a (4,6) curve) come out right too.
 */
const R = String.raw;
const ZZ = R`\mathbb{Z}`;
const zMod = (d) => `${ZZ}_${String(d).length === 1 ? d : `{${d}}`}`;

/* ---------------------------------------------------------------- integer algebra */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
function egcd(a, b) { // returns [g, x, y] with a x + b y = g >= 0
  if (b === 0) return a >= 0 ? [a, 1, 0] : [-a, -1, 0];
  const [g, x, y] = egcd(b, a % b);
  return [g, y, x - Math.trunc(a / b) * y];
}

// invariant factors (nonzero diagonal of the Smith normal form) of an integer matrix
function snf(A) {
  const M = A.map(r => r.slice());
  const m = M.length, n = m ? M[0].length : 0;
  const diag = [];
  const swapR = (i, j) => { [M[i], M[j]] = [M[j], M[i]]; };
  const swapC = (i, j) => { for (const r of M) [r[i], r[j]] = [r[j], r[i]]; };
  for (let t = 0; t < Math.min(m, n); t++) {
    let best = null;
    for (let i = t; i < m; i++) for (let j = t; j < n; j++) if (M[i][j] && (!best || Math.abs(M[i][j]) < Math.abs(M[best[0]][best[1]]))) best = [i, j];
    if (!best) break;
    swapR(t, best[0]); swapC(t, best[1]);
    for (let guard = 0; guard < 500; guard++) {
      let clean = true;
      for (let i = t + 1; i < m; i++) if (M[i][t]) {
        const q = Math.floor(M[i][t] / M[t][t]);
        for (let j = t; j < n; j++) M[i][j] -= q * M[t][j];
        if (M[i][t]) { swapR(t, i); clean = false; }
      }
      for (let j = t + 1; j < n; j++) if (M[t][j]) {
        const q = Math.floor(M[t][j] / M[t][t]);
        for (let i = t; i < m; i++) M[i][j] -= q * M[i][t];
        if (M[t][j]) { swapC(t, j); clean = false; }
      }
      if (!clean) continue;
      let fixed = true;
      outer: for (let i = t + 1; i < m; i++) for (let j = t + 1; j < n; j++) if (M[i][j] % M[t][t]) {
        for (let jj = t; jj < n; jj++) M[t][jj] += M[i][jj];
        fixed = false; break outer;
      }
      if (fixed) break;
    }
    diag.push(Math.abs(M[t][t]));
  }
  return diag;
}

/* ---------------------------------------------------------------- formatting */
const zPow = (r, times) => r === 0 ? '' : r === 1 ? ZZ : times ? Array(r).fill(ZZ).join(R` \times `) : `${ZZ}^{${r}}`;
function group(r, tors = [], opts = {}) {
  const parts = [];
  if (r) parts.push(zPow(r, opts.times && r <= 3));
  tors.filter(d => d > 1).forEach(d => parts.push(zMod(d)));
  if (!parts.length) return opts.trivial || '0';
  return parts.join(opts.times ? R` \times ` : R` \oplus `);
}
const pmatrix = (M) => R`\begin{pmatrix}` + M.map(r => r.join(' & ')).join(R` \\ `) + R`\end{pmatrix}`;
function wordTex(w) { // w: [[gen, exp], ...]
  if (!w.length) return '1';
  return w.map(([g, e]) => e === 1 ? g : `${g}^{${e}}`).join('');
}
const expSum = (w, gens) => gens.map(g => w.reduce((s, [h, e]) => s + (h === g && typeof e === 'number' ? e : 0), 0));
const ord = (k) => `${k}`;

/* ---------------------------------------------------------------- generic engine */
// cw: { cells: [[names of 0-cells], [names of 1-cells], ...], D: {k: matrix c_{k-1} x c_k}, why: {k: text} }
function homologyOf(cw) {
  const top = cw.cells.length - 1;
  const c = cw.cells.map(x => x.length);
  const sn = {}, rk = {};
  for (let k = 1; k <= top; k++) {
    const M = cw.D[k] || Array.from({ length: c[k - 1] }, () => Array(c[k]).fill(0));
    sn[k] = c[k - 1] && c[k] ? snf(M) : [];
    rk[k] = sn[k].length;
  }
  const H = [];
  for (let k = 0; k <= top; k++) {
    const kerRank = c[k] - (rk[k] || 0);
    const imRank = rk[k + 1] || 0;
    const tors = (sn[k + 1] || []).filter(d => d > 1);
    H.push({ free: kerRank - imRank, tors, kerRank, imRank, imDiag: sn[k + 1] || [] });
  }
  return { H, top, c, sn, rk };
}

function homologySteps(cw, X, n0) {
  const h = homologyOf(cw);
  const { c, top } = h;
  const steps = [];
  const cellList = cw.cells.map((names, k) => names.length ? names.map(nm => `e^{${k}}_{${nm}}`).join(', ') : null).filter(Boolean).join(R`;\quad `);
  steps.push({ label: `Step ${n0}: CW structure of $${X}$ (cells by dimension):`, katex: cellList });
  let chainTex = '0 \\longrightarrow ';
  for (let k = top; k >= 0; k--) {
    chainTex += `C_{${k}} = ${c[k] ? (c[k] === 1 ? ZZ : `${ZZ}^{${c[k]}}`) : '0'}`;
    chainTex += k > 0 ? ` \\xrightarrow{\\partial_{${k}}} ` : ' \\longrightarrow 0';
  }
  steps.push({ label: `Step ${n0 + 1}: cellular chain complex ($C_k$ is free abelian on the $k$-cells):`, katex: chainTex });
  let s = n0 + 2;
  for (let k = 1; k <= top; k++) {
    if (!c[k] || !c[k - 1]) continue;
    const M = cw.D[k];
    const zero = !M || M.every(r => r.every(v => v === 0));
    steps.push({ label: `Step ${s++}: boundary map $\\partial_{${k}}: C_{${k}} \\to C_{${k - 1}}$. ${cw.why && cw.why[k] ? cw.why[k] : ''}`, katex: zero ? R`\partial_{${k}} = 0`.replace('${k}', k) : `\\partial_{${k}} = ${pmatrix(M)}` + (h.sn[k].some(d => d > 1) || c[k] > 1 || c[k - 1] > 1 ? R`\ \sim\ \text{Smith normal form: } ` + (h.sn[k].length ? `\\operatorname{diag}(${h.sn[k].join(', ')})` : '0') : '') });
  }
  const lines = h.H.map((g, k) => {
    const tor = g.tors.length ? ` \\oplus ${g.tors.map(d => zMod(d)).join(R` \oplus `)}` : '';
    return `H_{${k}} = \\ker\\partial_{${k}} / \\operatorname{im}\\partial_{${k + 1}} \\cong ${group(g.free, g.tors)}` + (g.kerRank || g.imRank ? R`\quad (\operatorname{rank}\ker = ${g.kerRank},\ \operatorname{rank}\operatorname{im} = ${g.imRank})`.replace('${g.kerRank}', g.kerRank).replace('${g.imRank}', g.imRank) : '') ;
  });
  steps.push({ label: `Step ${s++}: homology = kernel / image in each degree (torsion comes from the Smith normal form entries > 1):`, katex: lines.join(R` \\ `) });
  const chi = c.reduce((a, v, k) => a + (k % 2 ? -v : v), 0);
  const chiH = h.H.reduce((a, g, k) => a + (k % 2 ? -g.free : g.free), 0);
  steps.push({ label: `Step ${s++}: check with the Euler characteristic (cells vs. Betti numbers):`, katex: `\\chi(${X}) = ${c.map((v, k) => (k ? (k % 2 ? ' - ' : ' + ') : '') + v).join('')} = ${chi} = ${h.H.map((g, k) => (k ? (k % 2 ? ' - ' : ' + ') : '') + g.free).join('')} \\ ${chi === chiH ? R`\checkmark` : ''}` });
  return { steps, h, chi, next: s };
}

const hList = (h) => h.H.map((g, k) => `H_{${k}} = ${group(g.free, g.tors)}`).join(R`,\ `) + `,\\ H_n = 0 \\ (n \\ge ${h.top + 1})`;

/* ---------------------------------------------------------------- space catalogue */
// each builder returns { X, name, intro, cw, pi1: {pres, value, why}, extra? }
function presTex(gens, rels) {
  return R`\langle ` + (gens.length ? gens.join(', ') : R`\ `) + (rels.length ? R` \mid ` + rels.map(wordTex).join(', ') : '') + R` \rangle`;
}
function twoComplex(gens, rels, names2) {
  const cells = [['v'], gens.slice(), names2 || rels.map((_, i) => rels.length === 1 ? 'F' : `${i + 1}`)];
  const D = { 1: [gens.map(() => 0)], 2: gens.map((g, i) => rels.map(w => expSum(w, gens)[i])) };
  if (!gens.length) { cells[1] = []; D[1] = undefined; D[2] = undefined; }
  if (!rels.length) cells.pop();
  return { cells, D };
}
const comm = (a, b) => [[a, 1], [b, 1], [a, -1], [b, -1]];

function sphere(n) {
  if (n === 1) return circleSpace();
  const cells = [['v']]; for (let k = 1; k < n; k++) cells.push([]); cells.push(['F']);
  return {
    X: `S^{${n}}`, name: `the ${n}-sphere $S^{${n}}$`,
    cw: { cells, D: {}, why: { [n]: '' } },
    cwWhy: `one 0-cell and one ${n}-cell attached by the constant map $\\partial D^{${n}} \\to v$`,
    pi1: { pres: R`\langle\ \rangle`, value: '1', valueWord: R`1 \text{ (trivial)}`, why: `there are no 1-cells, so every loop is homotopic into the 0-skeleton (a point): $S^{${n}}$ is simply connected for $n \\ge 2$` }
  };
}
function circleSpace() {
  return {
    X: 'S^1', name: 'the circle $S^1$',
    cw: { cells: [['v'], ['a']], D: { 1: [[0]] }, why: { 1: 'The 1-cell is a loop at the single vertex, so $\\partial_1(a) = v - v = 0$.' } },
    cwWhy: 'one 0-cell $v$ and one 1-cell $a$ with both ends at $v$',
    pi1: { pres: R`\langle a \rangle`, value: ZZ, why: 'one 1-cell and no 2-cells: the free group on one generator, generated by the loop that goes once around' }
  };
}
function torusSpace() {
  const t = twoComplex(['a', 'b'], [comm('a', 'b')], ['T']);
  t.why = { 1: 'Both 1-cells are loops at the single vertex, so $\\partial_1 = 0$.', 2: 'The 2-cell is attached along $aba^{-1}b^{-1}$; abelianising, $a + b - a - b = 0$.' };
  return {
    X: 'T^2', name: 'the torus $T^2 = S^1 \\times S^1$', cw: t,
    cwWhy: 'a square with opposite sides identified: one vertex, two edges $a, b$, one 2-cell attached along $aba^{-1}b^{-1}$',
    pi1: { pres: presTex(['a', 'b'], [comm('a', 'b')]), value: R`\mathbb{Z} \times \mathbb{Z}`, why: 'the relation $aba^{-1}b^{-1} = 1$ says exactly that $a$ and $b$ commute, so the group is free abelian on $a, b$ (also $\\pi_1(S^1 \\times S^1) = \\pi_1(S^1) \\times \\pi_1(S^1)$)' }
  };
}
function genusSurface(g) {
  if (g === 0) return sphere(2);
  if (g === 1) return torusSpace();
  const gens = [], rel = [];
  for (let i = 1; i <= g; i++) { gens.push(`a_{${i}}`, `b_{${i}}`); rel.push(...comm(`a_{${i}}`, `b_{${i}}`)); }
  const t = twoComplex(gens, [rel], ['F']);
  t.why = { 1: '$\\partial_1 = 0$ (all edges are loops).', 2: 'Each letter of $[a_1,b_1]\\cdots[a_g,b_g]$ appears once with exponent $+1$ and once with $-1$, so $\\partial_2 = 0$.' };
  return {
    X: `M_{${g}}`, name: `the closed orientable surface of genus ${g}`, cw: t,
    cwWhy: `a $${4 * g}$-gon with edges identified by the word $[a_1,b_1]\\cdots[a_{${g}},b_{${g}}]$: one vertex, ${2 * g} edges, one 2-cell`,
    pi1: { pres: R`\langle a_1, b_1, \dots, a_{${g}}, b_{${g}} \mid [a_1,b_1][a_2,b_2]\cdots[a_{${g}},b_{${g}}] \rangle`.replace(/\$\{g\}/g, g), value: R`\langle a_1, b_1, \dots, a_{${g}}, b_{${g}} \mid [a_1,b_1]\cdots[a_{${g}},b_{${g}}] = 1 \rangle`.replace(/\$\{g\}/g, g), why: `one generator per edge and one relation from the 2-cell; for $g \\ge 2$ this group is non-abelian (its abelianisation is $${ZZ}^{${2 * g}}$)` }
  };
}
function nonOrientable(h) {
  if (h === 1) return rpn(2);
  if (h === 2) return klein();
  const gens = [], rel = [];
  for (let i = 1; i <= h; i++) { gens.push(`a_{${i}}`); rel.push([`a_{${i}}`, 2]); }
  const t = twoComplex(gens, [rel], ['F']);
  t.why = { 1: '$\\partial_1 = 0$.', 2: 'The attaching word $a_1^2 a_2^2 \\cdots a_h^2$ has exponent sum 2 in every generator.' };
  return {
    X: `N_{${h}}`, name: `the connected sum of ${h} projective planes`, cw: t,
    cwWhy: `a $${2 * h}$-gon with word $a_1a_1a_2a_2\\cdots a_{${h}}a_{${h}}$: one vertex, ${h} edges, one 2-cell`,
    pi1: { pres: R`\langle a_1, \dots, a_{${h}} \mid a_1^2 a_2^2 \cdots a_{${h}}^2 \rangle`.replace(/\$\{h\}/g, h), value: R`\langle a_1, \dots, a_{${h}} \mid a_1^2 \cdots a_{${h}}^2 = 1 \rangle`.replace(/\$\{h\}/g, h), why: 'one generator per edge, one relation from the 2-cell (non-abelian for $h \\ge 2$)' }
  };
}
function klein() {
  const w = [['a', 1], ['b', 1], ['a', 1], ['b', -1]];
  const t = twoComplex(['a', 'b'], [w], ['K']);
  t.why = { 1: '$\\partial_1 = 0$ (both edges are loops).', 2: 'The 2-cell is attached along $abab^{-1}$: exponent sum 2 in $a$ and 0 in $b$, so $\\partial_2(K) = 2a$.' };
  return {
    X: 'K', name: 'the Klein bottle $K$', cw: t,
    cwWhy: 'a square with one pair of sides glued with a flip: one vertex, edges $a, b$, one 2-cell attached along $abab^{-1}$',
    pi1: { pres: presTex(['a', 'b'], [w]), value: R`\langle a, b \mid abab^{-1} = 1 \rangle`, why: 'non-abelian (it is $\\mathbb{Z} \\rtimes \\mathbb{Z}$); its abelianisation is $\\mathbb{Z} \\oplus \\mathbb{Z}_2$' }
  };
}
function rpn(n) {
  if (n === 1) return Object.assign(circleSpace(), { X: R`\mathbb{RP}^1`, name: R`$\mathbb{RP}^1 \cong S^1$` });
  const cells = [['v']]; const D = {};
  for (let k = 1; k <= n; k++) { cells.push([`${k}`]); D[k] = [[1 + (-1) ** k]]; }
  return {
    X: `\\mathbb{RP}^{${n}}`, name: `real projective space $\\mathbb{RP}^{${n}}$`,
    cw: { cells, D, why: Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, `The $${i + 1}$-cell is attached by the 2-fold covering $S^{${i}} \\to \\mathbb{RP}^{${i}}$, of degree $1 + (-1)^{${i + 1}} = ${1 + (-1) ** (i + 1)}$.`])) },
    cwWhy: `one cell in each dimension $0, 1, \\dots, ${n}$ ($\\mathbb{RP}^k = \\mathbb{RP}^{k-1} \\cup e^k$)`,
    pi1: { pres: R`\langle a \mid a^2 \rangle`, value: `${ZZ}_2`, why: 'one 1-cell $a$; the 2-cell is attached along $a^2$; cells of dimension $\\ge 3$ do not change $\\pi_1$' }
  };
}
function cpn(n) {
  const cells = [['v']];
  for (let k = 1; k <= 2 * n; k++) cells.push(k % 2 ? [] : [`${k}`]);
  return {
    X: `\\mathbb{CP}^{${n}}`, name: `complex projective space $\\mathbb{CP}^{${n}}$`,
    cw: { cells, D: {}, why: {} },
    cwWhy: `one cell in each even dimension $0, 2, \\dots, ${2 * n}$, so every boundary map goes between a zero group and something: all $\\partial_k = 0$`,
    pi1: { pres: R`\langle\ \rangle`, value: '1', valueWord: R`1 \text{ (trivial)}`, why: 'no 1-cells, so it is simply connected' }
  };
}
function lens(p, q) {
  return {
    X: `L(${p},${q})`, name: `the lens space $L(${p},${q})$`,
    cw: { cells: [['v'], ['1'], ['2'], ['3']], D: { 1: [[0]], 2: [[p]], 3: [[0]] }, why: { 1: '$\\partial_1 = 0$.', 2: `The 2-cell wraps ${p} times around the 1-cell.`, 3: 'The 3-cell is attached with degree 0 on the 2-cell ($L(p,q)$ is an orientable 3-manifold).' } },
    cwWhy: 'one cell in each dimension 0, 1, 2, 3',
    pi1: { pres: `\\langle a \\mid a^{${p}} \\rangle`, value: zMod(p), why: `it is the quotient of $S^3$ by a free $${ZZ}_{${p}}$ action, and from the cells: one generator, relation $a^{${p}}$` }
  };
}
function wedge(parts) { // parts: list of sphere dimensions (1 = circle)
  const circles = parts.filter(d => d === 1).length;
  const top = Math.max(...parts);
  const cells = [['v']]; for (let k = 1; k <= top; k++) cells.push([]);
  let ci = 0, si = {};
  parts.forEach(d => { if (d === 1) cells[1].push(circles > 1 ? `a_{${++ci}}` : 'a'); else { si[d] = (si[d] || 0) + 1; cells[d].push(`${d}${parts.filter(x => x === d).length > 1 ? ',' + si[d] : ''}`); } });
  const D = {}; if (circles) D[1] = [Array(circles).fill(0)];
  const X = parts.map(d => `S^{${d}}`).join(R` \vee `);
  const gens = cells[1];
  return {
    X, name: `the wedge $${X}$`,
    cw: { cells, D, why: { 1: 'All 1-cells are loops at the wedge point, so $\\partial_1 = 0$.' } },
    cwWhy: 'one common 0-cell (the wedge point) and one top cell for each sphere, each attached by the constant map',
    pi1: circles === 0 ? { pres: R`\langle\ \rangle`, value: '1', valueWord: R`1 \text{ (trivial)}`, why: 'no 1-cells: simply connected (van Kampen: free product of trivial groups)' }
      : circles === 1 ? { pres: R`\langle a \rangle`, value: ZZ, why: 'van Kampen: $\\pi_1$ of a wedge is the free product of the $\\pi_1$ of the pieces, and higher spheres are simply connected' }
        : { pres: presTex(gens, []), value: `F_{${circles}}` + R` \text{ (free group on ${circles} generators)}`.replace('${circles}', circles), why: 'van Kampen: $\\pi_1(A \\vee B) = \\pi_1(A) * \\pi_1(B)$, a free product of copies of $\\mathbb{Z}$' }
  };
}
function sphereProduct(m, n) {
  if (m === 1 && n === 1) return torusSpace();
  const top = m + n; const cells = [['v']]; for (let k = 1; k <= top; k++) cells.push([]);
  cells[m].push('a'); cells[n].push(m === n ? 'b' : 'b'); cells[top].push('ab');
  const D = {}; if (cells[1].length) D[1] = [Array(cells[1].length).fill(0)];
  const pi = [m, n].filter(d => d === 1).length;
  return {
    X: `S^{${m}} \\times S^{${n}}`, name: `the product $S^{${m}} \\times S^{${n}}$`,
    cw: { cells, D, why: {} },
    cwWhy: `product CW structure: cells $e^0, e^{${m}}, e^{${n}}, e^{${m}} \\times e^{${n}}$; every boundary map is 0`,
    pi1: { pres: pi ? R`\langle a \rangle` : R`\langle\ \rangle`, value: pi ? ZZ : '1', valueWord: pi ? null : R`1 \text{ (trivial)}`, why: '$\\pi_1(A \\times B) = \\pi_1(A) \\times \\pi_1(B)$' }
  };
}
function ntorus(n) {
  if (n === 1) return circleSpace();
  if (n === 2) return torusSpace();
  const binom = (a, b) => { let r = 1; for (let i = 1; i <= b; i++) r = r * (a - b + i) / i; return Math.round(r); };
  const cells = []; for (let k = 0; k <= n; k++) cells.push(Array.from({ length: binom(n, k) }, (_, i) => k === 0 ? 'v' : `${i + 1}`));
  return {
    X: `T^{${n}}`, name: `the ${n}-torus $T^{${n}} = (S^1)^{${n}}$`,
    cw: { cells, D: {}, why: {} },
    cwWhy: `product of ${n} circles: $\\binom{${n}}{k}$ cells in dimension $k$, and every cellular boundary map is 0`,
    pi1: { pres: '', value: zPow(n, true), why: `$\\pi_1$ of a product is the product: $${ZZ}^{${n}}$` }
  };
}
function moore(nn) {
  const t = twoComplex(['a'], [[['a', nn]]], ['D']);
  t.why = { 1: '$\\partial_1 = 0$.', 2: `The disk is attached by a map of degree ${nn}, so $\\partial_2(D) = ${nn}a$.` };
  return {
    X: 'X', name: `the circle with a 2-cell attached by a degree-${nn} map`, cw: t,
    cwWhy: `one 0-cell, one 1-cell $a$, one 2-cell attached along $a^{${nn}}$`,
    pi1: { pres: `\\langle a \\mid a^{${nn}} \\rangle`, value: Math.abs(nn) === 1 ? R`1 \text{ (trivial)}` : nn === 0 ? ZZ : zMod(Math.abs(nn)), why: 'Seifert–van Kampen: attaching a 2-cell along $a^n$ adds the relation $a^n = 1$' }
  };
}
function dunce() {
  const w = [['a', 1], ['a', 1], ['a', -1]];
  const t = twoComplex(['a'], [w], ['D']);
  t.why = { 1: '$\\partial_1 = 0$.', 2: 'The 2-cell is attached along $aaa^{-1}$, exponent sum 1, so $\\partial_2(D) = a$.' };
  return {
    X: 'D', name: 'the dunce cap', cw: t,
    cwWhy: 'a triangle with edges identified by $aaa^{-1}$: one vertex, one edge, one 2-cell',
    pi1: { pres: presTex(['a'], [w]), value: R`1 \text{ (trivial)}`, why: '$aaa^{-1} = 1$ means $a = 1$; in fact the dunce cap is contractible' }
  };
}
function pointSpace(label) {
  return { X: 'X', name: label, cw: { cells: [['v']], D: {}, why: {} }, cwWhy: 'it deformation retracts to a point (one 0-cell)', pi1: { pres: R`\langle\ \rangle`, value: '1', valueWord: R`1 \text{ (trivial)}`, why: 'it is contractible' } };
}

/* ---------------------------------------------------------------- torus with disks glued along (p,q) curves */
function torusWithDisks(pairs) {
  const k = pairs.length;
  const gens = ['a', 'b'];
  const cells = [['v'], ['a', 'b'], ['T', ...pairs.map((_, i) => (k === 1 ? 'D' : `D_{${i + 1}}`))]];
  const D2 = [[0, ...pairs.map(p => p[0])], [0, ...pairs.map(p => p[1])]];
  const rels = pairs.map(([p, q]) => [['a', p], ['b', q]].filter(([, e]) => e !== 0));
  const sn = snf(pairs.map(p => [p[0], p[1]]));
  const piFree = 2 - sn.length, piTors = sn.filter(d => d > 1);
  const value = group(piFree, piTors, { times: true, trivial: R`1 \text{ (trivial)}` });
  return { cells, D2, rels, value, piFree, piTors, gens };
}

function solveTorusDisk(info, parts) {
  const steps = [];
  const symbolic = info.symbolic;
  let n = 1;
  const X = 'X';
  if (symbolic) {
    const [P, Q] = info.sym;
    const cop = info.coprime;
    steps.push({ label: `Setup: $X = T^2 \\cup_f D^2$, where $f: \\partial D^2 \\to T^2$ is a simple closed curve of type $(${P}, ${Q})$ (it winds $${P}$ times around the first circle and $${Q}$ times around the second).`, katex: R`X = T^2 \cup_f D^2,\qquad [f] = a^{${P}} b^{${Q}} \in \pi_1(T^2)`.replace('${P}', P).replace('${Q}', Q) });
    if (parts.pi1) {
      steps.push({ label: `Step ${n++}: fundamental group of the torus (standard generators $a, b$ = the two circles):`, katex: R`\pi_1(T^2) = \langle a, b \mid aba^{-1}b^{-1} \rangle \cong \mathbb{Z} \times \mathbb{Z}` });
      steps.push({ label: `Step ${n++} (Seifert–van Kampen, open cover): let $U = X \\setminus \\{x_0\\}$ for a point $x_0$ in the interior of the disk, and $V$ = the open disk.`, katex: R`U \simeq T^2 \ (\text{radial deformation retraction of the punctured disk onto its boundary}),\quad V \simeq \{\ast\},\quad U \cap V \simeq S^1` });
      steps.push({ label: `Step ${n++}: $\\pi_1(U \\cap V) = \\mathbb{Z}$ is generated by a loop $\\gamma$ parallel to the boundary of the disk. In $U$ it is homotopic to the attaching curve, in $V$ it is trivial:`, katex: R`i_*(\gamma) = a^{${P}} b^{${Q}} \in \pi_1(U),\qquad j_*(\gamma) = 1 \in \pi_1(V) = 1`.replace('${P}', P).replace('${Q}', Q) });
      steps.push({ label: `Step ${n++}: van Kampen gives the amalgamated product, i.e. $\\pi_1(T^2)$ with one extra relation:`, katex: R`\pi_1(X) \cong \frac{\pi_1(U) * \pi_1(V)}{\langle\langle\, i_*(\gamma)\, j_*(\gamma)^{-1} \rangle\rangle} = \langle a, b \mid aba^{-1}b^{-1},\ a^{${P}} b^{${Q}} \rangle`.replace('${P}', P).replace('${Q}', Q) });
      if (cop) {
        steps.push({ label: `Step ${n++}: the group is abelian (a quotient of $\\mathbb{Z}^2$), so it is $\\mathbb{Z}^2$ modulo the subgroup generated by $(${P}, ${Q})$. Because $\\gcd(${P}, ${Q}) = 1$, Bézout gives integers $r, s$ with $${P}s - ${Q}r = 1$:`, katex: R`A = \begin{pmatrix} ${P} & ${Q} \\ r & s \end{pmatrix} \in SL_2(\mathbb{Z}),\qquad u = a^{${P}} b^{${Q}},\ v = a^{r} b^{s} \text{ is a new basis of } \mathbb{Z}^2`.replace(/\$\{P\}/g, P).replace(/\$\{Q\}/g, Q) });
        steps.push({ label: `Step ${n++}: in the basis $u, v$ the relation is just $u = 1$, so only $v$ survives:`, katex: R`\pi_1(X) \cong \langle u, v \mid uvu^{-1}v^{-1},\ u \rangle \cong \langle v \rangle \cong \mathbb{Z}` });
      } else {
        steps.push({ label: `Step ${n++}: the group is abelian, $\\mathbb{Z}^2 / \\langle (${P}, ${Q}) \\rangle$. With $d = \\gcd(${P}, ${Q})$, write $(${P}, ${Q}) = d\\,(${P}', ${Q}')$ with $\\gcd(${P}', ${Q}') = 1$ and complete $(${P}', ${Q}')$ to a basis of $\\mathbb{Z}^2$:`, katex: R`\pi_1(X) \cong \mathbb{Z}^2 / \langle d\,u \rangle \cong \mathbb{Z} \times \mathbb{Z}_d \qquad (\cong \mathbb{Z} \text{ when } \gcd(p,q) = 1)`.replace(/p,q/, `${P},${Q}`) });
      }
    }
    if (parts.H) {
      steps.push({ label: `Step ${n++}: CW structure of $X$: the torus has one 0-cell $v$, two 1-cells $a, b$ and one 2-cell $e_T$ (attached along $aba^{-1}b^{-1}$); the glued disk adds one more 2-cell $e_D$ (attached along the $(${P}, ${Q})$ curve).`, katex: R`C_2 = \mathbb{Z}e_T \oplus \mathbb{Z}e_D \cong \mathbb{Z}^2,\quad C_1 = \mathbb{Z}a \oplus \mathbb{Z}b \cong \mathbb{Z}^2,\quad C_0 = \mathbb{Z}v,\quad C_n = 0 \ (n \ge 3)` });
      steps.push({ label: `Step ${n++}: boundary maps. Both 1-cells are loops, so $\\partial_1 = 0$. The commutator abelianises to $a + b - a - b = 0$, and the disk's boundary is homologous to $${P}a + ${Q}b$:`, katex: R`\partial_1 = 0,\qquad \partial_2(e_T) = 0,\quad \partial_2(e_D) = ${P}a + ${Q}b,\qquad \partial_2 = \begin{pmatrix} 0 & ${P} \\ 0 & ${Q} \end{pmatrix}`.replace(/\$\{P\}/g, P).replace(/\$\{Q\}/g, Q) });
      steps.push({ label: `Step ${n++}: $H_0$ ($X$ is path-connected):`, katex: R`H_0(X) = C_0 / \operatorname{im}\partial_1 = \mathbb{Z}` });
      steps.push({ label: `Step ${n++}: $H_1 = \\ker\\partial_1 / \\operatorname{im}\\partial_2 = \\mathbb{Z}^2 / \\langle ${P}a + ${Q}b \\rangle$${cop ? '. Since $\\gcd(' + P + ', ' + Q + ') = 1$, the Smith normal form of $\\partial_2$ is $\\operatorname{diag}(1, 0)$ (same change of basis as above)' : ''}:`, katex: cop ? R`H_1(X) \cong \mathbb{Z}^2 / \langle u \rangle \cong \mathbb{Z}` : R`H_1(X) \cong \mathbb{Z} \oplus \mathbb{Z}_d,\quad d = \gcd(${P},${Q})`.replace('${P}', P).replace('${Q}', Q) });
      steps.push({ label: `Step ${n++}: $H_2 = \\ker\\partial_2$ (nothing in degree 3 to divide by). $\\partial_2(m e_T + k e_D) = k(${P}a + ${Q}b) = 0$ forces $k = 0$ because $(${P}, ${Q}) \\ne (0, 0)$:`, katex: R`H_2(X) = \ker\partial_2 = \mathbb{Z}\,e_T \cong \mathbb{Z}` });
      steps.push({ label: `Step ${n++}: there are no cells of dimension $\\ge 3$:`, katex: R`H_n(X) = 0 \quad (n \ge 3)` });
      steps.push({ label: `Step ${n++}: checks. Euler characteristic: cells $1 - 2 + 2 = 1$, Betti numbers $1 - 1 + 1 = 1$ ✓. Hurewicz: $H_1$ is the abelianisation of $\\pi_1$ ✓.${cop ? ' In fact $X \\simeq S^1 \\vee S^2$: after the change of basis the disk caps off the generator $u$, and the torus 2-cell becomes a sphere.' : ''}`, katex: cop ? R`X \simeq S^1 \vee S^2` : '' });
    }
    const ans = [];
    if (parts.pi1) ans.push(cop ? R`\pi_1(X) \cong \mathbb{Z}` : R`\pi_1(X) \cong \mathbb{Z} \times \mathbb{Z}_{\gcd(${P},${Q})}`.replace('${P}', P).replace('${Q}', Q));
    if (parts.H) ans.push(cop ? R`H_{0} = \mathbb{Z},\ H_{1} = \mathbb{Z},\ H_{2} = \mathbb{Z},\ H_n = 0 \ (n \ge 3)` : R`H_{0} = \mathbb{Z},\ H_{1} = \mathbb{Z} \oplus \mathbb{Z}_{\gcd(${P},${Q})},\ H_{2} = \mathbb{Z},\ H_n = 0 \ (n \ge 3)`.replace('${P}', P).replace('${Q}', Q));
    if (parts.chi) ans.push(R`\chi(X) = 1`);
    const answer = ans.join(R`;\quad `);
    steps.push({ label: 'Final Answer:', katex: R`\mathbf{` + answer + '}' });
    return { answer, steps };
  }

  // numeric curve(s)
  const pairs = info.pairs;
  const T = torusWithDisks(pairs);
  const k = pairs.length;
  const curveTxt = pairs.map(([p, q]) => `(${p}, ${q})`).join(', ');
  steps.push({ label: `Setup: $X$ = torus with ${k === 1 ? 'a disk' : k + ' disks'} glued along ${k === 1 ? 'a curve' : 'curves'} of type ${curveTxt}. In $\\pi_1(T^2) = \\langle a, b \\mid aba^{-1}b^{-1} \\rangle$ a $(p, q)$ curve represents $a^p b^q$:`, katex: pairs.map(([p, q], i) => `[f_{${k === 1 ? '' : i + 1}}] = ${wordTex([['a', p], ['b', q]].filter(([, e]) => e !== 0)) || '1'}`).join(R`,\quad `) });
  if (parts.pi1) {
    steps.push({ label: `Step ${n++} (Seifert–van Kampen): take $U = X$ minus one interior point of each disk ($U \\simeq T^2$) and $V$ = the open disk${k > 1 ? 's' : ''} (contractible). Each component of $U \\cap V$ is an annulus whose generator maps to the attaching word in $U$ and to $1$ in $V$, so each disk adds one relation:`, katex: R`\pi_1(X) \cong \langle a, b \mid aba^{-1}b^{-1},\ ` + T.rels.map(r => wordTex(r) || '1').join(', ') + R` \rangle` });
    const M = pairs.map(p => [p[0], p[1]]);
    if (k === 1) {
      const [p, q] = pairs[0];
      const d = gcd(p, q);
      if (d === 0) {
        steps.push({ label: `Step ${n++}: the curve $(0, 0)$ is null-homotopic, so the relation is trivial and the disk becomes a sphere: $X \\simeq T^2 \\vee S^2$.`, katex: R`\pi_1(X) \cong \mathbb{Z} \times \mathbb{Z}` });
      } else {
        const [g, x, y] = egcd(p / d, q / d); // (p/d) x + (q/d) y = 1  -> s = x, r = -y
        const r = -y, s = x;
        steps.push({ label: `Step ${n++}: the group is abelian, so $\\pi_1(X) \\cong \\mathbb{Z}^2 / \\langle (${p}, ${q}) \\rangle$. Here $\\gcd(${p}, ${q}) = ${d}$${d === 1 ? '' : `, so $(${p}, ${q}) = ${d}\\,(${p / d}, ${q / d})$`}. Bézout: $${p / d}\\cdot(${s}) - ${q / d}\\cdot(${r}) = ${g}$, so the matrix below has determinant 1 and $u = a^{${p / d}} b^{${q / d}}$, $v = a^{${r}} b^{${s}}$ form a basis:`, katex: `\\begin{pmatrix} ${p / d} & ${q / d} \\\\ ${r} & ${s} \\end{pmatrix} \\in SL_2(\\mathbb{Z}),\\qquad a^{${p}}b^{${q}} = u^{${d}}` });
        steps.push({ label: `Step ${n++}: in the basis $u, v$ the only relation is $u^{${d}} = 1$:`, katex: `\\pi_1(X) \\cong \\langle u, v \\mid [u, v],\\ u^{${d}} \\rangle \\cong ${T.value}` });
      }
    } else {
      steps.push({ label: `Step ${n++}: the group is abelian, so $\\pi_1(X) = \\mathbb{Z}^2 / (\\text{row space of the relation matrix})$; Smith normal form:`, katex: `${pmatrix(M)} \\sim \\operatorname{diag}(${snf(M).join(', ') || '0'}) \\implies \\pi_1(X) \\cong ${T.value}` });
    }
  }
  let hres = null;
  if (parts.H) {
    const cw = { cells: T.cells, D: { 1: [[0, 0]], 2: T.D2 }, why: { 1: 'Both 1-cells are loops at the single vertex, so $\\partial_1 = 0$.', 2: `Column $e_T$: the commutator abelianises to $0$. Column of a disk glued along a $(p, q)$ curve: $p\\,a + q\\,b$.` } };
    const hs = homologySteps(cw, X, n);
    steps.push(...hs.steps);
    n = hs.next;
    hres = hs.h;
  }
  const ans = [];
  if (parts.pi1) ans.push(`\\pi_1(X) \\cong ${T.value}`);
  if (hres) ans.push(hList(hres));
  if (parts.chi) ans.push(`\\chi(X) = ${1 - 2 + 1 + k}`);
  const answer = ans.join(R`;\quad `);
  steps.push({ label: 'Final Answer:', katex: R`\mathbf{` + answer + '}' });
  return { answer, steps };
}

/* ---------------------------------------------------------------- generic answer for a catalogue space */
function solveSpace(sp, parts) {
  const steps = [];
  const X = sp.X;
  steps.push({ label: `Space: ${sp.name}. CW structure: ${sp.cwWhy}.`, katex: '' });
  let n = 1;
  if (parts.pi1) {
    const twoCells = (sp.cw.cells[2] || []).length;
    if (sp.pi1.pres) steps.push({ label: `Step ${n++}: $\\pi_1$ depends only on the 2-skeleton: one generator for each 1-cell and${twoCells ? ' (Seifert–van Kampen: removing a point from each open 2-cell leaves a space that retracts to the 1-skeleton, and the annulus around the point carries the attaching loop)' : ''} one relation for each 2-cell, read off from its attaching word:`, katex: `\\pi_1(${X}) \\cong ${sp.pi1.pres}` });
    steps.push({ label: `Step ${n++}: ${sp.pi1.why}:`, katex: `\\pi_1(${X}) \\cong ${sp.pi1.valueWord || sp.pi1.value}` });
  }
  let h = null;
  if (parts.H || parts.chi) {
    const hs = homologySteps(Object.assign({}, sp.cw, { why: sp.cw.why || {} }), X, n);
    if (parts.H) steps.push(...hs.steps); else steps.push(hs.steps[hs.steps.length - 1]);
    h = hs;
    n = hs.next;
  }
  const ans = [];
  if (parts.pi1) ans.push(`\\pi_1(${X}) \\cong ${sp.pi1.valueWord || sp.pi1.value}`.replace(/\\cong 1 \\text\{ \(trivial\)\}/, '= 1 \\text{ (trivial)}'));
  if (parts.H) ans.push(hList(h.h));
  if (parts.chi) ans.push(`\\chi(${X}) = ${h.chi}`);
  const answer = ans.join(R`;\quad `);
  steps.push({ label: 'Final Answer:', katex: R`\mathbf{` + answer + '}' });
  return { answer, steps };
}

/* ---------------------------------------------------------------- reading the question */
function norm(raw) {
  return String(raw)
    .replace(/\$/g, ' ')
    .replace(/\\mathbb\s*\{\s*(R|C)\s*P\s*\}/gi, ' $1P').replace(/\\mathbb\s*\{\s*(R|C)\s*\}\s*P/gi, ' $1P').replace(/ℝ\s*P/g, 'RP').replace(/ℂ\s*P/g, 'CP')
    .replace(/\\mathbb\s*\{\s*Z\s*\}/g, 'Z')
    .replace(/\\(?:text|mathrm|operatorname|mathbf|mathcal|textbf|textit)\s*\{([^{}]*)\}/g, ' $1 ')
    .replace(/\\(?:left|right|big|Big|bigg)(?![a-z])/g, '')
    .replace(/\\times/g, ' × ').replace(/\\vee/g, ' ∨ ').replace(/\\wedge/g, ' ∨ ').replace(/\\#/g, ' # ').replace(/\\pi/g, 'π').replace(/\\chi/g, 'χ')
    .replace(/\\(?:geq|ge)(?![a-z])/g, '≥').replace(/\\setminus/g, ' minus ').replace(/\\cong/g, '≅')
    .replace(/\\[,;:! ]|~/g, ' ').replace(/[{}]/g, '')
    .toLowerCase().replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
}

const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const numOf = (t) => t == null ? null : /^\d+$/.test(t) ? Number(t) : (NUMW[t] ?? null);

function whichParts(s) {
  const pi1 = /fundamental group|π_?1|pi_?1\b|\bπ1\b|first homotopy group/.test(s);
  const H = /homology|\bh_\s*(?:n|k|\d|i|\*|q)\b|\bh_\*|betti/.test(s);
  const chi = /euler characteristic|χ/.test(s);
  return { pi1, H, chi, any: pi1 || H || chi };
}

function recognise(s) {
  const torusRe = /\btorus\b|\bt\^2\b|\bt2\b|s\^1\s*×\s*s\^1|\bdonut\b|\bdoughnut\b/;
  const attaching = /\b(glu|attach|sew|cap|identif)/.test(s);
  // torus with disk(s) along (p,q) curves
  if (torusRe.test(s) && attaching && /\b(disks?|discs?|d\^2|2-cells?|2 cells?|2-disks?|cells?)\b/.test(s)) {
    const nums = [...s.matchAll(/(?<![a-z0-9_)])\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g)].map(m => [Number(m[1]), Number(m[2])]);
    const uniq = []; nums.forEach(p => { if (!uniq.some(u => u[0] === p[0] && u[1] === p[1])) uniq.push(p); });
    if (uniq.length) return { kind: 'torusDisk', pairs: uniq };
    const sym = s.match(/(?<![a-z0-9_)])\(\s*([pqmnrsab])\s*,\s*([pqmnrsab])\s*\)/);
    if (sym && sym[1] !== sym[2]) {
      const P = sym[1], Q = sym[2];
      const coprime = new RegExp(`coprime|relatively prime|gcd\\s*\\(\\s*${P}\\s*,\\s*${Q}\\s*\\)\\s*=\\s*1|co-prime`).test(s);
      return { kind: 'torusDisk', symbolic: true, sym: [P, Q], coprime };
    }
    if (/meridian|longitude/.test(s)) return { kind: 'torusDisk', pairs: [/meridian/.test(s) ? [0, 1] : [1, 0]] };
  }
  // circle with a disk attached by a degree-n map
  if (/\b(circle|s\^1)\b/.test(s) && attaching && /(disk|disc|2-cell|d\^2)/.test(s)) {
    const m = s.match(/degree\s*(-?\d+)|z\s*(?:↦|->|\\mapsto|maps to)?\s*z\s*\^\s*(-?\d+)|wraps?\s*(?:around\s*)?(\d+)\s*times|(\d+)\s*times\s*around/);
    if (m) return { kind: 'space', sp: moore(Number(m[1] || m[2] || m[3] || m[4])) };
  }
  if (/dunce\s*cap/.test(s)) return { kind: 'space', sp: dunce() };
  // punctured spaces
  let m = s.match(/(?:sphere|s\^2)\s*(?:with|minus|without|removing|less)\s*(\w+)\s*points?\s*(?:removed|deleted|punctured|taken out)?/) || s.match(/(\w+)[- ]punctured\s*(?:sphere|s\^2)/);
  if (m && numOf(m[1])) { const k = numOf(m[1]); return { kind: 'space', sp: k === 1 ? pointSpace('the sphere minus a point (homeomorphic to $\\mathbb{R}^2$, contractible)') : Object.assign(wedge(Array(k - 1).fill(1)), { name: `the sphere minus ${k} points, which deformation retracts onto a wedge of ${k - 1} circle${k > 2 ? 's' : ''}` }) }; }
  m = s.match(/(?:plane|r\^2)\s*(?:with|minus|without|removing|less)\s*(\w+)\s*points?/);
  if (m && numOf(m[1])) { const k = numOf(m[1]); return { kind: 'space', sp: Object.assign(wedge(Array(k).fill(1)), { name: `the plane minus ${k} point${k > 1 ? 's' : ''}, which deformation retracts onto a wedge of ${k} circle${k > 1 ? 's' : ''}` }) }; }
  if (torusRe.test(s) && /(minus|with|without|removing)\s*(a|one)\s*point|punctured\s*torus|once[- ]punctured/.test(s)) return { kind: 'space', sp: Object.assign(wedge([1, 1]), { name: 'the punctured torus, which deformation retracts onto $S^1 \\vee S^1$ (the 1-skeleton)' }) };
  if (/(sphere|s\^2)/.test(s) && /(two|2)\s*points\s*identified|identify(?:ing)?\s*(?:the\s*)?(?:north and south poles|two points)|north and south poles?\s*identified/.test(s)) return { kind: 'space', sp: Object.assign(wedge([2, 1]), { name: '$S^2$ with two points identified, which is homotopy equivalent to $S^2 \\vee S^1$ (join the two points by an arc inside the sphere and collapse it)' }) };
  // lens space
  m = s.match(/l\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (m && /lens/.test(s)) return { kind: 'space', sp: lens(Number(m[1]), Number(m[2])) };
  // wedges
  m = s.match(/wedge (?:sum )?of (\w+) circles|bouquet of (\w+) circles/);
  if (m && numOf(m[1] || m[2])) return { kind: 'space', sp: wedge(Array(numOf(m[1] || m[2])).fill(1)) };
  if (/figure[- ]?(eight|8)/.test(s)) return { kind: 'space', sp: wedge([1, 1]) };
  m = s.match(/(s\^\d+(?:\s*∨\s*s\^\d+)+)/);
  if (m) return { kind: 'space', sp: wedge(m[1].split('∨').map(x => Number(x.replace(/[^\d]/g, ''))).sort((a, b) => a - b)) };
  // products of spheres
  m = s.match(/s\^(\d+)\s*×\s*s\^(\d+)/);
  if (m && !(m[1] === '1' && m[2] === '1' && attaching)) return { kind: 'space', sp: sphereProduct(Number(m[1]), Number(m[2])) };
  m = s.match(/\bt\^(\d+)\b|(\d+)[- ]torus|(\w+)[- ]dimensional torus/);
  if (m && numOf(m[1] || m[2] || m[3]) && numOf(m[1] || m[2] || m[3]) !== 2) return { kind: 'space', sp: ntorus(numOf(m[1] || m[2] || m[3])) };
  // projective spaces
  m = s.match(/\brp\s*\^?\s*(\d+)|real projective (?:space|plane)(?:\s*rp\^?(\d+))?/);
  if (m) return { kind: 'space', sp: rpn(m[1] ? Number(m[1]) : m[2] ? Number(m[2]) : 2) };
  m = s.match(/\bcp\s*\^?\s*(\d+)|complex projective (?:space|plane)/);
  if (m) return { kind: 'space', sp: cpn(m[1] ? Number(m[1]) : 1) };
  // surfaces
  m = s.match(/connected sum of (\w+) (?:copies of the )?(?:tori|torus)|genus[- ]?(?:g\s*=\s*)?(\d+)\b|(\w+)[- ]holed torus/);
  if (m && /non[- ]?orientable/.test(s) && numOf(m[1] || m[2])) return { kind: 'space', sp: nonOrientable(numOf(m[1] || m[2])) };
  if (m && numOf(m[1] || m[2] || m[3]) != null) return { kind: 'space', sp: genusSurface(numOf(m[1] || m[2] || m[3])) };
  m = s.match(/connected sum of (\w+) (?:copies of the )?(?:real )?projective planes|connected sum of (\w+) rp\^?2/);
  if (m && numOf(m[1] || m[2])) return { kind: 'space', sp: nonOrientable(numOf(m[1] || m[2])) };
  if (/klein\s*bottle/.test(s)) return { kind: 'space', sp: klein() };
  if (/projective\s*plane/.test(s)) return { kind: 'space', sp: rpn(2) };
  if (/m(ö|o|oe)bius/.test(s)) return { kind: 'space', sp: Object.assign(circleSpace(), { X: 'M', name: 'the Möbius band, which deformation retracts onto its central circle' }) };
  if (/cylinder|annulus/.test(s)) return { kind: 'space', sp: Object.assign(circleSpace(), { X: 'X', name: 'the cylinder / annulus, which deformation retracts onto a circle' }) };
  if (torusRe.test(s)) return { kind: 'space', sp: torusSpace() };
  m = s.match(/\bs\^(\d+)\b|(\d+)[- ]sphere/);
  if (m) return { kind: 'space', sp: sphere(Number(m[1] || m[2])) };
  if (/\bsphere\b/.test(s)) return { kind: 'space', sp: sphere(2) };
  if (/\bcircle\b/.test(s)) return { kind: 'space', sp: circleSpace() };
  if (/\b(disk|disc|ball|contractible|convex)\b|\br\^\d\b/.test(s)) return { kind: 'space', sp: pointSpace('a contractible space (disk / ball / $\\mathbb{R}^n$)') };
  return null;
}

function solveTopology(raw) {
  const s = norm(raw);
  const parts = whichParts(s);
  if (!parts.any) return null;
  // Euler characteristic of a polyhedron from V, E, F: left to the polyhedron solver
  if (!parts.pi1 && !parts.H && (/\bv\s*=\s*\d+/.test(s) || /\b(cube|tetrahedron|octahedron|dodecahedron|icosahedron|polyhedron)\b/.test(s))) return null;
  const r = recognise(s);
  if (!r) return null;
  if (r.kind === 'torusDisk') return solveTorusDisk(r, parts);
  return solveSpace(r.sp, parts);
}

module.exports = { solveTopology, snf, _norm: norm, _recognise: recognise };
