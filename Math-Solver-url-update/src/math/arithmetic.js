// Step-by-step arithmetic with correct order of operations (BODMAS / PEMDAS).
// Handles + - * / ^, brackets, unary minus (-2^2 = -4), right-associative
// powers (2^3^2 = 2^9), implicit multiplication 2(3+4), exact fractions and decimals.

const { Q, DivisionByZero } = require('./rational');

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const num = src.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
    if (num) { tokens.push({ type: 'num', value: num[1] }); i += num[1].length; continue; }
    if ('+-*/^()'.includes(ch)) { tokens.push({ type: ch }); i++; continue; }
    throw new Error(`Unexpected character "${ch}"`);
  }
  // Implicit multiplication: 2(3)  (2)(3)  (2)3
  const out = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (prev && (prev.type === 'num' || prev.type === ')') && (t.type === '(' || (t.type === 'num' && prev.type === ')'))) {
      out.push({ type: '*' });
    }
    out.push(t);
  }
  return out;
}

function parse(src) {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (type) => {
    const t = tokens[pos];
    if (!t || (type && t.type !== type)) throw new Error('Invalid expression');
    pos++;
    return t;
  };

  function expr() {
    let node = term();
    while (peek() && (peek().type === '+' || peek().type === '-')) {
      const op = take().type;
      node = { t: 'bin', op, l: node, r: term() };
    }
    return node;
  }
  function term() {
    let node = unary();
    while (peek() && (peek().type === '*' || peek().type === '/')) {
      const op = take().type;
      node = { t: 'bin', op, l: node, r: unary() };
    }
    return node;
  }
  function unary() {
    if (peek() && peek().type === '-') { take(); return { t: 'neg', e: unary() }; }
    if (peek() && peek().type === '+') { take(); return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek() && peek().type === '^') { take(); return { t: 'bin', op: '^', l: base, r: unary() }; }
    return base;
  }
  function primary() {
    const t = peek();
    if (!t) throw new Error('Expression ended unexpectedly');
    if (t.type === 'num') { take(); return { t: 'num', v: Q.parse(t.value) }; }
    if (t.type === '(') { take(); const e = expr(); take(')'); return { t: 'paren', e }; }
    throw new Error('Invalid expression');
  }

  const tree = expr();
  if (pos !== tokens.length) throw new Error('Invalid expression');
  return tree;
}

// ---------- Display ----------
function toTex(node, decimal, ctx = 'top') {
  switch (node.t) {
    case 'num': {
      const s = node.v.toTex(decimal);
      const needsWrap = (node.v.isNegative() && ctx !== 'top' && ctx !== 'left') ||
        (ctx === 'base' && (node.v.isNegative() || s.includes('\\frac')));
      return needsWrap ? `\\left(${s}\\right)` : s;
    }
    case 'paren': return `\\left(${toTex(node.e, decimal)}\\right)`;
    case 'neg': {
      const inner = toTex(node.e, decimal, 'right');
      const s = `-${inner}`;
      return ctx === 'top' || ctx === 'left' ? s : `\\left(${s}\\right)`;
    }
    case 'bin': {
      if (node.op === '^') return `${toTex(node.l, decimal, 'base')}^{${toTex(node.r, decimal)}}`;
      const sym = { '+': '+', '-': '-', '*': '\\times', '/': '\\div' }[node.op];
      return `${toTex(node.l, decimal, ctx === 'top' ? 'left' : ctx)} ${sym} ${toTex(node.r, decimal, 'right')}`;
    }
  }
  return '';
}

// ---------- Evaluation one step at a time ----------
const isNum = (n) => n.t === 'num';

// Unwrap (5) -> 5 and -(5) -> -5 without counting as a separate step
function tidy(node) {
  if (node.t === 'paren') {
    const e = tidy(node.e);
    return isNum(e) ? e : { t: 'paren', e };
  }
  if (node.t === 'neg') {
    const e = tidy(node.e);
    return isNum(e) ? { t: 'num', v: e.v.neg() } : { t: 'neg', e };
  }
  if (node.t === 'bin') return { ...node, l: tidy(node.l), r: tidy(node.r) };
  return node;
}

const OP_NAMES = { '^': 'Exponent', '*': 'Multiplication', '/': 'Division', '+': 'Addition', '-': 'Subtraction' };

// Reduces exactly one operation (the first one that is ready, in BODMAS order).
function reduceOnce(node, decimal, insideBracket = false) {
  if (node.t === 'paren') {
    const res = reduceOnce(node.e, decimal, true);
    return res && { node: { t: 'paren', e: res.node }, desc: res.desc };
  }
  if (node.t === 'neg') {
    const res = reduceOnce(node.e, decimal, insideBracket);
    return res && { node: { t: 'neg', e: res.node }, desc: res.desc };
  }
  if (node.t !== 'bin') return null;

  if (isNum(node.l) && isNum(node.r)) {
    const a = node.l.v, b = node.r.v;
    let v;
    switch (node.op) {
      case '+': v = a.add(b); break;
      case '-': v = a.sub(b); break;
      case '*': v = a.mul(b); break;
      case '/': v = a.div(b); break;
      case '^': v = a.pow(b); break;
    }
    const where = insideBracket ? ' inside the brackets' : '';
    const sub = toTex({ t: 'bin', op: node.op, l: node.l, r: node.r }, decimal);
    const approx = v.exact ? '=' : '\\approx';
    return { node: { t: 'num', v }, desc: `${OP_NAMES[node.op]}${where}: $${sub} ${approx} ${v.toTex(decimal)}$` };
  }

  // Exponent's operands first, then left side, then right side
  const left = reduceOnce(node.l, decimal, insideBracket);
  if (left) return { node: { ...node, l: left.node }, desc: left.desc };
  const right = reduceOnce(node.r, decimal, insideBracket);
  if (right) return { node: { ...node, r: right.node }, desc: right.desc };
  return null;
}

// Returns { answer, steps } or null if the text isn't plain arithmetic.
function solveArithmetic(input) {
  // scientific notation: 1e308 -> 1*10^(308)
  const src = String(input || '').trim().replace(/(\d)[eE]([+-]?\d+)/g, '$1*10^($2)');
  if (!src || !/^[0-9+\-*/^().\s]+$/.test(src) || !/\d/.test(src)) return null;

  let tree;
  try { tree = parse(src); } catch (e) { return null; }

  const decimal = /\d\.\d|\.\d/.test(src);
  const steps = [{ label: 'Given expression:', katex: toTex(tree, decimal) }];
  steps.push({ label: 'Order of operations (BODMAS): Brackets → Orders (powers) → Division/Multiplication (left to right) → Addition/Subtraction (left to right).', katex: '' });

  let current = tidy(tree);
  let stepNo = 1;
  try {
    const MAX_SHOWN = 40; // very long calculations: show the first steps, then jump to the result
    for (let guard = 0; guard < 5000 && !isNum(current); guard++) {
      const res = reduceOnce(current, decimal);
      if (!res) break;
      current = tidy(res.node);
      if (stepNo <= MAX_SHOWN) steps.push({ label: `Step ${stepNo}: ${res.desc}`, katex: `= ${toTex(current, decimal)}` });
      else if (stepNo === MAX_SHOWN + 1) steps.push({ label: '… the remaining steps continue the same way …', katex: '' });
      stepNo++;
    }
  } catch (err) {
    if (err instanceof DivisionByZero) {
      steps.push({ label: 'Error:', katex: '\\text{Division by zero is undefined.}' });
      return { answer: '\\text{Undefined}', steps };
    }
    steps.push({ label: 'Error:', katex: `\\text{${err.message}}` });
    return { answer: /too large/.test(err.message) ? '\\text{Too large to calculate}' : '\\text{Not a real number}', steps };
  }

  if (!isNum(current)) return null;
  const v = current.v;
  let answer = v.toTex(decimal);

  if (!decimal && v.exact && !v.isInteger()) {
    const mixed = v.toMixedTex();
    steps.push({
      label: 'Final Answer (simplified fraction):',
      katex: `\\mathbf{${answer}}${mixed ? ` = ${mixed}` : ''} \\approx ${Q.float(v.toNumber()).toTex()}`
    });
  } else {
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${answer}}` });
  }
  if (!v.exact) answer = `\\approx ${answer}`;
  return { answer, steps };
}

module.exports = { solveArithmetic, parseArithmetic: parse };
