// Calculus Engine: Differentiation & Integration with Formal Formulas & Steps
const math = require('mathjs');

function solveCalculus(inputStr) {
  let raw = inputStr.trim();

  // Differentiation: d/dx(x^3 + 5x^2 - 7), dy/dx, diff(x^2)
  let diffMatch = raw.match(/^(?:d\/dx|\\frac\{d\}\{dx\}|dy\/dx|diff|derivative)\s*(?:of\s*)?[\(\[\{]?(.*?)[\)\]\}]?$/i)
               || raw.match(/^d\/dx\s+(.+)$/i);

  if (diffMatch && diffMatch[1] && diffMatch[1].trim() !== '') {
    return solveDifferentiation(diffMatch[1].trim());
  }

  // Integration: \int (x^2 + 3x) dx, int(x^2), integrate(x^3)
  let intMatch = raw.match(/^(?:\\int|int|integrate)\s*(?:of\s*)?[\(\[\{]?(.*?)[\)\]\}]?(?:\s*dx|\s*dt)?$/i);
  if (intMatch && intMatch[1] && intMatch[1].trim() !== '') {
    return solveIntegration(intMatch[1].trim());
  }

  return null;
}

function solveDifferentiation(exprStr) {
  let cleanExpr = exprStr.replace(/\s*dx$/i, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim();
  let steps = [];

  steps.push({
    label: "Given function to differentiate:",
    katex: `f(x) = ${cleanExpr}`
  });

  steps.push({
    label: "Step 1: General Formulas of Differentiation:",
    katex: `\\begin{aligned}
\\text{Power Rule: } & \\frac{d}{dx}[x^n] = n x^{n-1} \\
\\text{Constant Multiple Rule: } & \\frac{d}{dx}[c \\cdot u] = c \\frac{du}{dx} \\
\\text{Sum / Difference Rule: } & \\frac{d}{dx}[u \\pm v] = \\frac{du}{dx} \\pm \\frac{dv}{dx}
\\end{aligned}`
  });

  try {
    const parsed = math.parse(cleanExpr);
    const derivative = math.derivative(parsed, 'x');
    const simplified = math.simplify(derivative);

    const ansLatex = simplified.toTex();
    const ansPlain = simplified.toString();

    steps.push({
      label: "Step 2: Differentiate terms using Power Rule:",
      katex: `f'(x) = ${ansLatex}`
    });

    steps.push({
      label: "Final Result:",
      katex: `\\mathbf{\\frac{df}{dx} = ${ansLatex}}`
    });

    return { answer: `f'(x) = ${ansPlain}`, steps };
  } catch (err) {
    return null;
  }
}

function solveIntegration(exprStr) {
  let cleanExpr = exprStr.replace(/\s*dx$/i, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim();
  let steps = [];

  steps.push({
    label: "Given indefinite integral to evaluate:",
    katex: `\\int (${cleanExpr}) \\, dx`
  });

  steps.push({
    label: "Step 1: General Formulas of Integration:",
    katex: `\\begin{aligned}
\\text{Power Rule: } & \\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \quad (n \\neq -1) \\
\\text{Constant Rule: } & \\int c \\, dx = c x + C \\
\\text{Sum Rule: } & \\int [f(x) \\pm g(x)] \\, dx = \\int f(x) \\, dx \\pm \\int g(x) \\, dx
\\end{aligned}`
  });

  try {
    let terms = cleanExpr.replace(/-/g, '+-').split('+').map(t => t.trim()).filter(t => t !== '');
    let resultTerms = [];
    let breakdownSteps = [];

    for (let t of terms) {
      let coeff = 1, power = 0, sign = 1;
      let str = t;
      if (str.startsWith('-')) {
        sign = -1;
        str = str.substring(1).trim();
      }

      if (str.includes('x')) {
        let parts = str.split('x');
        if (parts[0] === '' || parts[0] === '+') coeff = 1;
        else if (parts[0] === '-') coeff = -1;
        else coeff = parseFloat(parts[0]);

        power = parts[1].startsWith('^') ? parseFloat(parts[1].substring(1)) : 1;
        coeff = coeff * sign;

        const newPower = power + 1;
        const newCoeff = coeff / newPower;
        const coeffStr = Number.isInteger(newCoeff) ? (newCoeff === 1 ? '' : (newCoeff === -1 ? '-' : `${newCoeff}`)) : `\\frac{${coeff}}{${newPower}}`;

        breakdownSteps.push(`\\int (${coeff}x^{${power}}) \\, dx = ${coeffStr}x^{${newPower}}`);
        resultTerms.push(Number.isInteger(newCoeff) ? `${coeffStr}x^${newPower}` : `${coeff}/${newPower}*x^${newPower}`);
      } else {
        coeff = parseFloat(str) * sign;
        breakdownSteps.push(`\\int (${coeff}) \\, dx = ${coeff}x`);
        resultTerms.push(`${coeff}x`);
      }
    }

    if (breakdownSteps.length > 0) {
      steps.push({
        label: "Step 2: Integrate term-by-term using the Power Rule:",
        katex: breakdownSteps.join(' \\quad \\text{and} \\quad ')
      });

      let combined = resultTerms.join(' + ').replace(/\+ -/g, '- ');
      steps.push({
        label: "Step 3: Combine all terms and add the constant of integration (C):",
        katex: `\\mathbf{\\int (${cleanExpr}) \\, dx = ${combined} + C}`
      });

      return { answer: `${combined} + C`, steps };
    }
  } catch (e) {}

  steps.push({
    label: "Step 2: Add constant of integration:",
    katex: `F(x) + C`
  });
  return { answer: "F(x) + C", steps };
}

module.exports = { solveCalculus };
