const canvas = document.getElementById("lienzo");
const ctx = canvas.getContext("2d");

const params = new URLSearchParams(location.search);
const FRASE = params.get("t") || "I love you";

const TAMANO = 0.6;
const CAPAS = 4;
const SEPARACION = 1.1;
const TAM_LETRA = 1.0;
const VELOCIDAD = 1.5;
const ESPACIO = 3.2;
const DISTANCIA = 60;
const FUENTE_BASE = 20;
const GIRO = 0.75;
const INCLINACION = 0.2;

let W, H, S, dpr;
let CX = 0, CY = 0;

function corazon(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t)
            - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x, y };
}

const N = 1200;
let camino = [];
let PERIMETRO = 0;

(function construirCamino() {
  const fino = [];
  let acumulado = 0;
  let anterior = corazon(0);
  fino.push({ x: anterior.x, y: anterior.y, d: 0 });
  const PASOS = 4000;
  for (let i = 1; i <= PASOS; i++) {
    const p = corazon((i / PASOS) * Math.PI * 2);
    acumulado += Math.hypot(p.x - anterior.x, p.y - anterior.y);
    fino.push({ x: p.x, y: p.y, d: acumulado });
    anterior = p;
  }
  PERIMETRO = acumulado;

  let k = 0;
  for (let i = 0; i <= N; i++) {
    const objetivo = (i / N) * PERIMETRO;
    while (k < fino.length - 2 && fino[k + 1].d < objetivo) k++;
    const a = fino[k], b = fino[k + 1];
    const f = (objetivo - a.d) / (b.d - a.d || 1);
    camino.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  }
})();

function puntoEn(s) {
  s = ((s % PERIMETRO) + PERIMETRO) % PERIMETRO;
  const pos = (s / PERIMETRO) * N;
  const i = Math.floor(pos);
  const f = pos - i;
  const a = camino[i % N], b = camino[(i + 1) % N];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

const CANTIDAD = Math.max(1, Math.round(PERIMETRO / ESPACIO));
const PASO = PERIMETRO / CANTIDAD;

function unidad(x, y, z) {
  const x1 = x * Math.cos(GIRO) + z * Math.sin(GIRO);
  const z1 = -x * Math.sin(GIRO) + z * Math.cos(GIRO);
  const y2 = y * Math.cos(INCLINACION) - z1 * Math.sin(INCLINACION);
  const z2 = y * Math.sin(INCLINACION) + z1 * Math.cos(INCLINACION);
  const p = DISTANCIA / (DISTANCIA + z2);
  return { x: x1 * p, y: y2 * p, z: z2, p: p };
}

function calcular() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const zMax = ((CAPAS - 1) / 2) * SEPARACION;
  for (const z of [-zMax, zMax]) {
    for (const c of camino) {
      const u = unidad(c.x, c.y, z);
      if (u.x < minX) minX = u.x;
      if (u.x > maxX) maxX = u.x;
      if (u.y < minY) minY = u.y;
      if (u.y > maxY) maxY = u.y;
    }
  }
  CX = (minX + maxX) / 2;
  CY = (minY + maxY) / 2;
  const anchoU = (maxX - minX) + 5;
  const altoU = (maxY - minY) + 2;
  S = Math.min((W * TAMANO) / anchoU, (H * TAMANO) / altoU);
}

function ajustar() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  calcular();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
}
window.addEventListener("resize", ajustar);
ajustar();

function proyectar(x, y, z) {
  const u = unidad(x, y, z);
  return {
    x: W / 2 + (u.x - CX) * S,
    y: H / 2 + (u.y - CY) * S,
    z: u.z,
    p: u.p
  };
}

function dibujar(ms) {
  const tiempo = ms / 1000;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(0, 0, W, H);

  const flujo = tiempo * VELOCIDAD;
  const items = [];

  for (let j = 0; j < CAPAS; j++) {
    const z = (j - (CAPAS - 1) / 2) * SEPARACION;
    const desfase = j * PASO * 0.37;

    for (let i = 0; i < CANTIDAD; i++) {
      const s = i * PASO + flujo + desfase;
      const a = puntoEn(s);
      const pa = proyectar(a.x, a.y, z);
      items.push({ x: pa.x, y: pa.y, z: pa.z, p: pa.p });
    }
  }

  items.sort((m, n) => n.z - m.z);

  ctx.font = `300 ${FUENTE_BASE}px 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#ff6fae";
  ctx.shadowBlur = 8;

  for (const it of items) {
    const alpha = Math.min(1, Math.max(0.15, (it.p - 0.7) / 0.7));
    const escala = ((TAM_LETRA * S * it.p) / FUENTE_BASE) * dpr;

    ctx.setTransform(escala, 0, 0, escala, it.x * dpr, it.y * dpr);
    ctx.fillStyle = `rgba(255, 175, 215, ${alpha})`;
    ctx.fillText(FRASE, 0, 0);
  }

  requestAnimationFrame(dibujar);
}

requestAnimationFrame(dibujar);