const express = require('express');
const path = require('path');
const solverRoutes = require('./src/routes/solverRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const authRoutes = require('./src/routes/authRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const { attachUser } = require('./src/config/security');
const seo = require('./src/seo/pages');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', true); // Render / Vercel sit behind a proxy: use the real protocol and host

// ---- One main domain: SITE_URL (e.g. https://allmathsolver.com) for canonical links,
// og:url, structured data, robots.txt and sitemap.xml; every other host -> 301 to it.
const domain = require('./src/seo/domain');
app.get('/healthz', (req, res) => res.type('text/plain').send('ok')); // for uptime monitors
app.use(domain.redirectToMainDomain);
app.use(express.json({ limit: '20kb' }));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// robots.txt and sitemap.xml (real files for search engines)
app.get('/robots.txt', (req, res) => {
  res.type('text/plain; charset=utf-8').send(seo.robotsTxt(req));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml; charset=utf-8').send(seo.sitemapXml(req));
});

// Private page for reading contact-form messages (password = ADMIN_TOKEN). Not indexed.
app.get('/admin/messages', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(__dirname, 'admin', 'messages.html'));
});

// The page template must not be served raw (duplicate of the home page)
app.get('/index.html', (req, res) => res.redirect(301, '/'));

// Static files (CSS, JS, images). index: false so "/" is rendered by the page handler below.
app.use(express.static(path.join(__dirname, 'public'), { index: false, redirect: false }));

// Reads the login token (if any) for every API request
app.use('/api', attachUser);
app.use('/api/solve', solverRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);

app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// Every page URL (/, /age-calculator, /blog/..., ...) gets its own server-rendered HTML.
// Unknown URLs return a real 404 page.
app.get('*', seo.pageHandler);

// Bad JSON bodies etc.
app.use((err, req, res, next) => {
  console.error('Request Error:', err.message);
  res.status(err.status || 500).json({ success: false, error: 'Invalid request.' });
});

// On Vercel the app is exported and Vercel runs it; locally we start a server.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 AllMath App Running at: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

module.exports = app;
