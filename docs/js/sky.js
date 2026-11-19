// O céu: rota de voo, nuvens, aviões voando e moedas subindo.
import { planeSprite } from './planes.js';
import { fmt } from './config.js';

const LANES = [1, 0.76, 1.22];
const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, -apple-system, "Segoe UI", sans-serif';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const THEMES = [
  { sky: ['#2f86e6', '#74bdf5', '#d3efff'], cloud: 'rgba(255,255,255,.9)', orb: '#fff4b8', glow: 'rgba(255,244,184,.55)', route: 'rgba(255,255,255,.6)', stars: 0 },
  { sky: ['#4a56b8', '#f08a6c', '#ffd8a0'], cloud: 'rgba(255,232,214,.8)', orb: '#ffe9b0', glow: 'rgba(255,200,130,.6)', route: 'rgba(255,255,255,.6)', stars: 0 },
  { sky: ['#0e1440', '#27307e', '#5a56b3'], cloud: 'rgba(196,204,255,.3)', orb: '#f3f1ff', glow: 'rgba(200,205,255,.35)', route: 'rgba(255,255,255,.42)', stars: 50 },
  { sky: ['#060920', '#231250', '#5a2a86'], cloud: 'rgba(214,170,255,.2)', orb: '#ffd0f0', glow: 'rgba(255,140,220,.35)', route: 'rgba(255,255,255,.42)', stars: 110 },
];

function drawCloud(g, x, y, s, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x + s * 0.6, y);
  g.arc(x, y, s * 0.6, 0, Math.PI * 2);
  g.moveTo(x + s * 1.5, y - s * 0.35);
  g.arc(x + s * 0.7, y - s * 0.35, s * 0.8, 0, Math.PI * 2);
  g.moveTo(x + s * 2.15, y);
  g.arc(x + s * 1.5, y, s * 0.65, 0, Math.PI * 2);
  g.roundRect(x - s * 0.6, y, s * 2.75, s * 0.6, s * 0.3);
  g.fill();
}

export class Sky {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.hooks = hooks;
    this.pops = [];
    this.pending = 0;
    this.lastPop = 0;
    this.side = 1;
    this.pulse = 0;
    this.last = performance.now() / 1000;
    this.clouds = Array.from({ length: 7 }, () => ({
      x: Math.random() * 1.4 - 0.2,
      y: 0.06 + Math.random() * 0.88,
      s: 0.5 + Math.random() * 0.9,
      v: 0.006 + Math.random() * 0.014,
    }));
    this.stars = Array.from({ length: 110 }, () => ({
      x: Math.random(), y: Math.random(), r: 1 + Math.random() * 1.6,
      p: Math.random() * 6.28, v: 0.6 + Math.random() * 1.8,
    }));
    this.w = this.h = 1;
    this.dpr = 1;
    if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    const cw = Math.round(this.w * this.dpr);
    const ch = Math.round(this.h * this.dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
  }

  geom() {
    const { w, h } = this;
    const size = clamp(h * 0.24, 36, 84);
    return {
      cx: w / 2,
      cy: h * 0.5,
      rx: Math.min((w - size) / 2 / LANES[2] - 2, h * 1.6),
      ry: h * 0.27,
      size,
    };
  }

  pos(t, lane, G) {
    const k = LANES[lane || 0];
    const th = Math.PI / 2 + t * Math.PI * 2;
    const x = G.cx + G.rx * k * Math.cos(th);
    const y = G.cy + G.ry * k * Math.sin(th);
    const dx = -G.rx * k * Math.sin(th);
    const dy = G.ry * k * Math.cos(th);
    return { x, y, rot: Math.atan2(dy, dx) + Math.PI / 2 };
  }

  // moedas subindo quando um avião completa a volta
  pop(plane, amount) {
    this.pulse = 1;
    this.pending += amount; // junta as voltas próximas num número só
  }

  flushPops(t, G) {
    if (!this.pending || t - this.lastPop < 0.4) return;
    this.lastPop = t;
    this.side = -this.side;
    this.pops.push({
      x: G.cx + this.side * G.size * (0.35 + Math.random() * 0.5),
      y: G.cy + G.ry - G.size * 0.2,
      text: '+' + fmt(this.pending),
      age: 0,
    });
    this.pending = 0;
  }

  draw() {
    const g = this.g;
    const { w, h } = this;
    const t = performance.now() / 1000;
    const dt = Math.min(0.1, Math.max(0, t - this.last));
    this.last = t;
    const th = THEMES[this.hooks.theme()] || THEMES[0];

    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const grad = g.createLinearGradient(0, 0, 0, h);
    th.sky.forEach((c, i) => grad.addColorStop(i / (th.sky.length - 1), c));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    if (th.stars) {
      g.fillStyle = '#fff';
      for (let i = 0; i < th.stars; i++) {
        const s = this.stars[i];
        g.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * s.v + s.p));
        g.fillRect(s.x * w, s.y * h, s.r, s.r);
      }
      g.globalAlpha = 1;
    }

    // sol / lua
    const sx = w * 0.7;
    const sy = h * 0.2;
    const sr = Math.max(13, h * 0.085);
    const halo = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 3);
    halo.addColorStop(0, th.glow);
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = halo;
    g.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
    g.fillStyle = th.orb;
    g.beginPath();
    g.arc(sx, sy, sr, 0, Math.PI * 2);
    g.fill();

    // nuvens
    const unit = clamp(h / 9, 14, 30);
    for (const c of this.clouds) {
      c.x -= c.v * dt;
      if (c.x < -0.35) { c.x = 1.15; c.y = 0.06 + Math.random() * 0.88; }
      drawCloud(g, c.x * w, c.y * h, c.s * unit, th.cloud);
    }

    // rota de voo
    const G = this.geom();
    g.setLineDash([10, 12]);
    g.lineDashOffset = -t * 24;
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.strokeStyle = th.route;
    for (const k of LANES) {
      g.beginPath();
      g.ellipse(G.cx, G.cy, G.rx * k, G.ry * k, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.setLineDash([]);

    // linha de chegada dourada
    this.pulse = Math.max(0, this.pulse - dt * 3);
    g.save();
    g.lineWidth = 6 + this.pulse * 4;
    g.strokeStyle = '#ffd34d';
    g.shadowColor = '#ffd34d';
    g.shadowBlur = 10 + this.pulse * 16;
    g.beginPath();
    g.moveTo(G.cx, G.cy + G.ry * LANES[1] - 9);
    g.lineTo(G.cx, G.cy + G.ry * LANES[2] + 9);
    g.stroke();
    g.restore();

    // aviões
    const boosted = this.hooks.boosted();
    const planes = this.hooks.planes()
      .map((p) => ({ p, at: this.pos(p.t, p.n, G) }))
      .sort((a, b) => a.at.y - b.at.y);
    for (const { p, at } of planes) {
      const k = LANES[p.n || 0];
      const perimeter = 2 * Math.PI * Math.sqrt((G.rx * G.rx + G.ry * G.ry) / 2) * k;
      g.fillStyle = boosted ? '#ffe680' : '#ffffff';
      for (let i = 6; i >= 0; i--) {
        const back = (G.size * 0.42 + i * G.size * 0.15) / perimeter;
        const q = this.pos(p.t - back, p.n, G);
        g.globalAlpha = 0.5 * (1 - i / 7);
        g.beginPath();
        g.arc(q.x, q.y, G.size * 0.075 * (1 - i / 10), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      g.save();
      g.translate(at.x, at.y);
      g.rotate(at.rot);
      g.drawImage(planeSprite(p.l, 160), -G.size / 2, -G.size / 2, G.size, G.size);
      g.restore();
    }

    // moedas subindo
    this.flushPops(t, G);
    if (this.pops.length) {
      g.font = `900 ${Math.round(clamp(h * 0.085, 14, 26))}px ${FONT}`;
      g.textAlign = 'center';
      g.lineJoin = 'round';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(29,36,64,.85)';
      g.fillStyle = '#ffe066';
      this.pops = this.pops.filter((o) => (o.age += dt) < 1.1);
      for (const o of this.pops) {
        const k = o.age / 1.1;
        const y = o.y - k * h * 0.16;
        g.globalAlpha = 1 - k * k;
        g.strokeText(o.text, o.x, y);
        g.fillText(o.text, o.x, y);
      }
      g.globalAlpha = 1;
    }
  }
}
