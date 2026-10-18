// Catálogo de mecánicas "zero-prep" para el Sorteo de mecánicas.
// Cada una se aplica sobre la diapositiva que el grupo ya está viendo.
// `consigna` es el texto que el docente lee en voz alta.
// ICAP (Chi y Wylie, 2014): C = constructivo, I = interactivo.

export const CATEGORIAS = {
  critica: 'Análisis crítico',
  sintesis: 'Traducción y síntesis',
  simulacion: 'Simulación y roles',
  debate: 'Interrogación y debate',
};

export const NIVELES = {
  pregrado: 'Pregrado',
  posgrado: 'Posgrado',
};

export const MODALIDADES = {
  individual: 'Individual',
  dupla: 'En dupla',
  grupo: 'Todo el grupo',
};

export const MECANICAS = [
  // ── Análisis crítico ──────────────────────────────────────────────
  {
    id: 'abogado-diablo',
    categoria: 'critica',
    icap: 'C',
    posgrado: {
      nombre: 'Abogado del Diablo',
      consigna: 'Encuentra el punto débil de esta lámina: un sesgo metodológico, un límite del modelo o un supuesto no declarado. Si alguien la refutara dentro de diez años, ¿por dónde lo haría?',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: '¿Y si no fuera cierto?',
      consigna: '¿En qué caso esta lámina NO se cumpliría? Piensa en una situación donde lo que dice fallaría.',
      arranque: 'Esto solo funciona si…',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'dupla',
    },
  },
  {
    id: 'lo-omitido',
    categoria: 'critica',
    icap: 'C',
    posgrado: {
      nombre: 'Lo Omitido',
      consigna: 'Mirando solo lo que muestra esta lámina: ¿qué variable crítica, contexto sociocultural, comorbilidad o factor ético no aparece y cambiaría por completo su aplicación real?',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: '¿Qué le falta?',
      consigna: 'Elige UNA de estas: edad, contexto, costo o riesgo. ¿Cómo cambiaría lo que dice la lámina si tomamos eso en cuenta?',
      arranque: 'Esta lámina no dice nada sobre…',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'dupla',
    },
  },
  {
    id: 'teoria-trinchera',
    categoria: 'critica',
    icap: 'C',
    posgrado: {
      nombre: 'Teoría vs. Trinchera',
      consigna: '¿En qué momento exacto choca este protocolo o concepto con la realidad operativa de la práctica diaria, y cómo se resuelve ese vacío?',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: 'Ejemplo real',
      consigna: 'Da un ejemplo de la vida cotidiana o de tus prácticas donde aparezca lo que dice esta lámina. Se vale un caso que hayas visto o vivido.',
      arranque: 'Yo lo vi cuando…',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'individual',
    },
  },

  // ── Traducción y síntesis ─────────────────────────────────────────
  {
    id: 'doble-traduccion',
    categoria: 'sintesis',
    icap: 'C',
    posgrado: {
      nombre: 'Doble Traducción',
      consigna: 'Explica el concepto central de esta lámina dos veces en menos de dos minutos. Primero a un colega de otra especialidad: técnico, sin jerga hiperespecializada. Luego a un familiar en crisis: claro, empático, sin tecnicismos.',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: 'Explícalo a tu abuela',
      consigna: 'Explica la idea central de esta lámina como si hablaras con alguien que no estudió esto. Cero tecnicismos. El grupo levanta la mano si escucha jerga.',
      arranque: 'Imagina que…',
      tiempoSeg: 90,
      pensarSeg: 30,
      modalidad: 'individual',
    },
  },
  {
    id: 'en-12-palabras',
    categoria: 'sintesis',
    icap: 'C',
    posgrado: {
      nombre: 'En 12 Palabras',
      consigna: 'Sin repetir el título de la lámina, escribe en máximo 12 palabras su conclusión más importante o accionable. Después se leen tres al azar.',
      tiempoSeg: 60,
      modalidad: 'grupo',
    },
    pregrado: {
      nombre: 'Tuit de 15 palabras',
      consigna: 'Escribe en máximo 15 palabras lo más importante de esta lámina, y subraya 3 palabras clave. Después se leen tres al azar.',
      tiempoSeg: 60,
      modalidad: 'grupo',
    },
  },
  {
    id: 'puente',
    categoria: 'sintesis',
    icap: 'C',
    posgrado: {
      nombre: 'El Puente',
      consigna: 'Conecta el concepto de esta lámina con el tema de la sesión de la semana pasada. Explica cómo interactúan o dónde se contradicen.',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: 'El Puente corto',
      consigna: 'Conecta esta lámina con la lámina anterior o con lo primero que vimos hoy. ¿Qué tienen en común o en qué se oponen?',
      arranque: 'Esto se conecta con lo anterior porque…',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'individual',
    },
  },

  // ── Simulación e inversión de roles ───────────────────────────────
  {
    id: 'toma-catedra',
    categoria: 'simulacion',
    icap: 'C',
    posgrado: {
      nombre: 'Toma la Cátedra',
      consigna: 'Avanza a la siguiente lámina, que aún no he explicado. Tú das la clase de esa lámina como titular del seminario: deduce el hilo conductor. Yo me siento.',
      tiempoSeg: 180,
      modalidad: 'individual',
      requiereSiguiente: true,
    },
    pregrado: {
      nombre: 'Narrador',
      consigna: 'Explica esta lámina como si fueras el profesor. Puedes elegir a un compañero de copiloto que te ayude si te trabas.',
      arranque: 'Lo que vemos aquí es…',
      tiempoSeg: 90,
      pensarSeg: 30,
      modalidad: 'individual',
    },
  },
  {
    id: 'interconsulta',
    categoria: 'simulacion',
    icap: 'I',
    posgrado: {
      nombre: 'Interconsulta',
      consigna: 'En dupla: uno plantea una duda compleja o un problema práctico basado en esta lámina; el otro actúa como consultor experto y da una recomendación fundamentada en menos de dos minutos.',
      tiempoSeg: 180,
      modalidad: 'dupla',
    },
    pregrado: {
      nombre: 'Pregunta y respuesta',
      consigna: 'En dupla: uno pregunta algo de esta lámina que no entendió; el otro responde usando la lámina. Después cambian de papel.',
      arranque: 'No me quedó claro por qué…',
      tiempoSeg: 120,
      modalidad: 'dupla',
    },
  },
  {
    id: 'escenario-extremo',
    categoria: 'simulacion',
    icap: 'C',
    posgrado: {
      nombre: 'Escenario Extremo',
      consigna: 'Lleva una variable de esta lámina al extremo: recursos cero, urgencia absoluta o una población atípica. ¿Cómo se adapta el manejo?',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: '¿Y si cambia X?',
      consigna: 'Voy a cambiar una variable de esta lámina. ¿Qué pasaría entonces con lo que dice? (El docente indica la variable.)',
      arranque: 'Entonces tendríamos que…',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'dupla',
    },
  },

  // ── Interrogación inversa y debate ────────────────────────────────
  {
    id: 'disena-reactivo',
    categoria: 'debate',
    icap: 'C',
    posgrado: {
      nombre: 'Diseña el Reactivo',
      consigna: 'Basándote solo en esta lámina, redacta una pregunta de examen de nivel posgrado que evalúe razonamiento, no memoria. Elige a un compañero para que la responda en vivo.',
      tiempoSeg: 180,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: 'Pregunta de repaso',
      consigna: 'Escribe una pregunta de opción múltiple con tres opciones sobre esta lámina: una correcta y una incorrecta pero creíble. Un compañero la responde.',
      arranque: '¿Cuál de estas…?',
      tiempoSeg: 120,
      modalidad: 'dupla',
    },
  },
  {
    id: 'dilema',
    categoria: 'debate',
    icap: 'C',
    posgrado: {
      nombre: 'Dilema Oculto',
      consigna: 'Formula un dilema ético, económico o práctico que surja directamente de aplicar al pie de la letra lo que dice esta lámina.',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: '¿Es justo?',
      consigna: 'Si aplicamos esto tal cual, ¿a quién beneficia y a quién deja fuera? ¿Hay algo injusto o difícil de cumplir?',
      arranque: 'Esto beneficia a… pero deja fuera a…',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'dupla',
    },
  },
  {
    id: 'pre-mortem',
    categoria: 'debate',
    icap: 'C',
    posgrado: {
      nombre: 'Pre-Mortem',
      consigna: 'Imagina que lo que muestra esta lámina era un plan que fracasó rotundamente en el mundo real. ¿Cuáles fueron las tres causas más probables?',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: 'Errores comunes',
      consigna: 'Nombra dos errores que cometería un estudiante al aplicar lo que dice esta lámina, y cómo evitarlos.',
      arranque: 'El error más fácil sería…',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'dupla',
    },
  },

  // ── Extras opcionales (activar en la configuración) ───────────────
  {
    id: 'nivel-evidencia',
    extra: true,
    categoria: 'critica',
    icap: 'C',
    posgrado: {
      nombre: 'Nivel de Evidencia',
      consigna: '¿Qué tipo de estudio o fuente sostiene esta lámina, y cuánta confianza le darías? ¿Qué evidencia cambiaría tu opinión?',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: '¿Quién lo dice?',
      consigna: '¿De dónde creen que sale lo que dice esta lámina? ¿Cómo podríamos comprobar que es cierto?',
      arranque: 'Yo lo comprobaría…',
      tiempoSeg: 90,
      pensarSeg: 30,
      modalidad: 'dupla',
    },
  },
  {
    id: 'steelman',
    extra: true,
    categoria: 'critica',
    icap: 'C',
    posgrado: {
      nombre: 'Steelman',
      consigna: 'Formula la mejor versión posible del argumento contrario a lo que dice esta lámina, la que un defensor inteligente de esa postura aceptaría como propia.',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: 'El otro lado',
      consigna: 'Piensa en alguien que no estaría de acuerdo con esta lámina. ¿Cuál sería su mejor razón?',
      arranque: 'Alguien podría decir que…',
      tiempoSeg: 90,
      pensarSeg: 30,
      modalidad: 'dupla',
    },
  },
  {
    id: 'relampago',
    extra: true,
    categoria: 'sintesis',
    icap: 'C',
    posgrado: {
      nombre: 'Recuerdo Relámpago',
      consigna: 'Sin mirar la lámina: ¿qué dijimos en las dos láminas anteriores? Reconstrúyelo en veinte segundos.',
      tiempoSeg: 30,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: 'Pregunta Relámpago',
      consigna: 'Sin mirar los apuntes: ¿qué fue lo más importante de la lámina anterior? Tienes veinte segundos.',
      tiempoSeg: 30,
      modalidad: 'individual',
    },
  },
  {
    id: 'comodin',
    extra: true,
    categoria: 'debate',
    icap: 'C',
    posgrado: {
      nombre: 'Comodín de la Casa',
      consigna: 'Elige tú la mecánica que prefieras para esta lámina: critica, traduce, sintetiza o pregunta.',
      tiempoSeg: 120,
      modalidad: 'individual',
    },
    pregrado: {
      nombre: 'Comodín de la Casa',
      consigna: 'Elige tú cómo quieres trabajar esta lámina: criticarla, explicarla con tus palabras o hacer una pregunta.',
      tiempoSeg: 120,
      pensarSeg: 30,
      modalidad: 'individual',
    },
  },
];

export const CATEGORIA_IDS = Object.keys(CATEGORIAS);
export const EXTRA_IDS = MECANICAS.filter(m => m.extra).map(m => m.id);
export const MECANICA_IDS = MECANICAS.map(m => m.id);

export const DEFAULT_MECANICAS = {
  nivel: 'posgrado',
  categorias: CATEGORIA_IDS,
  extras: [],
  pensarAntes: true,
};

// Mecánicas elegibles según la configuración guardada.
export const mecanicasActivas = (cfg) => {
  const cats = new Set(cfg.categorias);
  const extras = new Set(cfg.extras);
  return MECANICAS.filter(m => cats.has(m.categoria) && (!m.extra || extras.has(m.id)));
};

// Versión de la mecánica para el nivel dado, con la fase de "pensar" ya
// resuelta (solo pregrado la define, y solo si el interruptor está activo).
export const variante = (mecanica, cfg) => {
  const v = mecanica[cfg.nivel];
  return { ...v, pensarSeg: cfg.pensarAntes ? (v.pensarSeg || 0) : 0 };
};
