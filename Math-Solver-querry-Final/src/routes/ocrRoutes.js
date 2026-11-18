'use strict';
/* POST /api/ocr  { image: "data:image/jpeg;base64,..." }  ->  { success, text }
 * Reads a cropped photo of a maths question with Claude (vision) and returns the question as
 * text/LaTeX for the solver. Works only when the server has ANTHROPIC_API_KEY set and the
 * @anthropic-ai/sdk package installed; otherwise it answers 503 { available: false } and the
 * page falls back to the in-browser reader (Tesseract).
 */
const express = require('express');

const router = express.Router();
const MODEL = process.env.OCR_MODEL || 'claude-opus-5-5';
const MAX_BYTES = 5 * 1024 * 1024;

let client = null;
function getClient() {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const mod = require('@anthropic-ai/sdk');
    const Anthropic = mod.default || mod;
    client = new Anthropic({ timeout: 45000, maxRetries: 1 });
  } catch (e) {
    console.warn('[ocr] @anthropic-ai/sdk is not installed:', e.message);
    return null;
  }
  return client;
}

// simple per-IP limit so the paid reader can't be abused: 15 photos per 10 minutes
const hits = new Map();
function allowed(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  if (list.length >= 15) { hits.set(ip, list); return false; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < win)) hits.delete(k);
  return true;
}

const SYSTEM = `You transcribe photos of maths questions for a step-by-step maths solver.
Output only the question exactly as written in the image, with no solution, no commentary and no quotation marks.
Keep the instruction words (Solve, Find, Simplify, Differentiate, Prove, ...) as plain English words.
Write all mathematics in LaTeX: \\frac{a}{b}, x^{2}, \\sqrt{x}, \\sqrt[3]{x}, \\sin x, \\log_{2} x, \\int_{a}^{b} f(x)\\,dx, \\sum_{k=1}^{n}, \\lim_{x \\to a}, \\begin{pmatrix} ... \\end{pmatrix}, \\pi, \\theta, \\le, \\ge.
Write a system of equations on one line, separated by commas.
Handwriting is welcome: read it carefully and use the context of the question to resolve unclear symbols.
If the photo shows several questions, transcribe only the most complete, central one.
If there is no readable maths question in the image, output exactly NO_QUESTION.`;

router.get('/', (req, res) => res.json({ available: !!getClient() }));

router.post('/', express.json({ limit: '7mb' }), async (req, res) => {
  const c = getClient();
  if (!c) return res.status(503).json({ success: false, available: false, error: 'The photo reader is not set up on this server.' });
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  if (!allowed(ip)) return res.status(429).json({ success: false, error: 'Too many photos in a short time. Please wait a few minutes.' });

  const m = String((req.body && req.body.image) || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return res.status(400).json({ success: false, error: 'Please send a JPEG, PNG or WebP image.' });
  if (m[2].length * 0.75 > MAX_BYTES) return res.status(413).json({ success: false, error: 'The photo is too large.' });

  try {
    const response = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          { type: 'text', text: 'Transcribe the maths question in this photo.' }
        ]
      }]
    });
    if (response.stop_reason === 'refusal') return res.status(422).json({ success: false, error: 'This photo could not be read.' });
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text || /^NO_QUESTION\b/.test(text)) return res.status(422).json({ success: false, error: 'No maths question was found in the photo.' });
    return res.json({ success: true, text: text.slice(0, 2000) });
  } catch (err) {
    console.warn('[ocr] request failed:', err && (err.status || ''), err && err.message);
    const status = err && err.status === 429 ? 503 : 502;
    return res.status(status).json({ success: false, error: 'The photo reader is busy. Please try again.' });
  }
});

module.exports = router;
