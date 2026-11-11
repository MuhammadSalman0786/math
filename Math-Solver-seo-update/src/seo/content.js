// Page-specific text for each calculator page (rendered on the server).
// Each calculator page gets its own description, "how to use" steps, a worked example
// and FAQs (also published as FAQPage structured data). Keep answers accurate to what
// the tools actually do.

const CALC_CONTENT = {
  expression: {
    descCard: 'descExpression',
    howTitle: 'What can All Math Solver solve?',
    how: [
      '<strong>Arithmetic &amp; fractions</strong>: correct order of operations (BODMAS/PEMDAS) and exact fractions, e.g. <code>5 - 2^2</code>, <code>1/2 + 1/3</code>.',
      '<strong>Equations</strong>: linear, quadratic (including complex roots) and higher-degree equations that factor, e.g. <code>x^2 + 2x + 5 = 0</code>; exponential equations such as <code>2^{2x} - 5·2^x + 4 = 0</code>.',
      '<strong>Algebra</strong>: expanding, factoring and simplifying rational expressions with domain restrictions; square roots and radicals.',
      '<strong>Calculus</strong>: derivatives with product and chain rule steps, integrals (including integration by parts), definite and improper integrals, and limits with L\'Hôpital\'s rule.',
      '<strong>Linear algebra</strong>: eigenvalues and eigenvectors of 2×2 and 3×3 matrices.',
      '<strong>Sequences &amp; series</strong>: arithmetic and geometric progressions, and convergence tests (p-series, integral, ratio, comparison, alternating).',
      '<strong>Differential equations</strong>: first- and second-order linear ODEs with constant coefficients, including initial conditions.',
      '<strong>Advanced topics</strong>: double integrals, Green\'s theorem, Laurent series, real integrals by residues, the heat equation, and written proofs of standard theorems.'
    ],
    example: { q: 'Find dy/dx if y = x² sin(3x)', a: 'Product rule: dy/dx = 2x sin(3x) + 3x² cos(3x)' },
    faqs: [
      { q: 'Is All Math Solver free to use?', a: 'Yes. Every solver and calculator on the site is free, and you can use it without an account. Signing in only adds history that syncs across your devices.' },
      { q: 'Does it show the steps or only the answer?', a: 'It shows the full working: each step is written out with the rule used (for example BODMAS, the quadratic formula, the product rule or L\'Hôpital\'s rule), followed by the final answer.' },
      { q: 'How do I type powers, fractions and square roots?', a: 'Type ^ for powers (x^2), / for fractions (1/2), and use the fx button for symbols like √, π, ∫ and ∑. You can also paste a question copied from a worksheet or PDF.' },
      { q: 'Which topics are supported?', a: 'Arithmetic, algebra, linear and quadratic equations, exponential equations, derivatives, integrals, limits, eigenvalues, sequences and series, linear differential equations, and several advanced calculus topics, as listed above.' }
    ]
  },
  proportion: {
    descCard: 'descProportion',
    howTitle: 'How to use the proportion calculator',
    how: [
      'Enter the four parts of the proportion <strong>A/B = C/D</strong>.',
      'Put a letter such as <strong>x</strong> in the box you want to find; fill the other three boxes with numbers.',
      'Press <strong>Calculate</strong> to see the cross-multiplication and the value of the unknown, step by step.'
    ],
    example: { q: '4/8 = 6/x', a: 'Cross-multiply: 4·x = 8·6 = 48, so x = 48 ÷ 4 = 12' },
    faqs: [
      { q: 'What is a proportion?', a: 'A proportion is an equation saying two ratios are equal, written A/B = C/D. For example 1/2 = 4/8.' },
      { q: 'How does cross multiplication work?', a: 'In A/B = C/D the cross products are equal: A × D = B × C. If one value is unknown, multiply the two known diagonal numbers and divide by the remaining number.' },
      { q: 'Can the unknown be in any position?', a: 'Yes. The letter can be in A, B, C or D. Exactly one box must contain the unknown and the other three must be numbers.' },
      { q: 'Can I use decimals?', a: 'Yes, decimals such as 2.5 are accepted. Division by zero is not allowed, so B and D cannot be 0.' }
    ]
  },
  age: {
    descCard: 'descAge',
    howTitle: 'How to use the age calculator',
    how: [
      'Choose your <strong>date of birth</strong> in the date box.',
      'Press <strong>Calculate</strong>.',
      'You get your exact age in <strong>years, months and days</strong>, plus the total number of days and hours you have lived.'
    ],
    example: { q: 'Born on 29 February 2000, checked on 12 November 2026', a: '26 years, 8 months, 14 days' },
    faqs: [
      { q: 'How is the exact age calculated?', a: 'The calculator counts whole years first, then whole months, then the remaining days, using the real length of each month instead of dividing by 365.' },
      { q: 'Does it handle leap years and people born on 29 February?', a: 'Yes. Leap years are counted correctly, including birthdays on 29 February.' },
      { q: 'What else does it show?', a: 'Besides years, months and days, it shows the total number of days lived and the total number of hours lived.' },
      { q: 'Can I enter a future date?', a: 'No. A date of birth in the future is rejected with a clear message.' }
    ]
  },
  acdc: {
    descCard: 'descAcdc',
    howTitle: 'How to use the AC to DC calculator',
    how: [
      'Enter the AC voltage, for example <strong>220</strong> for household mains.',
      'Choose whether that value is the <strong>RMS</strong> voltage (what a multimeter shows for mains) or the <strong>peak</strong> voltage.',
      'Choose a <strong>full-wave (bridge)</strong> or <strong>half-wave</strong> rectifier and press <strong>Calculate</strong>.'
    ],
    example: { q: '220 V RMS, full-wave bridge rectifier', a: 'V_peak = 220 × √2 ≈ 311.13 V, V_DC = 2·V_peak/π ≈ 198.07 V' },
    faqs: [
      { q: 'What is the formula for AC to DC conversion?', a: 'For an ideal full-wave rectifier V_DC = 2·V_peak/π ≈ 0.637·V_peak. For a half-wave rectifier V_DC = V_peak/π ≈ 0.318·V_peak. From RMS voltage, first use V_peak = V_RMS × √2.' },
      { q: 'What is the difference between RMS and peak voltage?', a: 'Peak voltage is the highest point of the AC wave. RMS is the equivalent heating value that meters display; for a sine wave V_peak = √2 × V_RMS, so 220 V RMS is about 311 V peak.' },
      { q: 'What DC voltage does 220 V AC give?', a: 'An ideal full-wave rectifier gives about 198 V average DC from 220 V RMS; a half-wave rectifier gives about 99 V.' },
      { q: 'Are diode voltage drops included?', a: 'No. The results are for ideal diodes without a smoothing capacitor. Real circuits lose roughly 0.7 V per conducting silicon diode (about 1.4 V for a bridge).' }
    ]
  }
};

module.exports = { CALC_CONTENT };
