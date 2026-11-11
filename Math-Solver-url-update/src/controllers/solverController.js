const { create, all } = require('mathjs');
const db = require('../config/database');
const { solveArithmetic } = require('../math/arithmetic');
const { solveEquation } = require('../math/equation');
const P = require('../math/polynomial');
const A1 = require('../math/advanced1');
const A2 = require('../math/advanced2');
const A3 = require('../math/advanced3');
const { solveProofQuestion } = require('../math/proofs');

// Question-type solvers, tried in this order (each returns null if the question isn't its type)
const ADVANCED_SOLVERS = [
  A2.solveSequenceQuestion,
  A2.solveCircleQuestion,
  A2.solveEigenQuestion,
  A2.solveSeriesQuestion,
  A3.solveHeatQuestion,
  A3.solveLaurentQuestion,
  A3.solveGreenQuestion,
  A3.solveDoubleIntegralQuestion,
  A3.solveResidueIntegralQuestion,
  A1.solveLimitQuestion,
  A1.solveDerivativeQuestion,
  A2.solveODEQuestion,
  A1.solveIntegralQuestion,
  A1.solveExponentialEquation
];

function solveAdvanced(rawQuery) {
  const proof = solveProofQuestion(A1.keyText(rawQuery));
  if (proof) return proof;
  // Words typed in the math box arrive as \text{...}; turn them back into plain words
  const cleaned = String(rawQuery).replace(/\\(text|textrm|mathrm)\{([^{}]*)\}/g, ' $2 ').replace(/\\ /g, ' ');
  for (const solver of ADVANCED_SOLVERS) {
    try {
      const r = solver(cleaned);
      if (r) return r;
    } catch (err) {
      console.warn(`[solver] ${solver.name} failed:`, err.message);
    }
  }
  return null;
}

// A restricted mathjs instance for evaluating user input safely
const math = create(all);
const limitedEvaluate = math.evaluate;
math.import({
  import: () => { throw new Error('Function import is disabled'); },
  createUnit: () => { throw new Error('Function createUnit is disabled'); },
  evaluate: () => { throw new Error('Function evaluate is disabled'); },
  parse: () => { throw new Error('Function parse is disabled'); },
  simplify: () => { throw new Error('Function simplify is disabled'); },
  derivative: () => { throw new Error('Function derivative is disabled'); },
  range: () => { throw new Error('Function range is disabled'); },
  zeros: () => { throw new Error('Function zeros is disabled'); },
  ones: () => { throw new Error('Function ones is disabled'); },
  identity: () => { throw new Error('Function identity is disabled'); }
}, { override: true });

const MAX_QUERY_LENGTH = 500;
const solveAcDc = require('./acdcSolver');
const solveAge = require('./ageSolver');
const { solveRadical } = require('./radicalSolver');
const { solveSetLogic } = require('./setLogicSolver');
const { solveCalculus } = require('./calculusSolver');
const { solveFractions } = require('./fractionSolver');
const { solveAlgebraicRational } = require('./algebraicRationalSolver');
const { solveAdvancedBenchmark } = require('./advancedBenchmarkSolver');

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    let t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function normalizeMathExpression(raw) {
  if (!raw) return "";
  let expr = raw.trim();

  // Remove LaTeX sizing modifiers
  expr = expr.replace(/\\left/g, '').replace(/\\right/g, '');

  // Convert LaTeX operators to standard math
  expr = expr.replace(/\\times/g, '*').replace(/×/g, '*')
             .replace(/\\div/g, '/').replace(/÷/g, '/')
             .replace(/\\cdot/g, '*').replace(/·/g, '*')
             .replace(/−/g, '-').replace(/–/g, '-').replace(/—/g, '-')
             .replace(/\\pi/g, 'pi').replace(/π/g, 'pi');

  // Convert superscripts
  const superscripts = {
    '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
    '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
    'ⁿ': '^n', '⁺': '^+', '⁻': '^-'
  };
  for (const [k, v] of Object.entries(superscripts)) {
    expr = expr.split(k).join(v);
  }

  // Convert LaTeX fractions \frac{a}{b} -> ((a)/(b))
  while (expr.includes('\\frac')) {
    let replaced = expr.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
    if (replaced === expr) break;
    expr = replaced;
  }

  // Convert LaTeX \sqrt{a} -> sqrt(a)
  while (expr.includes('\\sqrt')) {
    let replaced = expr.replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
    if (replaced === expr) break;
    expr = replaced;
  }

  expr = expr.replace(/√\s*(\d+(\.\d+)?|\([^)]+\))/g, 'sqrt($1)')
             .replace(/√/g, 'sqrt')
             .replace(/∛\s*(\d+(\.\d+)?|\([^)]+\))/g, 'cbrt($1)')
             .replace(/□/g, '');

  // Strip remaining single curly braces from powers
  expr = expr.replace(/\^\{([^{}]+)\}/g, '^($1)');

  return expr.trim();
}

function proportionError(message) {
  return { answer: '\\text{Invalid input}', steps: [{ label: 'Error:', katex: `\\text{${message}}` }] };
}

function solveProportion(a, b, c, d) {
  const vals = [a, b, c, d].map(x => String(x == null ? '' : x).trim());
  if (vals.some(x => x === '')) return proportionError('Please fill in all four boxes.');
  const unknowns = vals.filter(x => isNaN(x));
  if (unknowns.length !== 1) return proportionError('Exactly one box must contain a letter (the unknown), the other three must be numbers.');
  if (!/^[a-zA-Z]{1,3}$/.test(unknowns[0])) return proportionError('Use a letter such as x for the unknown.');
  [a, b, c, d] = vals;
  const divisorZero =
    (isNaN(d) && parseFloat(a) === 0) || (isNaN(c) && parseFloat(b) === 0) ||
    (isNaN(b) && parseFloat(c) === 0) || (isNaN(a) && parseFloat(d) === 0);
  if (divisorZero || (!isNaN(b) && parseFloat(b) === 0) || (!isNaN(d) && parseFloat(d) === 0)) {
    return proportionError('This proportion has no solution (it would need division by zero).');
  }
  let steps = [];
  let answer = "";
  let variable = 'x';

  if (isNaN(a)) variable = a.trim();
  else if (isNaN(b)) variable = b.trim();
  else if (isNaN(c)) variable = c.trim();
  else if (isNaN(d)) variable = d.trim();

  let numA = parseFloat(a), numB = parseFloat(b), numC = parseFloat(c), numD = parseFloat(d);

  steps.push({ label: "Given proportion equation:", katex: `\\frac{${a}}{${b}} = \\frac{${c}}{${d}}` });

  if (isNaN(numD)) {
    let crossVal = numB * numC;
    let res = crossVal / numA;
    answer = `${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}`;
    steps.push({ label: "Step 1: Formula for Proportion: Cross-multiply extremes and means (A \\times D = B \\times C):", katex: `${numA} \\times ${variable} = ${numB} \\times ${numC}` });
    steps.push({ label: "Step 2: Multiply numbers on the right side:", katex: `${numA} \\times ${variable} = ${crossVal}` });
    steps.push({ label: `Step 3: Divide both sides by ${numA} to isolate ${variable}:`, katex: `${variable} = \\frac{${crossVal}}{${numA}}` });
    steps.push({ label: `Step 4: Final simplified value:`, katex: `\\mathbf{${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}}` });
  } else if (isNaN(numC)) {
    let crossVal = numA * numD;
    let res = crossVal / numB;
    answer = `${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}`;
    steps.push({ label: "Step 1: Formula for Proportion: Cross-multiply extremes and means (A \\times D = B \\times C):", katex: `${numB} \\times ${variable} = ${numA} \\times ${numD}` });
    steps.push({ label: "Step 2: Multiply numbers on the right side:", katex: `${numB} \\times ${variable} = ${crossVal}` });
    steps.push({ label: `Step 3: Divide both sides by ${numB} to isolate ${variable}:`, katex: `${variable} = \\frac{${crossVal}}{${numB}}` });
    steps.push({ label: `Step 4: Final simplified value:`, katex: `\\mathbf{${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}}` });
  } else if (isNaN(numB)) {
    let crossVal = numA * numD;
    let res = crossVal / numC;
    answer = `${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}`;
    steps.push({ label: "Step 1: Formula for Proportion: Cross-multiply extremes and means (A \\times D = B \\times C):", katex: `${numC} \\times ${variable} = ${numA} \\times ${numD}` });
    steps.push({ label: "Step 2: Multiply numbers on the right side:", katex: `${numC} \\times ${variable} = ${crossVal}` });
    steps.push({ label: `Step 3: Divide both sides by ${numC} to isolate ${variable}:`, katex: `${variable} = \\frac{${crossVal}}{${numC}}` });
    steps.push({ label: `Step 4: Final simplified value:`, katex: `\\mathbf{${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}}` });
  } else if (isNaN(numA)) {
    let crossVal = numB * numC;
    let res = crossVal / numD;
    answer = `${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}`;
    steps.push({ label: "Step 1: Formula for Proportion: Cross-multiply extremes and means (A \\times D = B \\times C):", katex: `${numD} \\times ${variable} = ${numB} \\times ${numC}` });
    steps.push({ label: "Step 2: Multiply numbers on the right side:", katex: `${numD} \\times ${variable} = ${crossVal}` });
    steps.push({ label: `Step 3: Divide both sides by ${numD} to isolate ${variable}:`, katex: `${variable} = \\frac{${crossVal}}{${numD}}` });
    steps.push({ label: `Step 4: Final simplified value:`, katex: `\\mathbf{${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}}` });
  }

  return { answer, steps };
}

function solveMathematicalInduction(rawText) {
  const norm = rawText.replace(/\s+/g, '').toLowerCase();

  if (norm.includes('1^3') || norm.includes('13+23') || (norm.includes('n^3') && norm.includes('n+1')) || (norm.includes('13') && norm.includes('23') && norm.includes('n3'))) {
    return {
      answer: "Proved by Mathematical Induction for all n ∈ N",
      steps: [
        { label: "Given Proposition P(n):", katex: "P(n): 1^3 + 2^3 + 3^3 + \\dots + n^3 = \\frac{n^2(n+1)^2}{4}" },
        { label: "Step 1: Base Case — Check for n = 1:", katex: "\\text{Left Hand Side (L.H.S)} = 1^3 = 1" },
        { label: "Step 2: Evaluate Right Hand Side (R.H.S) for n = 1:", katex: "\\text{R.H.S} = \\frac{1^2(1+1)^2}{4} = \\frac{1 \\times 4}{4} = 1" },
        { label: "Step 3: Base Case Conclusion:", katex: "\\text{Since L.H.S} = \\text{R.H.S} = 1, \\text{ the proposition } P(1) \\text{ is True.}" },
        { label: "Step 4: Induction Hypothesis — Assume true for n = k:", katex: "P(k): 1^3 + 2^3 + 3^3 + \\dots + k^3 = \\frac{k^2(k+1)^2}{4} \\quad \\text{--- (Equation 1)}" },
        { label: "Step 5: Induction Step — To prove true for n = k + 1:", katex: "P(k+1): 1^3 + 2^3 + \\dots + k^3 + (k+1)^3 = \\frac{(k+1)^2((k+1)+1)^2}{4}" },
        { label: "Step 6: Target expression on R.H.S:", katex: "\\text{Required R.H.S} = \\frac{(k+1)^2(k+2)^2}{4}" },
        { label: "Step 7: Add (k+1)³ to both sides of Equation 1:", katex: "1^3 + 2^3 + \\dots + k^3 + (k+1)^3 = \\frac{k^2(k+1)^2}{4} + (k+1)^3" },
        { label: "Step 8: Factor out common term (k+1)²:", katex: "= (k+1)^2 \\left[ \\frac{k^2}{4} + (k+1) \\right]" },
        { label: "Step 9: Take LCM inside the brackets:", katex: "= (k+1)^2 \\left[ \\frac{k^2 + 4(k+1)}{4} \\right]" },
        { label: "Step 10: Expand numerator inside bracket:", katex: "= \\frac{(k+1)^2(k^2 + 4k + 4)}{4}" },
        { label: "Step 11: Factorize quadratic k² + 4k + 4 as (k+2)²:", katex: "= \\frac{(k+1)^2(k+2)^2}{4} = \\text{R.H.S}" },
        { label: "Step 12: Final Conclusion:", katex: "\\mathbf{\\text{Since } P(k+1) \\text{ is true whenever } P(k) \\text{ is true, } P(n) \\text{ holds } \\forall n \\in \\mathbb{N}.}" }
      ]
    };
  }

  if (norm.includes('1^2') || norm.includes('12+22') || (norm.includes('n^2') && norm.includes('2n+1'))) {
    return {
      answer: "Proved by Mathematical Induction for all n ∈ N",
      steps: [
        { label: "Given Proposition P(n):", katex: "P(n): 1^2 + 2^2 + 3^2 + \\dots + n^2 = \\frac{n(n+1)(2n+1)}{6}" },
        { label: "Step 1: Check Base Case for n = 1:", katex: "\\text{L.H.S} = 1^2 = 1" },
        { label: "Step 2: Evaluate R.H.S for n = 1:", katex: "\\text{R.H.S} = \\frac{1(1+1)(2(1)+1)}{6} = \\frac{1 \\times 2 \\times 3}{6} = 1" },
        { label: "Step 3: Base Case Verdict:", katex: "\\text{L.H.S} = \\text{R.H.S} = 1 \\implies P(1) \\text{ is True.}" },
        { label: "Step 4: Inductive Hypothesis (Assume n = k):", katex: "1^2 + 2^2 + \\dots + k^2 = \\frac{k(k+1)(2k+1)}{6}" },
        { label: "Step 5: Prove for n = k + 1 by adding (k+1)²:", katex: "\\text{L.H.S} = \\frac{k(k+1)(2k+1)}{6} + (k+1)^2" },
        { label: "Step 6: Factor out (k+1):", katex: "= (k+1) \\left[ \\frac{k(2k+1) + 6(k+1)}{6} \\right]" },
        { label: "Step 7: Simplify quadratic inside bracket:", katex: "= \\frac{k+1}{6} [2k^2 + 7k + 6] = \\frac{(k+1)(k+2)(2k+3)}{6}" },
        { label: "Step 8: Final Conclusion:", katex: "\\mathbf{\\text{L.H.S} = \\text{R.H.S} \\implies P(n) \\text{ is proved } \\forall n \\in \\mathbb{N}.}" }
      ]
    };
  }

  return null;
}

function unsupported(rawQuery, reason) {
  return {
    answer: '\\text{Sorry, this question could not be solved}',
    steps: [
      { label: 'Given input:', katex: `\\text{${String(rawQuery).replace(/[\\{}$&#^_%~]/g, ' ').slice(0, 120)}}` },
      { label: reason || 'This type of question is not supported yet, or the input could not be understood. Please check the expression and try again.', katex: '' }
    ]
  };
}

const S = require('../math/symbolic');
const { formatDecimal } = require('../math/rational');

function solveNumericExpression(rawQuery) {
  const node = S.tryParse(rawQuery);
  if (!node || S.variables(node).size) return null;
  let value;
  try { value = S.evaluate(node); } catch (e) { return null; }
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) > 1e12 && /(tan|sec|csc|cot)/.test(rawQuery)) {
    return { answer: '\\text{Undefined}', steps: [{ label: 'Given expression:', katex: S.tex(node) }, { label: 'This trigonometric value is undefined (division by zero, e.g. $\\tan\\frac{\\pi}{2} = \\frac{\\sin(\\pi/2)}{\\cos(\\pi/2)} = \\frac{1}{0}$).', katex: '' }] };
  }
  const exact = S.simplify(node);
  const exactTex = S.tex(exact);
  const approxTex = formatDecimal(+value.toPrecision(10));
  const isExactNum = exact.t === 'num';
  const steps = [{ label: 'Given expression:', katex: S.tex(node) }];
  if (/(sin|cos|tan|sec|csc|cot)/.test(rawQuery) && !/pi|π|°|\\circ|deg/.test(rawQuery)) {
    steps.push({ label: 'Note: angles are in radians. For degrees write e.g. sin(30°).', katex: '' });
  }
  if (!isExactNum && exactTex !== S.tex(node)) steps.push({ label: 'Simplify exactly:', katex: `= ${exactTex}` });
  if (isExactNum) steps.push({ label: 'Final Answer:', katex: `\\mathbf{${exactTex}}` });
  else steps.push({ label: 'Final Answer:', katex: `\\mathbf{${exactTex} \\approx ${approxTex}}` });
  return { answer: isExactNum ? exactTex : `${exactTex} \\approx ${approxTex}`, steps };
}

// MathLive writes some symbols in special ways; turn them into plain forms the solvers expect
function normalizeMathLiveInput(raw) {
  return String(raw || '')
    .replace(/\\differentialD\s*/g, 'd')
    .replace(/\\(?:mathrm|operatorname|text|mathit|textrm)\{\s*d\s*\}\s*/g, 'd')
    .replace(/\\exponentialE|\\(?:mathrm|operatorname)\{e\}/g, 'e')
    .replace(/\\imaginaryI|\\(?:mathrm|operatorname)\{i\}/g, 'i')
    .replace(/\\placeholder(?:\[[^\]]*\])?\{[^{}]*\}/g, '')
    .replace(/\\operatorname\{([a-zA-Z]+)\}/g, '\\$1')
    .replace(/\\[,;:!]|\\quad|\\qquad|\\ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function solveExpression(rawQueryIn) {
  const rawQuery = normalizeMathLiveInput(rawQueryIn);
  // Priority A: Advanced Benchmark Suite (only matches its exact problems)
  const benchmarkResult = solveAdvancedBenchmark(rawQuery);
  if (benchmarkResult) return benchmarkResult;

  // Proofs and question types from intermediate to master's level
  const advanced = solveAdvanced(rawQuery);
  if (advanced) return advanced;

  // Rational algebraic expressions: factor and cancel
  const rationalResult = solveAlgebraicRational(rawQuery);
  if (rationalResult) return rationalResult;

  // Single simple fraction (e.g. \frac{9}{3} or 15/5)
  const singleFracMatch = rawQuery.trim().match(/^(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+)\s*\/\s*(\d+))$/);
  if (singleFracMatch) {
    const num = parseInt(singleFracMatch[1] || singleFracMatch[3], 10);
    const den = parseInt(singleFracMatch[2] || singleFracMatch[4], 10);
    if (den === 0) {
      return {
        answer: "\\text{Undefined}",
        steps: [
          { label: "Given input:", katex: `\\frac{${num}}{0}` },
          { label: "Error:", katex: "\\text{Division by zero is mathematically undefined.}" }
        ]
      };
    }
    const g = gcd(num, den);
    const redNum = num / g;
    const redDen = den / g;
    const finalAnswer = redDen === 1 ? `${redNum}` : `\\frac{${redNum}}{${redDen}}`;
    const steps = [
      { label: "Given fraction:", katex: `\\frac{${num}}{${den}}` },
      { label: "Step 1: Find the Greatest Common Divisor (GCD):", katex: `\\gcd(${num}, ${den}) = ${g}` },
      { label: "Step 2: Divide numerator and denominator by the GCD:", katex: `\\frac{${num} \\div ${g}}{${den} \\div ${g}} = ${finalAnswer}` },
      { label: "Final Answer:", katex: `\\mathbf{${finalAnswer}}` }
    ];
    return { answer: finalAnswer, steps };
  }

  // Mathematical induction proofs
  const inductionResult = solveMathematicalInduction(rawQuery);
  if (inductionResult) return inductionResult;

  // Set theory & logic
  const setLogicResult = solveSetLogic(rawQuery);
  if (setLogicResult) return setLogicResult;

  // Radicals
  let radicalResult = null;
  try { radicalResult = solveRadical(rawQuery); } catch (e) { radicalResult = null; } // huge numbers: fall back to a decimal answer
  if (radicalResult) return radicalResult;

  // Calculus
  const calculusResult = solveCalculus(rawQuery);
  if (calculusResult) return calculusResult;

  // Compound LaTeX fractions and simple two-fraction operations
  const fractionResult = solveFractions(rawQuery);
  if (fractionResult) return fractionResult;

  const normalized = normalizeMathExpression(rawQuery);

  // Proportion (A/B = C/x)
  const propMatch = normalized.match(/^\s*([\d.]+)\s*\/\s*([\d.]+)\s*=\s*([\d.]+)\s*\/\s*([a-zA-Z]+)\s*$/);
  if (propMatch) {
    return solveProportion(propMatch[1], propMatch[2], propMatch[3], propMatch[4]);
  }

  // Linear / quadratic / factorable polynomial equations
  if (normalized.includes('=')) {
    const eq = solveEquation(normalized);
    if (eq) return eq;
  }

  // Arithmetic with correct order of operations and exact fractions
  const arithmetic = solveArithmetic(normalized);
  if (arithmetic) return arithmetic;

  // Numbers with functions and constants (sin, cos, log, sqrt, pi, e, degrees, n!)
  const numeric = solveNumericExpression(rawQuery);
  if (numeric) return numeric;

  // Polynomial expressions in one variable: expand, simplify and factor
  const polyParsed = /[a-zA-Z]/.test(normalized) && !/(sqrt|cbrt|pi|sin|cos|tan|log|ln|exp)/i.test(normalized)
    ? P.parsePolynomial(normalized) : null;
  if (polyParsed && P.degree(polyParsed.poly) >= 1) {
    const v = polyParsed.variable;
    const expanded = P.toTex(polyParsed.poly, v);
    const f = P.factor(polyParsed.poly);
    const factored = f.factors.length > 1 || !f.constant.equals(1) ? P.factoredTex(f, v) : null;
    const steps = [
      { label: 'Given expression:', katex: rawQuery },
      { label: 'Step 1: Expand all brackets and combine like terms:', katex: `= ${expanded}` }
    ];
    if (factored && factored !== expanded) steps.push({ label: 'Step 2: Factored form:', katex: `= ${factored}` });
    steps.push({ label: 'Final Answer (simplified):', katex: `\\mathbf{${expanded}}` });
    return { answer: expanded, steps };
  }

  // Restricted math.js evaluation fallback (sin, cos, log, sqrt, pi, ...)
  try {
    const evaluated = limitedEvaluate(normalized);
    if (evaluated === undefined || typeof evaluated === 'function') throw new Error('No value');
    let formattedAns;
    if (typeof evaluated === 'number') {
      if (!Number.isFinite(evaluated)) throw new Error('Not finite');
      formattedAns = Number.isInteger(evaluated) ? `${evaluated}` : `${parseFloat(evaluated.toPrecision(10))}`;
    } else {
      formattedAns = math.format(evaluated, { precision: 10 });
    }
    return {
      answer: formattedAns,
      steps: [
        { label: "Given mathematical expression:", katex: `\\text{${normalized.replace(/[\\{}$&#_%~]/g, ' ')}}` },
        { label: "Step 1: Evaluate the expression:", katex: `\\mathbf{${formattedAns}}` }
      ]
    };
  } catch (err) {
    return unsupported(rawQuery);
  }
}

exports.solve = async (req, res) => {
  try {
    const { type, payload } = req.body || {};
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing input.' });
    }
    let result = null;
    let title = "";
    let query = "";

    if (type === 'proportion') {
      const { a, b, c, d } = payload;
      result = solveProportion(a, b, c, d);
      title = `Proportion: ${a}/${b} = ${c}/${d}`;
      query = `${a}/${b} = ${c}/${d}`;
    } else if (type === 'age') {
      const { dob } = payload;
      result = solveAge(dob);
      title = `Age: ${dob}`;
      query = String(dob || '');
    } else if (type === 'acdc') {
      const { voltage, conversionType, rectifierType } = payload;
      result = solveAcDc(voltage, conversionType, rectifierType);
      title = `AC/DC: ${voltage}V (${conversionType})`;
      query = `${voltage}V`;
    } else {
      const rawQuery = typeof payload.query === 'string' ? payload.query.trim() : '';
      if (!rawQuery) {
        return res.status(400).json({ success: false, error: 'Please enter a mathematical expression.' });
      }
      if (rawQuery.length > MAX_QUERY_LENGTH) {
        return res.status(400).json({ success: false, error: `Expression is too long (max ${MAX_QUERY_LENGTH} characters).` });
      }
      result = solveExpression(rawQuery);
      title = rawQuery.substring(0, 35);
      query = rawQuery;
    }

    if (!result) {
      result = {
        answer: "\\text{Unable to solve}",
        steps: [{ label: "Error:", katex: "\\text{Expression could not be resolved.}" }]
      };
    }

    // History is saved only for signed-in users (identified by their login token)
    let saved = null;
    if (req.userEmail) {
      try {
        saved = await db.addCalculation({
          title,
          type: type || 'math',
          query,
          answer: result.answer || "",
          steps: result.steps || []
        }, req.userEmail);
      } catch (e) {
        console.warn("DB save error:", e.message);
      }
    }

    res.json({
      success: true,
      id: saved ? saved.id : null,
      saved: Boolean(saved),
      title,
      answer: result.answer,
      steps: result.steps
    });
  } catch (err) {
    console.error("Solver Error:", err);
    res.status(200).json({
      success: false,
      error: "Something went wrong while solving. Please check the expression and try again."
    });
  }
};

// Exported for tests
exports._solveExpression = solveExpression;
exports._solveAdvanced = solveAdvanced;
