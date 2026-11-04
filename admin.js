// ═══════════════════════════════════════════
//  SHUI THREAD — Seller back office auth
//  One shared password (ADMIN_PASSWORD). A signed, HttpOnly cookie keeps the
//  session; changing the password invalidates every session.
// ═══════════════════════════════════════════
const crypto = require('crypto');

const COOKIE = 'shui_admin';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const MAX_FAILS = 10;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const fails = new Map(); // Best effort: per serverless instance.

function sign(exp) {
  return crypto.createHmac('sha256', process.env.ADMIN_PASSWORD).update(`shui-admin:${exp}`).digest('base64url');
}

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

function isAdmin(req) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const [exp, sig] = readCookie(req, COOKIE).split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, sign(exp));
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: '请先登录' });
  next();
}

function clientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

async function adminLogin(req, res) {
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: '后台未配置' });
  const key = clientKey(req);
  const now = Date.now();
  const rec = fails.get(key);
  if (rec && now - rec.first > FAIL_WINDOW_MS) fails.delete(key);
  if (fails.get(key)?.count >= MAX_FAILS) return res.status(429).json({ error: '尝试次数过多，请 15 分钟后再试' });

  if (!safeEqual(req.body?.password || '', process.env.ADMIN_PASSWORD)) {
    const r = fails.get(key) || { count: 0, first: now };
    r.count += 1;
    fails.set(key, r);
    await new Promise(done => setTimeout(done, 400));
    return res.status(401).json({ error: '密码不正确' });
  }
  fails.delete(key);
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  res.setHeader('Set-Cookie', `${COOKIE}=${exp}.${sign(exp)}; Max-Age=${SESSION_SECONDS}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict`);
  res.json({ ok: true });
}

function adminLogout(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; Path=/api/admin; HttpOnly; Secure; SameSite=Strict`);
  res.json({ ok: true });
}

module.exports = { adminLogin, adminLogout, requireAdmin, isAdmin };
