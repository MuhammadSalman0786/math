/* Every page of the site and its URL. Shared by the browser (navigation) and the
   server (renders each URL with its own title/description and adds it to sitemap.xml). */
(function (root) {
  const SITE_NAME = 'All Math Solver';

  const ROUTES = [
    {
      path: '/', section: 'home', calc: 'expression',
      title: 'Free Math & Maths Solver with Steps | All Math Solver',
      description: 'Free step-by-step math and maths solver: algebra, equations, derivatives, integrals, limits, series and differential equations, every step explained.',
      priority: '1.0', changefreq: 'weekly'
    },
    {
      path: '/mathematical-induction-solver', section: 'home', calc: 'induction',
      title: 'Mathematical Induction Solver with Steps | Math & Maths Proofs',
      description: 'Free mathematical induction solver: prove sum formulas and divisibility statements step by step, with the base case, hypothesis and inductive step.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/quadratic-equation-calculator', section: 'home', calc: 'quadratic',
      title: 'Quadratic Equation Calculator with Steps | Math & Maths Solver',
      description: 'Free quadratic equation calculator: solve ax² + bx + c = 0 with the quadratic formula, discriminant, factorising, exact surd roots and the vertex.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/lcm-calculator', section: 'home', calc: 'lcm',
      title: 'LCM Calculator: Least Common Multiple with Steps | Math & Maths',
      description: 'Free LCM calculator: find the least common multiple of 2 to 10 numbers using prime factorisation, checked with Euclid\'s algorithm, step by step.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/gcf-calculator', section: 'home', calc: 'gcf',
      title: 'GCF Calculator (HCF & GCD) with Steps | Math & Maths Tools',
      description: 'Free GCF calculator, also called HCF or GCD: find the greatest common factor of numbers by prime factors and Euclid\'s algorithm, step by step.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/percentage-calculator', section: 'home', calc: 'percentage',
      title: 'Percentage Calculator: % of, % Change & Increase | Math & Maths',
      description: 'Free percentage calculator: work out X% of Y, what percent X is of Y, and percentage increase or decrease, with each step shown.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/proportion-calculator', section: 'home', calc: 'proportion',
      title: 'Proportion Calculator & Solver with Steps | Math & Maths',
      description: 'Free proportion calculator and proportion solver: solve A/B = C/D for the missing value using cross multiplication, explained step by step.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/age-calculator', section: 'home', calc: 'age',
      title: 'Age Calculator: Years, Months & Days | Math & Maths Tools',
      description: 'Free age calculator: find your exact age in years, months and days from your date of birth, plus total days, hours and your next birthday.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/ac-to-dc-calculator', section: 'home', calc: 'acdc',
      title: 'AC to DC Voltage Calculator | Math & Maths Tools',
      description: 'Free AC to DC voltage calculator for 230 V (UK, India) or 120 V (US, Canada) mains: RMS or peak AC to DC for half-wave and bridge rectifiers.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/about', section: 'about',
      title: 'About Us | All Math Solver: Free Math & Maths Help',
      description: 'All Math Solver makes math and maths easy with free step-by-step solutions for high school, A-level, college and university students.',
      priority: '0.5', changefreq: 'yearly'
    },
    {
      path: '/blog', section: 'blog',
      title: 'Math & Maths Guides and Tutorials | All Math Solver Blog',
      description: 'Math and maths guides for high school, A-level and college: the quadratic formula, mathematical induction, ratio and proportion and more, step by step.',
      priority: '0.7', changefreq: 'weekly'
    },
    {
      path: '/contact', section: 'contact',
      title: 'Contact Us | All Math Solver',
      description: 'Contact the All Math Solver team: ask a question, report a wrong answer or bug, or suggest a new math calculator. We reply by email.',
      priority: '0.4', changefreq: 'yearly'
    },
    {
      path: '/privacy-policy', section: 'privacy',
      title: 'Privacy Policy | All Math Solver',
      description: 'How All Math Solver collects, uses and protects your information: accounts, recent history, contact messages, cookies and translation.',
      priority: '0.3', changefreq: 'yearly'
    },
    {
      path: '/terms-and-conditions', section: 'terms',
      title: 'Terms & Conditions | All Math Solver',
      description: 'The terms and conditions for using All Math Solver, the free step-by-step math and maths solver: accounts, accuracy, acceptable use and liability.',
      priority: '0.3', changefreq: 'yearly'
    },
    {
      path: '/disclaimer', section: 'disclaimer',
      title: 'Disclaimer | All Math Solver',
      description: 'Disclaimer for All Math Solver: solutions are for learning and practice; please check important results and follow your school\'s rules.',
      priority: '0.3', changefreq: 'yearly'
    },
    {
      path: '/cookie-policy', section: 'cookies',
      title: 'Cookie Policy | All Math Solver',
      description: 'Which cookies and local storage All Math Solver uses (sign-in, recent history, language choice) and how to control them.',
      priority: '0.3', changefreq: 'yearly'
    },
    {
      path: '/site-map', section: 'sitemap',
      title: 'Site Map: All Calculators & Guides | All Math Solver',
      description: 'A list of every page on All Math Solver: math and maths calculators, step-by-step solvers, guides and help pages.',
      priority: '0.4', changefreq: 'monthly'
    }
  ];

  // Blog articles get /blog/<slug>
  const articles = (typeof module !== 'undefined' && module.exports)
    ? require('./blog-data.js')
    : (root.BLOG_ARTICLES || {});
  Object.keys(articles).forEach(id => {
    const a = articles[id];
    if (!a.slug) return;
    ROUTES.push({
      path: '/blog/' + a.slug, section: 'blog', post: id,
      title: a.seoTitle || ((a.title.length + SITE_NAME.length + 3 <= 65) ? `${a.title} | ${SITE_NAME}` : a.title),
      description: a.description || a.lead || '',
      priority: '0.8', changefreq: 'monthly'
    });
  });

  // Old #hash links and other aliases -> new URLs
  const LEGACY = {
    '#home': '/', '#solver': '/', '#about': '/about', '#blog': '/blog', '#contact': '/contact',
    '#privacy': '/privacy-policy', '#terms': '/terms-and-conditions'
  };
  const CALC_PATHS = {
    expression: '/', induction: '/mathematical-induction-solver', quadratic: '/quadratic-equation-calculator',
    lcm: '/lcm-calculator', gcf: '/gcf-calculator', percentage: '/percentage-calculator',
    proportion: '/proportion-calculator', age: '/age-calculator', acdc: '/ac-to-dc-calculator'
  };
  const REDIRECTS = {
    '/index.html': '/', '/home': '/', '/math-solver': '/', '/solver': '/',
    '/privacy': '/privacy-policy', '/terms': '/terms-and-conditions', '/about-us': '/about', '/contact-us': '/contact',
    '/induction-solver': '/mathematical-induction-solver', '/quadratic-calculator': '/quadratic-equation-calculator', '/quadratic-formula-calculator': '/quadratic-equation-calculator',
    '/hcf-calculator': '/gcf-calculator', '/gcd-calculator': '/gcf-calculator', '/lcm-and-gcf-calculator': '/lcm-calculator',
    '/percent-calculator': '/percentage-calculator', '/proportion-solver': '/proportion-calculator',
    '/sitemap': '/site-map', '/sitemap.html': '/site-map', '/cookies': '/cookie-policy', '/disclaimer-policy': '/disclaimer'
  };

  const findRoute = (path) => ROUTES.find(r => r.path === path) || null;

  const api = { SITE_NAME, ROUTES, LEGACY, CALC_PATHS, REDIRECTS, findRoute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SITE_ROUTES = api;
})(typeof window !== 'undefined' ? window : globalThis);
