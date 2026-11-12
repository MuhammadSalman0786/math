/* Blog articles, shared by the browser (app.js) and the server (server-side rendering for SEO).
   To add an article: add an entry here with a unique "slug"; it gets the URL /blog/<slug>
   and is added to sitemap.xml automatically. */
(function (root) {
  const BLOG_ARTICLES = {
  quadratic: {
    category: "Algebra • High School, GCSE, A-Level & SAT",
    date: "November 2026",
    readTime: "6 min read",
    title: "The Quadratic Formula: Derivation, Discriminant & Worked Examples",
    lead: "The quadratic formula solves every equation of the form ax² + bx + c = 0. This guide shows where it comes from, what the discriminant tells you, and how to use it without mistakes.",
    content: String.raw`
      <h3>What is a quadratic equation?</h3>
      <p>A quadratic equation is any equation that can be written as
      \[ ax^2 + bx + c = 0, \qquad a \neq 0. \]
      Here \(a\), \(b\) and \(c\) are numbers called the <em>coefficients</em>. For example, in \(2x^2 - 3x + 1 = 0\) we have \(a = 2\), \(b = -3\) and \(c = 1\). Always move every term to one side first, so that the other side is 0.</p>

      <div class="article-box-callout">
        <strong>The quadratic formula:</strong>
        \[ x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \]
        <p>The \(\pm\) sign gives the two solutions (roots): one with \(+\) and one with \(-\).</p>
      </div>

      <h3>Where does the formula come from? (Completing the square)</h3>
      <p>Start from \(ax^2 + bx + c = 0\) and divide by \(a\):
      \[ x^2 + \frac{b}{a}x = -\frac{c}{a}. \]
      Add \(\left(\frac{b}{2a}\right)^2\) to both sides to complete the square:
      \[ \left(x + \frac{b}{2a}\right)^2 = \frac{b^2}{4a^2} - \frac{c}{a} = \frac{b^2 - 4ac}{4a^2}. \]
      Take the square root of both sides and subtract \(\frac{b}{2a}\):
      \[ x + \frac{b}{2a} = \pm\frac{\sqrt{b^2 - 4ac}}{2a} \quad\Longrightarrow\quad x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}. \]</p>

      <h3>The discriminant: how many roots?</h3>
      <p>The expression under the square root, \(\Delta = b^2 - 4ac\), is called the <strong>discriminant</strong>. It tells you the nature of the roots before you finish the calculation:</p>
      <ul>
        <li>\(\Delta > 0\): two different real roots (the parabola crosses the x-axis twice).</li>
        <li>\(\Delta = 0\): one repeated real root (the parabola touches the x-axis).</li>
        <li>\(\Delta < 0\): no real roots; two complex roots \(p \pm qi\) (the parabola does not meet the x-axis).</li>
      </ul>
      <p>If \(\Delta\) is a perfect square (0, 1, 4, 9, 16, ...) and the coefficients are whole numbers, the roots are rational and the quadratic can also be solved by factorising.</p>

      <h3>Worked example 1: two rational roots</h3>
      <p>Solve \(x^2 - 5x + 6 = 0\). Here \(a = 1\), \(b = -5\), \(c = 6\).
      \[ \Delta = (-5)^2 - 4(1)(6) = 25 - 24 = 1 \]
      \[ x = \frac{5 \pm \sqrt{1}}{2} = \frac{5 \pm 1}{2} \quad\Longrightarrow\quad x = 3 \ \text{or}\ x = 2. \]
      Check by factorising: \((x - 2)(x - 3) = 0\).</p>

      <h3>Worked example 2: irrational (surd) roots</h3>
      <p>Solve \(x^2 - 3x + 1 = 0\). Then \(\Delta = 9 - 4 = 5\), which is not a perfect square, so
      \[ x = \frac{3 \pm \sqrt{5}}{2} \approx 2.618 \ \text{or}\ 0.382. \]
      Exam questions often ask for the exact answer in surd form, so keep \(\sqrt{5}\) until the last step.</p>

      <h3>Worked example 3: complex roots</h3>
      <p>Solve \(x^2 + 2x + 5 = 0\). Then \(\Delta = 4 - 20 = -16 < 0\), so there are no real roots. Using \(\sqrt{-16} = 4i\):
      \[ x = \frac{-2 \pm 4i}{2} = -1 \pm 2i. \]</p>

      <h3>Useful extras</h3>
      <ul>
        <li><strong>Sum and product of roots:</strong> \(x_1 + x_2 = -\frac{b}{a}\) and \(x_1 x_2 = \frac{c}{a}\).</li>
        <li><strong>Vertex of the parabola</strong> \(y = ax^2 + bx + c\): at \(x = -\frac{b}{2a}\); it is a minimum if \(a > 0\) and a maximum if \(a < 0\).</li>
      </ul>

      <h3>Common mistakes to avoid</h3>
      <ul>
        <li>Forgetting the sign of \(b\): if \(b = -5\), then \(-b = 5\) and \(b^2 = 25\) (not \(-25\)).</li>
        <li>Dividing only \(\sqrt{\Delta}\) by \(2a\): the whole numerator \(-b \pm \sqrt{\Delta}\) is divided by \(2a\).</li>
        <li>Not rearranging to "\(= 0\)" first: \(x^2 = 5x - 6\) must become \(x^2 - 5x + 6 = 0\).</li>
      </ul>
      <p>The quadratic formula is on the syllabus for GCSE and A-level maths in the UK, Algebra 1 and 2 and the SAT in the US, high school maths in Canada, and Class 10 and 11 CBSE maths in India. Use our free <a href="/quadratic-equation-calculator">quadratic equation calculator</a> to check your working step by step.</p>
    `,
    calcMode: "quadratic",
    calcQuery: "1, -3, 1"
  },
  induction: {
    category: "Higher Mathematics • High School & College",
    date: "October 2026",
    readTime: "5 min read",
    title: "Mastering Mathematical Induction for High School, A-Level & College Exams",
    lead: "Mathematical induction is a powerful proof technique used to establish the veracity of an infinite sequence of mathematical statements for all natural numbers n in N.",
    content: String.raw`
      <h3>Introduction to Principle of Mathematical Induction (PMI)</h3>
      <p>In algebra and discrete mathematics, proving that a formula holds true for every positive integer \(n = 1, 2, 3, \dots\) by testing numbers one by one is impossible because numbers are infinite. The Principle of Mathematical Induction solves this like falling dominoes.</p>

      <div class="article-box-callout">
        <strong>The 3 Essential Steps of Induction:</strong>
        <ol style="margin-left: 20px; margin-top: 8px;">
          <li><strong>Base Step:</strong> Prove that the proposition \(P(n)\) is true for the smallest natural number (usually \(n = 1\)).</li>
          <li><strong>Inductive Hypothesis:</strong> Assume that the proposition \(P(k)\) is true for some arbitrary positive integer \(k\).</li>
          <li><strong>Inductive Step:</strong> Using the hypothesis, prove that \(P(k+1)\) is strictly true.</li>
        </ol>
      </div>

      <h3>Classic Example: Sum of First n Cubes</h3>
      <p>Consider the famous textbook theorem:
      \[ 1^3 + 2^3 + 3^3 + \dots + n^3 = \frac{n^2(n+1)^2}{4} \]
      </p>
      <p><strong>Step 1 (Base Case):</strong> For \(n = 1\), L.H.S = \(1^3 = 1\). R.H.S = \(\frac{1^2(1+1)^2}{4} = \frac{4}{4} = 1\). Both sides are equal!</p>
      <p><strong>Step 2 (Hypothesis):</strong> We assume \(1^3 + 2^3 + \dots + k^3 = \frac{k^2(k+1)^2}{4}\) is true.</p>
      <p><strong>Step 3 (Proof for k+1):</strong> Adding \((k+1)^3\) to both sides and factoring \((k+1)^2\) yields \(\frac{(k+1)^2(k+2)^2}{4}\). The proof is complete!</p>
    `,
    calcMode: "induction",
    calcQuery: "1^3 + 2^3 + ... + n^3 = n^2(n+1)^2/4"
  },
  acdc: {
    category: "Applied Electronics & Physics",
    date: "October 2026",
    readTime: "6 min read",
    title: "Understanding AC to DC Rectification: Peak vs RMS Voltage",
    lead: "Every electronic device, from your laptop charger to smartphone adapter, relies on rectifier circuits to convert oscillating AC mains into steady DC electricity.",
    content: String.raw`
      <h3>Alternating Current (AC) Characteristics</h3>
      <p>Household AC voltage fluctuates sinusoidally. The standard voltage supplied to homes represents the <strong>Root Mean Square (RMS)</strong> voltage, which produces the same heating effect as an equivalent DC voltage.</p>
      <p>The relationship between Peak Voltage (\(V_{peak}\)) and RMS Voltage (\(V_{RMS}\)) is given by:
      \[ V_{peak} = V_{RMS} \times \sqrt{2} \approx 1.4142 \times V_{RMS} \]
      For a 230 V RMS household line (UK, India, most of Europe) the peak voltage reaches \(\approx 325.27\text{ V}\); for a 120 V line (US, Canada) it is \(\approx 169.71\text{ V}\).</p>

      <h3>Full-Wave vs Half-Wave Rectification</h3>
      <div class="article-box-callout">
        <ul>
          <li><strong>Full-Wave Bridge Rectifier:</strong> Converts both positive and negative AC half-cycles into positive DC pulses. The average DC voltage is:
          \[ V_{DC} = \frac{2 \times V_{peak}}{\pi} \approx 0.6366 \times V_{peak} \]</li>
          <li><strong>Half-Wave Rectifier:</strong> Conducts only during the positive half-cycle, blocking the negative half. The output is:
          \[ V_{DC} = \frac{V_{peak}}{\pi} \approx 0.3183 \times V_{peak} \]</li>
        </ul>
      </div>
    `,
    calcMode: "acdc",
    calcQuery: "230"
  },
  proportion: {
    category: "Arithmetic & Scientific Ratios",
    date: "October 2026",
    readTime: "4 min read",
    title: "Cross-Multiplication Made Simple: The Ratio & Proportion Guide",
    lead: "Mastering proportion equations is the foundation for solving chemistry stoichiometry, physics unit scaling, and financial percentages.",
    content: String.raw`
      <h3>What is a Mathematical Proportion?</h3>
      <p>A proportion states that two fractions or ratios are equal:
      \[ \frac{A}{B} = \frac{C}{D} \]
      Here, \(A\) and \(D\) are known as the <em>extremes</em>, while \(B\) and \(C\) are known as the <em>means</em>.</p>

      <div class="article-box-callout">
        <strong>The Cross-Multiplication Rule:</strong>
        <p>In any true proportion, the product of the extremes equals the product of the means:</p>
        \[ A \times D = B \times C \]
      </div>
    `,
    calcMode: "proportion",
    calcQuery: ""
  }
};

  // URL slugs and search descriptions
  const META = {
    quadratic: { slug: 'quadratic-formula', seoTitle: 'Quadratic Formula: Derivation & Examples | Math & Maths Guide', published: '2026-11-12', modified: '2026-11-12', description: 'The quadratic formula explained: derivation by completing the square, the discriminant, and worked examples with rational, surd and complex roots.' },
    induction: { slug: 'mathematical-induction', seoTitle: 'Mathematical Induction Explained | Math & Maths Guide', published: '2026-10-01', modified: '2026-11-12', description: 'Mathematical induction step by step for high school, A-level and college maths: base case, inductive step and a fully worked sum-of-cubes proof.' },
    acdc: { slug: 'ac-to-dc-rectification', seoTitle: 'AC to DC Rectification, Peak vs RMS | Math & Maths Guide', published: '2026-10-01', modified: '2026-11-12', description: 'How AC to DC rectification works: peak vs RMS voltage, half-wave and bridge rectifiers, diode drops and ripple, with worked formulas.' },
    proportion: { slug: 'ratio-and-proportion', seoTitle: 'Ratio & Proportion, Cross-Multiplication | Math & Maths', published: '2026-10-01', modified: '2026-11-12', description: 'Cross-multiplication made simple: solve ratio and proportion problems A/B = C/D quickly, with real-world examples and worked steps.' }
  };
  Object.keys(META).forEach(id => { if (BLOG_ARTICLES[id]) Object.assign(BLOG_ARTICLES[id], META[id]); });

  if (typeof module !== 'undefined' && module.exports) module.exports = BLOG_ARTICLES;
  else root.BLOG_ARTICLES = BLOG_ARTICLES;
})(typeof window !== 'undefined' ? window : globalThis);
