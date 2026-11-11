// Small symbolic algebra engine: parse -> simplify -> differentiate / integrate / evaluate.
// Expressions use canonical n-ary nodes:
//   { t:'num', v:Q }  { t:'var', n:'x' }  { t:'const', n:'e'|'pi' }
//   { t:'sum', terms:[...] }  { t:'prod', factors:[...] }  { t:'pow', base, exp }  { t:'fn', f:'sin', arg }

const { Q } = require('./rational');
const P = require('./polynomial');

// ---------- Constructors ----------
const num = (v) => ({ t: 'num', v: Q.from(v) });
const vr = (n) => ({ t: 'var', n });
const cst = (n) => ({ t: 'const', n });
const sum = (...terms) => ({ t: 'sum', terms });
const prod = (...factors) => ({ t: 'prod', factors });
const pow = (base, exp) => ({ t: 'pow', base, exp: typeof exp === 'number' ? num(exp) : exp });
const fn = (f, arg) => ({ t: 'fn', f, arg });
const neg = (a) => prod(num(-1), a);
const sub = (a, b) => sum(a, neg(b));
const div = (a, b) => prod(a, pow(b, -1));
const isNum = (n, v) => n.t === 'num' && (v === undefined || n.v.equals(v));

const FUNCS = ['fact', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'ln', 'log', 'exp', 'sqrt', 'abs'];

// ---------- LaTeX / unicode / plain-text cleanup ----------
function replaceCommand(s, cmd, nArgs, build) {
  // Replaces \cmd{a}{b} (balanced braces) using build(a, b)
  for (let guard = 0; guard < 50; guard++) {
    const i = s.indexOf(cmd);
    if (i === -1) return s;
    let pos = i + cmd.length;
    let opt = null;
    if (s[pos] === '[') { const e = s.indexOf(']', pos); opt = s.slice(pos + 1, e); pos = e + 1; }
    const args = [];
    for (let k = 0; k < nArgs; k++) {
      while (s[pos] === ' ') pos++;
      if (s[pos] !== '{') {
        // single-character argument like \frac12
        if (s[pos] === undefined) return s;
        args.push(s[pos]); pos++; continue;
      }
      let depth = 0, j = pos;
      for (; j < s.length; j++) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') { depth--; if (depth === 0) break; }
      }
      args.push(s.slice(pos + 1, j));
      pos = j + 1;
    }
    s = s.slice(0, i) + build(args, opt) + s.slice(pos);
  }
  return s;
}

function toPlain(input) {
  let s = String(input || '');
  s = s.replace(/\\left|\\right|\\big|\\Big|\\displaystyle/g, '')
    .replace(/\\[,;:!]|\\quad|\\qquad|~/g, ' ')
    .replace(/\\(operatorname|mathrm|text|mathit)\{([^{}]*)\}/g, '$2')
    .replace(/\\exponentialE|\\mathrm\{e\}/g, 'e')
    .replace(/\\(cdot|times|ast)/g, '*').replace(/\\div/g, '/')
    .replace(/[·×∗]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-')
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
    .replace(/π|\\pi/g, 'pi').replace(/∞|\\infty/g, 'inf')
    .replace(/(\d+(?:\.\d+)?)\s*(?:°|\^\{?\\circ\}?|\\degree|deg\b)/g, '($1*pi/180)')
    .replace(/\\(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|sec|csc|cot|ln|log|exp)/g, '$1 ');
  s = replaceCommand(s, '\\dfrac', 2, a => `((${a[0]})/(${a[1]}))`);
  s = replaceCommand(s, '\\tfrac', 2, a => `((${a[0]})/(${a[1]}))`);
  s = replaceCommand(s, '\\frac', 2, a => `((${a[0]})/(${a[1]}))`);
  s = replaceCommand(s, '\\sqrt', 1, (a, opt) => opt ? `((${a[0]})^(1/(${opt})))` : `sqrt(${a[0]})`);
  s = s.replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([a-z0-9]+)/gi, 'sqrt($1)');
  s = s.replace(/\{/g, '(').replace(/\}/g, ')').replace(/\[/g, '(').replace(/\]/g, ')');
  s = s.replace(/\\/g, ' ');
  return s.trim();
}

// Heuristic repair for text copied from a PDF, where superscripts are flattened:
// "x2" -> x^2, "e3x" -> e^(3x), "ex" -> e^x, "(ln n)2" -> (ln n)^2.
// Only applied when the text has no '^' at all.
function repairPdfMath(s) {
  if (/\^/.test(s)) return s;
  return s
    .replace(/\be(-?\d*[a-z])(?![a-z(])/g, 'e^($1)')
    .replace(/([a-z\)])(\d+)/g, '$1^$2');
}

// ---------- Tokenizer & parser ----------
function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const m = src.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
    if (m) { out.push({ t: 'num', v: m[1] }); i += m[1].length; continue; }
    if (/[a-zA-Z]/.test(ch)) {
      const rest = src.slice(i);
      const name = FUNCS.find(f => rest.startsWith(f)); // longer names (sinh) are listed before shorter (sin)
      if (name) { out.push({ t: 'fn', v: name }); i += name.length; continue; }
      if (rest.startsWith('pi')) { out.push({ t: 'const', v: 'pi' }); i += 2; continue; }
      if (rest.startsWith('inf')) { out.push({ t: 'const', v: 'inf' }); i += 3; continue; }
      out.push(ch === 'e' ? { t: 'const', v: 'e' } : { t: 'var', v: ch });
      i++;
      continue;
    }
    if ('+-*/^(),|!'.includes(ch)) { out.push({ t: ch }); i++; continue; }
    if (ch === "'") { out.push({ t: "'" }); i++; continue; }
    throw new Error(`Unexpected "${ch}"`);
  }
  return out;
}

function parse(input, opts = {}) {
  let src = toPlain(input);
  if (opts.pdf) src = repairPdfMath(src);
  const tk = tokenize(src);
  let pos = 0;
  const peek = () => tk[pos];
  const eat = (t) => { if (!tk[pos] || (t && tk[pos].t !== t)) throw new Error('Parse error'); return tk[pos++]; };
  const startsPrimary = (t) => t && (t.t === 'num' || t.t === 'var' || t.t === 'const' || t.t === 'fn' || t.t === '(');

  function expr() {
    let terms = [term()];
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = eat().t;
      const r = term();
      terms.push(op === '-' ? neg(r) : r);
    }
    return terms.length === 1 ? terms[0] : sum(...terms);
  }
  function term() {
    let factors = [unary()];
    for (;;) {
      const t = peek();
      if (t && t.t === '*') { eat(); factors.push(unary()); }
      else if (t && t.t === '/') { eat(); factors.push(pow(unary(), -1)); }
      else if (startsPrimary(t)) factors.push(power());
      else break;
    }
    return factors.length === 1 ? factors[0] : prod(...factors);
  }
  function unary() {
    if (peek() && peek().t === '-') { eat(); return neg(unary()); }
    if (peek() && peek().t === '+') { eat(); return unary(); }
    return power();
  }
  function power() {
    let base = primary();
    while (peek() && peek().t === '!') { eat(); base = fn('fact', base); }
    if (peek() && peek().t === '^') { eat(); return pow(base, unary()); }
    return base;
  }
  // Argument of a function written without brackets: "sin 3x", "ln x"
  function bareArg() {
    const factors = [power()];
    while (peek() && (peek().t === 'num' || peek().t === 'var' || peek().t === 'const')) factors.push(power());
    return factors.length === 1 ? factors[0] : prod(...factors);
  }
  function primary() {
    const t = eat();
    if (t.t === 'num') return num(Q.parse(t.v));
    if (t.t === 'var') return vr(t.v);
    if (t.t === 'const') return cst(t.v);
    if (t.t === '(') { const e = expr(); eat(')'); return e; }
    if (t.t === '|') { const e = expr(); eat('|'); return fn('abs', e); }
    if (t.t === 'fn') {
      let exponent = null;
      if (peek() && peek().t === '^') { eat(); exponent = primary(); if (exponent.t === 'prod' && isNum(exponent.factors[0], -1)) exponent = neg(exponent.factors[1]); }
      let arg;
      if (peek() && peek().t === '(') { eat(); arg = expr(); eat(')'); }
      else arg = bareArg();
      let name = t.v;
      if (exponent && simplify(exponent).t === 'num' && simplify(exponent).v.equals(-1) && ['sin', 'cos', 'tan'].includes(name)) {
        return fn('arc' + name, arg);
      }
      const f = fn(name, arg);
      return exponent ? pow(f, exponent) : f;
    }
    throw new Error('Parse error');
  }
  const tree = expr();
  if (pos !== tk.length) throw new Error('Unexpected input');
  return tree;
}

function tryParse(input, opts) {
  try { return parse(input, opts); } catch (e) { return null; }
}

// ---------- Keys (for comparing expressions) ----------
function key(n) {
  switch (n.t) {
    case 'num': return n.v.toPlain();
    case 'var': return n.n;
    case 'const': return '#' + n.n;
    case 'sum': return '(' + n.terms.map(key).sort().join('+') + ')';
    case 'prod': return '[' + n.factors.map(key).sort().join('*') + ']';
    case 'pow': return '{' + key(n.base) + '^' + key(n.exp) + '}';
    case 'fn': return n.f + '(' + key(n.arg) + ')';
  }
  return '?';
}
const same = (a, b) => key(a) === key(b);

// ---------- Simplifier ----------
function splitCoef(n) {
  if (n.t === 'num') return [n.v, null];
  if (n.t === 'prod') {
    let c = new Q(1n);
    const rest = [];
    for (const f of n.factors) { if (f.t === 'num') c = c.mul(f.v); else rest.push(f); }
    return [c, rest.length === 0 ? null : rest.length === 1 ? rest[0] : prod(...rest)];
  }
  return [new Q(1n), n];
}

function simplify(n) {
  switch (n.t) {
    case 'num': case 'var': case 'const': return n;
    case 'fn': return simplifyFn(n.f, simplify(n.arg));
    case 'pow': return simplifyPow(simplify(n.base), simplify(n.exp));
    case 'prod': return simplifyProd(n.factors.map(simplify));
    case 'sum': return simplifySum(n.terms.map(simplify));
  }
  return n;
}

function simplifyFn(f, a) {
  if (f === 'exp') return simplifyPow(cst('e'), a);
  if (f === 'sqrt') return simplifyPow(a, num(new Q(1n, 2n)));
  if (a.t === 'num') {
    if (a.v.isZero()) {
      if (['sin', 'tan', 'arcsin', 'arctan', 'sinh', 'tanh'].includes(f)) return num(0);
      if (['cos', 'cosh', 'sec'].includes(f)) return num(1);
    }
    if (f === 'ln' && a.v.equals(1)) return num(0);
    if (f === 'log' && a.v.equals(1)) return num(0);
    if (f === 'log' && a.v.isInteger() && a.v.n > 0n) { // log10 of a power of 10
      const sd = a.v.n.toString();
      if (/^10*$/.test(sd)) return num(sd.length - 1);
    }
    if (f === 'abs') return num(a.v.abs());
  }
  if (f === 'ln' && a.t === 'const' && a.n === 'e') return num(1);
  if (f === 'ln' && a.t === 'pow' && a.base.t === 'const' && a.base.n === 'e') return a.exp;
  if (f === 'fact' && a.t === 'num' && a.v.isInteger() && !a.v.isNegative() && a.v.n <= 170n) {
    let r = 1n; for (let i = 2n; i <= a.v.n; i++) r *= i; return num(new Q(r));
  }
  // sin/cos/tan of rational multiples of π with simple exact values
  if (['sin', 'cos', 'tan'].includes(f)) {
    let k = null; // a = k·π
    if (a.t === 'const' && a.n === 'pi') k = new Q(1n);
    else if (a.t === 'prod' && a.factors.length === 2 && a.factors[0].t === 'num' && a.factors[1].t === 'const' && a.factors[1].n === 'pi') k = a.factors[0].v;
    if (k && k.exact) {
      // reduce to [0, 2)
      let r = k.sub(new Q(2n).mul(new Q(BigInt(Math.floor(k.toNumber() / 2)))));
      const h = new Q(1n, 2n), half = (v) => simplifyPow(num(v), num(h));
      const sinTable = { '0': num(0), '1/6': num(h), '1/4': simplifyProd([num(h), half(new Q(2n))]), '1/3': simplifyProd([num(h), half(new Q(3n))]), '1/2': num(1) };
      const sinOf = (x) => { // x in [0,2)
        let sign = 1, y = x;
        if (y.toNumber() >= 1) { sign = -1; y = y.sub(new Q(1n)); }
        if (y.toNumber() > 0.5) y = new Q(1n).sub(y);
        const v = sinTable[y.toPlain()];
        return v ? (sign < 0 ? simplifyProd([num(-1), v]) : v) : null;
      };
      const s = sinOf(r);
      const cArg = r.add(h); const c = sinOf(cArg.toNumber() >= 2 ? cArg.sub(new Q(2n)) : cArg);
      if (f === 'sin' && s) return s;
      if (f === 'cos' && c) return c;
      if (f === 'tan' && s && c && !(c.t === 'num' && c.v.isZero())) return simplifyProd([s, simplifyPow(c, num(-1))]);
    }
  }
  if (f === 'sin' && a.t === 'const' && a.n === 'pi') return num(0);
  if (f === 'cos' && a.t === 'const' && a.n === 'pi') return num(-1);
  return fn(f, a);
}

function simplifyPow(b, e) {
  if (isNum(e, 0)) return num(1);
  if (isNum(e, 1)) return b;
  if (isNum(b, 1)) return num(1);
  if (isNum(b, 0) && e.t === 'num' && !e.v.isNegative()) return num(0);
  if (b.t === 'num' && e.t === 'num') {
    if (e.v.isInteger()) return num(b.v.pow(e.v));
    // √n with a square factor: √8 = 2√2
    if (e.v.equals(new Q(1n, 2n)) && b.v.isInteger() && b.v.n > 3n && b.v.n < 10n ** 15n) {
      const { out, inside } = P.simplifyRadical(b.v.n);
      if (inside === 1n) return num(new Q(out));
      if (out > 1n) return prod(num(new Q(out)), pow(num(new Q(inside)), num(new Q(1n, 2n))));
    }
    try {
      const r = b.v.pow(e.v);
      if (r.exact) return num(r);
    } catch (err) { /* keep symbolic */ }
  }
  if (b.t === 'pow' && e.t === 'num' && (e.v.isInteger() || (b.exp.t === 'num' && b.exp.v.isInteger() && false))) {
    return simplifyPow(b.base, simplify(prod(b.exp, e)));
  }
  if (b.t === 'pow' && b.exp.t === 'num' && e.t === 'num' && b.base.t !== 'num') {
    // (x^2)^(1/2) is |x| in general; keep x for the solver's purposes when exponent product is an integer
    const p = b.exp.v.mul(e.v);
    if (p.isInteger()) return simplifyPow(b.base, num(p));
  }
  if (b.t === 'prod' && e.t === 'num' && e.v.isInteger()) {
    return simplifyProd(b.factors.map(f => simplifyPow(f, e)));
  }
  return pow(b, e);
}

function simplifyProd(factors) {
  // flatten
  const flat = [];
  for (const f of factors) { if (f.t === 'prod') flat.push(...f.factors); else flat.push(f); }
  let c = new Q(1n);
  const groups = []; // { base, exps:[] }
  for (const f of flat) {
    if (f.t === 'num') { c = c.mul(f.v); continue; }
    const base = f.t === 'pow' ? f.base : f;
    const exp = f.t === 'pow' ? f.exp : num(1);
    const g = groups.find(x => same(x.base, base));
    if (g) g.exps.push(exp); else groups.push({ base, exps: [exp] });
  }
  if (c.isZero()) return num(0);
  const out = [];
  for (const g of groups) {
    const e = g.exps.length === 1 ? g.exps[0] : simplifySum(g.exps);
    const p = simplifyPow(g.base, e);
    if (p.t === 'num') c = c.mul(p.v);
    else if (p.t === 'prod') { // e.g. pow distributed
      for (const f of p.factors) { if (f.t === 'num') c = c.mul(f.v); else out.push(f); }
    } else out.push(p);
  }
  if (!out.length) return num(c);
  // Conventional order: x^n first, then e^(...)/a^(...), then functions, then brackets
  const rank = (f) => {
    const b = f.t === 'pow' ? f.base : f;
    if (b.t === 'var') return 0;
    if (b.t === 'const' || b.t === 'num') return 1;
    if (b.t === 'fn') return 2;
    return 3;
  };
  out.sort((a, b) => rank(a) - rank(b));
  if (c.equals(1) && out.length === 1) return out[0];
  return c.equals(1) ? prod(...out) : prod(num(c), ...out);
}

function simplifySum(terms) {
  const flat = [];
  for (const t of terms) { if (t.t === 'sum') flat.push(...t.terms); else flat.push(t); }
  let constant = new Q(0n);
  const groups = []; // { rest, coef }
  for (const t of flat) {
    const [c, rest] = splitCoef(t);
    if (!rest) { constant = constant.add(c); continue; }
    const g = groups.find(x => same(x.rest, rest));
    if (g) g.coef = g.coef.add(c); else groups.push({ rest, coef: c });
  }
  const out = [];
  for (const g of groups) {
    if (g.coef.isZero()) continue;
    out.push(g.coef.equals(1) ? g.rest : simplifyProd([num(g.coef), g.rest]));
  }
  if (!constant.isZero()) out.push(num(constant));
  if (!out.length) return num(0);
  return out.length === 1 ? out[0] : sum(...out);
}

// Multiply out products of sums (used before integrating term by term)
function expand(n) {
  n = simplify(n);
  if (n.t === 'sum') return simplify(sum(...n.terms.map(expand)));
  if (n.t === 'pow' && n.exp.t === 'num' && n.exp.v.isInteger() && !n.exp.v.isNegative() && n.exp.v.n <= 6n && n.base.t === 'sum') {
    let r = num(1);
    for (let i = 0n; i < n.exp.v.n; i++) r = expand(prod(r, n.base));
    return r;
  }
  if (n.t === 'prod') {
    let acc = [num(1)];
    for (const f0 of n.factors) {
      const f = (f0.t === 'pow' || f0.t === 'sum' || f0.t === 'prod') ? expand(f0) : f0;
      const parts = f.t === 'sum' ? f.terms : [f];
      const next = [];
      for (const a of acc) for (const b of parts) next.push(simplify(prod(a, b)));
      acc = next;
    }
    return simplify(sum(...acc));
  }
  return n;
}

// ---------- Display ----------
const FN_TEX = { sin: '\\sin', cos: '\\cos', tan: '\\tan', sec: '\\sec', csc: '\\csc', cot: '\\cot', ln: '\\ln', log: '\\log', arcsin: '\\arcsin', arccos: '\\arccos', arctan: '\\arctan', sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh' };

function isNegativeTerm(n) {
  if (n.t === 'num') return n.v.isNegative();
  if (n.t === 'prod') return n.factors[0].t === 'num' && n.factors[0].v.isNegative();
  return false;
}

function negateTerm(n) {
  if (n.t === 'num') return num(n.v.neg());
  const [c, rest] = splitCoef(n);
  return c.neg().equals(1) ? rest : prod(num(c.neg()), ...(rest.t === 'prod' ? rest.factors : [rest]));
}

function tex(n, ctx = 'top') {
  switch (n.t) {
    case 'num': {
      const s = n.v.toTex();
      if ((ctx === 'factor' || ctx === 'base') && (n.v.isNegative() || s.includes('frac'))) return `\\left(${s}\\right)`;
      return s;
    }
    case 'var': return n.n;
    case 'const': return n.n === 'pi' ? '\\pi' : n.n === 'inf' ? '\\infty' : 'e';
    case 'sum': {
      let s = '';
      n.terms.forEach((t, i) => {
        if (i === 0) s += tex(t, 'term');
        else if (isNegativeTerm(t)) s += ' - ' + tex(negateTerm(t), 'term');
        else s += ' + ' + tex(t, 'term');
      });
      return ctx === 'factor' || ctx === 'base' ? `\\left(${s}\\right)` : s;
    }
    case 'prod': {
      const [c, rest] = splitCoef(n);
      const fs = rest ? (rest.t === 'prod' ? rest.factors : [rest]) : [];
      const top = [], bottom = [];
      for (const f of fs) {
        if (f.t === 'pow' && f.exp.t === 'num' && f.exp.v.isNegative()) {
          const e = f.exp.v.neg();
          bottom.push(e.equals(1) ? f.base : pow(f.base, num(e)));
        } else top.push(f);
      }
      const cn = c.exact ? new Q(c.n < 0n ? -c.n : c.n) : c.abs();
      const cd = c.exact ? new Q(c.d) : new Q(1n);
      const sign = c.isNegative() ? '-' : '';
      const joinF = (list) => list.map((f, i) => {
        const t = tex(f, list.length === 1 && cn.equals(1) && (bottom.length || !cd.equals(1)) ? 'top' : 'factor');
        return i > 0 && /^[\d(\\left(]/.test(t) && /^\d/.test(t) ? '\\cdot ' + t : t;
      }).join(' ');
      if (bottom.length || !cd.equals(1)) {
        let numer = joinF(top);
        if (!cn.equals(1) || !numer) numer = (cn.equals(1) && numer ? '' : cn.toTex()) + (numer ? (cn.equals(1) ? '' : ' ') + numer : '');
        const denParts = bottom.map(b => tex(b, bottom.length > 1 ? 'factor' : 'top'));
        const den = (cd.equals(1) ? '' : cd.toTex() + (denParts.length ? ' ' : '')) + denParts.join(' ');
        const s = `${sign}\\frac{${numer}}{${den}}`;
        return ctx === 'base' ? `\\left(${s}\\right)` : s;
      }
      const body = joinF(top);
      const coef = cn.equals(1) ? '' : cn.toTex();
      const s = sign + coef + (coef && body && /^\d/.test(body) ? ' \\cdot ' : '') + body;
      return (ctx === 'base' || (ctx === 'factor' && sign)) ? `\\left(${s}\\right)` : s;
    }
    case 'pow': {
      const e = n.exp;
      if (e.t === 'num' && e.v.equals(new Q(1n, 2n))) return `\\sqrt{${tex(n.base)}}`;
      if (e.t === 'num' && e.v.isNegative()) return `\\frac{1}{${e.v.equals(-1) ? tex(n.base, 'top') : tex(pow(n.base, num(e.v.neg())), 'top')}}`;
      if (n.base.t === 'fn' && FN_TEX[n.base.f] && e.t === 'num' && e.v.isInteger()) {
        return `${FN_TEX[n.base.f]}^{${e.v.toTex()}}\\left(${tex(n.base.arg)}\\right)`;
      }
      const b = n.base.t === 'const' && n.base.n === 'e' ? 'e' : tex(n.base, 'base');
      const needsWrap = n.base.t === 'fn' || n.base.t === 'pow';
      return `${needsWrap ? `\\left(${b}\\right)` : b}^{${tex(e)}}`;
    }
    case 'fn': {
      if (n.f === 'fact') return `${tex(n.arg, 'base')}!`;
      if (n.f === 'ln' && n.arg.t === 'fn' && n.arg.f === 'abs') return `\\ln\\left|${tex(n.arg.arg)}\\right|`;
      if (n.f === 'abs') return `\\left|${tex(n.arg)}\\right|`;
      if (n.f === 'sqrt') return `\\sqrt{${tex(n.arg)}}`;
      return `${FN_TEX[n.f] || '\\operatorname{' + n.f + '}'}\\left(${tex(n.arg)}\\right)`;
    }
  }
  return '?';
}

// ---------- Utilities ----------
function freeOf(n, x) {
  switch (n.t) {
    case 'var': return n.n !== x;
    case 'num': case 'const': return true;
    case 'sum': return n.terms.every(t => freeOf(t, x));
    case 'prod': return n.factors.every(t => freeOf(t, x));
    case 'pow': return freeOf(n.base, x) && freeOf(n.exp, x);
    case 'fn': return freeOf(n.arg, x);
  }
  return true;
}

function variables(n, out = new Set()) {
  if (n.t === 'var') out.add(n.n);
  else if (n.t === 'sum') n.terms.forEach(t => variables(t, out));
  else if (n.t === 'prod') n.factors.forEach(t => variables(t, out));
  else if (n.t === 'pow') { variables(n.base, out); variables(n.exp, out); }
  else if (n.t === 'fn') variables(n.arg, out);
  return out;
}

function substitute(n, x, value) {
  switch (n.t) {
    case 'var': return n.n === x ? value : n;
    case 'sum': return sum(...n.terms.map(t => substitute(t, x, value)));
    case 'prod': return prod(...n.factors.map(t => substitute(t, x, value)));
    case 'pow': return pow(substitute(n.base, x, value), substitute(n.exp, x, value));
    case 'fn': return fn(n.f, substitute(n.arg, x, value));
  }
  return n;
}

function evaluate(n, env = {}) {
  switch (n.t) {
    case 'num': return n.v.toNumber();
    case 'var': if (!(n.n in env)) throw new Error('unknown ' + n.n); return env[n.n];
    case 'const': return n.n === 'e' ? Math.E : n.n === 'pi' ? Math.PI : Infinity;
    case 'sum': return n.terms.reduce((a, t) => a + evaluate(t, env), 0);
    case 'prod': return n.factors.reduce((a, t) => a * evaluate(t, env), 1);
    case 'pow': return Math.pow(evaluate(n.base, env), evaluate(n.exp, env));
    case 'fn': {
      const a = evaluate(n.arg, env);
      if (n.f === 'fact') { if (a < 0 || !Number.isInteger(a)) return NaN; let r = 1; for (let i = 2; i <= a; i++) r *= i; return r; }
      const F = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sec: v => 1 / Math.cos(v), csc: v => 1 / Math.sin(v), cot: v => 1 / Math.tan(v), ln: Math.log, log: Math.log10, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh };
      return F[n.f](a);
    }
  }
  return NaN;
}

// ---------- Polynomial conversion ----------
function toPoly(n, x) {
  n = simplify(n);
  switch (n.t) {
    case 'num': return [n.v];
    case 'var': return n.n === x ? [new Q(0n), new Q(1n)] : null;
    case 'sum': {
      let r = [new Q(0n)];
      for (const t of n.terms) { const p = toPoly(t, x); if (!p) return null; r = P.add(r, p); }
      return r;
    }
    case 'prod': {
      let r = [new Q(1n)];
      for (const f of n.factors) { const p = toPoly(f, x); if (!p) return null; r = P.mul(r, p); }
      return r;
    }
    case 'pow': {
      if (n.exp.t !== 'num' || !n.exp.v.isInteger() || n.exp.v.isNegative() || n.exp.v.n > 40n) return null;
      const b = toPoly(n.base, x);
      return b ? P.pow(b, Number(n.exp.v.n)) : null;
    }
  }
  return null;
}

function fromPoly(p, x) {
  p = P.trim(p);
  const terms = [];
  for (let i = p.length - 1; i >= 0; i--) {
    if (p[i].isZero()) continue;
    if (i === 0) terms.push(num(p[i]));
    else {
      const xp = i === 1 ? vr(x) : pow(vr(x), i);
      terms.push(p[i].equals(1) ? xp : prod(num(p[i]), xp));
    }
  }
  if (!terms.length) return num(0);
  return terms.length === 1 ? terms[0] : sum(...terms);
}

// Linear a*x + b  ->  { a, b } (Q) or null
function linearIn(n, x) {
  const p = toPoly(n, x);
  if (!p || P.degree(p) !== 1) return null;
  return { a: P.trim(p)[1], b: P.trim(p)[0] };
}

// ---------- Differentiation (with explanation) ----------
function d(n, x) {
  switch (n.t) {
    case 'num': case 'const': return num(0);
    case 'var': return num(n.n === x ? 1 : 0);
    case 'sum': return sum(...n.terms.map(t => d(t, x)));
    case 'prod': {
      const terms = n.factors.map((f, i) => prod(d(f, x), ...n.factors.filter((_, j) => j !== i)));
      return sum(...terms);
    }
    case 'pow': {
      const { base: b, exp: e } = n;
      if (freeOf(e, x)) return prod(e, pow(b, sum(e, num(-1))), d(b, x));
      if (freeOf(b, x)) return prod(n, fn('ln', b), d(e, x));
      return prod(n, sum(prod(d(e, x), fn('ln', b)), prod(e, d(b, x), pow(b, -1))));
    }
    case 'fn': {
      const u = n.arg, du = d(u, x);
      const R = {
        sin: () => fn('cos', u),
        cos: () => neg(fn('sin', u)),
        tan: () => pow(fn('sec', u), 2),
        sec: () => prod(fn('sec', u), fn('tan', u)),
        csc: () => neg(prod(fn('csc', u), fn('cot', u))),
        cot: () => neg(pow(fn('csc', u), 2)),
        ln: () => pow(u, -1),
        log: () => pow(prod(u, fn('ln', num(10))), -1),
        exp: () => fn('exp', u),
        sqrt: () => prod(num(new Q(1n, 2n)), pow(u, num(new Q(-1n, 2n)))),
        arcsin: () => pow(sum(num(1), neg(pow(u, 2))), num(new Q(-1n, 2n))),
        arccos: () => neg(pow(sum(num(1), neg(pow(u, 2))), num(new Q(-1n, 2n)))),
        arctan: () => pow(sum(num(1), pow(u, 2)), -1),
        sinh: () => fn('cosh', u),
        cosh: () => fn('sinh', u),
        tanh: () => pow(fn('cosh', u), -2),
        abs: () => prod(u, pow(fn('abs', u), -1))
      };
      return prod(R[n.f](), du);
    }
  }
  throw new Error('cannot differentiate');
}

function derivative(n, x) {
  return simplify(d(simplify(n), x));
}

// Explanation of the main rule used at the top level
function explainDerivative(n, x, fname = 'f') {
  n = simplify(n);
  const steps = [];
  const D = (e) => tex(derivative(e, x));
  if (n.t === 'sum') {
    steps.push({ label: `Sum rule: differentiate each term separately.`, katex: n.terms.map(t => `\\frac{d}{d${x}}\\left[${tex(t)}\\right] = ${D(t)}`).join(' \\\\ ') });
    steps[0].katex = `\\begin{aligned} ${n.terms.map(t => `\\frac{d}{d${x}}\\left[${tex(t)}\\right] &= ${D(t)}`).join(' \\\\ ')} \\end{aligned}`;
  } else if (n.t === 'prod') {
    const [c, rest] = splitCoef(n);
    const fs = rest && rest.t === 'prod' ? rest.factors.filter(f => !freeOf(f, x)) : [];
    if (fs.length >= 2) {
      const u = fs[0];
      const v = simplify(prod(...rest.factors.filter(f => f !== u)));
      steps.push({ label: 'Product rule: $(uv)\' = u\'v + uv\'$', katex: `u = ${tex(u)}, \\quad v = ${tex(v)}` });
      steps.push({ label: 'Differentiate each part:', katex: `u' = ${D(u)}, \\quad v' = ${D(v)}` });
      steps.push({ label: 'Substitute into the product rule:', katex: `${!c.equals(1) ? c.toTex() + '\\left[' : ''}\\left(${D(u)}\\right)\\left(${tex(v)}\\right) + \\left(${tex(u)}\\right)\\left(${D(v)}\\right)${!c.equals(1) ? '\\right]' : ''}` });
    } else if (rest && !c.equals(1)) {
      steps.push({ label: 'Constant multiple rule: take the constant outside.', katex: `\\frac{d}{d${x}}\\left[${tex(n)}\\right] = ${c.toTex()} \\cdot \\frac{d}{d${x}}\\left[${tex(rest)}\\right]` });
    }
  } else if (n.t === 'fn' && !(n.arg.t === 'var')) {
    steps.push({ label: `Chain rule: let $u = ${tex(n.arg)}$, then $\\frac{d}{d${x}} f(u) = f'(u) \\cdot u'$`, katex: `u' = ${D(n.arg)}` });
  } else if (n.t === 'pow' && !freeOf(n.exp, x) && freeOf(n.base, x)) {
    steps.push({ label: 'Exponential rule: $\\frac{d}{dx} a^{u} = a^{u} \\ln a \\cdot u\'$', katex: '' });
  } else if (n.t === 'pow' && n.base.t !== 'var') {
    steps.push({ label: `Chain rule with the power rule: let $u = ${tex(n.base)}$`, katex: `\\frac{d}{d${x}} u^{${tex(n.exp)}} = ${tex(n.exp)}\\,u^{${tex(simplify(sum(n.exp, num(-1))))}} \\cdot u'` });
  }
  return steps;
}

// ---------- Integration ----------
// Returns { result, method, steps } or null
function integrate(n0, x) {
  const n = simplify(n0);
  const steps = [];
  const res = integ(n, x, steps);
  if (!res) return null;
  return { result: simplify(res), steps };
}

function integ(n, x, steps) {
  if (freeOf(n, x)) return prod(n, vr(x));
  if (n.t === 'sum') {
    const parts = n.terms.map(t => integ(t, x, steps));
    return parts.every(Boolean) ? sum(...parts) : null;
  }
  // Constant factor out
  if (n.t === 'prod') {
    const consts = n.factors.filter(f => freeOf(f, x));
    const rest = n.factors.filter(f => !freeOf(f, x));
    if (consts.length && rest.length) {
      const r = integ(simplify(rest.length === 1 ? rest[0] : prod(...rest)), x, steps);
      return r ? prod(...consts, r) : null;
    }
  }
  const basic = integBasic(n, x);
  if (basic) return basic;

  // Product of a polynomial and e^(ax+b), sin(ax+b), cos(ax+b): integration by parts (tabular)
  if (n.t === 'prod') {
    const polyParts = n.factors.filter(f => toPoly(f, x));
    const others = n.factors.filter(f => !toPoly(f, x));
    if (polyParts.length && others.length === 1) {
      const pPoly = toPoly(prod(...polyParts), x);
      const g = others[0];
      const ibp = byParts(pPoly, g, x, steps);
      if (ibp) return ibp;
    }
    // e^(ax) * sin(bx) / cos(bx)
    if (n.factors.length === 2) {
      const [f1, f2] = n.factors;
      const ex = [f1, f2].find(f => f.t === 'pow' && f.base.t === 'const' && f.base.n === 'e' && linearIn(f.exp, x));
      const tr = [f1, f2].find(f => f.t === 'fn' && (f.f === 'sin' || f.f === 'cos') && linearIn(f.arg, x));
      if (ex && tr) {
        const A = linearIn(ex.exp, x).a, B = linearIn(tr.arg, x).a;
        const denom = A.mul(A).add(B.mul(B));
        const inner = tr.f === 'sin'
          ? sum(prod(num(A), fn('sin', tr.arg)), neg(prod(num(B), fn('cos', tr.arg))))
          : sum(prod(num(A), fn('cos', tr.arg)), prod(num(B), fn('sin', tr.arg)));
        steps.push({ label: 'Integrate by parts twice (the original integral reappears), then solve for it:', katex: `\\int e^{ax}${tr.f === 'sin' ? '\\sin' : '\\cos'}(bx)\\,dx = \\frac{e^{ax}}{a^2 + b^2}\\left(${tr.f === 'sin' ? 'a\\sin(bx) - b\\cos(bx)' : 'a\\cos(bx) + b\\sin(bx)'}\\right) + C` });
        return prod(num(new Q(1n).div(denom)), ex, inner);
      }
    }
    // Distribute over sums and integrate term by term
    if (n.factors.some(f => f.t === 'sum' || (f.t === 'pow' && f.base.t === 'sum' && f.exp.t === 'num' && f.exp.v.isInteger() && !f.exp.v.isNegative()))) {
      const ex = expand(n);
      if (ex.t === 'sum') return integ(ex, x, steps);
    }
  }
  // Polynomial in disguise (e.g. (x+1)^3)
  const p = toPoly(n, x);
  if (p) {
    const terms = P.trim(p).map((c, i) => c.isZero() ? null : prod(num(c.div(new Q(BigInt(i + 1)))), pow(vr(x), i + 1))).filter(Boolean);
    return terms.length ? sum(...terms) : num(0);
  }
  return null;
}

function integBasic(n, x) {
  // x^k and (ax+b)^k
  if (n.t === 'var' && n.n === x) return prod(num(new Q(1n, 2n)), pow(vr(x), 2));
  if (n.t === 'pow' && freeOf(n.exp, x)) {
    const L = linearIn(n.base, x);
    if (L && n.exp.t === 'num') {
      if (n.exp.v.equals(-1)) return prod(num(new Q(1n).div(L.a)), fn('ln', fn('abs', n.base)));
      const k1 = n.exp.v.add(1);
      return prod(num(new Q(1n).div(L.a.mul(k1))), pow(n.base, num(k1)));
    }
    // 1/(x^2 + a^2)
    if (n.exp.t === 'num' && n.exp.v.equals(-1)) {
      const q = toPoly(n.base, x);
      if (q && P.degree(q) === 2 && q[1].isZero() && q[2].equals(1) && !q[0].isNegative() && !q[0].isZero()) {
        const a2 = q[0];
        const a = simplify(pow(num(a2), num(new Q(1n, 2n))));
        return prod(pow(a, -1), fn('arctan', prod(vr(x), pow(a, -1))));
      }
    }
    // 1/sqrt(a^2 - x^2)
    if (n.exp.t === 'num' && n.exp.v.equals(new Q(-1n, 2n))) {
      const q = toPoly(n.base, x);
      if (q && P.degree(q) === 2 && q[1].isZero() && q[2].equals(-1) && !q[0].isNegative()) {
        const a = simplify(pow(num(q[0]), num(new Q(1n, 2n))));
        return fn('arcsin', prod(vr(x), pow(a, -1)));
      }
    }
  }
  // e^(ax+b), c^(ax+b)
  if (n.t === 'pow' && freeOf(n.base, x)) {
    const L = linearIn(n.exp, x);
    if (L) {
      if (n.base.t === 'const' && n.base.n === 'e') return prod(num(new Q(1n).div(L.a)), n);
      return prod(n, pow(prod(num(L.a), fn('ln', n.base)), -1));
    }
  }
  if (n.t === 'fn') {
    const L = linearIn(n.arg, x);
    if (L) {
      const k = num(new Q(1n).div(L.a));
      switch (n.f) {
        case 'sin': return prod(num(new Q(-1n).div(L.a)), fn('cos', n.arg));
        case 'cos': return prod(k, fn('sin', n.arg));
        case 'tan': return prod(num(new Q(-1n).div(L.a)), fn('ln', fn('abs', fn('cos', n.arg))));
        case 'cot': return prod(k, fn('ln', fn('abs', fn('sin', n.arg))));
        case 'sec': return prod(k, fn('ln', fn('abs', sum(fn('sec', n.arg), fn('tan', n.arg)))));
        case 'ln': return prod(k, sum(prod(n.arg, fn('ln', n.arg)), neg(n.arg)));
        case 'sinh': return prod(k, fn('cosh', n.arg));
        case 'cosh': return prod(k, fn('sinh', n.arg));
      }
    }
  }
  // sec^2(ax), csc^2(ax), 1/cos^2
  if (n.t === 'pow' && n.base.t === 'fn' && n.exp.t === 'num') {
    const L = linearIn(n.base.arg, x);
    if (L) {
      const k = num(new Q(1n).div(L.a));
      if (n.base.f === 'sec' && n.exp.v.equals(2)) return prod(k, fn('tan', n.base.arg));
      if (n.base.f === 'cos' && n.exp.v.equals(-2)) return prod(k, fn('tan', n.base.arg));
      if (n.base.f === 'csc' && n.exp.v.equals(2)) return prod(neg(k), fn('cot', n.base.arg));
      if (n.base.f === 'sin' && n.exp.v.equals(-2)) return prod(neg(k), fn('cot', n.base.arg));
    }
  }
  // sin^2, cos^2 (power-reduction) and sin*cos
  if (n.t === 'pow' && n.base.t === 'fn' && (n.base.f === 'sin' || n.base.f === 'cos') && isNum(n.exp, 2)) {
    const L = linearIn(n.base.arg, x);
    if (L) {
      const u = n.base.arg;
      const two = prod(num(2), u);
      const s4 = prod(num(new Q(1n).div(L.a.mul(new Q(4n)))), fn('sin', two));
      return n.base.f === 'sin' ? sum(prod(num(new Q(1n, 2n)), vr(x)), neg(s4)) : sum(prod(num(new Q(1n, 2n)), vr(x)), s4);
    }
  }
  // sec*tan, csc*cot, sin*cos
  if (n.t === 'prod' && n.factors.length === 2) {
    const fsc = n.factors;
    if (fsc.every(f => f.t === 'fn') && same(fsc[0].arg, fsc[1].arg) && [fsc[0].f, fsc[1].f].sort().join() === 'cos,sin') {
      const L = linearIn(fsc[0].arg, x);
      if (L) return prod(num(new Q(1n).div(L.a.mul(new Q(2n)))), pow(fn('sin', fsc[0].arg), 2));
    }
    const names = n.factors.map(f => f.t === 'fn' ? f.f : '').sort().join(',');
    const a0 = n.factors[0].arg, a1 = n.factors[1].arg;
    if (a0 && a1 && same(a0, a1)) {
      const L = linearIn(a0, x);
      if (L && names === 'sec,tan') return prod(num(new Q(1n).div(L.a)), fn('sec', a0));
      if (L && names === 'cot,csc') return prod(num(new Q(-1n).div(L.a)), fn('csc', a0));
    }
  }
  return null;
}

// ∫ P(x) g(x) dx with g = e^(ax+b), sin(ax+b), cos(ax+b), ln(x)
function byParts(p, g, x, steps) {
  p = P.trim(p);
  const deg = P.degree(p);
  let kind = null, L = null;
  if (g.t === 'pow' && g.base.t === 'const' && g.base.n === 'e' && (L = linearIn(g.exp, x))) kind = 'exp';
  else if (g.t === 'fn' && (g.f === 'sin' || g.f === 'cos') && (L = linearIn(g.arg, x))) kind = g.f;
  else if (g.t === 'fn' && g.f === 'ln' && g.arg.t === 'var' && g.arg.n === x) kind = 'ln';
  if (!kind) return null;

  if (kind === 'ln') {
    // ∫ c x^k ln x dx = c [x^(k+1) ln x/(k+1) - x^(k+1)/(k+1)^2]
    const terms = [];
    p.forEach((c, k) => {
      if (c.isZero()) return;
      const k1 = new Q(BigInt(k + 1));
      terms.push(prod(num(c.div(k1)), pow(vr(x), k + 1), fn('ln', vr(x))));
      terms.push(prod(num(c.neg().div(k1.mul(k1))), pow(vr(x), k + 1)));
    });
    steps.push({ label: 'Integration by parts with $u = \\ln x$ (its derivative $\\frac{1}{x}$ is simpler) and $dv$ = the polynomial:', katex: '\\int u\\,dv = uv - \\int v\\,du' });
    return sum(...terms);
  }

  const a = L.a;
  const arg = kind === 'exp' ? g.exp : g.arg;
  // successive antiderivatives G_1, G_2, ...
  const G = (k) => {
    const s = new Q(1n).div(a.pow(new Q(BigInt(k))));
    if (kind === 'exp') return prod(num(s), g);
    const cycleSin = [neg(fn('cos', arg)), neg(fn('sin', arg)), fn('cos', arg), fn('sin', arg)];
    const cycleCos = [fn('sin', arg), neg(fn('cos', arg)), neg(fn('sin', arg)), fn('cos', arg)];
    return prod(num(s), (kind === 'sin' ? cycleSin : cycleCos)[(k - 1) % 4]);
  };
  const terms = [];
  let deriv = p;
  const rows = [];
  for (let k = 0; k <= deg; k++) {
    const sign = k % 2 === 0 ? 1 : -1;
    terms.push(prod(num(sign), fromPoly(deriv, x), G(k + 1)));
    rows.push(`${tex(simplify(fromPoly(deriv, x)))} & ${tex(simplify(G(k + 1)))} & ${sign > 0 ? '+' : '-'}`);
    deriv = P.trim(deriv.slice(1).map((c, i) => c.mul(new Q(BigInt(i + 1)))));
    if (!deriv.length) deriv = [new Q(0n)];
  }
  steps.push({
    label: `Integration by parts: $\\int u\\,dv = uv - \\int v\\,du$ with $u = ${tex(simplify(fromPoly(p, x)))}$ (it becomes 0 after differentiating) and $dv = ${tex(g)}\\,d${x}$.`,
    katex: ''
  });
  if (deg >= 1) {
    steps.push({
      label: 'Repeat by parts (tabular method): differentiate $u$ down to 0, integrate $dv$ each time, alternate signs:',
      katex: `\\begin{array}{c|c|c} u \\text{ and derivatives} & \\text{integrals of } dv & \\text{sign} \\\\ \\hline ${rows.join(' \\\\ ')} \\end{array}`
    });
  }
  return sum(...terms);
}

module.exports = {
  Q, num, vr, cst, sum, prod, pow, fn, neg, sub, div,
  parse, tryParse, toPlain, repairPdfMath, simplify, expand, tex, key, same,
  freeOf, variables, substitute, evaluate, toPoly, fromPoly, linearIn,
  derivative, explainDerivative, integrate, splitCoef
};
