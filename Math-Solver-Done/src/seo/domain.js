// Main-domain handling.
// SITE_URL (e.g. https://allmathsolver.com) is the one official address of the site.
// When it is set, requests for any other host (math-1-ks0v.onrender.com, www.allmathsolver.com,
// http://...) are permanently redirected (301) to the same path on SITE_URL, so Google only
// indexes the main domain. Local development (localhost) is never redirected.

function mainSite() {
  const raw = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return { url: raw, host: u.host.toLowerCase(), proto: u.protocol.replace(':', '') };
  } catch (e) {
    console.warn('[site] SITE_URL is not a valid URL:', raw);
    return null;
  }
}

function redirectToMainDomain(req, res, next) {
  const site = mainSite();
  if (!site || (req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/') || req.path === '/healthz') return next();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  if (!host || /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return next();
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  if (host !== site.host || (site.proto === 'https' && proto !== 'https')) {
    return res.redirect(301, site.url + (req.originalUrl || req.url));
  }
  next();
}

module.exports = { redirectToMainDomain, mainSite };
