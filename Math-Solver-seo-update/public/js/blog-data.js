/* Blog articles, shared by the browser (app.js) and the server (server-side rendering for SEO).
   To add an article: add an entry here with a unique "slug"; it gets the URL /blog/<slug>
   and is added to sitemap.xml automatically. */
(function (root) {
  const BLOG_ARTICLES = {
  induction: {
    category: "Higher Mathematics • Intermediate",
    date: "October 2026",
    readTime: "5 min read",
    title: "Mastering Mathematical Induction for Inter & College Exams",
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
    calcMode: "expression",
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
      For a 220V RMS household line, the peak voltage reaches \(\approx 311.12\text{ V}\)!</p>

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
    calcQuery: "220"
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
    induction: { slug: 'mathematical-induction', published: '2026-10-01', modified: '2026-11-12', description: 'Learn mathematical induction step by step: base case, inductive hypothesis and inductive step, with a fully worked sum-of-cubes proof for inter and college exams.' },
    acdc: { slug: 'ac-to-dc-rectification', published: '2026-10-01', modified: '2026-11-12', description: 'How AC to DC rectification works: peak vs RMS voltage, half-wave and bridge rectifiers, diode drops and ripple, with worked formulas.' },
    proportion: { slug: 'ratio-and-proportion', published: '2026-10-01', modified: '2026-11-12', description: 'Cross-multiplication made simple: solve ratio and proportion problems A/B = C/D quickly, with real-world examples and worked steps.' }
  };
  Object.keys(META).forEach(id => { if (BLOG_ARTICLES[id]) Object.assign(BLOG_ARTICLES[id], META[id]); });

  if (typeof module !== 'undefined' && module.exports) module.exports = BLOG_ARTICLES;
  else root.BLOG_ARTICLES = BLOG_ARTICLES;
})(typeof window !== 'undefined' ? window : globalThis);
