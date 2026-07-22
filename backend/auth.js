// auth.js — email + password accounts, session held in an httpOnly cookie
// (a signed JWT). Nothing fancy: no email verification, no password reset
// flow yet — this is the minimum needed to let more than one person (and
// your phone) use the app with their own separate history.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    '\n⚠️  No JWT_SECRET set in .env — using an insecure default. ' +
    'Set JWT_SECRET to a long random string before you deploy this anywhere real.\n'
  );
}
const SECRET = JWT_SECRET || 'dev-only-insecure-secret-change-me';
const COOKIE_NAME = 'console_chat_session';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function signToken(user) {
  return jwt.sign({ uid: user.id, email: user.email }, SECRET, { expiresIn: '30d' });
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Only require HTTPS for the cookie once you're actually deployed
    // (NODE_ENV=production) — localhost during dev is http.
    secure: process.env.NODE_ENV === 'production',
    maxAge: THIRTY_DAYS_MS,
  });
}

// Attach req.user if a valid session cookie is present; otherwise 401.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not logged in.' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: payload.uid, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Your session expired — please log in again.' });
  }
}

function registerAuthRoutes(app) {
  app.post('/api/auth/signup', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(normalizedEmail, passwordHash);
    db.prepare('INSERT INTO conversations (user_id, data) VALUES (?, ?)').run(info.lastInsertRowid, '[]');

    const user = { id: info.lastInsertRowid, email: normalizedEmail };
    setSessionCookie(res, signToken(user));
    res.json({ user: { email: user.email } });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    setSessionCookie(res, signToken(row));
    res.json({ user: { email: row.email } });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return res.json({ user: null });
    try {
      const payload = jwt.verify(token, SECRET);
      res.json({ user: { email: payload.email } });
    } catch {
      res.json({ user: null });
    }
  });
}

module.exports = { requireAuth, registerAuthRoutes };
