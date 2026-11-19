// Dados e regras de economia do jogo.

export const MAX_LEVEL = 40;
export const SLOT_COUNT = 16;

export const TIERS = [
  'Passarinhos', 'Insetos', 'Grandes aves', 'Ventos',
  'Nuvens', 'Tempestades', 'Sombras', 'Espaciais',
];

export const NAMES = [
  null,
  'Pardal', 'Bem-te-vi', 'Sabiá', 'Andorinha', 'Canário Turbo',
  'Libélula', 'Vagalume', 'Marimbondo', 'Besouro Real', 'Mariposa Dourada',
  'Tucano', 'Arara', 'Pelicano', 'Albatroz', 'Condor Cargueiro',
  'Brisa', 'Ventania', 'Vendaval', 'Tufão', 'Furacão',
  'Nuvem', 'Nimbo', 'Estrato', 'Cúmulo Gigante', 'Rei dos Céus',
  'Faísca', 'Raio', 'Trovão', 'Relâmpago', 'Tempestade',
  'Sombra', 'Fantasma', 'Eclipse', 'Meia-Noite', 'Vulto Supersônico',
  'Cometa', 'Meteoro', 'Nebulosa', 'Supernova', 'Galáxia do Alex',
];

// Nível do melhor avião necessário para liberar cada vaga do hangar.
export const SLOT_UNLOCKS = [1, 1, 1, 1, 1, 1, 3, 4, 5, 6, 8, 10, 12, 14, 17, 20];
// Nível do melhor avião necessário para cada lugar na rota de voo.
export const FLIGHT_UNLOCKS = [1, 1, 1, 4, 7, 10, 13, 16, 20, 25];

export const tierOf = (L) => Math.floor((L - 1) / 5);
export const eps = (L) => 2 * 2.05 ** (L - 1);            // moedas por segundo
export const lapTime = (L) => Math.max(2.6, 6 - L * 0.085); // segundos por volta
export const baseCost = (L) => 50 * 2.6 ** (L - 1);
export const sellValue = (L) => Math.floor(baseCost(L) * 0.25);
export const crateInterval = (n) => 30 - 2 * n;

export const BOOST_MS = 60_000;
export const BOOST_COOLDOWN_MS = 180_000;

export const UPGRADES = [
  { id: 'income', icon: '🚀', name: 'Motores turbinados', max: 30, cost: (n) => 500 * 2.4 ** n,
    label: 'Moedas por volta', val: (n) => `+${n * 10}%` },
  { id: 'discount', icon: '🏷️', name: 'Desconto na loja', max: 10, cost: (n) => 1500 * 3.2 ** n,
    label: 'Preço dos aviões', val: (n) => `-${n * 2}%` },
  { id: 'crate', icon: '🎁', name: 'Entrega expressa', max: 5, cost: (n) => 4000 * 4 ** n,
    label: 'Presente a cada', val: (n) => `${crateInterval(n)}s` },
  { id: 'offline', icon: '🌙', name: 'Piloto automático', max: 10, cost: (n) => 2500 * 3 ** n,
    label: 'Ganhos fora do jogo', val: (n) => `até ${2 + n}h` },
];

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function fmt(n) {
  if (!Number.isFinite(n)) return '∞';
  n = Math.floor(n);
  if (n < 1000) return String(n);
  let e = Math.floor(Math.log10(n) / 3);
  let v = n / 10 ** (e * 3);
  if (v >= 1000) { v /= 1000; e += 1; }
  const d = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  const p = 10 ** d;
  return (Math.floor(v * p) / p).toFixed(d).replace('.', ',') + (SUFFIXES[e] ?? 'e' + e * 3);
}

export function fmtRate(n) {
  if (n < 100) return (Math.round(n * 10) / 10).toString().replace('.', ',');
  return fmt(n);
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, '0')}`;
}

export function fmtAway(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h >= 48) return `${Math.floor(h / 24)} dias`;
  if (h >= 1) return `${h}h ${m}min`;
  return `${Math.max(1, m)} min`;
}
