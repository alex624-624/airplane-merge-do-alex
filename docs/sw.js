// Guarda no aparelho uma versão INTEIRA do jogo e entrega sempre essa mesma versão.
// Assim, publicar uma atualização nunca mistura arquivos novos com antigos:
// quem está jogando continua na versão em que entrou, e a troca só acontece
// quando a página é carregada de novo (ver js/atualiza.js).

// <versao> (bloco gerado por tools/versao.js — não edite à mão)
const VERSION = '09a838769c';
const FILES = {
  "icon.svg": "5cc828b57ad188162a57533183e7523ad83c5d81b1f6f1d9303e9240a1e1496e",
  "./": "6a288489d5df3cdbc0dca2cdf481bd233fdc1426652694ed524c1ca633a312d7",
  "js/api.js": "6640eda46ba5ba6cb9b77e588c8126088fa8e34016c4eb348a593e97cdc802f5",
  "js/atualiza.js": "1acc16b0822f77ebbddd1640e4a11b17dde3baee9bcb9a5e592780ce86f0e5f7",
  "js/audio.js": "34c9b4b89dfa14b76e4804b29cfed5fd204abfe8f21d78498c8190f8f715d278",
  "js/backend-local.js": "3f8b653e361fe858bc5e19b64846996154e135feb7270efdaaede0e9035e6a6f",
  "js/backend-server.js": "022eab4f159463417673f995bc9d134670e3eaa1778915fa677d18fc00c517e3",
  "js/config.js": "fff913de7baf9667197dc966cf2319a12daffba1bd26c27fdc3736f5f47edf82",
  "js/firebase-config.js": "a14d992d1d9cab5f23c26060a2455a710c6ee12b0325c421bf68bb6551d1ff1f",
  "js/game.js": "547a4722a2dbfbd34e9897e5f182b7230cb8548a1d070ef723ee71369bb90199",
  "js/main.js": "8b8c9bed5b0b6d17a2864a723c6ca5c6a23a693b157742482e4dd09d4f3a32b4",
  "js/modo.js": "d769897d6d1377cf0e4cd5ffea941406fde726a15a99d32d81f5ef391ca539a5",
  "js/planes.js": "f31c48c5d5a99ec9432ed64fa20532674fb0b3e0886b664ff3d83d80e178238d",
  "js/ranking-online.js": "2bd7059f80f0eba494eb4213d24a4832348ee6091ae1478e50787de12b9759bf",
  "js/sky.js": "b9352c4bdad9035ba084db1f493cdbd1bbfbdfd7907cb05715eb2aec81bbfd47",
  "js/transfer.js": "343fc30cca8be3af25be98be65aea24e2735e5e09861023ce56eb37e43a969d9",
  "manifest.webmanifest": "e0e8771754b9633ea5942a3a15313afb8504b3f1d0e68a6e28a503676cf0b745",
  "style.css": "73b86f0d6003128dffdb02f73e5a82996b4ec55246a4cdb29b09f8cccd455896"
};
// </versao>

const CACHE = 'amda-' + VERSION;
const SCOPE = new URL('./', self.location).pathname;

const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

// Baixa todos os arquivos desta versão e confere um por um.
// Se algum não bater (publicação ainda pela metade), desiste e tenta de novo mais tarde.
async function install() {
  const cache = await caches.open(CACHE);
  try {
    await Promise.all(Object.entries(FILES).map(async ([path, hash]) => {
      const res = await fetch(new Request(path, { cache: 'no-store' }));
      if (!res.ok) throw new Error('não baixou: ' + path);
      const got = hex(await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer()));
      if (got !== hash) throw new Error('arquivo de outra versão: ' + path);
      await cache.put(path, res);
    }));
  } catch (err) {
    await caches.delete(CACHE);
    throw err;
  }
}

self.addEventListener('install', (event) => event.waitUntil(install()));

self.addEventListener('activate', (event) => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith('amda-') && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));

// a página pede a troca de versão quando está carregando, nunca no meio do jogo
self.addEventListener('message', (event) => {
  if (event.data === 'ativar') self.skipWaiting();
  else if (event.data === 'versao' && event.ports[0]) event.ports[0].postMessage(VERSION);
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = (await cache.match(req, { ignoreSearch: true }))
      || (req.mode === 'navigate' ? await cache.match('./') : null);
    return hit || fetch(req);
  })());
});
