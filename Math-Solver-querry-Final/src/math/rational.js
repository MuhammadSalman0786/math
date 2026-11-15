// Exact numbers for the solvers.
// Q = exact rational number (BigInt numerator/denominator).
// If a result can't be exact (e.g. 2^0.5) it becomes an approximate float.

const absB = (x) => (x < 0n ? -x : x);
function gcdB(a, b) {
  a = absB(a); b = absB(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

class DivisionByZero extends Error {
  constructor() { super('Division by zero is undefined.'); this.name = 'DivisionByZero'; }
}

class Q {
  constructor(n, d = 1n, approx = null) {
    this.approx = approx; // number when inexact, otherwise null
    if (approx !== null) return;
    n = BigInt(n); d = BigInt(d);
    if (d === 0n) throw new DivisionByZero();
    if (d < 0n) { n = -n; d = -d; }
    const g = gcdB(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }

  static float(x) {
    if (x === Infinity || x === -Infinity) throw new Error('The result is too large to calculate.');
    if (!Number.isFinite(x)) throw new Error('The result is not a real number.');
    return new Q(0n, 1n, x);
  }

  // Parses "12", "-3", "2.75", "1/4" into an exact value.
  static parse(str) {
    str = String(str).trim();
    let m = str.match(/^([+-]?)(\d+)\/(\d+)$/);
    if (m) return new Q(BigInt(m[1] + m[2]), BigInt(m[3]));
    m = str.match(/^([+-]?)(\d*)(?:\.(\d+))?$/);
    if (!m || (m[2] === '' && !m[3])) return null;
    const frac = m[3] || '';
    return new Q(BigInt(m[1] + (m[2] || '0') + frac), 10n ** BigInt(frac.length));
  }

  static from(x) {
    if (x instanceof Q) return x;
    if (typeof x === 'bigint') return new Q(x);
    if (Number.isInteger(x)) return new Q(BigInt(x));
    return Q.parse(String(x)) || Q.float(x);
  }

  get exact() { return this.approx === null; }
  isZero() { return this.exact ? this.n === 0n : this.approx === 0; }
  isInteger() { return this.exact && this.d === 1n; }
  isNegative() { return this.exact ? this.n < 0n : this.approx < 0; }
  toNumber() { return this.exact ? Number(this.n) / Number(this.d) : this.approx; }
  equals(o) { o = Q.from(o); return this.exact && o.exact ? this.n === o.n && this.d === o.d : this.toNumber() === o.toNumber(); }

  _tooBig() { return this.exact && (this.n.toString().length > 1000 || this.d.toString().length > 1000); }
  _guard() { return this._tooBig() ? Q.float(this.toNumber()) : this; }

  add(o) { o = Q.from(o); if (!this.exact || !o.exact) return Q.float(this.toNumber() + o.toNumber()); return new Q(this.n * o.d + o.n * this.d, this.d * o.d)._guard(); }
  sub(o) { o = Q.from(o); if (!this.exact || !o.exact) return Q.float(this.toNumber() - o.toNumber()); return new Q(this.n * o.d - o.n * this.d, this.d * o.d)._guard(); }
  mul(o) { o = Q.from(o); if (!this.exact || !o.exact) return Q.float(this.toNumber() * o.toNumber()); return new Q(this.n * o.n, this.d * o.d)._guard(); }
  div(o) {
    o = Q.from(o);
    if (o.isZero()) throw new DivisionByZero();
    if (!this.exact || !o.exact) return Q.float(this.toNumber() / o.toNumber());
    return new Q(this.n * o.d, this.d * o.n)._guard();
  }
  neg() { return this.exact ? new Q(-this.n, this.d) : Q.float(-this.approx); }
  abs() { return this.isNegative() ? this.neg() : this; }

  pow(o) {
    o = Q.from(o);
    if (this.isZero() && o.isNegative()) throw new DivisionByZero();
    if (this.exact && o.isInteger() && absB(o.n) <= 2000n) {
      const e = absB(o.n);
      // Rough size check before computing huge powers exactly
      const size = Math.max(Number(this.n < 0n ? -this.n : this.n), Number(this.d));
      const digits = Math.log10(Math.max(size, 1)) * Number(e);
      if (digits <= 1200) {
        const r = new Q(this.n ** e, this.d ** e);
        return o.n < 0n ? new Q(1n).div(r) : r;
      }
    }
    // Odd roots of negative numbers: (-8)^(1/3) = -2
    if (this.exact && o.exact && this.isNegative() && o.d % 2n === 1n && o.d > 1n) {
      const r = this.neg().pow(o);
      return o.n % 2n === 0n ? r : r.neg();
    }
    // Exact roots like 4^(1/2) or 8^(1/3)
    if (this.exact && o.exact && !this.isNegative() && o.d > 1n && o.d <= 10n) {
      const rootN = intRoot(this.n, o.d), rootD = intRoot(this.d, o.d);
      if (rootN !== null && rootD !== null) return new Q(rootN, rootD).pow(new Q(o.n));
    }
    const v = Math.pow(this.toNumber(), o.toNumber());
    if (Number.isNaN(v)) throw new Error('The result is not a real number (even root of a negative number).');
    return Q.float(v);
  }

  // LaTeX display. decimal=true shows decimals instead of fractions.
  toTex(decimal = false) {
    if (!this.exact || (decimal && !this.isInteger())) return formatDecimal(this.toNumber());
    if (this.d === 1n) return this.n.toString();
    const sign = this.n < 0n ? '-' : '';
    return `${sign}\\frac{${absB(this.n)}}{${this.d}}`;
  }

  toPlain() {
    if (!this.exact) return formatDecimal(this.approx);
    return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`;
  }

  // "2\frac{1}{3}" for 7/3 (null when not useful)
  toMixedTex() {
    if (!this.exact || this.d === 1n || absB(this.n) < this.d) return null;
    const sign = this.n < 0n ? '-' : '';
    const n = absB(this.n);
    return `${sign}${n / this.d}\\frac{${n % this.d}}{${this.d}}`;
  }
}

function intRoot(x, k) {
  k = BigInt(k);
  if (x < 0n) return null;
  if (x < 2n) return x;
  let r = BigInt(Math.round(Math.pow(Number(x), 1 / Number(k))));
  for (const c of [r - 1n, r, r + 1n]) if (c >= 0n && c ** k === x) return c;
  return null;
}

function formatDecimal(x) {
  if (Number.isInteger(x)) return String(x);
  const abs = Math.abs(x);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return x.toExponential(6).replace(/\.?0+e/, 'e');
  return String(parseFloat(x.toPrecision(10)));
}

module.exports = { Q, gcdB, absB, DivisionByZero, formatDecimal, intRoot };
