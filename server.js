'use strict';
/*
 * Airplane Merge do Alex — servidor
 * Sem dependências: usa apenas módulos nativos do Node (http, sqlite, crypto).
 * Rodar:  node server.js   (Node 22.13 ou mais novo)
 *
 * Serve a pasta docs/ (o site) e guarda as contas num banco SQLite.
 * O site publicado no GitHub Pages não usa este servidor: lá as contas ficam
 * em cada aparelho. Quem avisa o site de que o servidor existe é /js/modo.js.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'docs'); // a mesma pasta que o GitHub Pages publica
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
// Cabeçalho em que a hospedagem informa o IP real do visitante (ex.: fly-client-ip, cf-connecting-ip).
const CLIENT_IP_HEADER = String(process.env.CLIENT_IP_HEADER || '').toLowerCase();

const MAX_LEVEL = 100;
const SLOT_COUNT = 16;
const SESSION_MS = 30 * 24 * 3600 * 1000;
const MAX_BODY = 64 * 1024;
const USER_RE = /^[A-Za-z0-9_-]{3,16}$/;

// ---------------------------------------------------------------- banco de dados
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'jogo.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    save TEXT,
    saved_at INTEGER,
    epoch INTEGER NOT NULL DEFAULT 0,
    best INTEGER NOT NULL DEFAULT 1,
    total REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_rank ON users(best DESC, total DESC);
`);

const q = {
  userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  addUser: db.prepare('INSERT INTO users (username, pass_hash, salt, created_at) VALUES (?, ?, ?, ?)'),
  addSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
  session: db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?'),
  delSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
  bumpEpoch: db.prepare('UPDATE users SET epoch = epoch + 1 WHERE id = ?'),
  save: db.prepare('UPDATE users SET save = ?, saved_at = ?, best = ?, total = ? WHERE id = ? AND epoch = ?'),
  top: db.prepare('SELECT username, best, total FROM users WHERE save IS NOT NULL ORDER BY best DESC, total DESC, id ASC LIMIT 20'),
  rank: db.prepare('SELECT COUNT(*) AS n FROM users WHERE save IS NOT NULL AND (best > ? OR (best = ? AND total > ?))'),
};

// ---------------------------------------------------------------- utilidades
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
    "connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
};

function send(res, status, body, headers = {}) {
  const data = Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...headers,
  });
  res.end(data);
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status, expose: true });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooBig = false;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        tooBig = true;
        chunks.length = 0;
        if (size > MAX_BODY * 16) req.destroy();
      } else if (!tooBig) chunks.push(c);
    });
    req.on('end', () => {
      if (tooBig) return reject(httpError(413, 'Dados grandes demais.'));
      try {
        const data = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
        if (!data || typeof data !== 'object') throw new Error('formato');
        resolve(data);
      } catch {
        reject(httpError(400, 'Dados inválidos.'));
      }
    });
    req.on('error', reject);
  });
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const scrypt = (password, salt) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));
const DUMMY_SALT = crypto.randomBytes(16).toString('hex');

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function sessionCookie(req, value, maxAgeSec) {
  const secure = isHttps(req) || req.headers['x-forwarded-proto'] === 'https';
  return `sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}

function startSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  q.addSession.run(sha256(token), userId, Date.now() + SESSION_MS);
  res.setHeader('Set-Cookie', sessionCookie(req, token, Math.floor(SESSION_MS / 1000)));
}

function currentUser(req) {
  const token = parseCookies(req).sid;
  if (!token || token.length > 128) return null;
  const row = q.session.get(sha256(token));
  if (!row || row.expires_at < Date.now()) return null;
  return q.userById.get(row.user_id) || null;
}

function clientIp(req) {
  if (TRUST_PROXY) {
    const direct = CLIENT_IP_HEADER && String(req.headers[CLIENT_IP_HEADER] || '').trim();
    if (direct) return direct.slice(0, 64);
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd.slice(0, 64);
  }
  return req.socket.remoteAddress || '?';
}

function isHttps(req) {
  return !!req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === req.headers.host || host === req.headers['x-forwarded-host'];
  } catch {
    return false;
  }
}

// limite simples de tentativas (em memória)
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) {
    b = { n: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.n += 1;
  return b.n > max;
}
// só consulta, sem contar (para limites que contam apenas as falhas)
function blocked(key, max) {
  const b = buckets.get(key);
  return !!b && b.reset >= Date.now() && b.n >= max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  q.purgeSessions.run(now);
}, 10 * 60 * 1000).unref();
q.purgeSessions.run(Date.now());

// ---------------------------------------------------------------- validação do save
function sanitizeSave(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  const num = (x, max = 1e300) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(x, max) : 0);
  const int = (x, min, max) => {
    const n = Math.floor(Number(x));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  };
  const out = {
    v: 1,
    coins: num(s.coins),
    total: num(s.total),
    best: int(s.best, 1, MAX_LEVEL),
    slots: [],
    bought: {},
    up: {},
    boostUntil: num(s.boostUntil, 1e14),
    boostReady: num(s.boostReady, 1e14),
    tut: !!s.tut,
  };
  const slots = Array.isArray(s.slots) ? s.slots : [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const p = slots[i];
    if (p && typeof p === 'object' && p.c != null) {
      out.slots.push({ c: int(p.c, 1, MAX_LEVEL) });
    } else if (p && typeof p === 'object' && p.l != null) {
      const l = int(p.l, 1, MAX_LEVEL);
      out.best = Math.max(out.best, l);
      out.slots.push({ l, f: p.f ? 1 : 0, t: Math.min(0.999, num(p.t, 1)), n: int(p.n, 0, 2) });
    } else {
      out.slots.push(null);
    }
  }
  if (s.bought && typeof s.bought === 'object') {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const n = int(s.bought[l], 0, 1e6);
      if (n) out.bought[l] = n;
    }
  }
  for (const k of ['income', 'offline', 'crate', 'discount']) out.up[k] = int(s.up && s.up[k], 0, 100);
  return out;
}

// ---------------------------------------------------------------- API
async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const ip = clientIp(req);
  if (req.method === 'POST' && !sameOrigin(req)) return send(res, 403, { error: 'Origem inválida.' });

  switch (route) {
    case 'GET /api/me': {
      const u = currentUser(req);
      if (!u) return send(res, 401, { error: 'Não autenticado.' });
      return send(res, 200, { user: { name: u.username } });
    }

    case 'POST /api/register': {
      if (limited('auth:' + ip, 30, 10 * 60 * 1000)) return send(res, 429, { error: 'Muitas tentativas. Aguarde alguns minutos.' });
      const { username, password } = await readJson(req);
      if (typeof username !== 'string' || !USER_RE.test(username)) {
        return send(res, 400, { error: 'O nome deve ter de 3 a 16 caracteres (letras, números, _ e -).' });
      }
      if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
        return send(res, 400, { error: 'A senha deve ter pelo menos 6 caracteres.' });
      }
      if (q.userByName.get(username)) return send(res, 409, { error: 'Esse nome já está em uso.' });
      if (limited('reg:' + ip, 10, 60 * 60 * 1000)) {
        return send(res, 429, { error: 'Muitas contas criadas daqui. Tente de novo mais tarde.' });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = (await scrypt(password, salt)).toString('hex');
      let id;
      try {
        id = Number(q.addUser.run(username, hash, salt, Date.now()).lastInsertRowid);
      } catch (e) {
        if (String(e && e.message).includes('UNIQUE')) return send(res, 409, { error: 'Esse nome já está em uso.' });
        throw e;
      }
      startSession(req, res, id);
      return send(res, 201, { user: { name: username } });
    }

    case 'POST /api/login': {
      if (limited('auth:' + ip, 30, 10 * 60 * 1000)) return send(res, 429, { error: 'Muitas tentativas. Aguarde alguns minutos.' });
      const { username, password } = await readJson(req);
      if (typeof username !== 'string' || typeof password !== 'string' || password.length > 100) {
        return send(res, 400, { error: 'Informe usuário e senha.' });
      }
      const failKey = 'fail:' + username.slice(0, 16).toLowerCase();
      if (blocked(failKey, 20)) return send(res, 429, { error: 'Muitas tentativas nesta conta. Aguarde alguns minutos.' });
      const u = USER_RE.test(username) ? q.userByName.get(username) : null;
      const hash = await scrypt(password, u ? u.salt : DUMMY_SALT);
      if (!u || !crypto.timingSafeEqual(hash, Buffer.from(u.pass_hash, 'hex'))) {
        limited(failKey, 20, 15 * 60 * 1000);
        return send(res, 401, { error: 'Usuário ou senha incorretos.' });
      }
      startSession(req, res, u.id);
      return send(res, 200, { user: { name: u.username } });
    }

    case 'POST /api/logout': {
      const token = parseCookies(req).sid;
      if (token) q.delSession.run(sha256(token));
      res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
      return send(res, 200, { ok: true });
    }

    case 'POST /api/load': {
      const u = currentUser(req);
      if (!u) return send(res, 401, { error: 'Não autenticado.' });
      q.bumpEpoch.run(u.id);
      let save = null;
      try { save = u.save ? JSON.parse(u.save) : null; } catch { save = null; }
      return send(res, 200, {
        user: { name: u.username },
        save,
        savedAt: u.saved_at,
        now: Date.now(),
        epoch: u.epoch + 1,
      });
    }

    case 'POST /api/save': {
      const u = currentUser(req);
      if (!u) return send(res, 401, { error: 'Não autenticado.' });
      if (limited('save:' + u.id, 90, 60 * 1000)) return send(res, 429, { error: 'Muitos salvamentos.' });
      const body = await readJson(req);
      const save = sanitizeSave(body.save);
      if (!save) return send(res, 400, { error: 'Save inválido.' });
      if (body.epoch !== u.epoch) return send(res, 409, { error: 'O jogo foi aberto em outro aparelho.' });
      q.save.run(JSON.stringify(save), Date.now(), save.best, save.total, u.id, u.epoch);
      return send(res, 200, { ok: true, now: Date.now() });
    }

    case 'GET /api/ranking': {
      const u = currentUser(req);
      if (!u) return send(res, 401, { error: 'Não autenticado.' });
      const top = q.top.all().map((r) => ({ name: r.username, best: r.best, total: r.total }));
      const me = u.save
        ? { name: u.username, best: u.best, total: u.total, rank: q.rank.get(u.best, u.best, u.total).n + 1 }
        : null;
      return send(res, 200, { top, me });
    }

    default:
      return send(res, 404, { error: 'Não encontrado.' });
  }
}

// ---------------------------------------------------------------- arquivos estáticos
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

// versões comprimidas dos arquivos de texto, guardadas em memória
const gzCache = new Map();
function gzipped(file, etag, cb) {
  const hit = gzCache.get(file);
  if (hit && hit.etag === etag) return cb(null, hit.data);
  fs.readFile(file, (err, raw) => {
    if (err) return cb(err);
    zlib.gzip(raw, { level: 9 }, (err2, data) => {
      if (err2) return cb(err2);
      gzCache.set(file, { etag, data });
      cb(null, data);
    });
  });
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Método não permitido.' });
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: 'Endereço inválido.' }); }
  if (rel === '/') rel = '/index.html';
  if (rel === '/js/modo.js') { // avisa o site de que aqui as contas ficam no servidor
    return send(res, 200, req.method === 'HEAD' ? '' : 'export const SERVIDOR = true;\n', { 'Content-Type': MIME['.js'] });
  }
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 404, { error: 'Não encontrado.' });
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, { error: 'Não encontrado.' });
    const etag = `W/"${stat.size}-${Math.round(stat.mtimeMs)}"`;
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
      ETag: etag,
      Vary: 'Accept-Encoding',
      ...SECURITY_HEADERS,
    };
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }
    const plain = () => {
      res.writeHead(200, { ...headers, 'Content-Length': stat.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    };
    const compressible = !type.startsWith('image/png') && !type.startsWith('image/x-icon') && stat.size > 600 && stat.size < 2e6;
    if (!compressible || !/\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) return plain();
    gzipped(file, etag, (gzErr, data) => {
      if (gzErr) return plain();
      res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}

// ---------------------------------------------------------------- servidor
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    if (url.pathname === '/healthz') {
      db.prepare('SELECT 1').get();
      return send(res, 200, 'ok', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (e) {
    if (e && e.expose) return send(res, e.status, { error: e.message });
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'Erro interno do servidor.' });
    else res.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log('\n  ✈  Airplane Merge do Alex está no ar!\n');
  console.log(`  Neste computador:  http://localhost:${PORT}`);
  if (HOST === '0.0.0.0') {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const net of list || []) {
        if (net.family === 'IPv4' && !net.internal) console.log(`  No celular (mesmo Wi-Fi):  http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('');
});

// desligamento limpo: para de aceitar conexões, fecha o banco e sai
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  const finish = () => {
    try { db.close(); } catch { /* já fechado */ }
    process.exit(0);
  };
  server.close(finish);
  server.closeIdleConnections();
  setTimeout(finish, 1500).unref();
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, shutdown);
