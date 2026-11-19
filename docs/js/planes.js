// Desenho dos 100 aviões (vistos de cima, nariz para o alto), tudo feito em canvas.
import { MAX_LEVEL } from './config.js';

const OUT = '#1d2440';
const GLASS = '#aee4ff';

// [principal, secundária, destaque] para cada nível
const PAL = [
  null,
  // Passarinhos — aviõezinhos a hélice
  ['#ffd447', '#fff6dc', '#ff7a59'],
  ['#ff8a5c', '#fff3e6', '#3a6ff0'],
  ['#4cc38a', '#f2fff7', '#ffb02e'],
  ['#4aa3ff', '#f0f8ff', '#ff5d73'],
  ['#ffbf1f', '#fffbe8', '#e2452f'],
  // Insetos — biplanos
  ['#37c2b1', '#fff4d6', '#ef5350'],
  ['#b6e04a', '#fffbe0', '#2f7fe0'],
  ['#ffb230', '#4a4a5c', '#ffffff'],
  ['#3f6fd9', '#ffe9a8', '#ff8a3d'],
  ['#f5c542', '#fff7d0', '#9a5cff'],
  // Grandes aves — bimotores
  ['#ff9f1c', '#ffffff', '#22304f'],
  ['#e2452f', '#ffffff', '#1fa0e0'],
  ['#f4f1e8', '#ffd27a', '#3d7ed8'],
  ['#e9eef6', '#cdd7e6', '#2a3d66'],
  ['#5b6b8c', '#e8edf5', '#ffb02e'],
  // Ventos — jatos executivos
  ['#ffffff', '#e7f1ff', '#29b6c9'],
  ['#ffffff', '#e9e6ff', '#7a5cff'],
  ['#f7f9fc', '#dde6f2', '#ff6b3d'],
  ['#2b3a5f', '#f0f4fa', '#35d0a5'],
  ['#1a2340', '#f5d77a', '#f5b92e'],
  // Nuvens — jatos de passageiros
  ['#ffffff', '#e3ecf7', '#2f7fe0'],
  ['#ffffff', '#e3ecf7', '#e2452f'],
  ['#ffffff', '#e8f5ee', '#1fa870'],
  ['#ffffff', '#f1e8fb', '#8a4be0'],
  ['#fffaf0', '#f3e2b0', '#d9a21b'],
  // Tempestades — caças
  ['#8fa3b8', '#b9c7d6', '#ffb02e'],
  ['#5f7fa8', '#93acc9', '#ffe14a'],
  ['#4b5d75', '#7d8fa8', '#ff5d3d'],
  ['#3c8f8a', '#7cc4bd', '#fff06a'],
  ['#3a3f58', '#6a718f', '#ff3d81'],
  // Sombras — asas voadoras
  ['#3b4252', '#4c566a', '#58e6d9'],
  ['#2f2a4a', '#453e6b', '#b18cff'],
  ['#1f2a44', '#31406a', '#ffb347'],
  ['#161a2e', '#27304f', '#5aa7ff'],
  ['#101223', '#231a3d', '#ff4fd8'],
  // Espaciais
  ['#f4f7fb', '#cfd8e6', '#35d7ff'],
  ['#f4f7fb', '#ffd9c7', '#ff7a3d'],
  ['#efe9ff', '#cdbcff', '#b85cff'],
  ['#fff5d6', '#ffd36a', '#ff4f6d'],
  ['#fff1b8', '#ffcf3d', '#7a5cff'],
  // Foguetes — [corpo, aletas, ponta]
  ['#f7f9fc', '#e2452f', '#e2452f'],
  ['#ffffff', '#2f7fe0', '#ffb02e'],
  ['#ffe9a8', '#3d4a6b', '#ff7a3d'],
  ['#e9eef6', '#1fa870', '#22304f'],
  ['#ffffff', '#22304f', '#f5b92e'],
  // Discos voadores — [disco, cúpula, luzes]
  ['#b9c7d6', '#7d8fa8', '#7dff8a'],
  ['#9fd8c8', '#4f9d8c', '#fff06a'],
  ['#c9b8f5', '#7a5cff', '#5af0ff'],
  ['#8fa3b8', '#3a3f58', '#ff5d73'],
  ['#f0d58a', '#c9952e', '#ff4fd8'],
  // Drones — [corpo, braços, detalhes]
  ['#f4f6fa', '#5b6b8c', '#ff5d3d'],
  ['#ffd447', '#3a3f58', '#2f7fe0'],
  ['#35c2a1', '#22304f', '#fff06a'],
  ['#3a3f58', '#8a93a8', '#58e6d9'],
  ['#e2452f', '#22304f', '#ffffff'],
  // Arraias — [corpo, barriga, pintas]
  ['#4aa3ff', '#d9efff', '#ffffff'],
  ['#2bb7a8', '#d4fff5', '#fff06a'],
  ['#5b6ee0', '#dfe4ff', '#ffb347'],
  ['#2a3d8f', '#9fb4ff', '#58e6d9'],
  ['#7a4be0', '#ead9ff', '#ffd34d'],
  // Fogo — caças em chamas
  ['#e2452f', '#ffb02e', '#ffe14a'],
  ['#ff7a1a', '#ffd34d', '#fff6c2'],
  ['#b3261e', '#ff7a3d', '#ffd34d'],
  ['#3a2030', '#ff5d3d', '#ffb02e'],
  ['#1d1a22', '#ff3d2e', '#ffe14a'],
  // Gelo — asas voadoras congeladas
  ['#dff4ff', '#a8dcf5', '#3aa8e0'],
  ['#bfe9ff', '#ffffff', '#2f7fe0'],
  ['#8fd3f5', '#e9f8ff', '#ffffff'],
  ['#5aa7e0', '#d9f1ff', '#b8f5ff'],
  ['#f2fbff', '#9bdcff', '#7a5cff'],
  // Neon — drones luminosos
  ['#1a1f38', '#2f3660', '#39ff88'],
  ['#1a1f38', '#3a2a5c', '#ff3df2'],
  ['#141a2e', '#27406a', '#3df2ff'],
  ['#20142e', '#4a2a6a', '#fff23d'],
  ['#0f1220', '#3a1f4f', '#ff5a3d'],
  // Ouro — jatos dourados
  ['#ffe9a8', '#f5c542', '#c9952e'],
  ['#ffd76a', '#ffe9a8', '#b8791a'],
  ['#fff4cf', '#f5b92e', '#e2452f'],
  ['#f5c542', '#fff1b8', '#7a4a12'],
  ['#ffd84a', '#fff6d6', '#7a5cff'],
  // Cristais — discos de pedras preciosas
  ['#fbe4ee', '#f0b8cf', '#ffffff'],
  ['#c9a8f5', '#8a4be0', '#f3e6ff'],
  ['#8fb8ff', '#2f5fe0', '#e3f0ff'],
  ['#8ff0bf', '#1fa870', '#e6fff3'],
  ['#eafcff', '#9be7ff', '#ff9bf0'],
  // Arco-íris — arraias coloridas
  ['#9bd0ff', '#ffffff', '#ffe14a'],
  ['#ff9bd0', '#fff0f8', '#58e6d9'],
  ['#b8f58f', '#fbffe8', '#ff7a59'],
  ['#ffd27a', '#fff8e0', '#7a5cff'],
  ['#ffffff', '#ffe6f7', '#ff4fd8'],
  // Galácticos — foguetes do espaço profundo
  ['#2a2f5c', '#7a5cff', '#58e6d9'],
  ['#1f2550', '#ff4fd8', '#ffe14a'],
  ['#3a2a6a', '#35d7ff', '#ffffff'],
  ['#18183a', '#b85cff', '#ff7a3d'],
  ['#0f1030', '#ffd34d', '#5af0ff'],
  // Lendas — naves lendárias
  ['#ffffff', '#e3ecf7', '#ffd34d'],
  ['#fff5d6', '#ffcf3d', '#ff7a3d'],
  ['#f4f7fb', '#b8f5ff', '#35d7ff'],
  ['#fff1b8', '#ff9bf0', '#b85cff'],
  ['#fffbe8', '#ffd84a', '#ff4f6d'],
];

// ------------------------------------------------------------ ajudantes de desenho
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const to = amt < 0 ? 0 : 255;
  const t = Math.abs(amt);
  const ch = (c) => Math.round(c + (to - c) * t);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

// polígono simétrico: pontos do lado direito, do topo ao fim da linha central
function sym(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(-pts[i][0], pts[i][1]);
  ctx.closePath();
}

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function paint(ctx, fill, lw = 2.2) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
}

// fuselagem: nariz em `top`, cauda em `bottom`, meia-largura `w`
function body(ctx, top, bottom, w, nose, blunt, tail, tw) {
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.bezierCurveTo(w * blunt, top, w, top + nose * 0.5, w, top + nose);
  ctx.lineTo(w, bottom - tail);
  ctx.bezierCurveTo(w, bottom - tail * 0.4, tw, bottom - tail * 0.15, tw, bottom);
  ctx.lineTo(-tw, bottom);
  ctx.bezierCurveTo(-tw, bottom - tail * 0.15, -w, bottom - tail * 0.4, -w, bottom - tail);
  ctx.lineTo(-w, top + nose);
  ctx.bezierCurveTo(-w, top + nose * 0.5, -w * blunt, top, 0, top);
  ctx.closePath();
}

function ell(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// desenha do lado direito e espelha para o esquerdo
function both(ctx, fn) {
  fn();
  ctx.save();
  ctx.scale(-1, 1);
  fn();
  ctx.restore();
}

function inside(ctx, pathFn, fn) {
  ctx.save();
  pathFn();
  ctx.clip();
  fn();
  ctx.restore();
}

function outline(ctx, pathFn, lw = 2.2) {
  pathFn();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUT;
  ctx.stroke();
}

function prop(ctx, x, y, r) {
  ell(ctx, x, y, r, r * 0.2);
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(29,36,64,.45)';
  ctx.stroke();
  ell(ctx, x, y + 0.8, 2.2, 2.6);
  ctx.fillStyle = OUT;
  ctx.fill();
}

function fin(ctx, y0, y1, color) {
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(0, y1);
  ctx.lineWidth = 4.6;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 2.1;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function glass(ctx, pts, color = GLASS) {
  sym(ctx, pts);
  paint(ctx, color, 1.5);
}

function flame(ctx, x, y, w, len, c1, c2) {
  const g = ctx.createLinearGradient(0, y, 0, y + len);
  g.addColorStop(0, c1);
  g.addColorStop(0.5, c2);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w, y + len * 0.6, x, y + len);
  ctx.quadraticCurveTo(x + w, y + len * 0.6, x + w, y);
  ctx.closePath();
  ctx.fill();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

// ------------------------------------------------------------ os tipos de avião
// 1) aviõezinhos a hélice
function t1(ctx, v, [p, s, a]) {
  const span = 36 + v * 2;
  const B = () => body(ctx, -33, 38, 6.5, 12, 0.75, 30, 1.6);
  sym(ctx, [[0, 27], [14, 28], [15.5, 32], [14, 36], [0, 35]]);
  paint(ctx, p);
  sym(ctx, [[0, -13], [span, -10.5], [span + 2, -5], [span, 1.5], [0, 5]]);
  paint(ctx, p);
  both(ctx, () => {
    poly(ctx, [[span - 8, -11], [span, -10.5], [span + 2, -5], [span, 1.5], [span - 8, 2.2]]);
    paint(ctx, a, 1.6);
  });
  if (v >= 2) both(ctx, () => { ctx.fillStyle = s; ctx.fillRect(13, -10.8, 3.5, 13.6); });
  if (v >= 4) both(ctx, () => { ell(ctx, span + 2.5, -4.5, 2.8, 8.5); paint(ctx, s, 1.8); });
  B();
  paint(ctx, s);
  inside(ctx, B, () => {
    ctx.fillStyle = p;
    ctx.fillRect(-10, -36, 20, 10);
    ctx.fillStyle = a;
    ctx.fillRect(-1.4, -24, 2.8, 70);
    if (v >= 3) { ctx.fillStyle = p; ctx.fillRect(-10, 15, 20, 5); }
  });
  outline(ctx, B);
  fin(ctx, 25, 38, a);
  ell(ctx, 0, -11, 4.2, 6.2);
  paint(ctx, GLASS, 1.6);
  ell(ctx, -1.4, -13, 1.2, 2.2);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fill();
  prop(ctx, 0, -34.5, 12 + v * 0.5);
}

// 2) biplanos
function t2(ctx, v, [p, s, a]) {
  const span = 39 + v;
  const B = () => body(ctx, -30, 38, 6.8, 8, 0.9, 30, 1.8);
  sym(ctx, [[0, 26], [15, 27], [17, 31.5], [15, 36], [0, 35]]);
  paint(ctx, p);
  sym(ctx, [[0, -3], [span - 6, -1], [span - 4, 4], [span - 6, 9], [0, 10]]);
  paint(ctx, shade(p, -0.22));
  B();
  paint(ctx, s);
  inside(ctx, B, () => {
    ctx.fillStyle = a;
    ctx.fillRect(-10, 16, 20, 3.5);
    ctx.fillRect(-10, 22, 20, 2.5);
  });
  outline(ctx, B);
  ell(ctx, 0, -26.5, 7.6, 5);
  paint(ctx, '#8a93a8');
  ell(ctx, 0, 8, 3.8, 4.6);
  paint(ctx, '#3b2f2f', 1.6);
  ell(ctx, 0, 8.4, 2.2, 2.3);
  ctx.fillStyle = '#ffd7a8';
  ctx.fill();
  fin(ctx, 25, 38, a);
  const W = () => sym(ctx, [[0, -19], [span, -17], [span + 2.5, -11.5], [span, -6], [0, -4.5]]);
  W();
  paint(ctx, p);
  inside(ctx, W, () => {
    if (v >= 2) { ctx.fillStyle = a; ctx.fillRect(-4, -20, 8, 17); }
    if (v >= 4) both(ctx, () => { ctx.fillStyle = a; ctx.fillRect(span - 5, -20, 10, 17); });
  });
  outline(ctx, W);
  both(ctx, () => {
    ctx.fillStyle = OUT;
    ctx.fillRect(13, -16.8, 1.8, 11.2);
    ctx.fillRect(span - 11, -16.4, 1.8, 9.8);
  });
  both(ctx, () => {
    ell(ctx, 24, -11.5, 4.3, 4.3);
    paint(ctx, a, 1.4);
    ell(ctx, 24, -11.5, 1.8, 1.8);
    ctx.fillStyle = s;
    ctx.fill();
  });
  prop(ctx, 0, -32, 13);
}

// 3) bimotores
function t3(ctx, v, [p, s, a]) {
  const span = 42 + (v >= 3 ? 2 : 0);
  const B = () => body(ctx, -42, 42, 7.8, 14, 0.8, 26, 2);
  sym(ctx, [[0, 30], [17, 31], [19, 35], [17, 39.5], [0, 39]]);
  paint(ctx, p);
  if (v >= 3) both(ctx, () => { rrect(ctx, 15.5, 28, 4.2, 14.5, 2); paint(ctx, a, 1.6); });
  sym(ctx, [[0, -10], [14, -10.5], [span, -5], [span + 1.5, -0.5], [span, 3.5], [14, 7.5], [0, 7.5]]);
  paint(ctx, p);
  both(ctx, () => {
    poly(ctx, [[span - 7, -6.3], [span, -5], [span + 1.5, -0.5], [span, 3.5], [span - 7, 4.6]]);
    paint(ctx, a, 1.6);
  });
  both(ctx, () => {
    rrect(ctx, 15, -21, 8, 26, 3.6);
    paint(ctx, s);
    ctx.fillStyle = a;
    ctx.fillRect(16.1, -13, 5.8, 2.6);
  });
  B();
  paint(ctx, s);
  inside(ctx, B, () => {
    ctx.fillStyle = p;
    ctx.fillRect(-10, 26, 20, 20);
    ctx.fillStyle = a;
    ctx.fillRect(-10, 22.5, 20, 3);
    if (v >= 1) ctx.fillRect(-1.2, -22, 2.4, 44);
    if (v >= 2) { ctx.fillStyle = p; ctx.fillRect(-10, -44, 20, 7); }
  });
  outline(ctx, B);
  if (v < 3) fin(ctx, 28, 42, a);
  glass(ctx, [[0, -35], [4.6, -31.5], [4.6, -27.5], [0, -29]]);
  both(ctx, () => prop(ctx, 19, -22, 10));
}

// 4) jatos executivos
function t4(ctx, v, [p, s, a]) {
  const k = 1 + v * 0.02;
  const B = () => body(ctx, -46, 42, 6.4, 24, 0.3, 22, 1.6);
  sym(ctx, [[0, -8], [7, -8], [40 * k, 12], [41 * k, 18], [35 * k, 18], [7, 8], [0, 8]]);
  paint(ctx, s);
  both(ctx, () => {
    poly(ctx, [[36.5 * k, 9.8], [40 * k, 12], [41 * k, 18], [37.5 * k, 18]]);
    paint(ctx, a, 1.6);
  });
  sym(ctx, [[0, 30], [4, 30], [19, 39], [19, 43], [4, 41], [0, 41]]);
  paint(ctx, s);
  both(ctx, () => {
    rrect(ctx, 6.6, 14, 7, 17, 3.2);
    paint(ctx, shade(p, -0.1));
    ell(ctx, 10.1, 15.8, 2.5, 1.4);
    ctx.fillStyle = OUT;
    ctx.fill();
    ctx.fillStyle = a;
    ctx.fillRect(7.7, 24, 4.8, 2.4);
  });
  B();
  paint(ctx, p);
  inside(ctx, B, () => {
    ctx.fillStyle = a;
    ctx.fillRect(-10, 27, 20, 20);
    ctx.fillRect(3.4, -20, 1.5, 47);
    ctx.fillRect(-4.9, -20, 1.5, 47);
    if (v >= 2) { ctx.fillStyle = s; ctx.fillRect(-10, 31, 20, 2.5); }
  });
  outline(ctx, B);
  fin(ctx, 28, 42, s);
  glass(ctx, [[0, -36], [4, -29], [3.6, -24.5], [0, -26.5]]);
}

// 5) jatos de passageiros
function t5(ctx, v, [p, s, a]) {
  const engines = v >= 3 ? [19, 31] : [21];
  const B = () => body(ctx, -47, 46, 8.4, 16, 0.85, 24, 2.2);
  const le = (x) => -12 + ((x - 9) / 37) * 22;
  both(ctx, () => engines.forEach((x) => {
    rrect(ctx, x - 3.4, le(x) - 9, 6.8, 14, 3);
    paint(ctx, v === 4 ? a : '#cfd8e6');
    ell(ctx, x, le(x) - 7.4, 2.4, 1.3);
    ctx.fillStyle = OUT;
    ctx.fill();
  }));
  sym(ctx, [[0, -12], [9, -12], [46, 10], [47, 16], [41, 17], [9, 7], [0, 7]]);
  paint(ctx, s);
  both(ctx, () => {
    poly(ctx, [[43, 8.2], [46, 10], [47, 16], [44, 16.5]]);
    paint(ctx, a, 1.6);
  });
  sym(ctx, [[0, 31], [5, 31], [20, 41], [20, 45], [5, 43], [0, 43]]);
  paint(ctx, s);
  B();
  paint(ctx, p);
  inside(ctx, B, () => {
    ctx.fillStyle = a;
    poly(ctx, [[-10, 30], [10, 22], [10, 50], [-10, 50]]);
    ctx.fill();
    ctx.fillRect(5.6, -30, 1.6, 55);
    ctx.fillRect(-7.2, -30, 1.6, 55);
    if (v >= 1) ctx.fillRect(-10, -49, 20, 7);
    if (v >= 2) {
      ctx.globalAlpha = 0.5;
      poly(ctx, [[-10, 22], [10, 14], [10, 18], [-10, 26]]);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
  outline(ctx, B);
  fin(ctx, 30, 46, '#ffffff');
  glass(ctx, [[0, -41.5], [5.4, -37], [5.4, -33.5], [0, -35.5]]);
}

// 6) caças
function t6(ctx, v, [p, s, a]) {
  const B = () => body(ctx, -48, 37, 5.8, 28, 0.15, 10, 5.2);
  both(ctx, () => flame(ctx, 2.8, 36, 2.4, 11 + v, '#fff2a8', '#ff8a2b'));
  sym(ctx, [[0, 25], [8, 25], [23, 37], [23, 41.5], [8, 39], [0, 39]]);
  paint(ctx, s);
  sym(ctx, [[0, -12], [6, -12], [38, 21], [38, 27.5], [10, 26], [0, 26]]);
  paint(ctx, p);
  both(ctx, () => {
    poly(ctx, [[31, 13.8], [38, 21], [38, 27.5], [33.5, 27.2]]);
    paint(ctx, a, 1.6);
  });
  if (v >= 1) both(ctx, () => {
    poly(ctx, [[15, -2.5], [19, 1.6], [19, 26.4], [15, 26.2]]);
    paint(ctx, s, 0);
  });
  if (v >= 2) {
    sym(ctx, [[0, -25], [5, -25], [16, -16], [16, -13], [5, -15], [0, -15]]);
    paint(ctx, s);
  }
  if (v >= 3) both(ctx, () => { rrect(ctx, 36.4, 12, 3.2, 17, 1.6); paint(ctx, '#f4f6fa', 1.5); });
  B();
  paint(ctx, p);
  inside(ctx, B, () => {
    ctx.fillStyle = s;
    ctx.fillRect(-1.6, -8, 3.2, 50);
    if (v >= 4) { ctx.fillStyle = a; ctx.fillRect(-10, -50, 20, 9); }
  });
  outline(ctx, B);
  both(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(3.6, 21);
    ctx.lineTo(7.2, 35);
    ctx.lineWidth = 4.2;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.lineWidth = 1.9;
    ctx.strokeStyle = a;
    ctx.stroke();
  });
  ell(ctx, 0, -22, 3.3, 9);
  paint(ctx, v >= 3 ? '#ffd76a' : GLASS, 1.5);
  ell(ctx, -1, -25, 0.9, 3);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fill();
  both(ctx, () => { rrect(ctx, 0.8, 34.4, 4, 3.4, 1); paint(ctx, '#3a4055', 1.2); });
}

// 7) asas voadoras
const WING_SHAPES = [
  [[0, -42], [46, 16], [46, 22], [30, 18], [21, 28], [11, 19], [0, 30]],
  [[0, -44], [44, 20], [40, 26], [26, 20], [16, 30], [8, 22], [0, 28]],
  [[0, -46], [10, -22], [42, 22], [42, 28], [18, 24], [10, 34], [0, 30]],
  [[0, -46], [8, -26], [30, 4], [46, 26], [40, 30], [20, 22], [12, 36], [0, 32]],
  [[0, -48], [7, -28], [22, -6], [46, 24], [44, 31], [24, 25], [14, 38], [5, 32], [0, 36]],
];

function t7(ctx, v, [p, s, a]) {
  const shape = WING_SHAPES[v];
  both(ctx, () => {
    const g = ctx.createRadialGradient(9, 31, 0, 9, 31, 13);
    g.addColorStop(0, a);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = g;
    ctx.fillRect(-4, 18, 26, 28);
    ctx.globalAlpha = 1;
  });
  sym(ctx, shape);
  paint(ctx, p);
  ctx.save();
  ctx.translate(0, 2.5);
  ctx.scale(0.8, 0.8);
  sym(ctx, shape);
  ctx.lineWidth = 1.9;
  ctx.strokeStyle = a;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.restore();
  sym(ctx, [[0, -32], [6.5, -14], [8.5, 12], [5, 24], [0, 25]]);
  paint(ctx, s, 1.5);
  sym(ctx, [[0, -27], [3.4, -18], [3, -10.5], [0, -9]]);
  paint(ctx, a, 1.3);
  ell(ctx, -0.9, -19, 0.8, 3.4);
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.fill();
  if (v >= 2) both(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(4.5, 2);
    ctx.lineTo(7, 8);
    ctx.lineTo(4.5, 14);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = a;
    ctx.stroke();
  });
}

// 8) naves espaciais
function t8(ctx, v, [p, s, a]) {
  const B = () => body(ctx, -47, 35, 7.8, 26, 0.4, 9, 6.6);
  const g = ctx.createRadialGradient(0, 2, 6, 0, 2, 50);
  g.addColorStop(0, a);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.28 + v * 0.05;
  ctx.fillStyle = g;
  ctx.fillRect(-52, -52, 104, 104);
  ctx.globalAlpha = 1;
  [-4.4, 0, 4.4].forEach((x) => flame(ctx, x, 34, 2.2, 13 + v, '#ffffff', a));
  sym(ctx, [[0, -22], [5, -22], [13, -3], [36, 23], [36, 31], [9, 30], [0, 30]]);
  paint(ctx, s);
  both(ctx, () => {
    poly(ctx, [[27, 12.8], [36, 23], [36, 31], [30, 30.8]]);
    paint(ctx, a, 1.6);
  });
  if (v >= 2) both(ctx, () => { rrect(ctx, 33.6, 17, 3.6, 16, 1.8); paint(ctx, p, 1.6); });
  if (v >= 3) {
    ell(ctx, 0, 8, 22, 6.5);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = a;
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }
  B();
  paint(ctx, p);
  inside(ctx, B, () => {
    ctx.fillStyle = '#2a3150';
    ctx.fillRect(-10, -50, 20, 9);
    ctx.fillStyle = a;
    ctx.fillRect(-10, 13, 20, 3);
    ctx.fillRect(-10, 18.5, 20, 2);
    if (v >= 1 && v < 4) ctx.fillRect(-1.2, -14, 2.4, 24);
  });
  outline(ctx, B);
  glass(ctx, [[0, -34], [3.8, -27], [3.4, -19.5], [0, -17.5]], shade(a, 0.35));
  [-4.4, 0, 4.4].forEach((x) => { rrect(ctx, x - 1.8, 33, 3.6, 3, 1); paint(ctx, '#3a4055', 1.1); });
  if (v === 4) { star(ctx, 0, 1, 5.6); paint(ctx, '#ffffff', 1.3); }
  if (v >= 1) { sparkle(ctx, -30, -22, 4); sparkle(ctx, 34, -8, 3); }
  if (v >= 3) { sparkle(ctx, 26, -34, 3.4); sparkle(ctx, -38, 6, 2.6); }
}

// 9) foguetes
function t9(ctx, v, [p, s, a]) {
  const B = () => body(ctx, -48, 30, 9.5, 30, 0.2, 6, 7.5);
  flame(ctx, 0, 30, 5.5, 16 + v * 2, '#fff6c2', '#ff7a2b');
  if (v >= 2) both(ctx, () => flame(ctx, 15.5, 27, 2.6, 10 + v, '#fff6c2', '#ff7a2b'));
  sym(ctx, [[0, 6], [9, 6], [24 + v, 28], [24 + v, 37], [9, 31], [0, 31]]);
  paint(ctx, s);
  both(ctx, () => {
    poly(ctx, [[18 + v, 21.5], [24 + v, 28], [24 + v, 37], [19 + v, 35.2]]);
    paint(ctx, a, 1.6);
  });
  if (v >= 2) both(ctx, () => {
    rrect(ctx, 12, -6, 7, 34, 3.4);
    paint(ctx, s);
    poly(ctx, [[12, -4.5], [15.5, -13], [19, -4.5]]);
    paint(ctx, a, 1.6);
    ctx.fillStyle = a;
    ctx.fillRect(13.1, 8, 4.8, 2.6);
  });
  B();
  paint(ctx, p);
  inside(ctx, B, () => {
    ctx.fillStyle = a;
    ctx.fillRect(-12, -50, 24, 15);
    ctx.fillRect(-12, 8, 24, 3.2);
    if (v >= 1) ctx.fillRect(-12, 14, 24, 2.2);
    if (v >= 3) { ctx.fillStyle = s; ctx.fillRect(-12, -9.5, 24, 3); }
  });
  outline(ctx, B);
  ell(ctx, 0, -20, 4.6, 4.6);
  paint(ctx, GLASS, 1.6);
  ell(ctx, -1.4, -21.4, 1.3, 1.3);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fill();
  if (v >= 1) { ell(ctx, 0, -2, 3, 3); paint(ctx, GLASS, 1.4); }
  fin(ctx, 17, 30, a);
  rrect(ctx, -5, 28.6, 10, 4, 1.4);
  paint(ctx, '#3a4055', 1.3);
  if (v === 4) { sparkle(ctx, -30, -24, 4); sparkle(ctx, 32, -6, 3.2); }
}

// 10) discos voadores
function t10(ctx, v, [p, s, a]) {
  const R = 36 + v;
  const k = 0.92;
  const g = ctx.createRadialGradient(0, 4, 8, 0, 4, R + 14);
  g.addColorStop(0, a);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = g;
  ctx.fillRect(-54, -54, 108, 108);
  ctx.globalAlpha = 1;
  if (v >= 3) both(ctx, () => flame(ctx, 11.5, R * k - 3, 3, 13, '#ffffff', a));
  ell(ctx, 0, 0, R, R * k);
  paint(ctx, p);
  ell(ctx, 0, 0, R - 7.5, (R - 7.5) * k);
  paint(ctx, shade(p, -0.14), 1.4);
  if (v >= 2) {
    ell(ctx, 0, 0, R - 14, (R - 14) * k);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = s;
    ctx.stroke();
  }
  const n = 8 + v * 2;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2 + Math.PI / n;
    ell(ctx, Math.cos(ang) * (R - 3.8), Math.sin(ang) * (R - 3.8) * k, 2.1, 2.1);
    paint(ctx, i % 2 ? a : s, 1);
  }
  poly(ctx, [[0, -R * k + 9], [4.2, -R * k + 16], [-4.2, -R * k + 16]]);
  paint(ctx, a, 1.3);
  ell(ctx, 0, 1, 13.5, 13);
  paint(ctx, s);
  ell(ctx, 0, 1, 9.8, 9.3);
  paint(ctx, GLASS, 1.5);
  ell(ctx, -3, -2.6, 2.6, 3.6);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fill();
  if (v >= 1) both(ctx, () => { ell(ctx, 3.2, 2.6, 1.5, 2.1); ctx.fillStyle = OUT; ctx.fill(); });
  if (v === 4) { star(ctx, 0, 18.5, 3.6); paint(ctx, a, 1); }
}

// 11) drones
function t11(ctx, v, [p, s, a]) {
  const arms = v >= 3 ? [[29, -27], [29, 27], [40, 0]] : [[30, -26], [30, 26]];
  const rr = v >= 3 ? 11 : 13;
  both(ctx, () => arms.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(5, y * 0.3);
    ctx.lineTo(x, y);
    ctx.lineWidth = 6.6;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = s;
    ctx.stroke();
  }));
  if (v >= 4) {
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(0, 31);
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ell(ctx, 0, 32, 2.6, 2.6);
    paint(ctx, a, 1.3);
  }
  const B = () => rrect(ctx, -11, -19, 22, 38, 9);
  B();
  paint(ctx, p);
  inside(ctx, B, () => {
    ctx.fillStyle = a;
    ctx.fillRect(-12, 5, 24, 3.4);
    if (v >= 1) ctx.fillRect(-12, 10.5, 24, 2.2);
    if (v >= 2) { ctx.fillStyle = s; ctx.fillRect(-1.5, -4, 3, 30); }
  });
  outline(ctx, B);
  ell(ctx, 0, -10.5, 5.2, 5.2);
  paint(ctx, '#2a3150', 1.5);
  ell(ctx, 0, -10.5, 2.8, 2.8);
  paint(ctx, GLASS, 1);
  ell(ctx, -0.9, -11.4, 0.9, 0.9);
  ctx.fillStyle = '#fff';
  ctx.fill();
  both(ctx, () => { ell(ctx, 6.3, 14.6, 1.6, 1.6); paint(ctx, a, 0.9); });
  both(ctx, () => arms.forEach(([x, y]) => {
    ell(ctx, x, y, 4.6, 4.6);
    paint(ctx, s, 1.5);
    ell(ctx, x, y, rr, rr);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(29,36,64,.45)';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - rr * 0.88, y - rr * 0.3);
    ctx.lineTo(x + rr * 0.88, y + rr * 0.3);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(29,36,64,.5)';
    ctx.stroke();
    ell(ctx, x, y, 1.9, 1.9);
    ctx.fillStyle = a;
    ctx.fill();
  }));
}

// 12) arraias
function mantaPath(ctx, w) {
  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.bezierCurveTo(8, -38, 20, -24, w, -2);
  ctx.bezierCurveTo(w - 8, 10, 24, 10, 10, 22);
  ctx.quadraticCurveTo(3, 27, 1.6, 47);
  ctx.lineTo(-1.6, 47);
  ctx.quadraticCurveTo(-3, 27, -10, 22);
  ctx.bezierCurveTo(-24, 10, -(w - 8), 10, -w, -2);
  ctx.bezierCurveTo(-20, -24, -8, -38, 0, -38);
  ctx.closePath();
}

function t12(ctx, v, [p, s, a]) {
  const w = 42 + v;
  const M = () => mantaPath(ctx, w);
  flame(ctx, 0, 28, 3.4, 22 + v * 1.5, '#ffffff', a);
  both(ctx, () => { rrect(ctx, 3.6, -46, 4.6, 12, 2.3); paint(ctx, p); });
  M();
  paint(ctx, p);
  inside(ctx, M, () => {
    ell(ctx, 0, -9, 9, 25);
    ctx.fillStyle = s;
    ctx.fill();
    const spots = [[22, -6, 2.6], [30, -2.5, 2], [16, 4, 1.9], [34.5, 2.5, 1.5], [24, 4.5, 1.4]];
    both(ctx, () => spots.slice(0, 2 + Math.min(v, 3)).forEach(([x, y, r]) => {
      ell(ctx, x, y, r, r);
      ctx.fillStyle = a;
      ctx.fill();
    }));
    if (v >= 2) both(ctx, () => { ctx.fillStyle = a; ctx.fillRect(w - 6, -14, 10, 28); });
  });
  outline(ctx, M);
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, 22);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = shade(p, -0.3);
  ctx.stroke();
  both(ctx, () => {
    ell(ctx, 5.4, -28.5, 2.2, 2.7);
    paint(ctx, '#ffffff', 1.2);
    ell(ctx, 5.6, -29, 1, 1.4);
    ctx.fillStyle = OUT;
    ctx.fill();
  });
  if (v >= 3) both(ctx, () => { poly(ctx, [[1.4, 29], [7.5, 37], [1.4, 36]]); paint(ctx, a, 1.2); });
  if (v === 4) { star(ctx, 0, -8, 4.6); paint(ctx, a, 1.1); }
}

// ------------------------------------------------------------ efeitos das famílias especiais
const SPOTS = [[-34, -26], [36, -12], [28, -36], [-40, 8], [38, 22], [-26, 32], [-14, -44], [16, 42]];

function glow(ctx, color, alpha, r = 52) {
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(-54, -54, 108, 108);
  ctx.globalAlpha = 1;
}

const sparkles = (ctx, n) => SPOTS.slice(0, n).forEach(([x, y], i) => sparkle(ctx, x, y, 3 + (i % 3)));

const FX = {
  fogo: {
    under(ctx, v) {
      glow(ctx, '#ff6a1a', 0.5);
      [-15, -7.5, 0, 7.5, 15].forEach((x, i) => flame(ctx, x, 30 - Math.abs(x) * 0.3, 4, 15 + v * 1.5 + (i % 2) * 4, '#fff2a8', '#ff4d1f'));
    },
    over(ctx, v) {
      SPOTS.slice(0, 2 + v).forEach(([x, y], i) => {
        ell(ctx, x, y, 1.3 + (i % 2) * 0.7, 1.3 + (i % 2) * 0.7);
        ctx.fillStyle = i % 2 ? '#ff8a2b' : '#ffd34d';
        ctx.fill();
      });
    },
  },
  gelo: {
    under(ctx) { glow(ctx, '#8fe3ff', 0.55); },
    over(ctx, v) { sparkles(ctx, 3 + v); },
  },
  neon: {
    under(ctx, v, [, , a]) {
      glow(ctx, a, 0.45);
      ell(ctx, 0, 0, 47, 47);
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = a;
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    over(ctx, v) { if (v >= 3) sparkles(ctx, v - 1); },
  },
  ouro: {
    under(ctx) { glow(ctx, '#ffd84a', 0.55); },
    over(ctx, v) { sparkles(ctx, 2 + v); },
  },
  cristal: {
    under(ctx, v, [, , a]) { glow(ctx, a, 0.4); },
    over(ctx, v, [, s]) {
      SPOTS.slice(0, 2 + v).forEach(([x, y]) => {
        poly(ctx, [[x, y - 4], [x + 2.8, y], [x, y + 4], [x - 2.8, y]]);
        paint(ctx, '#f4fdff', 1);
        poly(ctx, [[x, y - 4], [x + 2.8, y], [x, y]]);
        ctx.fillStyle = s;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    },
  },
  arcoiris: {
    under(ctx) {
      glow(ctx, '#ffffff', 0.3);
      ['#ff5d5d', '#ffa63d', '#ffe14a', '#5fdc6a', '#4aa3ff', '#a06bff'].forEach((c, i) => {
        const g = ctx.createLinearGradient(0, 6, 0, 54);
        g.addColorStop(0, c);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-13.5 + i * 4.5, 6, 4.5, 48);
      });
    },
    over(ctx, v) { if (v >= 2) sparkles(ctx, v); },
  },
  galaxia: {
    under(ctx, v, [, , a]) {
      glow(ctx, '#7a4dff', 0.5);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = a;
      ctx.globalAlpha = 0.8;
      ell(ctx, 0, 2, 47, 15);
      ctx.stroke();
      if (v >= 2) {
        ctx.save();
        ctx.rotate(1);
        ell(ctx, 0, 0, 47, 13);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      SPOTS.slice(0, 4 + v).forEach(([x, y], i) => { ell(ctx, x, y, 0.9 + (i % 2) * 0.5, 0.9 + (i % 2) * 0.5); ctx.fill(); });
    },
    over() {},
  },
  lenda: {
    under(ctx) {
      ctx.fillStyle = '#ffd84a';
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2;
        const a1 = a0 + Math.PI / 12;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a0) * 54, Math.sin(a0) * 54);
        ctx.lineTo(Math.cos(a1) * 54, Math.sin(a1) * 54);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      glow(ctx, '#fff3b0', 0.6);
    },
    over(ctx, v) { sparkles(ctx, 3 + v); },
  },
};

// uma família a cada 5 níveis: [desenho, efeito]
const KINDS = [
  [t1], [t2], [t3], [t4], [t5], [t6], [t7], [t8],
  [t9], [t10], [t11], [t12],
  [t6, FX.fogo], [t7, FX.gelo], [t11, FX.neon], [t5, FX.ouro],
  [t10, FX.cristal], [t12, FX.arcoiris], [t9, FX.galaxia], [t8, FX.lenda],
];

// ------------------------------------------------------------ cache de sprites
const sprites = new Map();
const urls = [];

export function planeSprite(level, size = 160) {
  level = Math.min(MAX_LEVEL, Math.max(1, level | 0));
  const key = level * 1000 + size;
  let c = sprites.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.scale(size / 108, size / 108);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const [draw, fx] = KINDS[Math.floor((level - 1) / 5)];
  const v = (level - 1) % 5;
  const pal = PAL[level];
  const layer = (fn) => { ctx.save(); fn(ctx, v, pal); ctx.restore(); };
  if (fx) layer(fx.under);
  layer(draw);
  if (fx) layer(fx.over);
  sprites.set(key, c);
  return c;
}

export function planeURL(level) {
  if (!urls[level]) urls[level] = planeSprite(level, 192).toDataURL('image/png');
  return urls[level];
}
