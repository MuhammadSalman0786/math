// Server-side page rendering for search engines.
// Each URL gets its own <title>, meta description, canonical link, Open Graph tags,
// structured data, and the right section / calculator / blog article already in the HTML.

const fs = require('fs');
const path = require('path');
const SITE = require('../../public/js/site-routes.js');
const BLOG = require('../../public/js/blog-data.js');
const { CALC_CONTENT } = require('./content');

const PUBLIC_DIR = path.join(__dirname, '../../public');
const BUILD_DATE = new Date().toISOString().slice(0, 10);

let templateCache = null;
function template() {
  if (!templateCache || process.env.NODE_ENV === 'development') {
    templateCache = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  }
  return templateCache;
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// https://example.com (no trailing slash). SITE_URL wins; otherwise the request's host.
function baseUrl(req) {
  const env = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  return `${proto}://${host}`;
}

const SECTION_IDS = { home: 'sectionHome', about: 'sectionAbout', blog: 'sectionBlog', contact: 'sectionContact', privacy: 'sectionPrivacy', terms: 'sectionTerms' };

const CALC_TEXT = {
  expression: { h1: 'All Math Solver', sub: 'Solve math problems instantly with single-line step-by-step breakdown.', pill: '<i class="fa-solid fa-calculator"></i> Math Solver', panel: 'expressionInputs' },
  proportion: { h1: 'Proportion Calculator', sub: 'Solve unknown variables in fractions using cross multiplication A/B = C/D.', pill: '<i class="fa-solid fa-divide"></i> Proportion Calculator', panel: 'proportionInputs' },
  age: { h1: 'Age Calculator', sub: 'Calculate exact age, months, days, total hours and leap year milestones.', pill: '<i class="fa-solid fa-calendar-days"></i> Age Calculator', panel: 'ageInputs' },
  acdc: { h1: 'AC to DC Voltage Calculator', sub: 'Calculate rectified DC output voltage from AC peak or RMS waveforms with diode formulas.', pill: '<i class="fa-solid fa-bolt"></i> AC to DC Calculator', panel: 'acdcInputs' }
};

function setHidden(html, id, hidden) {
  // find the opening tag that has id="..." (class may come before or after the id)
  const re = new RegExp(`<[a-z]+\\b[^>]*\\bid="${id}"[^>]*>`);
  return html.replace(re, (tag) => {
    if (!/\bclass="/.test(tag)) return hidden ? tag.replace(/>$/, ' class="hidden">') : tag;
    return tag.replace(/\bclass="([^"]*)"/, (all, cls) => {
      const list = cls.split(/\s+/).filter(c => c && c !== 'hidden');
      if (hidden) list.push('hidden');
      return `class="${list.join(' ')}"`;
    });
  });
}

// Position of a whole element (balanced tags) that has id="..." -> [start, end] or null
function elementRange(html, id, tag = 'div') {
  const m = new RegExp(`<${tag}\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
  if (!m) return null;
  const open = new RegExp(`<${tag}\\b`, 'g'), close = new RegExp(`</${tag}>`, 'g');
  let depth = 0, pos = m.index;
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = m.index;
  let t;
  while ((t = re.exec(html))) {
    depth += t[0] === `</${tag}>` ? -1 : 1;
    if (depth === 0) return [m.index, t.index + t[0].length];
  }
  return null;
}
function removeElement(html, id, tag = 'div') {
  const r = elementRange(html, id, tag);
  return r ? html.slice(0, r[0]) + html.slice(r[1]) : html;
}
function getElement(html, id, tag = 'div') {
  const r = elementRange(html, id, tag);
  return r ? html.slice(r[0], r[1]) : '';
}

// Calculator page text: its own description card, how-to, example and FAQs
function calculatorContentHtml(calc, tpl) {
  const c = CALC_CONTENT[calc];
  if (!c) return '';
  const card = getElement(tpl, c.descCard);
  const how = `
          <div class="calc-desc-card calc-howto-card">
            <h2 class="desc-card-title">${c.howTitle}</h2>
            <${calc === 'expression' ? 'ul' : 'ol'} class="desc-list">
              ${c.how.map(h => `<li>${h}</li>`).join('\n              ')}
            </${calc === 'expression' ? 'ul' : 'ol'}>
            <p class="desc-paragraph"><strong>Example:</strong> ${esc(c.example.q)} → ${esc(c.example.a)}</p>
          </div>`;
  const faq = `
          <div class="calc-desc-card calc-faq-card">
            <h2 class="desc-card-title">Frequently asked questions</h2>
            ${c.faqs.map(f => `<details class="faq-item"><summary>${esc(f.q)}</summary><p class="desc-paragraph">${esc(f.a)}</p></details>`).join('\n            ')}
          </div>`;
  return card + how + faq;
}

function articleHtml(post) {
  // same markup the browser builds in openBlogArticle()
  return `
      <div class="article-header">
        <span class="badge-tag">${post.category}</span>
        <h1 class="article-title">${post.title}</h1>
        <div class="blog-meta"><i class="fa-regular fa-calendar"></i> ${post.date} • ${post.readTime}</div>
      </div>
      <p class="lead-text"><strong>Overview:</strong> ${post.lead}</p>
      <div class="article-content">${post.content}</div>
      <div style="margin-top: 30px; padding-top: 18px; border-top: 1px solid var(--border-color); text-align: center;">
        <button class="btn-calculate" id="btnTryArticleCalc">
          <i class="fa-solid fa-calculator"></i> Try this in AllMath Calculator →
        </button>
      </div>`;
}

function structuredData(route, url, base) {
  const data = [];
  if (route.path === '/') {
    data.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.SITE_NAME, url: base + '/' });
  }
  const org = { '@type': 'Organization', name: SITE.SITE_NAME, url: base + '/', logo: { '@type': 'ImageObject', url: base + '/images/AMS_Solver.png' } };
  if (route.calc) {
    data.push({
      '@context': 'https://schema.org', '@type': 'WebApplication', name: CALC_TEXT[route.calc].h1,
      url, description: route.description, applicationCategory: 'EducationalApplication', operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    });
    const c = CALC_CONTENT[route.calc];
    if (c && c.faqs.length) {
      data.push({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: c.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
      });
    }
  }
  if (route.post) {
    const post = BLOG[route.post];
    data.push({
      '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: route.description,
      image: [base + '/images/AMS_Solver.png'],
      datePublished: post.published || BUILD_DATE, dateModified: post.modified || post.published || BUILD_DATE,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }, author: org, publisher: org, inLanguage: 'en'
    });
  }
  // breadcrumbs
  const crumbs = [{ name: 'Home', item: base + '/' }];
  if (route.path.startsWith('/blog')) crumbs.push({ name: 'Blog', item: base + '/blog' });
  if (route.path !== '/' && route.path !== '/blog') crumbs.push({ name: route.post ? BLOG[route.post].title : route.title.split(' | ')[0], item: url });
  if (crumbs.length > 1) {
    data.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })) });
  }
  return data.map(d => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n  ');
}

function renderPage(req, route, opts = {}) {
  const base = baseUrl(req);
  const url = base + (route.path === '/' ? '/' : route.path);
  let html = template();

  // ---- <head>: title, description, canonical, social tags, structured data
  const head = [
    `<meta name="description" content="${esc(route.description)}">`,
    opts.notFound ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:site_name" content="${esc(SITE.SITE_NAME)}">`,
    `<meta property="og:type" content="${route.post ? 'article' : 'website'}">`,
    `<meta property="og:title" content="${esc(route.title)}">`,
    `<meta property="og:description" content="${esc(route.description)}">`,
    opts.notFound ? '' : `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(base)}/images/AMS_Solver.png">`,
    '<meta name="twitter:card" content="summary">',
    opts.notFound ? '' : structuredData(route, url, base)
  ].filter(Boolean).join('\n  ');
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>\n  ${head}`);

  // ---- keep ONLY this page's section in the HTML (other pages' content is not sent)
  const active = SECTION_IDS[route.section] || 'sectionHome';
  const tpl = html;
  Object.values(SECTION_IDS).forEach(id => {
    if (id === active) html = setHidden(html, id, false);
    else html = removeElement(html, id, 'section');
  });

  // one visible <h1> per page: the home heading becomes <h2> when another section is shown
  if (active !== 'sectionHome') {
    html = html.replace('<h1 class="main-heading" id="dynamicCalcHeading">', '<h2 class="main-heading" id="dynamicCalcHeading">')
      .replace(/(<h2 class="main-heading" id="dynamicCalcHeading">[^<]*)<\/h1>/, '$1</h2>');
    if (active === 'sectionAbout' || (active === 'sectionBlog' && !route.post)) {
      const secStart = html.indexOf(`id="${active}"`);
      const i = html.indexOf('<h2 class="page-title">', secStart);
      if (i !== -1) {
        const j = html.indexOf('</h2>', i);
        html = html.slice(0, i) + '<h1 class="page-title">' + html.slice(i + 23, j) + '</h1>' + html.slice(j + 5);
      }
    }
  }

  // ---- calculator pages: heading, description and input panel
  if (route.calc) {
    const t = CALC_TEXT[route.calc];
    html = html.replace(/(<h1 class="main-heading" id="dynamicCalcHeading">)[^<]*(<\/h1>)/, `$1${t.h1}$2`)
      .replace(/(<p class="sub-heading" id="dynamicCalcSubheading">)[^<]*(<\/p>)/, `$1${t.sub}$2`)
      .replace(/(<span class="active-mode-pill" id="currentModeLabel">)[\s\S]*?(<\/span>)/, `$1${t.pill}$2`);
    ['expressionInputs', 'proportionInputs', 'ageInputs', 'acdcInputs'].forEach(id => { html = setHidden(html, id, id !== t.panel); });
    // only this calculator's description + how-to + FAQs (no text from the other calculators)
    const wr = elementRange(html, 'calcDescriptions');
    if (wr) {
      const openTag = html.slice(wr[0], html.indexOf('>', wr[0]) + 1);
      html = html.slice(0, wr[0]) + openTag + calculatorContentHtml(route.calc, tpl) + '\n        </div>' + html.slice(wr[1]);
    }
  }

  // ---- nav: highlight the current page
  html = html.replace(/(<a href="[^"]*" class="nav-link)( active)?( nav-link-action" data-target="(\w+)")/g, (all, a, act, b, target) => {
    const isActive = (target === route.section && route.section !== 'home') || (route.section === 'home' && target === 'home' && route.calc === 'expression');
    return a + (isActive ? ' active' : '') + b;
  });

  // ---- blog article pages: article content in the HTML
  if (route.post && BLOG[route.post]) {
    html = removeElement(html, 'blogListPage');
    html = setHidden(html, 'blogReaderPage', false);
    html = html.replace('<div id="blogArticleContent"></div>', `<div id="blogArticleContent" data-post="${route.post}">${articleHtml(BLOG[route.post])}</div>`);
  } else if (route.section === 'blog') {
    html = removeElement(html, 'blogReaderPage');
  }

  // ---- 404 page
  if (opts.notFound) {
    html = html.replace(/(<h[12] class="main-heading" id="dynamicCalcHeading">)[^<]*(<\/h[12]>)/, '$1Page not found (404)$2')
      .replace(/(<p class="sub-heading" id="dynamicCalcSubheading">)[^<]*(<\/p>)/, '$1Sorry, that page does not exist. You can use the solver below or go back to the <a href="/">home page</a>.$2');
  }

  // tell the browser script which page this is
  html = html.replace('<body>', `<body data-route="${esc(route.path)}"${opts.notFound ? ' data-not-found="1"' : ''}>`);
  return html;
}

function robotsTxt(req) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${baseUrl(req)}/sitemap.xml`,
    ''
  ].join('\n');
}

function sitemapXml(req) {
  const base = baseUrl(req);
  const urls = SITE.ROUTES.map(r => `  <url>
    <loc>${esc(base + (r.path === '/' ? '/' : r.path))}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>${r.changefreq || 'monthly'}</changefreq>
    <priority>${r.priority || '0.5'}</priority>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// Express handler for all page URLs
function pageHandler(req, res) {
  let p = req.path;
  // redirects: trailing slash, upper case, aliases
  if (p.length > 1 && p.endsWith('/')) return res.redirect(301, p.replace(/\/+$/, '') + (req.url.slice(req.path.length) || ''));
  if (p !== p.toLowerCase() && SITE.findRoute(p.toLowerCase())) return res.redirect(301, p.toLowerCase());
  if (SITE.REDIRECTS[p]) return res.redirect(301, SITE.REDIRECTS[p]);

  const route = SITE.findRoute(p);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  if (!route) {
    const notFound = { path: p, section: 'home', calc: 'expression', title: 'Page not found | All Math Solver', description: 'This page does not exist.' };
    return res.status(404).send(renderPage(req, notFound, { notFound: true }));
  }
  res.send(renderPage(req, route));
}

module.exports = { pageHandler, robotsTxt, sitemapXml, renderPage, baseUrl };
