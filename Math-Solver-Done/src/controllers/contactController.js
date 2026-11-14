// Contact form.
// Every message is saved in the site's database (so nothing is ever lost) and can be read at /admin/messages.
// Optional e-mail / chat notifications:
//   WEB3FORMS_ACCESS_KEY  - free key from web3forms.com (made with your e-mail address). The visitor's
//                           browser forwards the message to Web3Forms, which e-mails it to you.
//                           (Web3Forms' free plan only accepts browser-side submissions.)
//   CONTACT_WEBHOOK_URL   - optional Discord or Slack incoming-webhook URL: the server posts each new
//                           message there instantly.
//   ADMIN_TOKEN           - a long secret password that unlocks /admin/messages.

const crypto = require('crypto');
const db = require('../config/database');
const { isValidEmail, cleanName } = require('../config/security');

const WEB3FORMS_ACCESS_KEY = (process.env.WEB3FORMS_ACCESS_KEY || '').trim();
const CONTACT_WEBHOOK_URL = (process.env.CONTACT_WEBHOOK_URL || '').trim();
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();

const LIMITS = { name: 80, email: 120, subject: 120, message: 3000, minMessage: 10 };
const SUBJECTS = ['General question', 'Wrong answer / bug report', 'Feature request', 'Partnership', 'Other'];

// Max 5 messages per visitor (IP) per hour
const recent = new Map();
function rateLimited(ip) {
  const now = Date.now(), hour = 60 * 60 * 1000;
  const list = (recent.get(ip) || []).filter(t => now - t < hour);
  if (list.length >= 5) { recent.set(ip, list); return true; }
  list.push(now); recent.set(ip, list);
  if (recent.size > 5000) for (const [k, v] of recent) if (!v.some(t => now - t < hour)) recent.delete(k);
  return false;
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

async function notifyWebhook(m) {
  if (!CONTACT_WEBHOOK_URL) return false;
  const text = `New contact message on All Math Solver\nFrom: ${m.name} <${m.email}>\nSubject: ${m.subject}\n\n${m.message}`.slice(0, 1900);
  try {
    const res = await fetch(CONTACT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, text }), // "content" for Discord, "text" for Slack
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch (e) {
    console.error('[contact] webhook failed:', e.message);
    return false;
  }
}

exports.getConfig = (req, res) => {
  res.json({ success: true, web3formsKey: WEB3FORMS_ACCESS_KEY || null, subjects: SUBJECTS });
};

exports.submit = async (req, res) => {
  try {
    const body = req.body || {};
    // Honeypot: real visitors never fill the hidden "website" field
    if (clean(body.website, 200)) return res.json({ success: true, id: 'ok' });

    const name = cleanName(clean(body.name, LIMITS.name));
    const email = clean(body.email, LIMITS.email).toLowerCase();
    const subject = SUBJECTS.includes(body.subject) ? body.subject : 'General question';
    const message = clean(body.message, LIMITS.message);
    let page = clean(body.page, 200);
    if (!/^\/(?![\/\\])/.test(page)) page = ''; // only paths on this site

    if (!name) return res.status(400).json({ success: false, field: 'name', error: 'Please enter your name.' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, field: 'email', error: 'Please enter a valid email address so we can reply.' });
    if (message.length < LIMITS.minMessage) return res.status(400).json({ success: false, field: 'message', error: `Please write a little more (at least ${LIMITS.minMessage} characters).` });

    const ip = req.ip || 'unknown';
    if (rateLimited(ip)) return res.status(429).json({ success: false, error: 'You have sent several messages already. Please wait an hour and try again.' });

    const saved = await db.addMessage({ name, email, subject, message, page, userEmail: req.userEmail || null, status: 'new' });
    notifyWebhook(saved); // fire and forget: the visitor doesn't wait for it
    res.json({ success: true, id: saved.id });
  } catch (err) {
    console.error('[contact] save failed:', err.message);
    res.status(500).json({ success: false, error: 'Sorry, your message could not be sent right now. Please try again in a few minutes.' });
  }
};

// ---- admin: read / delete messages (needs ADMIN_TOKEN)
function isAdmin(req) {
  if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 12) return false;
  const given = String((req.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(ADMIN_TOKEN).digest();
  return crypto.timingSafeEqual(a, b);
}

exports.list = async (req, res) => {
  if (!ADMIN_TOKEN) return res.status(503).json({ success: false, error: 'Set the ADMIN_TOKEN environment variable (at least 12 characters) to read messages.' });
  if (!isAdmin(req)) return res.status(401).json({ success: false, error: 'Wrong admin password.' });
  res.json({ success: true, messages: await db.getMessages() });
};

exports.remove = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ success: false, error: 'Wrong admin password.' });
  res.json({ success: await db.deleteMessage(req.params.id) });
};
