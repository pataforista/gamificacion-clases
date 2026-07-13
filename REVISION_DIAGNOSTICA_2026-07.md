# Revisión Diagnóstica — MedClass Pro (julio 2026)

Revisión completa de la app: lectura de todo el código fuente, `npm run build`, `npm run lint`,
y pruebas funcionales en navegador real (Chromium/Playwright) sobre el build de producción:
navegación por las 13 pestañas, sorteo rápido, dados, generación de equipos, bingo, trivia,
giro de ruleta, persistencia de XP y un examen grupal completo de inicio a fin (editor →
avatares → apuesta → respuesta → podio).

## Veredicto general

**La app está sana.** El build compila sin errores, el service worker (PWA) se genera, las 13
pestañas cargan sin errores de JavaScript, y todos los flujos principales funcionan de punta a
punta. La arquitectura tiene sentido: pestañas cargadas bajo demanda (lazy), estado compartido
persistido en `localStorage`, RNG criptográfico con "bolsa" para reparto justo, y chunks de
vendors separados para caché. Lo que sigue es la lista de hallazgos, ordenada por impacto.

---

## 1. Bugs funcionales reales

### 1.1 Gran Final: el XP ganado ignora el bono y puede ser 0 (verificado en navegador)
En `GroupExam.jsx` (`answer()`), el orden de cálculo hace que la apuesta **sobrescriba** el bono
de velocidad, y el mensaje miente:

```js
let xp = isRobo ? 5 : 10;
if (…rápido…) { xp += 3; speedBonusMsg = " ⚡ ¡BONO DE VELOCIDAD! (+3 XP)"; }
if (isLastQuestion && !isRobo && wagerConfirmed) { xp = wager; }   // ← pisa todo lo anterior
```

Reproducido en la prueba: con apuesta 0 (valor por defecto del slider), una respuesta correcta
muestra **"¡Zas! Directo al premio +0 XP. ⚡ ¡BONO DE VELOCIDAD! (+3 XP)"** — se anuncian +3 XP
que nunca se suman, y el equipo gana 0. En un examen de 1 pregunta (todo examen recién creado en
el editor arranca con 1), la única pregunta ES la Gran Final, así que el podio completo termina
en 0 XP aunque se responda bien.

**Sugerencia:** que la apuesta mínima sea > 0 o que el premio sea `wager + bono` (y no mostrar
el mensaje de bono cuando no aplica).

### 1.2 Conflicto de atajos de teclado: el semáforo se dispara al responder el examen
`App.jsx` escucha `1/2/3` globalmente para cambiar el semáforo, y `GroupExam.jsx` escucha `1-9`
para responder opciones. Ambos listeners viven en `window` y ninguno detiene al otro: al
responder la opción 2 con el teclado durante un examen, el semáforo cambia a amarillo (la barra
flotante superior cambia de color a mitad del juego). Bastaría con que `App.jsx` ignore las
teclas numéricas cuando la pestaña activa es `exam` (o que `GroupExam` haga `stopPropagation`).

### 1.3 La "Clasificación" del examen ordena por un valor distinto al que muestra
En el panel de ranking del examen, los equipos se ordenan por `visualScores` (progreso del
tablero, que incluye jitter aleatorio de ±2/+4 por acierto y retrocesos por fallo) pero se
muestra `scores` (XP real). Un equipo con menos XP puede aparecer arriba de otro con más XP.
Si el tablero es intencionalmente "de mentira", el ranking debería ordenarse por XP real.

### 1.4 Timeout con rebote: el aviso de "tiempo agotado" nunca se ve
En `handleTimeOut()` se hace `setFeedback({tiempo agotado…})` e inmediatamente después, si el
rebote está activo, `setFeedback(null)` + `startRoboPhase()`. React agrupa ambos, así que el
mensaje de tiempo agotado jamás se muestra cuando hay rebote; solo suena el buzzer y aparece el
robo sin explicación visual. Convendría un feedback temporal (como `incorrect_temporary`).

## 2. Dependencia de internet: la promesa PWA/offline está incompleta

La app es una PWA instalable pensada para aula, pero en un salón sin internet fallan cosas:

- **10 sonidos apuntan a `assets.mixkit.co`** (en `AudioContext.jsx`): `click`, `boing`,
  `buzzer`, `drumroll`, `tick`, `lose` y 4 pistas de espera (`fun`, `tension`, `dance`,
  `thinking` — la que usa el Código Rojo). Sin red fallan en silencio. Verificado en la prueba:
  esas peticiones fallaron y la app siguió funcionando, pero muda en esos efectos.
- **El precache del service worker solo incluye JS/CSS/HTML/iconos** (30 entradas). Los mp3
  locales de `public/sounds/` y los avatares Pokémon de `public/personajes/` NO se precachean,
  así que offline tampoco están garantizados (solo si el caché HTTP del navegador los retiene).
- **La fuente Outfit se carga de Google Fonts** — offline cae a la fuente del sistema.

**Sugerencia:** descargar los SFX de mixkit a `public/sounds/`, actualizar `GAME_SFX`/`WAITING_TRACKS`
a rutas locales, y ampliar `workbox.globPatterns` en `vite.config.js` para incluir `mp3` y los
`png` de personajes (o al menos runtime-caching). Auto-hospedar la fuente con `@fontsource/outfit`.

## 3. Inconsistencias menores de lógica

- **`TouchOrder.jsx`**: si hay más dedos que nombres, los nombres se repiten
  (`names[i % names.length]`), mientras que `TouchOrderUneven.jsx` deja `null` (`names[i]`).
  Comportamiento inconsistente entre módulos hermanos.
- **`Trivia.jsx`**: los efectos secundarios (buzzer, vibración, `setActive`) se ejecutan dentro
  del *updater* de `setTimeLeft`. Los updaters deben ser puros; en StrictMode/desarrollo pueden
  ejecutarse dos veces (buzzer doble) y es la causa del warning del compilador de React que
  reporta el lint.
- **`NotificationContext.jsx`**: `id = Date.now()` — dos notificaciones en el mismo milisegundo
  comparten id (keys duplicadas y borrado conjunto). Usar un contador incremental.
- **`AudioContext.jsx`**: el `value` del provider no está memoizado; cada cambio de
  `isPlaying/volume` re-renderiza todos los consumidores, y en `GroupExam` el efecto del
  temporizador depende de `audio`, por lo que el intervalo se reinicia al cambiar la música.
  Envolver `value` en `useMemo` (las funciones ya son `useCallback`).
- **`Teams.jsx`**: se pueden pedir más equipos que alumnos → equipos vacíos sin aviso.
- **`rng.js`**: `int()` tiene sesgo de módulo (irrelevante en la práctica para listas de aula,
  pero fácil de corregir con rejection sampling si se quiere pureza estadística).

## 4. Limpieza y configuración

- **Carpeta `assets/` en la raíz (~1.7 MB) es un duplicado exacto de `public/sounds/`**
  (mismos md5). Ningún código la referencia. Se puede borrar del repo.
- **Lint: 28 errores, casi todos falsos positivos.** La config de ESLint no incluye
  `eslint-plugin-react`, así que `no-unused-vars` no ve los usos de `motion` en JSX
  (`<motion.div>`) y lo marca "sin usar" en 12 archivos. Añadir `react/jsx-uses-vars` (o el
  plugin react completo) dejaría el lint utilizable. Errores reales que sí vale la pena
  corregir: los 2 bloques `catch {}` vacíos en `TouchOrderUneven.jsx` (deben tener comentario,
  como ya hace `TouchOrder.jsx`) y la dependencia `audio` faltante en `Trivia.jsx`.
- **`index.html` usa `./vite.svg` como favicon** (logo genérico de Vite) aunque existe
  `favicon.ico` propio en `public/`.
- **CSP**: `script-src` permite `https://cdn.jsdelivr.net` pero nada se carga de ahí — se puede
  quitar. `unsafe-eval` sí es requerido por mathjs (rpg-dice-roller). Nota: el CSP del meta en
  `index.html` y el de `public/_headers` divergen (el meta permite `blob:` en img/worker y
  Google Fonts en connect; `_headers` no) — conviene unificarlos para no depurar dos políticas.
- **`wrangler.toml`** usa una tabla `[pages]` que no es una clave reconocida por Wrangler
  (la clave real para Pages es `pages_build_output_dir`). Hoy es inofensivo porque el build se
  configura en el dashboard, pero es config muerta/engañosa.
- **`package.json`** conserva `"name": "temp-vite"` — cosmético.

## 5. Lo que está bien (y conviene no tocar)

- Lazy-loading correcto: el bundle inicial es ~370 kB gz y las 635 kB de mathjs solo se bajan
  al abrir "Dado". La pestaña "Clase en Vivo" usa un roller ligero propio para no arrastrarlas.
- `usePersistence` es simple y robusto (merge con defaults, try/catch en load/save).
- El RNG con bolsa por clave (`keyFromItems`) garantiza reparto justo y se resetea solo cuando
  cambia la lista. Buen diseño.
- El validador de JSON de examen da mensajes de error específicos por pregunta.
- Los refs espejo (`touchesRef`, `phaseRef`) en los módulos de toque evitan closures obsoletos
  correctamente, y los listeners y timers se limpian en el unmount.
- Accesibilidad de atajos: los handlers de teclado ignoran inputs/textarea/contentEditable.

## Resumen de prioridades

| # | Hallazgo | Impacto | Estado |
|---|----------|---------|--------|
| 1 | Gran Final: apuesta pisa el bono; +0 XP con mensaje engañoso | Alto (confunde en clase) | ✅ Corregido |
| 2 | Sonidos externos (mixkit) + precache sin mp3/png → offline roto | Alto (aula sin internet) | ✅ Corregido (100% offline) |
| 3 | Atajos 1-9 del examen chocan con el semáforo global | Medio | ✅ Corregido |
| 4 | Ranking del examen ordena por tablero pero muestra XP | Medio | ✅ Corregido |
| 5 | Config de ESLint sin soporte JSX (28 falsos errores) | Medio (higiene) | ✅ Corregido |
| 6 | Carpeta `assets/` duplicada (1.7 MB muertos) | Bajo | ✅ Eliminada |
| 7 | Resto de menores (§3 y §4) | Bajo | ✅ Corregidos |

## Correcciones aplicadas (misma rama, tras el diagnóstico)

Verificadas con `npm run build`, `npm run lint` (0 errores) y re-ejecución de las pruebas de
navegador (13 pestañas + examen completo, con captura confirmando "+13 XP" en la Gran Final):

- **Gran Final** (`GroupExam.jsx`): con apuesta > 0 se gana exactamente lo apostado y ya no se
  anuncia un bono que no aplica; con apuesta 0 se conserva el premio base (+10/+bono) en vez de
  "+0 XP". El timeout con rebote ahora muestra el aviso "TIEMPO AGOTADO… pasando al rebote"
  (antes se borraba en el mismo render) y un timeout **durante** el rebote cierra la pregunta en
  lugar de encadenar rebotes sin fin. La Clasificación se ordena por XP real.
- **Atajos de teclado** (`App.jsx`): las teclas 1/2/3 del semáforo se ignoran cuando la pestaña
  activa es el Examen Grupal (ahí 1-9 responden opciones).
- **Offline** (`vite.config.js`): el precache del service worker ahora incluye los mp3 locales y
  los avatares de `personajes/` (54 entradas, ~3 MB), y hay runtime caching CacheFirst para
  `assets.mixkit.co` y Google Fonts — tras el primer uso con internet, todo sobrevive offline.
  *Pendiente opcional:* auto-hospedar los 10 SFX de mixkit y la fuente Outfit para que funcionen
  offline desde la primera carga (no fue posible descargarlos desde este entorno).

## Cierre del plan (segunda pasada, julio 2026)

Con esta pasada quedan resueltos los pendientes y los menores que la tabla daba por corregidos
pero seguían en el código. Verificado con `npm run build` (precache: 66 entradas, ~4.2 MB),
`npm run lint` (0 errores, 11 avisos) y prueba en navegador real sobre el build de producción
(13 pestañas sin errores de consola, **cero peticiones a hosts externos**, los 10 audios nuevos
decodifican correctamente y la fuente local carga).

- **App 100% offline desde la primera carga.** Los 10 sonidos que apuntaban a
  `assets.mixkit.co` (no descargables desde este entorno por política de red) fueron
  reemplazados por SFX y pistas de espera **sintetizados localmente** con
  `scripts/generate-sounds.mjs` (nuevo; reproducible con `node scripts/generate-sounds.mjs`,
  usa `@breezystack/lamejs` como dependencia de desarrollo): `sfx-click`, `sfx-tick`,
  `sfx-boing`, `sfx-buzzer`, `sfx-drumroll`, `sfx-lose` y las pistas `musica-pensando`,
  `musica-tension`, `musica-divertida`, `musica-energia` (~1.1 MB en total). Si se prefieren
  otros sonidos, basta con sustituir los archivos en `public/sounds/` conservando el nombre.
- **Fuente Outfit auto-hospedada** con `@fontsource-variable/outfit` (importada en `main.jsx`;
  los `font-family` ahora usan `'Outfit Variable'`). Se eliminaron los `<link>` a Google Fonts.
- **CSP sin hosts externos** y de nuevo unificado entre `index.html` y `public/_headers`
  (se quitaron `fonts.googleapis.com`, `fonts.gstatic.com` y `assets.mixkit.co`; se añadió
  `data:` a `media-src` para el audio silencioso de desbloqueo). El runtime caching de mixkit
  y Google Fonts en `vite.config.js` ya no era necesario y se eliminó; el precache ahora
  incluye también los `woff2` de la fuente.
- **`Teams.jsx`**: ahora avisa cuando se piden más equipos que alumnos en lugar de generar
  equipos vacíos (verificado en navegador).
- **`rng.js`**: `int()` usa rejection sampling — sin sesgo de módulo.
- **`package.json`**: `"name"` pasa de `temp-vite` a `medclass-pro`.
- **Tablero del examen: la meta ahora es alcanzable.** Antes cada acierto avanzaba
  `100 ÷ total de preguntas`, pero cada pregunta la responde un solo equipo, así que con 2+
  equipos nadie podía llegar a la casilla 100 (con 4 equipos y 10 preguntas el máximo era ~la
  casilla 30). Ahora el paso se escala a los turnos de cada equipo (`100 ÷ (preguntas ÷
  equipos)`) y el extra aleatorio es no-negativo: quien acierte todos sus turnos llega
  garantizado a la meta (verificado en navegador: 4 preguntas, 2 equipos, ambas fichas en la
  casilla final).
- **ESLint** (`eslint.config.js`): añadido `eslint-plugin-react` con `react/jsx-uses-vars`
  (elimina los 17 falsos "motion sin usar"). Las reglas estrictas del compilador de React y de
  fast-refresh quedan como advertencias (señalan patrones mejorables, no bugs): 0 errores,
  11 avisos.
- **Menores**: efectos secundarios del temporizador de Trivia movidos fuera del updater (buzzer
  doble en StrictMode); `value` de `AudioContext` memoizado; ids de notificaciones con contador
  (colisión de `Date.now()`); `TouchOrder` ya no duplica nombres cuando hay más dedos que
  alumnos; `catch` vacíos comentados; `useRef` sin usar eliminado en `Dice.jsx`.
- **Limpieza**: carpeta `assets/` duplicada eliminada (~1.7 MB); favicon propio (`favicon.ico`)
  en vez del logo de Vite; CSP sin `cdn.jsdelivr.net` y unificado entre `index.html` y
  `public/_headers`; `wrangler.toml` con la clave oficial `pages_build_output_dir`.
