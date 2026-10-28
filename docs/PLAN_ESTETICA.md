# Plan de mejora estética — Herramientas didácticas (octubre 2026)

Base empírica: build de producción, capturas en Chromium (1440×900 y 390×844) de 9 pestañas y
3 temas, lectura de `src/index.css` (2 198 líneas) y medición de contraste WCAG.
Marcos usados: revisión UI (Nielsen, Laws of UX, WCAG 2.2 AA, Refactoring UI, auditoría de
huellas de IA) y dirección de arte (frontend-design).

## 0. Contexto que condiciona cada decisión

- **Quién:** docente de medicina conduciendo una clase en vivo.
- **Dónde:** proyector (lectura a 6–10 m, luz ambiente, contraste degradado) y celular en mano.
- **Tarea:** disparar una dinámica en < 3 s sin perder el hilo de la clase.
- **Pendiente de confirmar:** el mensaje original se cortó en "El objetivo…". Insufficient data
  sobre el objetivo concreto (¿más legible en proyector?, ¿más "juego"?, ¿más sobrio/profesional?).
  El plan asume *legibilidad en proyector + identidad propia*; si el objetivo es otro, cambia la
  prioridad de las fases, no el diagnóstico.

## 1. Diagnóstico

La dirección fanzine/risográfica (papel, tinta, sombra sólida desplazada, semitono) **es una
decisión con carácter y conviene conservarla**. Los problemas no son de concepto; son de
ejecución y de jerarquía.

| # | Observación | Principio | Sev. (0–4) |
|---|---|---|---|
| 1 | El título "HERRAMIENTAS DIDÁCTICAS" (Anton rojo, ~90 px) se repite en **todas** las pestañas y ocupa ~15 % del alto útil; no dice dónde estás. El nombre real del módulo queda como `h2` dentro de una tarjeta. | Nielsen 1 (visibilidad del estado), jerarquía | 3 |
| 2 | Rojo de título sobre papel menta: contraste **2,62:1**. | WCAG 1.4.3 (texto grande ≥ 3:1) | 3 |
| 3 | Semáforo: las opciones inactivas se ven deshabilitadas (gris lavado), y la etiqueta "TRABAJO LIBRE / EQUIPO" en verde sobre papel da **1,87:1**. Precisamente el control que se proyecta es el menos legible. | WCAG 1.4.3, 1.4.1 (no depender del color) | 4 |
| 4 | Botones con texto claro: crema sobre verde 4,02:1, crema sobre rojo 3,95:1 (texto ~15 px). `--muted` sobre papel 4,14:1. | WCAG 1.4.3 (4,5:1) | 2 |
| 5 | Todo es tarjeta del mismo peso: mismo borde, misma sombra 5 px, mismo radio. El panel principal y un control secundario compiten igual. | Von Restorff, Refactoring UI | 3 |
| 6 | Grandes huecos vacíos (½ pantalla en Clase en vivo, Ruleta, Control de flujo, Examen) por rejilla de 3 columnas que no se adapta al contenido. | Composición, Fitts en proyector | 2 |
| 7 | Botones con colores sin significado (amarillo, rojo, verde, blanco conviven en la misma fila de Examen grupal). El rojo se usa para "Diseñar examen" y "Exportar respaldo", que no son destructivos; "Reset total" va en amarillo junto a "Importar". | Nielsen 4 y 5, contraste semántico | 3 |
| 8 | 34 líneas con emojis como iconos (📁 ✏️ 📋 📻 💾 📥 🎲 📺) mezclados con Lucide. Dos sistemas de iconos. | Consistencia, huella de IA | 2 |
| 9 | Escala tipográfica difusa: 30+ `font-size` distintos (0,78 / 0,8 / 0,85 / 0,88 / 0,9 / 0,92 / 0,95 rem…) y 37 `!important`. 14 radios distintos. | Sistema de diseño | 2 |
| 10 | Mezcla de idiomas y tono: "Heal (Recuperación)", "Game Show", "Asignar Lider" (sin tilde), mayúsculas tipo título en botones. | UX writing, Nielsen 2 | 1 |
| 11 | Móvil: la navegación es un carrusel horizontal que corta las etiquetas ("Sor…"); los temporizadores 15s/30s/60s/2m se apilan a ancho completo (4 botones enormes). | Adaptación a pantallas, Hick | 2 |
| 12 | Tema Noche: el logo pierde el trazo y desaparece; papel y tarjeta casi del mismo tono, la estructura se aplana. | Temas/modo oscuro | 2 |
| 13 | Estados vacíos mudos: "—" en Siguiente turno, Dados rápidos, Líder. No invitan a actuar. | Estados vacíos | 2 |

Lo que ya funciona y no se toca: `:focus-visible` definido, `prefers-reduced-motion` respetado
en 3 bloques, tokens por tema en `:root`, fuentes auto-hospedadas.

## 2. Dirección de arte: dos caminos

| Criterio | Opción A — Fanzine afinado | Opción B — Cartel de proyector |
|---|---|---|
| Concepto | Se conserva papel + tinta + sombra sólida; se ordena el sistema | El módulo activo se trata como un cartel a pantalla completa; la UI de control se retira a los bordes |
| Esfuerzo | Bajo–medio (CSS + ajustes de JSX) | Alto (reestructura de layout en 13 módulos) |
| Riesgo de regresión | Bajo | Medio–alto (tests e2e dependen del DOM) |
| Legibilidad a 8 m | Mejora moderada | Mejora alta |
| Identidad | Se mantiene y gana coherencia | Cambia; requiere validar con alumnos |
| Uso en celular | Mejora con nav inferior | Igual que A |

**Veredicto (3 líneas):**
A corrige los 13 hallazgos sin tirar una identidad que ya es propia; B resuelve mejor la distancia del proyector pero cuesta 3–4 veces más.
Recomendación: ejecutar A completo y tomar de B un solo elemento, el **modo Proyector unificado** (ya existe parcial en Ruleta y Código Rojo).
B solo se justifica si la prueba en aula (Fase 5) muestra que A sigue sin leerse desde el fondo.

## 3. Sistema propuesto (Opción A)

**Color — roles semánticos, no decorativos** (tema Prado):

| Token | Hex | Uso exclusivo |
|---|---|---|
| `--ink` | `#1E3A2B` | Texto, bordes, sombra |
| `--paper` | `#FBF6E9` | Superficies |
| `--field` | `#A6D9B0` | Fondo de página |
| `--action` | `#C7321F` (oscurecido desde `#E2412F`) | Acción principal, 1 por pantalla (≥ 4,5:1 con crema) |
| `--danger` | mismo rojo + icono + confirmación | Solo destructivos (Reset, Limpiar) |
| `--highlight` | `#FFD84A` | Estado activo / seleccionado (nav, semáforo activo) |

Los botones secundarios pasan a papel con borde de tinta. Fin del arcoíris por fila.

**Tipografía:** Anton solo para lo que se proyecta (número del temporizador, nombre sorteado,
título del módulo). Outfit para todo lo demás. Escala de 6 pasos, razón ~1,25:
`0,875 · 1 · 1,25 · 1,563 · 2,441 · clamp(4rem, 18vmin, 14rem)`.
Botones en tipo oración ("Diseñar examen"), sin mayúsculas forzadas.

**Profundidad = jerarquía:** sombra 7 px para el panel principal, 3 px para controles,
0 para paneles de configuración (solo borde). Radios: 2 valores (`6px`, `999px`).

**Iconos:** solo Lucide, mismo grosor; se retiran los 34 emojis de botones.

## 4. Fases

| Fase | Contenido | Hallazgos | Archivos |
|---|---|---|---|
| 1. Accesibilidad urgente | Contraste del semáforo, título, botones; semáforo inactivo legible + icono por estado | 2, 3, 4 | `index.css`, `FlowControl.jsx`, `LiveClass.jsx` |
| 2. Tokens y limpieza | Escala tipográfica, radios, sombras por nivel, eliminar `!important`, colores semánticos | 5, 7, 9 | `index.css`, componentes con hex sueltos (25) |
| 3. Encabezado y layout | Cabecera = nombre del módulo activo (marca solo en la barra lateral); rejilla que se ajusta al contenido | 1, 6 | `App.jsx`, `index.css` |
| 4. Detalle | Iconos Lucide, copy en español consistente, estados vacíos con acción, tema Noche, nav inferior en móvil | 8, 10–13 | componentes, `App.jsx` |
| 5. Validación | Prueba en aula real: leer el semáforo y el temporizador desde la última fila; axe/Lighthouse por tema; capturas antes/después | — | `tests/` |

Cada fase es un commit independiente y revisable; la Fase 1 sola ya elimina los dos hallazgos de severidad 3–4 que afectan al aula.

## 5. Tres cambios de mayor impacto

1. Semáforo legible y con significado más allá del color (hallazgo 3).
2. Cabecera que dice en qué módulo estás en lugar de repetir el nombre de la app (hallazgo 1).
3. Un solo color de acción por pantalla y profundidad según importancia (hallazgos 5 y 7).

Capas revisadas: contexto ✔ (objetivo final pendiente) · flujo ✔ · composición ✔ ·
accesibilidad ✔ (contraste medido; lector de pantalla no revisado) · pase visual ✔ ·
huellas de IA ✔ · validación con usuarios ✘ (Fase 5).

## 6. Estado (opción A aplicada, octubre 2026)

| Hallazgo | Estado | Qué se hizo |
|---|---|---|
| 1. Título repetido | Hecho | La cabecera muestra el módulo abierto; la materia queda como rótulo editable encima |
| 2. Título rojo sobre menta | Hecho | Título en tinta con sombra de color corrida |
| 3. Semáforo ilegible | Hecho | Componente único `TrafficLight`: franja de color, icono y texto en cada luz; la activa se rellena con tinta oscura fija (≥ 4,5:1) |
| 4. Contraste de botones y texto | Hecho | Colores de acción, éxito, error y texto atenuado ajustados en los 6 temas; 0 fallos en los pares revisados |
| 5. Todas las tarjetas iguales | Hecho | `card-main` (sombra grande), `card` (chica), `card-quiet` (sin sombra) |
| 6. Huecos vacíos | Parcial | Clase en vivo con semáforo dominante y columna lateral; el resto conserva su rejilla |
| 7. Color sin significado | Hecho | Una acción principal por pantalla; `.danger` para borrar/reiniciar; amarillo solo para "activo" |
| 8. Emojis como iconos | Hecho en botones | Lucide en botones de control; los mensajes del juego, avatares y Ayuda conservan sus emojis |
| 9. Escala tipográfica y radios | Hecho | 6 tamaños (`--fs-*`) y 3 radios (`--radius`, `--radius-sm`, `--radius-pill`) en el CSS global |
| 9b. `!important` | Pendiente | 37 siguen: casi todos compiten con estilos escritos dentro de los componentes (sobre todo el examen) |
| 10. Copy mezclado | Hecho | Sin "Heal", "Game Show" ni "Reset"; tipo oración en títulos y botones tocados |
| 11. Navegación en móvil | Hecho | Barra inferior al alcance del pulgar, icono sobre texto |
| 12. Tema Noche | Revisado | El logo sí se dibuja (la captura anterior se tomó antes de que terminara su animación); contraste corregido |
| 13. Estados vacíos | Hecho | "Nadie todavía", "Elige un dado", "Sin asignar" |

## 7. Cómo corregir lo pendiente

Orden sugerido: de menor a mayor riesgo. Cada punto cabe en un PR propio y se
verifica con `npm run lint`, `npm run build`, `npm run test:e2e` y el script de
contraste (pares texto/fondo por tema, mínimo 4,5:1).

### 7.1 Estilos en línea del Examen grupal → clases (desbloquea los `!important`)

**Diagnóstico.** `GroupExam.jsx` tiene 137 atributos `style={{…}}`, 32 de ellos
con `fontSize` fijo. El modo proyector (`.exam-stage`, en `index.css`) solo puede
ganarles con `!important`: de los 37 que quedan, 19 viven en ese bloque y otros
6 en la versión móvil del examen.

**Corrección.**
1. Extraer los estilos repetidos a clases con nombre de función, no de aspecto:
   `.exam-saved-item`, `.exam-music-menu`, `.exam-track-btn` (con `[aria-pressed]`
   para la pista elegida), `.exam-feedback`, `.exam-podium-place`.
2. Pasar los `fontSize` fijos a la escala (`var(--fs-sm)` … `var(--fs-xl)`); los
   que dependen de `isStage` se vuelven una regla `.exam-stage .x { … }`.
3. Con el JSX ya sin estilos en línea, borrar los `!important` del bloque
   `.exam-stage` uno por uno, revisando el modo proyector tras cada uno (la prueba
   `examen.spec.js › Modo proyector` cubre que todo quepa sin scroll).
4. Mantener `!important` solo donde gana a librerías o al navegador: canvas a
   pantalla completa (`.fs-card:fullscreen canvas`), `.module-pane[hidden]` y los
   `16px` que evitan el zoom de iOS.

**Riesgo.** Medio: es el archivo más grande (≈1 750 líneas). Hacerlo por
secciones (preparación → editor → juego → podio), un commit por sección.

### 7.2 Valores sueltos fuera del sistema en otros módulos

**Diagnóstico.** 54 tamaños de letra fijos y 41 colores escritos a mano
(`#hex`, `'white'`, `'black'`) en componentes; los que más tienen son
`TouchOrder.jsx` (14 colores), `GroupExam.jsx` (11) y `Ruleta.jsx` (10).

**Corrección.**
- Tamaños: sustituir por `var(--fs-*)` con la misma regla de redondeo usada en el
  CSS global (< 0,9 rem → `--fs-sm`; 0,9–1,05 → `--fs-base`; etc.).
- Colores en JSX: usar los tokens (`var(--text)`, `var(--on-signal)`,
  `var(--error)`…). Excepción: la ruleta pinta en `<canvas>`, que no entiende
  `var()`. Ahí se leen los tokens una vez con
  `getComputedStyle(document.body).getPropertyValue('--primary')` y se repinta al
  cambiar de tema.
- Prevención: una regla de ESLint (`no-restricted-syntax`) que avise ante
  `fontSize` numérico o `#hex` dentro de `style={{}}`.

### 7.3 Huecos en la rejilla (hallazgo 6, parcial)

**Diagnóstico.** Clase en vivo ya tiene su rejilla propia. Progreso RPG, Ruleta y
Control de flujo usan `.grid` genérica (`auto-fit, minmax(300px, 1fr)`): cuando
una tarjeta es mucho más alta que sus vecinas, deja una columna vacía debajo.

**Corrección.** Aplicar el mismo patrón que `live-grid`: una clase por módulo que
declare qué tarjeta domina (`grid-row: span 2`) y cuáles se apilan a su lado. En
Progreso RPG: Jerarquía como principal; Energía e Insignias apiladas; Respaldo a
lo ancho abajo, como panel `card-quiet`.

### 7.4 Ajustes finos vistos en las capturas

- **Semáforo muy alto en monitores grandes.** Limitar la altura de las luces
  en Clase en vivo: `.live-main .traffic-btn { max-height: 42vh; }`. En proyector
  sigue llenando; en un monitor de 27" deja de verse como tres columnas vacías.
- **Insignias en 3 + 1.** Fijar dos columnas (`repeat(2, 1fr)`) con
  `aspect-ratio: auto` para formar un 2 × 2 equilibrado sin que los nombres se
  partan.

### 7.5 Accesibilidad que falta medir

- **Prueba automática.** Añadir `@axe-core/playwright` y una prueba que recorra
  las 13 pestañas en los 6 temas y falle ante violaciones de nivel AA. Cubre lo
  que el script de contraste no ve (texto sobre imágenes, etiquetas, roles).
- **Lector de pantalla.** Revisión manual con NVDA o VoiceOver de tres flujos:
  cambiar el semáforo, sortear un alumno y responder una pregunta del examen. El
  semáforo ya anuncia su estado con `aria-pressed`; falta comprobar que el cambio
  de módulo se anuncie (opción: mover el foco al `<h1>` al cambiar de pestaña).

### 7.6 Fase 5: validación en aula

Los cambios anteriores son hipótesis sustentadas en heurísticas; solo el aula
las confirma.

1. Proyectar Clase en vivo y Control de flujo en el salón habitual.
2. Desde la última fila, 3–5 alumnos dicen en voz alta el estado del semáforo
   y el número del temporizador. Registrar aciertos y dudas.
3. Repetir con el tema Noche y con las luces del salón encendidas.
4. Criterio de éxito: todos leen el estado sin acercarse. Si falla, considerar
   la opción B (modo cartel) solo para esos dos módulos.
