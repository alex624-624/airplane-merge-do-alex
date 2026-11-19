// Contas guardadas no próprio aparelho (armazenamento do navegador).
// É o que o site publicado usa: ele não tem servidor, então cada aparelho tem as suas contas.
//
// A senha nunca é guardada: fica só um "embaralhado" dela (PBKDF2 com sal).
// Ela impede que outra pessoa entre na conta pelo jogo, mas quem mexe nas
// ferramentas do navegador consegue ver ou apagar os dados — não é um cofre.

const PREFIX = 'amda_conta:';
const CURRENT = 'amda_atual';
const USER_RE = /^[A-Za-z0-9_-]{3,16}$/;
const ROUNDS = 150000;

function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array(s.match(/../g).map((b) => parseInt(b, 16)));

async function scramble(password, salt) {
  if (!globalThis.crypto || !crypto.subtle) {
    throw fail(500, 'Este endereço não é seguro (https), então não dá para usar contas aqui.');
  }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: ROUNDS }, key, 256);
  return hex(new Uint8Array(bits));
}

// cada conta fica numa chave própria, para uma aba não atrapalhar a outra
function read(id) {
  try {
    const a = JSON.parse(localStorage.getItem(PREFIX + id));
    return a && a.name && a.hash && a.salt ? a : null;
  } catch {
    return null;
  }
}

function write(id, account) {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(account));
  } catch {
    throw fail(507, 'Este navegador não deixou salvar (modo anônimo ou sem espaço).');
  }
}

function everyone() {
  const list = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        const a = read(k.slice(PREFIX.length));
        if (a) list.push(a);
      }
    }
  } catch { /* sem armazenamento */ }
  return list;
}

function currentId() {
  try { return localStorage.getItem(CURRENT) || ''; } catch { return ''; }
}

function setCurrent(id) {
  try {
    if (id) localStorage.setItem(CURRENT, id);
    else localStorage.removeItem(CURRENT);
  } catch { /* sem armazenamento */ }
}

function signedIn() {
  const id = currentId();
  const account = id && read(id);
  if (!account) throw fail(401, 'Não autenticado.');
  return { id, account };
}

function enter(id, account) {
  setCurrent(id);
  // pede ao navegador para não apagar os dados sozinho (ele pode recusar)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch { /* sem suporte */ }
  return { user: { name: account.name } };
}

function store(epoch, save) {
  const { id, account } = signedIn();
  if (epoch !== account.epoch) throw fail(409, 'O jogo foi aberto em outra aba.');
  account.save = save;
  account.savedAt = Date.now();
  write(id, account);
  return { ok: true, now: account.savedAt };
}

const rankOf = (a) => ({ name: a.name, best: Math.round(Number(a.save && a.save.best)) || 1, total: Number(a.save && a.save.total) || 0 });

export const localApi = {
  local: true,
  saveEvery: 5000,

  async me() {
    return { user: { name: signedIn().account.name } };
  },

  async register(username, password) {
    if (!USER_RE.test(username)) throw fail(400, 'O nome deve ter de 3 a 16 caracteres (letras, números, _ e -).');
    if (typeof password !== 'string' || password.length < 6) throw fail(400, 'A senha deve ter pelo menos 6 caracteres.');
    const id = username.toLowerCase();
    if (read(id)) throw fail(409, 'Esse nome já está em uso neste aparelho.');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const account = { name: username, salt, hash: await scramble(password, salt), created: Date.now(), epoch: 0, save: null, savedAt: null };
    if (read(id)) throw fail(409, 'Esse nome já está em uso neste aparelho.');
    write(id, account);
    return enter(id, account);
  },

  async login(username, password) {
    const id = String(username).toLowerCase();
    const account = USER_RE.test(username) ? read(id) : null;
    const ok = !!account && (await scramble(String(password), account.salt)) === account.hash;
    if (!ok) {
      await new Promise((r) => setTimeout(r, 400)); // desanima quem fica chutando senha
      throw fail(401, 'Usuário ou senha incorretos.');
    }
    return enter(id, account);
  },

  async logout() {
    setCurrent('');
    return { ok: true };
  },

  // Abre o jogo. Trocar o "epoch" avisa as outras abas de que elas ficaram para trás.
  async load() {
    const { id, account } = signedIn();
    account.epoch = (Number(account.epoch) || 0) + 1;
    write(id, account);
    return { user: { name: account.name }, save: account.save || null, savedAt: account.savedAt || null, now: Date.now(), epoch: account.epoch };
  },

  async save(epoch, save) {
    return store(epoch, save);
  },

  // gravar aqui é instantâneo, então o save "de despedida" é um save comum
  beacon(epoch, save) {
    try {
      store(epoch, save);
      return true;
    } catch {
      return false;
    }
  },

  // ranking entre as contas deste aparelho
  async ranking() {
    const { account } = signedIn();
    const rows = everyone().map(rankOf) // todas as contas deste aparelho, mesmo as que mal jogaram
      .sort((a, b) => b.best - a.best || b.total - a.total || a.name.localeCompare(b.name));
    const i = rows.findIndex((r) => r.name === account.name);
    return { top: rows.slice(0, 20), me: i >= 0 ? { ...rows[i], rank: i + 1 } : null };
  },
};
