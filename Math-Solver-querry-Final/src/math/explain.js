'use strict';
/* Student-friendly working for numeric expressions.
 * Each part of the expression is worked out on its own line with the rule that is used
 * (negative / fractional exponents, simplifying roots, exact trig values with the quadrant
 * and reference angle, logs, factorials, multiplying / dividing / adding fractions with a
 * common denominator). The values come from the exact symbolic engine, so the working
 * always agrees with the final answer.
 */
const S = require('./symbolic');
const P = require('./polynomial');
const { Q } = require('./rational');

const T = (n) => S.tex(n);
const V = (n) => S.simplify(n);
const exactNum = (n) => n && n.t === 'num' && n.v.exact;
const qt = (q) => q.toTex();
const paren = (s) => (/^-|\\frac|[+\-]/.test(s.trim()) ? `\\left(${s}\\right)` : s);
const bgcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };

// exact q-th root of a rational number (negative allowed for odd q), or null
function rootQ(B, q) {
  const qi = Number(q);
  const r1 = (x) => { // BigInt -> BigInt root or null
    const neg = x < 0n;
    if (neg && qi % 2 === 0) return null;
    const ax = neg ? -x : x;
    const g = BigInt(Math.round(Math.pow(Number(ax), 1 / qi)));
    for (const c of [g - 1n, g, g + 1n]) if (c >= 0n && c ** q === ax) return neg ? -c : c;
    return null;
  };
  if (!B.exact) return null;
  const n = r1(B.n), d = r1(B.d);
  return n !== null && d !== null ? new Q(n, d) : null;
}

const QUAD = ['I', 'II', 'III', 'IV'];
function trigLine(f, k, lines) { // f(kπ)
  const fT = `\\${f}`;
  const angT = T(V(S.prod(S.num(k), S.cst('pi'))));
  const turns = Math.floor(k.toNumber() / 2);
  let r = k.sub(new Q(BigInt(2 * turns)));
  const out = V(S.fn(f, V(S.prod(S.num(k), S.cst('pi')))));
  if (out.t === 'fn') return; // no exact value
  const rn = r.toNumber();
  const rT = T(V(S.prod(S.num(r), S.cst('pi'))));
  if (turns !== 0) lines.push({ rule: `Remove whole turns: subtract ${turns > 0 ? '' : '−'}$${Math.abs(turns) === 1 ? '' : Math.abs(turns)}${Math.abs(turns) === 1 ? '' : '\\cdot '}2\\pi$ (a full turn does not change sin, cos or tan)`, tex: `${fT}\\left(${angT}\\right) = ${fT}\\left(${rT}\\right)` });
  if (Math.abs(rn * 2 - Math.round(rn * 2)) < 1e-12) { // on an axis
    lines.push({ rule: `$${rT}$ lies on an axis of the unit circle, where (cos, sin) is one of (1, 0), (0, 1), (−1, 0), (0, −1)`, tex: `${fT}\\left(${rT}\\right) = ${T(out)}` });
    return;
  }
  const quad = rn < 0.5 ? 0 : rn < 1 ? 1 : rn < 1.5 ? 2 : 3;
  const ref = [r, new Q(1n).sub(r), r.sub(new Q(1n)), new Q(2n).sub(r)][quad];
  const refT = T(V(S.prod(S.num(ref), S.cst('pi'))));
  const positive = { sin: [0, 1], cos: [0, 3], tan: [0, 2] }[f].includes(quad);
  const refVal = T(V(S.fn(f, V(S.prod(S.num(ref), S.cst('pi'))))));
  if (quad === 0) {
    lines.push({ rule: `Exact value from the special-angle table (${f} of $${rT}$)`, tex: `${fT}\\left(${rT}\\right) = ${T(out)}` });
  } else {
    lines.push({ rule: `$${rT}$ is in quadrant ${QUAD[quad]}; its reference angle is $${refT}$, and ${f} is ${positive ? 'positive' : 'negative'} in quadrant ${QUAD[quad]} (All–Sin–Tan–Cos rule)`, tex: `${fT}\\left(${rT}\\right) = ${positive ? '' : '-'}${fT}\\left(${refT}\\right) = ${positive ? refVal : '-' + paren(refVal)} = ${T(out)}` });
  }
}

function explainNode(n, lines, depth = 0) {
  if (depth > 40) return V(n);
  switch (n.t) {
    case 'num': case 'const': case 'var': return n;
    case 'pow': {
      const b = explainNode(n.base, lines, depth + 1);
      const e = explainNode(n.exp, [], depth + 1); // exponents like 3/4 need no working of their own
      const out = V(S.pow(b, e));
      if (!exactNum(b) || !exactNum(e)) return out;
      const B = b.v, E = e.v, bT = paren(qt(B));
      if (E.isZero()) { lines.push({ rule: 'Any non-zero number to the power 0 is 1', tex: `${bT}^{0} = 1` }); return out; }
      if (E.isInteger() && E.n > 1n) {
        const v = B.pow(E);
        const expand = E.n <= 4n && (B.isInteger() ? (B.n < 0n ? -B.n : B.n) < 1000n : true);
        lines.push({ rule: `Power: multiply ${bT.startsWith('\\left') ? 'the base' : '$' + bT + '$'} by itself ${E.n} times`.replace('$$', ''), tex: `${bT}^{${E.n}} = ${expand ? Array(Number(E.n)).fill(bT).join(' \\times ') + ' = ' : ''}${qt(v)}` });
        return out;
      }
      if (E.isInteger() && E.n < 0n) {
        const pos = B.pow(E.neg());
        lines.push({ rule: 'Negative exponent: $a^{-n} = \\frac{1}{a^{n}}$', tex: `${bT}^{${E.n}} = \\frac{1}{${bT}^{${-E.n}}} = \\frac{1}{${qt(pos)}} = ${qt(B.pow(E))}` });
        return out;
      }
      if (!E.isInteger()) {
        const p = E.n, q = E.d;
        if (q === 2n && p === 1n && B.isInteger() && B.n > 0n) {
          const r = rootQ(B, 2n);
          if (r) { lines.push({ rule: `Square root: $${qt(r)} \\times ${qt(r)} = ${qt(B)}$`, tex: `\\sqrt{${qt(B)}} = ${qt(r)}` }); return out; }
          const { out: o, inside } = P.simplifyRadical(B.n);
          if (o > 1n) lines.push({ rule: `Simplify the root: take out the largest square factor ($${o * o} = ${o}^2$)`, tex: `\\sqrt{${B.n}} = \\sqrt{${o * o} \\cdot ${inside}} = \\sqrt{${o * o}}\\,\\sqrt{${inside}} = ${o}\\sqrt{${inside}}` });
          return out;
        }
        const r = rootQ(B, q);
        if (r) {
          const rootT = q === 2n ? `\\sqrt{${qt(B)}}` : `\\sqrt[${q}]{${qt(B)}}`;
          if (p === 1n) lines.push({ rule: `${q === 3n ? 'Cube' : q === 2n ? 'Square' : `${q}th`} root: $${paren(qt(r))}^{${q}} = ${qt(B)}$`, tex: `${bT}^{\\frac{1}{${q}}} = ${rootT} = ${qt(r)}` });
          else {
            const v = r.pow(new Q(p));
            lines.push({ rule: `Fractional exponent: $a^{\\frac{p}{q}} = \\left(\\sqrt[q]{a}\\right)^{p}$ — take the root first, then the power`, tex: `${bT}^{\\frac{${p}}{${q}}} = \\left(${rootT}\\right)^{${p}} = ${paren(qt(r))}^{${p}} = ${qt(v)}` });
          }
        }
      }
      return out;
    }
    case 'fn': {
      const a = explainNode(n.arg, lines, depth + 1);
      if (n.f === 'sqrt') return explainNode(S.pow(a, S.num(new Q(1n, 2n))), lines, depth + 1);
      const out = V(S.fn(n.f, a));
      if (['sin', 'cos', 'tan'].includes(n.f)) {
        // an angle typed in degrees arrives as (d·π/180): show the conversion
        const at = S.tex(n.arg);
        const dm = at.match(/^\\frac\{(\d+) \\pi\}\{180\}$/);
        if (dm) lines.push({ rule: 'Convert degrees to radians: multiply by $\\frac{\\pi}{180}$', tex: `${dm[1]}^\\circ = ${dm[1]} \\times \\frac{\\pi}{180} = ${T(a)}` });
        let k = null;
        if (a.t === 'const' && a.n === 'pi') k = new Q(1n);
        else if (a.t === 'num' && a.v.isZero()) k = new Q(0n);
        else if (a.t === 'prod' && a.factors.length === 2 && exactNum(a.factors[0]) && a.factors[1].t === 'const' && a.factors[1].n === 'pi') k = a.factors[0].v;
        if (k) trigLine(n.f, k, lines);
        return out;
      }
      if (n.f === 'log' && exactNum(out) && exactNum(a)) { lines.push({ rule: `Logarithm base 10: $10^{${qt(out.v)}} = ${qt(a.v)}$`, tex: `\\log_{10} ${qt(a.v)} = ${qt(out.v)}` }); return out; }
      if (n.f === 'ln' && exactNum(out)) { lines.push({ rule: 'Natural log undoes $e$: $\\ln(e^{k}) = k$', tex: `\\ln\\left(${T(a)}\\right) = ${qt(out.v)}` }); return out; }
      if (n.f === 'fact' && exactNum(a) && exactNum(out)) {
        const m = Number(a.v.n);
        lines.push({ rule: 'Factorial: multiply all whole numbers from n down to 1', tex: `${m}! = ${m <= 8 ? Array.from({ length: m }, (_, i) => m - i).join(' \\times ') + ' = ' : ''}${qt(out.v)}` });
        return out;
      }
      if (n.f === 'abs' && exactNum(a)) { lines.push({ rule: 'Absolute value: the distance from 0 (never negative)', tex: `\\left|${qt(a.v)}\\right| = ${qt(out.v)}` }); return out; }
      return out;
    }
    case 'prod': {
      // division a / b is stored as a · b^(-1): explain b itself, then divide
      const mulF = [], divF = [];
      for (const f of n.factors) {
        if (f.t === 'pow' && exactNum(f.exp) && f.exp.v.equals(-1) && !(f.base.t === 'num' && n.factors.length === 1)) divF.push(explainNode(f.base, lines, depth + 1));
        else mulF.push(explainNode(f, lines, depth + 1));
      }
      const out = V(S.prod(...mulF, ...divF.map(d => S.pow(d, S.num(-1)))));
      const all = [...mulF, ...divF];
      if (!all.every(exactNum) || !exactNum(out)) return out;
      const realMul = mulF.filter(f => !(f.v.equals(1) || f.v.equals(-1)));
      const sign = mulF.filter(f => f.v.equals(-1)).length % 2 ? -1 : 1;
      if (!divF.length && realMul.length < 2) return out; // just a sign change
      const numer = realMul.reduce((acc, f) => acc.mul(f.v), new Q(BigInt(sign)));
      if (divF.length) {
        const den = divF.reduce((acc, f) => acc.mul(f.v), new Q(1n));
        if (den.isZero()) return out;
        if (!den.isInteger()) {
          const rec = new Q(den.d, den.n);
          lines.push({ rule: 'Dividing by a fraction: multiply by its reciprocal (flip it)', tex: `${paren(qt(numer))} \\div ${paren(qt(den))} = ${paren(qt(numer))} \\times ${paren(qt(rec))} = ${qt(out.v)}` });
        } else if (numer.isInteger() && den.isInteger()) {
          const g = bgcd(numer.n, den.n);
          lines.push({ rule: g > 1n && !out.v.isInteger() ? `Divide; simplify the fraction by the common factor ${g}` : 'Divide', tex: `\\frac{${qt(numer)}}{${qt(den)}} = ${qt(out.v)}` });
        } else {
          lines.push({ rule: 'Divide: multiply the denominator of the top fraction by the number underneath', tex: `${paren(qt(numer))} \\div ${qt(den)} = ${qt(out.v)}` });
        }
      } else {
        const fracs = realMul.some(f => !f.v.isInteger());
        lines.push({ rule: fracs ? 'Multiply fractions: numerator × numerator and denominator × denominator, then simplify' : 'Multiply', tex: `${sign < 0 ? '-' : ''}${realMul.map(f => paren(qt(f.v))).join(' \\times ')} = ${qt(out.v)}` });
      }
      return out;
    }
    case 'sum': {
      const vals = n.terms.map(t => explainNode(t, lines, depth + 1));
      const out = V(S.sum(...vals));
      if (vals.length < 2) return out;
      if (vals.every(exactNum) && exactNum(out)) {
        const qs = vals.map(v => v.v);
        const L = qs.reduce((acc, q) => acc * q.d / bgcd(acc, q.d), 1n);
        const joined = T(S.sum(...vals));
        if (L > 1n && qs.some(q => q.d !== L)) {
          const parts = qs.map((q, i) => { const num = q.n * (L / q.d); return (i === 0 ? (num < 0n ? '-' : '') : (num < 0n ? ' - ' : ' + ')) + `\\frac{${num < 0n ? -num : num}}{${L}}`; }).join('');
          const top = qs.reduce((acc, q) => acc + q.n * (L / q.d), 0n);
          lines.push({ rule: `Add / subtract the fractions: rewrite each one over the common denominator ${L} (the LCM of the denominators)`, tex: `${joined} = ${parts} = \\frac{${top}}{${L}} = ${qt(out.v)}`.replace(`= \\frac{${top}}{${L}} = \\frac{${top}}{${L}}`, `= \\frac{${top}}{${L}}`) });
        } else if (L > 1n) {
          lines.push({ rule: 'The fractions have the same denominator: add / subtract the numerators', tex: `${joined} = ${qt(out.v)}` });
        } else {
          lines.push({ rule: 'Add and subtract from left to right', tex: `${joined} = ${qt(out.v)}` });
        }
        return out;
      }
      const before = T(S.sum(...vals)), after = T(out);
      if (before !== after) lines.push({ rule: 'Collect like terms (terms with the same root or the same π are added like ordinary numbers)', tex: `${before} = ${after}` });
      return out;
    }
  }
  return V(n);
}

// steps for a numeric expression, or null when there is nothing worth showing
function explainNumeric(node) {
  const lines = [];
  try { explainNode(node, lines); } catch (e) { return null; }
  // drop repeated "= x = x" pieces and lines that change nothing
  lines.forEach(l => { const parts = l.tex.split(' = '); l.tex = parts.filter((p, i) => i === 0 || p.trim() !== parts[i - 1].trim()).join(' = '); });
  const seen = new Set();
  const uniq = lines.filter(l => l.tex.includes(' = ') && !seen.has(l.tex) && seen.add(l.tex));
  if (!uniq.length) return null;
  const steps = [];
  if (uniq.length > 1) steps.push({ label: 'Work out each part on its own, in the order of operations (brackets → powers and roots → × and ÷ → + and −):', katex: '' });
  uniq.slice(0, 14).forEach((l, i) => steps.push({ label: `Step ${i + 1}: ${l.rule}:`, katex: l.tex }));
  return steps;
}

module.exports = { explainNumeric, explainNode, rootQ };
