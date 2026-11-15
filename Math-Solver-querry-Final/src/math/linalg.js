// Exact linear algebra over the rationals (Q)
const { Q } = require('./rational');

// Reduced row echelon form. Returns { rref, pivots }
function rref(M) {
  const A = M.map(r => r.map(Q.from));
  const rows = A.length, cols = A[0].length;
  const pivots = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    while (p < rows && A[p][c].isZero()) p++;
    if (p === rows) continue;
    [A[r], A[p]] = [A[p], A[r]];
    const inv = new Q(1n).div(A[r][c]);
    A[r] = A[r].map(v => v.mul(inv));
    for (let i = 0; i < rows; i++) {
      if (i !== r && !A[i][c].isZero()) {
        const f = A[i][c];
        A[i] = A[i].map((v, j) => v.sub(f.mul(A[r][j])));
      }
    }
    pivots.push(c);
    r++;
  }
  return { rref: A, pivots };
}

// Solve A x = b. Returns array of Q, or null if no unique solution.
function solve(A, b) {
  const aug = A.map((row, i) => [...row.map(Q.from), Q.from(b[i])]);
  const n = A[0].length;
  const { rref: R, pivots } = rref(aug);
  if (pivots.includes(n)) return null;          // inconsistent
  if (pivots.length < n) return null;           // not unique
  return Array.from({ length: n }, (_, i) => R[i][n]);
}

// Basis of the null space of A, each vector scaled to whole numbers
function nullSpace(A) {
  const cols = A[0].length;
  const { rref: R, pivots } = rref(A);
  const free = [...Array(cols).keys()].filter(c => !pivots.includes(c));
  return free.map(f => {
    const v = Array.from({ length: cols }, () => new Q(0n));
    v[f] = new Q(1n);
    pivots.forEach((pc, i) => { v[pc] = R[i][f].neg(); });
    return integerVector(v);
  });
}

function integerVector(v) {
  const lcm = (a, b) => (a * b) / gcd(a, b);
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
  let L = 1n;
  for (const x of v) L = lcm(L, x.d);
  let ints = v.map(x => x.mul(new Q(L)).n);
  let g = 0n;
  for (const x of ints) g = gcd(g, x);
  if (g === 0n) g = 1n;
  ints = ints.map(x => x / g);
  // make the first non-zero entry positive
  const first = ints.find(x => x !== 0n);
  if (first < 0n) ints = ints.map(x => -x);
  return ints.map(x => new Q(x));
}

function det(M) {
  const n = M.length;
  if (n === 1) return Q.from(M[0][0]);
  if (n === 2) return Q.from(M[0][0]).mul(Q.from(M[1][1])).sub(Q.from(M[0][1]).mul(Q.from(M[1][0])));
  let d = new Q(0n);
  for (let j = 0; j < n; j++) {
    const minor = M.slice(1).map(r => r.filter((_, k) => k !== j));
    const term = Q.from(M[0][j]).mul(det(minor));
    d = j % 2 === 0 ? d.add(term) : d.sub(term);
  }
  return d;
}

function matrixTex(M) {
  return `\\begin{pmatrix} ${M.map(r => r.map(v => Q.from(v).toTex()).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
}
function vectorTex(v) {
  return `\\begin{pmatrix} ${v.map(x => Q.from(x).toTex()).join(' \\\\ ')} \\end{pmatrix}`;
}

module.exports = { rref, solve, nullSpace, det, matrixTex, vectorTex, integerVector };
