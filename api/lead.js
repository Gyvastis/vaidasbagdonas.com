const nodemailer = require('nodemailer');

const MAIL = 'info@vaidasbagdonas.com';
const LIMITS = { name: 100, contact: 120, website: 200, need: 60, message: 2000, utm: 200 };
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i;

const hits = new Map();

function rateLimited(ip, now) {
  const recent = (hits.get(ip) || []).filter(time => now - time < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) for (const [key, times] of hits) if (now - times.at(-1) >= RATE_WINDOW_MS) hits.delete(key);
  return recent.length > RATE_LIMIT;
}

const clean = (value, max) => (typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max + 1) : '');
const oneLine = value => value.replace(/\s+/g, ' ');
const isPhone = value => /^\+?[\d\s()-]{7,20}$/.test(value) && value.replace(/\D/g, '').length >= 7;

function validate(body) {
  const data = {};
  for (const key of ['name', 'contact', 'website', 'need', 'message']) data[key] = clean(body[key], LIMITS[key]);
  for (const key of UTM_KEYS) data[key] = clean(body[key], LIMITS.utm);
  for (const key of Object.keys(data)) if (data[key].length > (LIMITS[key] || LIMITS.utm)) return { error: `${key} too long` };
  data.name = oneLine(data.name);
  data.contact = oneLine(data.contact);
  data.website = oneLine(data.website);
  if (!data.name) return { error: 'name required' };
  if (!EMAIL.test(data.contact) && !isPhone(data.contact)) return { error: 'contact must be an email or a phone number' };
  if (data.message.length < 3) return { error: 'message required' };
  if (body.consent !== true && body.consent !== 'on' && body.consent !== 'true') return { error: 'consent required' };
  return { data };
}

function composeMail(data, now) {
  const lines = [
    `Vardas: ${data.name}`,
    `Kontaktas: ${data.contact}`,
    `Svetainė: ${data.website || '-'}`,
    `Ko reikia: ${data.need || '-'}`,
    `Laikas: ${new Date(now).toISOString()}`,
    ...UTM_KEYS.map(key => `${key}: ${data[key] || '-'}`),
    'Žinutė:',
    data.message,
  ];
  const mail = { from: MAIL, to: MAIL, subject: `[svetaine] Nauja užklausa: ${data.name}`, text: `${lines.join('\n')}\n` };
  if (EMAIL.test(data.contact)) mail.replyTo = data.contact;
  return mail;
}

function smtpTransport() {
  return nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: process.env.ZOHO_SMTP_USER, pass: process.env.ZOHO_SMTP_PASS },
  });
}

function createHandler(getTransport = smtpTransport) {
  return async function handler(req, res) {
    const reply = (status, body) => { res.setHeader('Cache-Control', 'no-store'); res.status(status).json(body); };
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(405, { ok: false, error: 'method not allowed' }); }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || typeof body !== 'object') return reply(400, { ok: false, error: 'invalid json' });
    if (clean(body.botcheck, 10)) return reply(200, { ok: true });

    const now = Date.now();
    const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (rateLimited(ip, now)) return reply(429, { ok: false, error: 'too many requests' });

    const { data, error } = validate(body);
    if (error) return reply(400, { ok: false, error });
    try {
      await getTransport().sendMail(composeMail(data, now));
    } catch (failure) {
      console.error('lead mail failed:', failure.code || failure.message);
      return reply(502, { ok: false, error: 'mail failed' });
    }
    return reply(200, { ok: true });
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
