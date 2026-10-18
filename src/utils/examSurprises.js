import { RNG } from './rng';

// Premios escondidos del tablero del examen grupal. Afectan solo la posición
// en el tablero (y el regalo, que suma XP): son de azar, no de mérito.
export const SORPRESAS = [
  { id: 'cohete', emoji: '🚀', label: '¡COHETE!', detail: 'Salta 8 casillas', peso: 30 },
  { id: 'regalo', emoji: '🎁', label: '¡REGALO!', detail: '+5 XP', peso: 25 },
  { id: 'torbellino', emoji: '🌀', label: '¡TORBELLINO!', detail: 'Cambia de lugar con otro equipo', peso: 25 },
  { id: 'cascara', emoji: '🍌', label: '¡CÁSCARA!', detail: 'Resbala 6 casillas', peso: 20 },
];

export const COHETE_PASOS = 8;
export const CASCARA_PASOS = 6;
export const REGALO_XP = 5;

// Elige una sorpresa según su peso. `sinTorbellino` se usa cuando solo hay un
// equipo y no hay con quién intercambiar lugar.
export const pickSorpresa = (sinTorbellino = false) => {
  const lista = sinTorbellino ? SORPRESAS.filter(s => s.id !== 'torbellino') : SORPRESAS;
  const total = lista.reduce((a, s) => a + s.peso, 0);
  let r = RNG.int(1, total);
  for (const s of lista) {
    r -= s.peso;
    if (r <= 0) return s;
  }
  return lista[0];
};

// Casillas sorpresa repartidas por todo el tablero: una por tramo, sin tocar
// el inicio, la meta ni las casillas de hito (9, 19, 29…).
export const makeSurprises = (tramos = 6) => {
  const min = 6;
  const max = 94;
  const ancho = (max - min + 1) / tramos;
  const out = [];
  for (let i = 0; i < tramos; i++) {
    const desde = Math.round(min + i * ancho);
    const hasta = Math.round(min + (i + 1) * ancho) - 1;
    const candidatas = [];
    for (let t = desde; t <= hasta; t++) if (t % 10 !== 9) candidatas.push(t);
    if (candidatas.length) out.push(candidatas[RNG.int(0, candidatas.length - 1)]);
  }
  return out;
};

// Preguntas doradas (XP x2): alrededor de una de cada cinco, nunca la última
// (la Gran Final ya tiene su apuesta) y solo si el examen tiene 3 o más.
export const chooseGolden = (count) => {
  if (count < 3) return [];
  const cuantas = Math.max(1, Math.round(count * 0.2));
  const candidatas = Array.from({ length: count - 1 }, (_, i) => i);
  return RNG.shuffle(candidatas).slice(0, cuantas).sort((a, b) => a - b);
};
