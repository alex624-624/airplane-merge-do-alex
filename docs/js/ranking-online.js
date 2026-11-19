// Ranking de todos os jogadores, guardado no Firebase (Firestore), usando só fetch.
//
// As contas e o progresso continuam no aparelho. Para a internet vai apenas uma linha
// por conta: nome, melhor avião e total ganho. Cada aparelho entra no Firebase de forma
// anônima (sem e-mail nem senha) só para poder gravar e ler essas linhas.

const SESSION = 'amda_fb';     // login anônimo deste aparelho
const SENT = 'amda_rank_sent'; // o que já foi enviado, para não repetir à toa
const AGAIN = 5 * 60 * 1000;

const text = (v) => ({ stringValue: String(v) });
const whole = (v) => ({ integerValue: String(Math.round(v)) });
const real = (v) => ({ doubleValue: v });
const numberOf = (f) => (f ? Number(f.integerValue ?? f.doubleValue ?? 0) || 0 : 0);
const stringOf = (f) => (f && typeof f.stringValue === 'string' ? f.stringValue : '');

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem armazenamento */ }
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
  const res = await fetch(url, { method, headers, body });
  let data = null;
  try { data = await res.json(); } catch { /* resposta sem JSON */ }
  return { ok: res.ok, status: res.status, data };
}

export function onlineRanking(cfg) {
  const hosts = cfg.hosts || {};
  const AUTH = hosts.auth || 'https://identitytoolkit.googleapis.com/v1';
  const TOKEN = hosts.token || 'https://securetoken.googleapis.com/v1/token';
  const DOCS = `${hosts.store || 'https://firestore.googleapis.com/v1'}/projects/${cfg.projectId}/databases/(default)/documents`;
  const apiKey = encodeURIComponent(cfg.apiKey);

  let sess = readJson(SESSION);
  if (!sess || !sess.uid || !sess.refresh) sess = null;
  let token = null;
  let tokenExp = 0;
  let entering = null;
  const sent = readJson(SENT) || {};

  async function enter() {
    if (sess) {
      const r = await request(`${TOKEN}?key=${apiKey}`, { method: 'POST', form: { grant_type: 'refresh_token', refresh_token: sess.refresh } });
      if (r.ok && r.data && r.data.id_token) {
        token = r.data.id_token;
        tokenExp = Date.now() + (Number(r.data.expires_in) || 3600) * 1000;
        return token;
      }
      if (r.status < 400 || r.status >= 500 || r.status === 429) throw new Error('ranking fora do ar');
      sess = null; // login antigo não vale mais: cria outro
    }
    const r = await request(`${AUTH}/accounts:signUp?key=${apiKey}`, { method: 'POST', json: { returnSecureToken: true } });
    if (!r.ok || !r.data || !r.data.idToken) throw new Error('ranking fora do ar');
    sess = { uid: r.data.localId, refresh: r.data.refreshToken };
    writeJson(SESSION, sess);
    for (const k of Object.keys(sent)) delete sent[k]; // aparelho "novo" para o Firebase: reenvia tudo
    token = r.data.idToken;
    tokenExp = Date.now() + (Number(r.data.expiresIn) || 3600) * 1000;
    return token;
  }

  async function idToken() {
    if (token && sess && Date.now() < tokenExp - 60000) return token;
    if (!entering) entering = enter().finally(() => { entering = null; });
    return entering;
  }

  async function store(method, path, json, retry = true) {
    const r = await request(DOCS + path, { method, token: await idToken(), json });
    if (r.status === 401 && retry) {
      token = null;
      return store(method, path, json, false);
    }
    return r;
  }

  // ordena por melhor avião e, no empate, por total ganho — num número só
  const scoreOf = (best, total) => best + Math.min(0.999, Math.log10(total + 1) / 400);

  function rowOf(doc, rid) {
    const f = doc.fields || {};
    const id = String(doc.name || '').split('/').pop();
    return {
      id,
      name: stringOf(f.name) || '???',
      best: Math.min(100, Math.max(1, Math.round(numberOf(f.best)) || 1)),
      total: numberOf(f.total),
      score: numberOf(f.score),
      mine: id === rid,
    };
  }

  // Envia as linhas que mudaram. entries: [{ rid, name, best, total }]
  async function publish(entries, force = false) {
    await idToken();
    let changed = false;
    await Promise.all(entries.map(async (e) => {
      const best = Math.min(100, Math.max(1, Math.round(Number(e.best)) || 1));
      const total = Math.max(0, Number(e.total) || 0);
      const last = sent[e.rid];
      const fresh = last && last.uid === sess.uid && last.best === best && (last.total === total || (!force && Date.now() - last.at < AGAIN));
      if (fresh) return;
      const fields = { name: text(e.name), best: whole(best), total: real(total), score: real(scoreOf(best, total)), owner: text(sess.uid) };
      const r = await store('PATCH', `/ranking/${e.rid}`, { fields });
      // 403: a linha já existe e pertence a outro aparelho (conta levada por código); deixa como está
      if (r.ok || r.status === 403) {
        sent[e.rid] = { uid: sess.uid, best, total, at: Date.now() };
        changed = true;
      }
    }));
    if (changed) writeJson(SENT, sent);
  }

  // Lê os 100 primeiros e a posição da conta em uso (rid).
  async function top(rid) {
    const from = [{ collectionId: 'ranking' }];
    const q = await store('POST', ':runQuery', {
      structuredQuery: { from, orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: 100 },
    });
    if (!q.ok) throw new Error('ranking fora do ar');
    const rows = (Array.isArray(q.data) ? q.data : []).filter((x) => x && x.document).map((x) => rowOf(x.document, rid));
    let me = null;
    const i = rows.findIndex((r) => r.mine);
    if (i >= 0) {
      me = { ...rows[i], rank: i + 1 };
    } else if (rid) {
      const got = await store('GET', `/ranking/${rid}`);
      if (got.ok) {
        const mine = rowOf(got.data, rid);
        const c = await store('POST', ':runAggregationQuery', {
          structuredAggregationQuery: {
            structuredQuery: { from, where: { fieldFilter: { field: { fieldPath: 'score' }, op: 'GREATER_THAN', value: real(mine.score) } } },
            aggregations: [{ alias: 'n', count: {} }],
          },
        });
        const n = c.ok && Array.isArray(c.data) && c.data[0] && c.data[0].result && c.data[0].result.aggregateFields;
        me = { ...mine, rank: n ? numberOf(n.n) + 1 : null };
      }
    }
    return { top: rows, me };
  }

  return { publish, top };
}
