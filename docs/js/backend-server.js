// Contas e progresso no servidor local (server.js + SQLite).

async function call(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('Sem conexão com o servidor.');
    err.status = 0;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch { /* resposta sem JSON */ }
  if (!res.ok) {
    // site publicado sem o Firebase configurado: não existe servidor de contas para responder
    const missing = !data && (res.status === 404 || res.status === 405);
    const err = new Error((data && data.error) || (missing ? 'As contas ainda não foram configuradas neste site.' : 'Algo deu errado. Tente de novo.'));
    err.status = res.status;
    throw err;
  }
  return data;
}

export const serverApi = {
  saveEvery: 8000,
  me: () => call('GET', 'api/me'),
  register: (username, password) => call('POST', 'api/register', { username, password }),
  login: (username, password) => call('POST', 'api/login', { username, password }),
  logout: () => call('POST', 'api/logout', {}),
  load: () => call('POST', 'api/load', {}),
  save: (epoch, save) => call('POST', 'api/save', { epoch, save }),
  ranking: () => call('GET', 'api/ranking'),
  // usado quando a aba está fechando
  beacon(epoch, save) {
    try {
      const blob = new Blob([JSON.stringify({ epoch, save })], { type: 'application/json' });
      return navigator.sendBeacon('api/save', blob);
    } catch {
      return false;
    }
  },
};
