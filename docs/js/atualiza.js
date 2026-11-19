// Atualizações sem susto.
// O jogo fica guardado no aparelho numa versão inteira (ver sw.js). Quando uma versão nova
// é publicada, quem está jogando NÃO é interrompido: a troca só acontece aqui, enquanto a
// página está carregando — ou seja, quando a pessoa abre o jogo ou atualiza a página.
import { SERVIDOR } from './modo.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// espera a versão nova terminar de baixar (e ser conferida)
function downloaded(worker, ms) {
  return new Promise((resolve) => {
    if (worker.state === 'installed') return resolve(true);
    if (worker.state === 'redundant' || worker.state === 'activated') return resolve(false);
    const timer = setTimeout(() => resolve(false), ms);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') { clearTimeout(timer); resolve(true); }
      if (worker.state === 'redundant') { clearTimeout(timer); resolve(false); }
    });
  });
}

// Chamado uma vez, antes de o jogo começar. Se existir versão nova, troca e recarrega.
// Em qualquer dúvida (sem internet, download pela metade), segue com a versão atual.
export async function freshVersion() {
  if (SERVIDOR || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  let reg;
  try {
    reg = await sw.register('sw.js', { updateViaCache: 'none' });
  } catch {
    return;
  }
  if (!sw.controller) return; // primeira visita: já é a versão mais nova
  try {
    let found = reg.waiting || reg.installing;
    if (!found) {
      await Promise.race([reg.update().catch(() => {}), wait(2500)]);
      found = reg.waiting || reg.installing;
    }
    if (!found || !(await downloaded(found, 12000))) return;
    await new Promise((resolve) => {
      sw.addEventListener('controllerchange', () => location.reload(), { once: true });
      found.postMessage('ativar');
      setTimeout(resolve, 4000); // se a troca não acontecer, joga na versão atual
    });
  } catch { /* segue com a versão atual */ }
}

// código curto da versão em uso (para conferir se o aparelho já atualizou)
export function currentVersion() {
  return new Promise((resolve) => {
    const ctl = !SERVIDOR && 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    if (!ctl) return resolve('');
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => resolve(String(e.data || ''));
    setTimeout(() => resolve(''), 800);
    ctl.postMessage('versao', [channel.port2]);
  });
}
