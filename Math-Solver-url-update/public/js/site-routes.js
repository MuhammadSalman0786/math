/* Every page of the site and its URL. Shared by the browser (navigation) and the
   server (renders each URL with its own title/description and adds it to sitemap.xml). */
(function (root) {
  const SITE_NAME = 'All Math Solver';

  const ROUTES = [
    {
      path: '/', section: 'home', calc: 'expression',
      title: 'All Math Solver | Free Step-by-Step Math Solver',
      description: 'Free step-by-step math solver for algebra, equations, derivatives, integrals, limits, matrices, series, differential equations and proofs.',
      priority: '1.0', changefreq: 'weekly'
    },
    {
      path: '/proportion-calculator', section: 'home', calc: 'proportion',
      title: 'Proportion Calculator (A/B = C/D) with Steps | All Math Solver',
      description: 'Free proportion calculator: solve A/B = C/D for the missing value using cross multiplication, with a clear step-by-step explanation.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/age-calculator', section: 'home', calc: 'age',
      title: 'Age Calculator – Exact Age in Years, Months & Days | All Math Solver',
      description: 'Free age calculator: find your exact age in years, months and days from your date of birth, plus total days, hours and your next birthday.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/ac-to-dc-calculator', section: 'home', calc: 'acdc',
      title: 'AC to DC Voltage Calculator (Rectifier) | All Math Solver',
      description: 'Free AC to DC voltage calculator: convert RMS or peak AC voltage to rectified DC output for half-wave and full-wave bridge rectifiers, with formulas.',
      priority: '0.9', changefreq: 'monthly'
    },
    {
      path: '/about', section: 'about',
      title: 'About Us | All Math Solver',
      description: 'All Math Solver makes mathematics easy and accessible with free step-by-step solutions for students, teachers and researchers.',
      priority: '0.5', changefreq: 'yearly'
    },
    {
      path: '/blog', section: 'blog',
      title: 'Math Guides, Formulas & Tutorials | All Math Solver Blog',
      description: 'Math guides and tutorials: mathematical induction, ratio and proportion, AC to DC rectification and more, explained step by step.',
      priority: '0.7', changefreq: 'weekly'
    },
    {
      path: '/contact', section: 'contact',
      title: 'Contact Us | All Math Solver',
      description: 'Get in touch with the All Math Solver team for questions, feedback or suggestions.',
      priority: '0.4', changefreq: 'yearly'
    },
    {
      path: '/privacy-policy', section: 'privacy',
      title: 'Privacy Policy | All Math Solver',
      description: 'Read how All Math Solver collects, uses and protects your information.',
      priority: '0.3', changefreq: 'yearly'
    },
    {
      path: '/terms-and-conditions', section: 'terms',
      title: 'Terms & Conditions | All Math Solver',
      description: 'The terms and conditions for using All Math Solver.',
      priority: '0.3', changefreq: 'yearly'
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
      title: (a.title.length + SITE_NAME.length + 3 <= 65) ? `${a.title} | ${SITE_NAME}` : a.title,
      description: a.description || a.lead || '',
      priority: '0.8', changefreq: 'monthly'
    });
  });

  // Old #hash links and other aliases -> new URLs
  const LEGACY = {
    '#home': '/', '#solver': '/', '#about': '/about', '#blog': '/blog', '#contact': '/contact',
    '#privacy': '/privacy-policy', '#terms': '/terms-and-conditions'
  };
  const CALC_PATHS = { expression: '/', proportion: '/proportion-calculator', age: '/age-calculator', acdc: '/ac-to-dc-calculator' };
  const REDIRECTS = {
    '/index.html': '/', '/home': '/', '/math-solver': '/', '/solver': '/',
    '/privacy': '/privacy-policy', '/terms': '/terms-and-conditions', '/about-us': '/about', '/contact-us': '/contact'
  };

  const findRoute = (path) => ROUTES.find(r => r.path === path) || null;

  const api = { SITE_NAME, ROUTES, LEGACY, CALC_PATHS, REDIRECTS, findRoute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SITE_ROUTES = api;
})(typeof window !== 'undefined' ? window : globalThis);
