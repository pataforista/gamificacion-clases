import { RNG } from './rng';

// Opciones que solo tienen sentido al final ("Todas las anteriores", etc.).
const ANCLADA = /^\s*(todas|ninguna|ambas|cualquiera)\b.{0,40}(anteriores|correct|arriba|opciones|son\s+(v[aá]lid|cierta))/i;

// Opciones que se refieren a otras por letra ("A y B", "Solo la opción C"):
// si cambian de lugar, dejan de significar lo mismo.
const POR_LETRA = /^\s*[a-d]\s*(y|e|o|,|y\/o)\s*[a-d]\s*[.)]?\s*$|\b(opci[oó]n|opciones|inciso|incisos)\s+[a-d]\b/i;

// Baraja las opciones de una pregunta y ajusta `correctIndex` para que siga
// apuntando a la misma respuesta. Devuelve una copia; no modifica la original.
//  - Las opciones ancladas ("Todas las anteriores") se quedan al final.
//  - Si alguna opción se refiere a otra por letra, la pregunta no se baraja.
export const barajarOpciones = (q) => {
  const opciones = [...q.options];
  if (opciones.some(o => POR_LETRA.test(String(o)))) return { ...q, options: opciones };

  const idx = opciones.map((_, i) => i);
  const libres = idx.filter(i => !ANCLADA.test(String(opciones[i])));
  const ancladas = idx.filter(i => ANCLADA.test(String(opciones[i])));
  if (libres.length < 2) return { ...q, options: opciones };

  const orden = [...RNG.shuffle(libres), ...ancladas];
  return {
    ...q,
    options: orden.map(i => opciones[i]),
    correctIndex: orden.indexOf(q.correctIndex),
  };
};
