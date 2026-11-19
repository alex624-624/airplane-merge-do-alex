// Entrada do site: tela de login/cadastro e início do jogo.
import { api } from './api.js';
import { startGame } from './game.js';
import { planeSprite } from './planes.js';

const $ = (id) => document.getElementById(id);
let mode = 'login';
let busy = false;

function drawLogo() {
  const c = $('logo-planes');
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const put = (level, x, y, size, rot) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.drawImage(planeSprite(level, 256), -size / 2, -size / 2, size, size);
    g.restore();
  };
  put(4, 92, 196, 150, -0.5);
  put(27, 508, 196, 150, 0.5);
  put(22, 300, 150, 270, 0);
}

function showError(msg) {
  const el = $('auth-error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

function setMode(next) {
  mode = next;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
  $('auth-submit').textContent = mode === 'login' ? 'Entrar' : 'Criar conta e jogar';
  $('auth-pass').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('auth-tip').hidden = mode === 'login';
  showError('');
}

async function enter(user) {
  const data = await api.load();
  $('splash').hidden = true;
  $('auth').hidden = true;
  $('game').hidden = false;
  startGame(user, data);
}

function showAuth(message) {
  if (api.local) {
    $('auth-tip').textContent = 'Sua conta fica guardada neste aparelho. Para jogar em outro, use o código de transferência no menu da conta.';
  }
  $('splash').hidden = true;
  $('auth').hidden = false;
  drawLogo();
  if (message) showError(message);
}

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));

$('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (busy) return;
  const username = $('auth-user').value.trim();
  const password = $('auth-pass').value;
  if (!/^[A-Za-z0-9_-]{3,16}$/.test(username)) {
    return showError('O nome deve ter de 3 a 16 caracteres (letras, números, _ e -).');
  }
  if (password.length < 6) return showError('A senha deve ter pelo menos 6 caracteres.');
  busy = true;
  $('auth-submit').disabled = true;
  showError('');
  try {
    const { user } = await (mode === 'login' ? api.login(username, password) : api.register(username, password));
    await enter(user);
  } catch (err) {
    showError(err.message);
  } finally {
    busy = false;
    $('auth-submit').disabled = false;
  }
});

(async function boot() {
  let user = null;
  try {
    user = (await api.me()).user;
  } catch (e) {
    return showAuth(e.status === 401 ? '' : e.message);
  }
  try {
    await enter(user);
  } catch (e) {
    showAuth(e.message);
  }
})();
