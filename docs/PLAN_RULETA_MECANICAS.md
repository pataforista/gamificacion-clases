# Plan de implementación: Sorteo de mecánicas didácticas, uso privado del docente (pregrado y posgrado)

> Objetivo: agregar a "Herramientas didácticas" un módulo *zero-prep* **de uso
> exclusivo del docente** que, sobre cualquier diapositiva ya proyectada, sortee
> una mecánica de procesamiento activo y le muestre **solo al docente** la
> instrucción, el tiempo y las reglas, en dos versiones: **pregrado** y **posgrado**.
>
> **Restricción de diseño:** no se proyecta nada, no hay tablero, ruleta
> animada, confeti ni sonidos. El grupo nunca ve la herramienta; solo escucha
> la consigna que el docente lee en voz alta. La pantalla del salón sigue
> mostrando la presentación.
>
> Audiencia de este documento: el docente que usará la herramienta y quien
> programe el cambio. Alcance: diseño pedagógico, especificación técnica,
> fases y forma de evaluar si funciona.

---

> **Estado:** Fases 1 a 4 implementadas (pestaña **Mecánicas**: `src/components/Mecanicas.jsx`,
> catálogo en `src/data/mecanicas.js`, pruebas en `tests/e2e/mecanicas.spec.js`).
> Pendiente: Fase 5 (piloto en clase). Diferencias con el diseño: el componente se llama
> `Mecanicas.jsx` y el registro de sesión vive solo en memoria (se exporta a CSV, no se guarda).

## 1. Punto de partida: lo que ya existe

`src/components/Ruleta.jsx` es una ruleta visual pensada para proyectar (lienzo
animado, confeti, sonido, modo proyector). **No se modifica**: queda como está
para quien la quiera usar así. El módulo nuevo es otra cosa: un **sorteador
discreto** que el docente consulta en su laptop, tableta o celular.

| Se reutiliza del repo | Se construye nuevo |
|---|---|
| Azar con `crypto` y bolsa sin repeticiones (`RNG.pickBalancedIndex`) | Catálogo de mecánicas con instrucción, tiempo y modalidad |
| Lista de clase (`pickerItems`) para elegir alumno | Pestaña **Sorteo de mecánicas** con interfaz de texto, sin animaciones |
| Persistencia en `usePersistence` | Selector **Pregrado / Posgrado** y filtro por categoría |
| Temas de color (para que se lea bien en el dispositivo del docente) | Cronómetro silencioso (aviso por vibración en celular) |
| App PWA, funciona sin internet | Botones *Otra*, *Misma en la siguiente lámina*, *Pasó* |

La app ya funciona sin internet, así que no hace falta un HTML aparte: basta
abrir la pestaña en el celular mientras la computadora proyecta las diapositivas.

---

## 2. Qué dice la evidencia (y qué no dice)

La idea central —que el alumno procese la lámina en vez de solo mirarla— tiene buen
respaldo. La parte de la *ruleta* como tal tiene respaldo más modesto. Conviene
separar ambas cosas.

| Componente del diseño | Evidencia | Matiz que cambia el diseño |
|---|---|---|
| Sustituir exposición por procesamiento activo | Metaanálisis de 225 estudios en STEM de pregrado: +0.47 DE en exámenes; la clase expositiva tuvo 1.5 veces más probabilidad de reprobación (Freeman et al., 2014). | Datos de pregrado STEM. Para posgrado clínico o humanidades la extrapolación es plausible, no demostrada. |
| Jerarquía de mecánicas | Marco ICAP: el aprendizaje tiende a crecer de Pasivo → Activo → Constructivo → Interactivo (Chi y Wylie, 2014). | Es un marco predictivo; al menos un estudio de laboratorio no reprodujo el orden. Útil para clasificar, no como ley. |
| Mecánicas de recuperación (#5, #6, #10) | Recuperar información mejora la retención a días y semanas más que releer (Roediger y Karpicke, 2006). Generar preguntas propias rinde de forma comparable a contestar pruebas (Ebersbach et al., 2020). | El beneficio aparece en la retención diferida; en la misma clase puede no notarse. |
| Enseñar al otro (#7, #8) | Preparar para enseñar ayuda a corto plazo; **enseñar de verdad** sostiene la ventaja a una semana (Fiorella y Mayer, 2013). | Justifica que "Toma la Cátedra" sea explicación en voz alta, no solo preparación. |
| Traducir a lego (#4) | *Teach-back* fue eficaz en 19 de 20 estudios clínicos de una revisión sistemática (Talevski et al., 2020). | Evidencia en pacientes, no en alumnos; aquí se usa como formato de ensayo comunicativo. |
| Pre-mortem (#12) | La "retrospección prospectiva" genera más razones de fallo (Mitchell et al., 1989; popularizado por Klein, 2007). | El famoso "+30 %" mide **cantidad** de razones, no su calidad. |
| Llamar al azar (la ruleta en sí) | Con *cold-calling* frecuente aumentó la participación voluntaria y la comodidad para participar (Dallimore et al., 2013). | Cerca de 60 % de alumnos de ciencias reportó más ansiedad con llamado al azar; depende de cómo se implementa (Cooper et al., 2018). |
| Envoltura de juego | Gamificación en aprendizaje: efectos pequeños a moderados; cognitivo g = 0.49, motivacional g = 0.36, conductual g = 0.25 (Sailer y Homner, 2020). | El efecto cognitivo fue el más estable. La ruleta motiva poco por sí sola; el peso lo carga la mecánica. |

**Consecuencia práctica:** el azar es el vehículo, la mecánica es el fármaco. Y
como el vehículo puede generar ansiedad, el diseño necesita amortiguadores
(sección 5), sobre todo en pregrado.

---

## 3. Modelo pedagógico: 12 mecánicas × 2 niveles

Mismas 12 casillas, misma lógica de categorías, pero con distinta carga cognitiva.
En posgrado la tarea apunta a **crítica y transferencia**; en pregrado, a
**comprensión, recuperación y primer contacto con la crítica**, con andamiaje
(frases de arranque, trabajo en dupla antes de hablar, tiempos un poco más cortos
o con 30 s extra para pensar).

### Categoría 1 · Análisis crítico

| # | Posgrado (original) | Pregrado (adaptación) | Andamiaje pregrado | ICAP |
|---|---|---|---|---|
| 1 | **Abogado del Diablo** · sesgo, límite o supuesto no declarado (2 min) | **¿Y si no fuera cierto?** · "Esto solo funciona si…" (2 min) | El docente dice la frase de arranque; dupla 30 s antes | C |
| 2 | **Lo Omitido** · variable, contexto o factor ético ausente (2 min) | **¿Qué le falta?** · elige 1 de: edad, contexto, costo, riesgo (2 min) | Lista corta de opciones visible | C |
| 3 | **Teoría vs. Trinchera** · dónde choca con la práctica y cómo se resuelve (2 min) | **Ejemplo real** · un caso de la vida cotidiana o de prácticas donde aparezca esto (2 min) | Se vale ejemplo personal o visto en video | C |

### Categoría 2 · Traducción y síntesis

| # | Posgrado | Pregrado | Andamiaje pregrado | ICAP |
|---|---|---|---|---|
| 4 | **Doble Traducción** · a colega de otra área y a familiar en crisis (2 min) | **Explícalo a tu abuela** · un solo nivel, sin tecnicismos (90 s) | El grupo levanta la mano si oye jerga | C |
| 5 | **En 12 Palabras** · conclusión accionable (1 min) | **Tuit de 15 palabras + 3 palabras clave** (1 min) | Todos escriben; se leen 3 al azar | C |
| 6 | **El Puente** · conecta con la semana pasada (2 min) | **El Puente corto** · conecta con la lámina anterior o el inicio de la clase (2 min) | Distancia temporal menor | C |

### Categoría 3 · Simulación e inversión de roles

| # | Posgrado | Pregrado | Andamiaje pregrado | ICAP |
|---|---|---|---|---|
| 7 | **Toma la Cátedra** · explica la lámina *siguiente*, aún no vista (3 min) | **Narrador** · explica la lámina *actual* como si fueras el profe (90 s) | Puede elegir un "copiloto" que complete | C→I |
| 8 | **Interconsulta** · uno plantea problema complejo, otro asesora (3 min) | **Pregunta y respuesta** · uno pregunta algo que no entendió, otro responde con la lámina (2 min) | La lámina sigue visible | I |
| 9 | **Escenario Extremo** · recursos cero, urgencia, población atípica (2 min) | **¿Y si cambia X?** · el docente dice qué variable cambia (2 min) | Variable acotada por el docente | C |

### Categoría 4 · Interrogación inversa y debate

| # | Posgrado | Pregrado | Andamiaje pregrado | ICAP |
|---|---|---|---|---|
| 10 | **Diseña el Reactivo** · pregunta que mida razonamiento (3 min) | **Pregunta de repaso** · opción múltiple de 3 opciones, una distractora creíble (2 min) | El docente da la plantilla "¿Cuál de estas…?" | C/I |
| 11 | **Dilema Ético** · conflicto ético, económico o práctico (2 min) | **¿Es justo?** · ¿a quién beneficia y a quién deja fuera? (2 min) | Dos preguntas guía fijas | C |
| 12 | **Pre-Mortem** · 3 causas probables de fracaso (2 min) | **Errores comunes** · 2 errores que cometería un estudiante al aplicar esto (2 min) | Se vale en dupla | C |

### Casillas extra opcionales (activables)

Sugerencias propias, no incluidas en la lista original; útiles si se quiere
ampliar sin perder el formato *zero-prep*:

- **Posgrado · Nivel de evidencia:** ¿qué tipo de estudio sostiene esta lámina y cuánto confiarías en ella? (2 min).
- **Posgrado · Hombre de acero (*steelman*):** formula la mejor versión del argumento contrario (2 min). Contrapeso al #1.
- **Pregrado · Pregunta relámpago:** el docente hace una pregunta de recuerdo sobre la lámina anterior; 20 s, sin apuntes. Recuperación pura.
- **Ambos · Comodín de la casa:** el alumno elige cualquier mecánica. Reduce la sensación de castigo.

---

## 4. Flujo en clase (solo lo ve el docente)

1. El docente proyecta su presentación como siempre y tiene la app abierta en su celular o en una ventana que **no** se proyecta.
2. Cada 3 o 4 láminas densas toca **Sortear**. El nivel elegido se recuerda entre sesiones.
3. En su dispositivo aparece, en texto sobrio: nombre de la mecánica, consigna de una línea lista para leer en voz alta, modalidad y frase de arranque si es pregrado.
4. El docente **lee la consigna**. Para el grupo no hay ruleta ni pantalla; solo una pregunta del profesor.
5. Opcional: **¿Quién?** sortea alumno o equipo de la lista de clase; el docente dice el nombre.
6. Toca **Iniciar tiempo**. El cronómetro es silencioso; en celular vibra al terminar.
7. Cierra con **Hecho**, **Pasó** u **Otra**. Queda en un registro privado de la sesión.

---

## 5. Reglas de seguridad psicológica (no negociables)

La evidencia sobre llamado al azar es mixta; lo que inclina la balanza es la
implementación (Cooper et al., 2018; Dallimore et al., 2013). Como el grupo no
ve la herramienta, las reglas se anuncian de palabra al inicio del curso y la
app solo le recuerda al docente cuál aplicar:

- **Otra** (sorteo nuevo, en silencio) si la mecánica no encaja con la lámina (bibliografía, imagen sin texto). El grupo ni se entera.
- **"Siguiente lámina"**: aplica la misma mecánica a la próxima diapositiva.
- Ventaja de no mostrar nada: el docente puede descartar una mecánica o un nombre sin exponer a nadie, lo que reduce la sensación de "me tocó en público".
- **Pasar con red**: el alumno puede pasar la palabra a un compañero o a su dupla, sin penalización.
- **Pensar antes de hablar**: en pregrado, toda mecánica individual inicia con 30 s en dupla (*think-pair-share*). En posgrado, configurable.
- **Llamado justo**: al elegir alumno, la bolsa balanceada impide repetir a alguien antes de que pasen todos.
- **Sin puntuación por acierto**: si se conecta con XP del módulo RPG, se premia la participación, no la respuesta correcta.

---

## 6. Especificación técnica

### 6.1 Datos: `src/data/ruletaMecanicas.js` (nuevo)

```js
// Una entrada por mecánica y nivel. `corto` es el nombre breve que ve el docente.
export const MECANICAS = [
  {
    id: 'abogado-diablo',
    categoria: 'critica',            // critica | sintesis | simulacion | debate
    posgrado: {
      corto: 'Abogado del Diablo',
      instruccion: 'Encuentra el sesgo, límite o supuesto no declarado de esta lámina.',
      tiempoSeg: 120,
      modalidad: 'individual',       // individual | dupla | grupo
    },
    pregrado: {
      corto: '¿Y si no fuera?',
      instruccion: '¿En qué caso esta lámina NO se cumpliría?',
      arranque: 'Esto solo funciona si…',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'dupla',
    },
    icap: 'C',
  },
  // … 11 más + extras con `extra: true`
];
export const CATEGORIAS = { critica: 'Análisis crítico', sintesis: 'Traducción y síntesis',
  simulacion: 'Simulación y roles', debate: 'Interrogación y debate' };
```

### 6.2 Componente nuevo `SorteoMecanicas.jsx` (pestaña propia)

`Ruleta.jsx` no se toca. El componente nuevo es deliberadamente austero:

- **Sin** lienzo, animación de giro, confeti, `playSFX` ni botón de proyector.
- **Configuración** (plegable, arriba): **Pregrado / Posgrado**, casillas por categoría y por extras, interruptor "pensar en dupla antes".
- **Sortear**: `idx = RNG.pickBalancedIndex(n, 'mecanicas-' + nivel)`. Sin animación, el resultado aparece de inmediato; la bolsa evita repeticiones hasta agotar el catálogo.
- **Resultado en texto**: nombre, consigna para leer en voz alta, modalidad, tiempo y frase de arranque. Tipografía normal, pensada para leerse en un celular, no a distancia.
- **¿Quién?**: `RNG.pick(pickerItems, 'mecanicas-alumno')`, muestra el nombre en texto.
- **Cronómetro discreto**: cuenta regresiva pequeña; al terminar, `navigator.vibrate` si existe y un cambio de color. Sin sonido por defecto.
- **Botones**: `Hecho`, `Pasó`, `Otra`, `Siguiente lámina`.
- **Accesibilidad**: botones grandes para tocar con el pulgar; `aria-live="polite"` para lectores de pantalla.
- **Navegación**: nueva entrada en el menú lateral de `App.jsx`, carga diferida con `lazy()` como las demás pestañas.

### 6.3 Persistencia (`usePersistence.jsx`)

Agregar a `DEFAULT_STATE` y a `sanitize`:

```js
mecanicas: {
  nivel: 'posgrado',          // 'pregrado' | 'posgrado'
  categorias: ['critica', 'sintesis', 'simulacion', 'debate'],
  extras: [],                 // ids de casillas opcionales activas
  pensarAntes: true,
}
```

`sanitize` debe validar cada campo (listas de strings, valores dentro del
conjunto permitido), igual que hoy con `traffic` o `rpgMode`, para que un
respaldo viejo no rompa la app.

### 6.4 Historial de sesión

Registro privado como lista de texto `{ mecanica, nivel, alumno?, resultado, hora }`,
plegado por defecto, con exportación a CSV. Sirve para la evaluación del piloto
(sección 8).

### 6.5 Pruebas (`tests/e2e`, Playwright)

- Cambiar de nivel cambia las consignas mostradas.
- Desactivar una categoría excluye sus 3 mecánicas de los sorteos.
- **Sortear** muestra el resultado en texto sin `<canvas>` ni confeti en la página.
- 12 sorteos seguidos producen 12 mecánicas distintas.
- Un estado guardado con `mecanicas` malformado se corrige al cargar.

---

## 7. Fases de entrega

| Fase | Contenido | Resultado usable |
|---|---|---|
| 1 · MVP | Catálogo, pestaña de sorteo en texto, selector de nivel, bolsa sin repeticiones | Ya se puede usar en clase |
| 2 · Ritmo | Cronómetro silencioso con fase "piensa", botones Otra / Siguiente / Pasó | Clase fluida sin reloj aparte |
| 3 · Justicia | Sorteo de alumno con bolsa balanceada | Nadie se repite ni queda olvidado |
| 4 · Memoria | Persistencia, filtro por categoría, extras, historial exportable | Configuración por curso |
| 5 · Evaluación | Piloto de 4–6 sesiones (sección 8) | Datos para ajustar |

---

## 8. Cómo saber si funciona (piloto mínimo)

Sin pretensión de ensayo controlado; un registro honesto basta para decidir.

- **Participación**: número de alumnos distintos que hablan por sesión y número de intervenciones voluntarias (indicador usado por Dallimore et al., 2013).
- **Ansiedad percibida**: una pregunta Likert de 5 puntos al final de la 1.ª y de la 5.ª sesión ("Me sentí cómodo/a cuando la ruleta me eligió").
- **Retención**: 3 preguntas de recuerdo sobre láminas trabajadas con ruleta frente a 3 sobre láminas solo expuestas, aplicadas una semana después.
- **Uso de comodines**: si `Otra` supera ~30 % de los sorteos en un tipo de diapositiva, esa mecánica no encaja con ese tipo de contenido.

Con grupos de 20–40 alumnos, cualquier diferencia será orientativa: suficiente
para ajustar la herramienta, insuficiente para publicar sin un diseño más
riguroso.

---

## 9. Pregrado frente a posgrado

| Criterio | Pregrado | Posgrado |
|---|---|---|
| Meta cognitiva | Comprender, recuperar, primer contacto con la crítica | Criticar, transferir, decidir bajo incertidumbre |
| Nivel ICAP dominante | Constructivo, con andamiaje | Constructivo e interactivo |
| Tiempo por mecánica | 1–2 min + 30 s de "piensa en dupla" | 1–3 min, sin fase previa obligatoria |
| Modalidad por defecto | Dupla o grupo | Individual o dupla |
| Andamiaje que lee el docente | Consigna + frase de arranque y opciones acotadas | Solo la consigna |
| Mecánica más arriesgada | "Toma la Cátedra" (por eso pasa a lámina actual) | "Escenario Extremo" mal acotado (se dispersa) |
| Riesgo principal | Ansiedad por exposición | Respuestas genéricas o de lucimiento |
| Regla de seguridad clave | Pensar en dupla antes de hablar | Exigir anclaje a un dato de la lámina |
| Uso de comodines esperado | Alto al inicio, debería bajar | Bajo; si sube, la mecánica no encaja |

**Veredicto (3 líneas)**
1. La diferencia de fondo es el andamiaje: el pregrado necesita la red (dupla, frase de arranque, lámina ya explicada); el posgrado la estorba.
2. Pregrado: priorizar #4, #5, #6 y #10 (recuperación y explicación). Posgrado: #1, #2, #3, #9 y #12 (crítica y transferencia).
3. Implementar ambos niveles sobre un solo catálogo es más barato que dos ruletas y permite subir de nivel a un grupo a mitad del semestre.

---

## 10. Fuentes verificadas

- Chi, M. T. H., y Wylie, R. (2014). The ICAP framework: Linking cognitive engagement to active learning outcomes. *Educational Psychologist, 49*(4), 219–243. https://doi.org/10.1080/00461520.2014.965823
- Cooper, K. M., Downing, V. R., y Brownell, S. E. (2018). The influence of active learning practices on student anxiety in large-enrollment college science classrooms. *International Journal of STEM Education, 5*, 23. https://doi.org/10.1186/s40594-018-0123-6
- Dallimore, E. J., Hertenstein, J. H., y Platt, M. B. (2013). Impact of cold-calling on student voluntary participation. *Journal of Management Education, 37*(3), 305–341.
- Ebersbach, M., Feierabend, M., y Barzagar Nazari, K. B. (2020). Comparing the effects of generating questions, testing, and restudying on students' long-term recall in university learning. *Applied Cognitive Psychology, 34*, 724–736. https://doi.org/10.1002/acp.3639
- Fiorella, L., y Mayer, R. E. (2013). The relative benefits of learning by teaching and teaching expectancy. *Contemporary Educational Psychology, 38*(4), 281–288. https://doi.org/10.1016/j.cedpsych.2013.06.001
- Freeman, S., et al. (2014). Active learning increases student performance in science, engineering, and mathematics. *PNAS, 111*(23), 8410–8415. https://doi.org/10.1073/pnas.1319030111
- Klein, G. (2007). Performing a project premortem. *Harvard Business Review, 85*(9), 18–19.
- Mitchell, D. J., Russo, J. E., y Pennington, N. (1989). Back to the future: Temporal perspective in the explanation of events. *Journal of Behavioral Decision Making, 2*, 25–38.
- Roediger, H. L., y Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science, 17*(3), 249–255. https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Sailer, M., y Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*(1), 77–112. https://doi.org/10.1007/s10648-019-09498-w
- Talevski, J., et al. (2020). Teach-back: A systematic review of implementation and impacts. *PLoS ONE, 15*(4), e0231350. https://doi.org/10.1371/journal.pone.0231350

Nota de verificación: los datos de Freeman, Sailer y Homner, Talevski, Chi y Wylie,
y Roediger y Karpicke se contrastaron con resúmenes originales. Para Cooper et al.
(cifra de ~60 %), Fiorella y Mayer (detalles de volumen y páginas) y Klein/Mitchell
(cifra de 30 %) solo hubo acceso a fuentes secundarias: conviene revisar el texto
original antes de citarlos en un trabajo formal.
