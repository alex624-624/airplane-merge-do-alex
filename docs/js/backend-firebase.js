// Contas e progresso no Firebase (Authentication + Firestore), usando só fetch.
//
// - O nome de usuário vira um e-mail interno (nome@DOMINIO) só para o Firebase aceitar o login.
// - saves/{uid}   → progresso de cada jogador (só o dono lê e grava).
// - ranking/{uid} → nome, melhor avião e total (qualquer jogador logado lê).
// As regras que garantem isso estão em firestore.rules.

const DOMAIN = 'pilotos.example.com'; // precisa ser igual ao de firestore.rules
const KEY = 'amda_sessao';
const RANK_EVERY = 5 * 60 * 1000;
const EXPIRED = 'Sua sessão expirou. Entre de novo.';

const AUTH_ERRORS = {
  EMAIL_EXISTS: [409, 'Esse nome já está em uso.'],
  INVALID_LOGIN_CREDENTIALS: [401, 'Usuário ou senha incorretos.'],
  EMAIL_NOT_FOUND: [401, 'Usuário ou senha incorretos.'],
  INVALID_PASSWORD: [401, 'Usuário ou senha incorretos.'],
  INVALID_EMAIL: [400, 'Esse nome não pode ser usado.'],
  WEAK_PASSWORD: [400, 'A senha deve ter pelo menos 6 caracteres.'],
  TOO_MANY_ATTEMPTS_TRY_LATER: [429, 'Muitas tentativas. Aguarde alguns minutos.'],
  USER_DISABLED: [403, 'Esta conta foi desativada.'],
  OPERATION_NOT_ALLOWED: [500, 'O login por senha ainda não foi ativado no Firebase.'],
  PASSWORD_LOGIN_DISABLED: [500, 'O login por senha ainda não foi ativado no Firebase.'],
  CONFIGURATION_NOT_FOUND: [500, 'A autenticação ainda não foi ativada no Firebase.'],
};

function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function request(url, { method = 'GET', token, json, form } = {}) {
  const headers = {};
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(form).toString();
  }
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch {
    throw fail(0, 'Sem conexão com a internet.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* resposta sem JSON */ }
  const err = (Array.isArray(data) ? data[0] && data[0].error : data && data.error) || null;
  // Firestore manda o código em "status"; a autenticação manda em "message" ("CODIGO : detalhe").
  const code = err ? String(err.status || err.message || '').split(/[\s:]/)[0] : '';
  const authCode = err ? String(err.message || '').split(/[\s:]/)[0] : '';
  return { ok: res.ok, status: res.status, data, code, authCode };
}

function problem(r) {
  if (r.status === 429 || r.code === 'RESOURCE_EXHAUSTED') {
    return fail(429, 'O limite gratuito de hoje do Firebase acabou. Tente de novo amanhã.');
  }
  if (r.status === 403) return fail(403, 'O Firebase recusou o acesso. Confira as regras do banco.');
  return fail(r.status || 500, `Algo deu errado (${r.code || r.status}). Tente de novo.`);
}

// o registro mudou desde a última vez que o vimos
const stale = (r) => r.status === 409 || ['FAILED_PRECONDITION', 'ABORTED', 'ALREADY_EXISTS', 'NOT_FOUND'].includes(r.code);

const text = (v) => ({ stringValue: String(v) });
const whole = (v) => ({ integerValue: String(Math.round(v)) });
const real = (v) => ({ doubleValue: v });
const numberOf = (f) => (f ? Number(f.integerValue ?? f.doubleValue ?? 0) || 0 : 0);
const stringOf = (f) => (f && typeof f.stringValue === 'string' ? f.stringValue : '');

function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && s.uid && s.refresh && s.name ? s : null;
  } catch {
    return null;
  }
}

export function firebaseApi(cfg) {
  const hosts = cfg.hosts || {};
  const AUTH = hosts.auth || 'https://identitytoolkit.googleapis.com/v1';
  const TOKEN = hosts.token || 'https://securetoken.googleapis.com/v1/token';
  const DOCS = `${hosts.store || 'https://firestore.googleapis.com/v1'}/projects/${cfg.projectId}/databases/(default)/documents`;
  const apiKey = encodeURIComponent(cfg.apiKey);
  // identifica esta aba: é assim que sabemos se um save "inesperado" foi nosso ou de outro aparelho
  const SID = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

  let sess = readSession();
  let token = null;
  let tokenExp = 0;
  let refreshing = null;
  let lastUpd = null;   // horário (do Firebase) da última gravação conhecida em saves/{uid}
  let skew = 0;         // relógio do Firebase menos o relógio deste aparelho
  let lastSave = null;
  let rankAt = 0;
  let rankBest = 0;
  let rankBusy = null;

  function persist() {
    try {
      if (sess) localStorage.setItem(KEY, JSON.stringify(sess));
      else localStorage.removeItem(KEY);
    } catch { /* sem armazenamento: a sessão dura só até fechar a aba */ }
  }

  function signOut() {
    sess = null;
    token = null;
    tokenExp = 0;
    lastUpd = null;
    lastSave = null;
    rankAt = 0;
    persist();
  }

  function signedIn(data, name) {
    sess = { uid: data.localId, name, refresh: data.refreshToken };
    token = data.idToken;
    tokenExp = Date.now() + (Number(data.expiresIn) || 3600) * 1000;
    persist();
    return { user: { name } };
  }

  async function authCall(action, username, password) {
    const r = await request(`${AUTH}/accounts:${action}?key=${apiKey}`, {
      method: 'POST',
      json: { email: `${username.toLowerCase()}@${DOMAIN}`, password, returnSecureToken: true },
    });
    if (r.ok && r.data && r.data.idToken) return signedIn(r.data, username);
    const known = AUTH_ERRORS[r.authCode];
    throw known ? fail(known[0], known[1]) : fail(r.status || 500, `Algo deu errado (${r.authCode || r.status}). Tente de novo.`);
  }

  async function refresh() {
    const r = await request(`${TOKEN}?key=${apiKey}`, {
      method: 'POST',
      form: { grant_type: 'refresh_token', refresh_token: sess.refresh },
    });
    if (!r.ok || !r.data || !r.data.id_token) {
      if (r.status >= 400 && r.status < 500 && r.status !== 429) {
        signOut(); // conta apagada, desativada ou sessão revogada
        throw fail(401, EXPIRED);
      }
      throw problem(r);
    }
    token = r.data.id_token;
    tokenExp = Date.now() + (Number(r.data.expires_in) || 3600) * 1000;
    if (sess && r.data.refresh_token && r.data.refresh_token !== sess.refresh) {
      sess.refresh = r.data.refresh_token;
      persist();
    }
    return token;
  }

  async function idToken() {
    if (!sess) throw fail(401, 'Não autenticado.');
    if (token && Date.now() < tokenExp - 60000) return token;
    if (!refreshing) refreshing = refresh().finally(() => { refreshing = null; });
    return refreshing;
  }

  // chamada ao Firestore já com o login; renova o login uma vez se ele foi recusado
  async function store(method, path, json, retry = true) {
    const r = await request(DOCS + path, { method, token: await idToken(), json });
    if (r.status !== 401) return r;
    token = null;
    if (retry) return store(method, path, json, false);
    throw fail(401, EXPIRED);
  }

  const savePath = () => `/saves/${sess.uid}`;
  const after = (upd) => `currentDocument.updateTime=${encodeURIComponent(upd)}`;
  const saveFields = (json, at) => ({ name: text(sess.name), save: text(json), sess: text(SID), at: whole(at) });

  function opened(doc, save, savedAt) {
    lastUpd = doc.updateTime;
    const serverNow = Date.parse(doc.updateTime) || Date.now();
    skew = serverNow - Date.now();
    rankAt = 0;
    return { user: { name: sess.name }, save, savedAt, now: serverNow, epoch: lastUpd };
  }

  // Abre o jogo: lê o progresso e marca o registro como "em uso por esta aba".
  // Essa gravação invalida qualquer outra aba/aparelho que estivesse com o jogo aberto.
  async function load() {
    for (let attempt = 0; attempt < 4; attempt++) {
      const got = await store('GET', savePath());
      if (got.status === 404) {
        const made = await store('PATCH', `${savePath()}?currentDocument.exists=false`, { fields: saveFields('', 0) });
        if (made.ok) return opened(made.data, null, null);
        if (stale(made)) continue;
        throw problem(made);
      }
      if (!got.ok) throw problem(got);
      const f = got.data.fields || {};
      const stored = stringOf(f.name);
      if (stored && stored !== sess.name && stored.toLowerCase() === sess.name.toLowerCase()) {
        sess.name = stored; // mantém maiúsculas/minúsculas como no cadastro
        persist();
      }
      const claim = await store('PATCH', `${savePath()}?updateMask.fieldPaths=sess&${after(got.data.updateTime)}`, { fields: { sess: text(SID) } });
      if (claim.ok) {
        let save = null;
        try { save = stringOf(f.save) ? JSON.parse(stringOf(f.save)) : null; } catch { save = null; }
        return opened(claim.data, save, numberOf(f.at) || null);
      }
      if (stale(claim)) continue;
      throw problem(claim);
    }
    throw fail(503, 'Não foi possível abrir o jogo. Tente de novo.');
  }

  function pushRank(data, force) {
    const best = Math.round(Number(data.best)) || 1;
    if (!force && best === rankBest && Date.now() - rankAt < RANK_EVERY) return rankBusy || Promise.resolve();
    const total = Math.max(0, Number(data.total) || 0);
    // ordena por melhor avião e, no empate, por total ganho — num número só
    const score = best + Math.min(0.999, Math.log10(total + 1) / 400);
    const fields = { name: text(sess.name), best: whole(best), total: real(total), score: real(score) };
    rankAt = Date.now();
    rankBest = best;
    rankBusy = store('PATCH', `/ranking/${sess.uid}`, { fields })
      .then((r) => { if (!r.ok) rankAt = 0; })
      .catch(() => { rankAt = 0; });
    return rankBusy;
  }

  async function save(_epoch, data) {
    if (!sess) throw fail(401, 'Não autenticado.');
    const json = JSON.stringify(data);
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await store('PATCH', `${savePath()}?${after(lastUpd)}`, { fields: saveFields(json, Date.now() + skew) });
      if (r.ok) {
        lastUpd = r.data.updateTime;
        lastSave = data;
        pushRank(data, false);
        return { ok: true, now: Date.parse(lastUpd) || Date.now(), epoch: lastUpd };
      }
      if (!stale(r)) throw problem(r);
      // O registro mudou sem a gente saber. Fomos nós (save enviado ao esconder a aba) ou outro aparelho?
      const got = await store('GET', savePath());
      if (!got.ok || stringOf(got.data.fields && got.data.fields.sess) !== SID) {
        lastSave = null; // esta aba ficou para trás: não mexe mais no ranking
        throw fail(409, 'O jogo foi aberto em outro aparelho.');
      }
      lastUpd = got.data.updateTime;
    }
    throw fail(503, 'Não foi possível salvar agora.');
  }

  // save "de despedida", quando a aba está sendo escondida ou fechada
  function beacon(_epoch, data) {
    if (!sess || !token || !lastUpd || Date.now() > tokenExp - 5000) return false;
    try {
      fetch(`${DOCS}${savePath()}?${after(lastUpd)}`, {
        method: 'PATCH',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ fields: saveFields(JSON.stringify(data), Date.now() + skew) }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((doc) => { if (doc && doc.updateTime) lastUpd = doc.updateTime; })
        .catch(() => {});
      lastSave = data;
      return true;
    } catch {
      return false;
    }
  }

  function rowOf(doc) {
    const f = doc.fields || {};
    return {
      uid: String(doc.name || '').split('/').pop(),
      name: stringOf(f.name) || '???',
      best: Math.min(40, Math.max(1, Math.round(numberOf(f.best)) || 1)),
      total: numberOf(f.total),
      score: numberOf(f.score),
    };
  }
  const publicRow = (r) => ({ name: r.name, best: r.best, total: r.total });

  async function ranking() {
    if (!sess) throw fail(401, 'Não autenticado.');
    if (rankBusy) await rankBusy;
    if (lastSave && Date.now() - rankAt > 15000) await pushRank(lastSave, true);
    const from = [{ collectionId: 'ranking' }];
    const q = await store('POST', ':runQuery', {
      structuredQuery: { from, orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: 20 },
    });
    if (!q.ok) throw problem(q);
    const rows = (Array.isArray(q.data) ? q.data : []).filter((x) => x && x.document).map((x) => rowOf(x.document));
    let me = null;
    const i = rows.findIndex((r) => r.uid === sess.uid);
    if (i >= 0) {
      me = { ...publicRow(rows[i]), rank: i + 1 };
    } else {
      const got = await store('GET', `/ranking/${sess.uid}`);
      if (got.ok) {
        const mine = rowOf(got.data);
        // quantos jogadores estão na frente
        const c = await store('POST', ':runAggregationQuery', {
          structuredAggregationQuery: {
            structuredQuery: {
              from,
              where: { fieldFilter: { field: { fieldPath: 'score' }, op: 'GREATER_THAN', value: real(mine.score) } },
            },
            aggregations: [{ alias: 'n', count: {} }],
          },
        });
        const n = c.ok && Array.isArray(c.data) && c.data[0] && c.data[0].result && c.data[0].result.aggregateFields;
        me = { ...publicRow(mine), rank: n ? numberOf(n.n) + 1 : null };
      }
    }
    return { top: rows.map(publicRow), me };
  }

  return {
    saveEvery: 30000, // o plano gratuito do Firebase tem limite diário de gravações
    async me() {
      if (!sess) throw fail(401, 'Não autenticado.');
      return { user: { name: sess.name } };
    },
    register: (username, password) => authCall('signUp', username, password),
    login: (username, password) => authCall('signInWithPassword', username, password),
    async logout() {
      signOut();
      return { ok: true };
    },
    load,
    save,
    beacon,
    ranking,
  };
}
