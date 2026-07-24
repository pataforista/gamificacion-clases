import React from 'react';

// Guía de uso: una tarjeta por cada parte de la app, agrupada por
// categoría, con "para qué sirve", pasos y un consejo.
const GESTION = [
  {
    id: 'live',
    icon: '⚡',
    title: 'Clase en Vivo',
    tag: 'Panel principal',
    what: 'Tu tablero de mando durante la clase: reúne el semáforo, el sorteo de turnos, el temporizador y los dados rápidos en una sola pantalla.',
    steps: [
      'Toca Libre / Dudas / Silencio para marcar la fase de la clase (verás una barra de color arriba de la pantalla).',
      'Usa “Sortear ahora” para elegir al azar a quién le toca participar.',
      'Lanza un Temporizador rápido (15s, 30s, 60s o 2m) para actividades cronometradas.',
      'Tira los Dados rápidos (d20, 2d10, 1d6, d100) sin cambiar de pestaña.',
    ],
    tip: 'Es la pestaña ideal para dejar proyectada mientras das la clase.',
  },
  {
    id: 'progreso',
    icon: '🩺',
    title: 'Progreso RPG',
    tag: 'Motivación',
    what: 'Convierte la participación en un juego de rol con jerarquía de hospital (Interno → Residente → Jefe de Servicio).',
    steps: [
      'Suma XP con “+10 (Acierto)” o “+50 (Gran Logro)” cuando el grupo participa bien.',
      'Gestiona la Energía del Grupo: usa “Daño” por errores o falta de atención y “Heal” para recuperarla.',
      'Toca las Insignias para desbloquear logros de la clase.',
      'Cambia entre modo Médico y Genérico según tu materia.',
      'Usa “Exportar JSON” para guardar el progreso y “Reset Total” para empezar de cero.',
    ],
    tip: 'Exporta el JSON antes de cambiar de grupo para no perder el avance.',
  },
  {
    id: 'control',
    icon: '🚦',
    title: 'Control de Flujo',
    tag: 'Manejo del aula',
    what: 'Herramientas para bajar el ruido y marcar transiciones: el temporizador de “Código Rojo”, el semáforo y la asignación de un líder.',
    steps: [
      'Ajusta la duración con el deslizador e inicia el “Código Rojo” para recuperar el silencio.',
      'Cambia el Semáforo entre Verde (trabajo libre), Amarillo (dudas) y Rojo (explicación).',
      'Usa “Asignar Líder” para elegir al responsable del grupo del día.',
      'Activa la música de fondo del Código Rojo si quieres reforzar la señal.',
    ],
    tip: 'Al activar el Código Rojo aparece un cronómetro gigante en toda la pantalla.',
  },
  {
    id: 'picker',
    icon: '🎟️',
    title: 'Sorteo',
    tag: 'Turnos justos',
    what: 'Rifa turnos o participaciones de forma equitativa: nadie vuelve a salir hasta que todos hayan salido al menos una vez.',
    steps: [
      'Escribe los nombres de los alumnos o equipos, uno por línea.',
      'Pulsa “Elegir alumno” para sacar un nombre al azar.',
      'Revisa el “Historial Reciente” para ver a quién ya le tocó.',
      'Usa “Cargar Demo” para probarlo o “Limpiar Todo” para reiniciar la lista.',
    ],
    tip: 'La lista del Sorteo se comparte con Ruleta, Equipos y otras herramientas.',
  },
  {
    id: 'teams',
    icon: '👥',
    title: 'Equipos',
    tag: 'Agrupar',
    what: 'Divide automáticamente los nombres del Sorteo en grupos equilibrados.',
    steps: [
      'Primero carga los nombres en la pestaña Sorteo.',
      'Indica cuántos equipos quieres formar.',
      'Pulsa “Generar” para repartirlos; usa “Rehacer” para otra combinación.',
      'Toca “Limpiar” para borrar los equipos generados.',
    ],
    tip: 'Los equipos creados aquí se pueden usar como participantes del Examen Grupal.',
  },
];

const HERRAMIENTAS = [
  {
    id: 'dice',
    icon: '🎲',
    title: 'Dado',
    tag: 'Azar',
    what: 'Lanza dados virtuales para decidir puntos, retos o eventos, con soporte para fórmulas de rol.',
    steps: [
      'Elige el Tipo de dado, la Cantidad y un modificador (+/–).',
      'Pulsa “Tirar” para lanzar.',
      'O escribe una fórmula avanzada (por ejemplo 2d20kh1 + 5) y pulsa “Fórmula”.',
      'Usa “Dificultad (2d10)” para tiradas de reto rápidas.',
    ],
    tip: 'El panel “Récords y Log” guarda el historial de tus últimas tiradas.',
  },
  {
    id: 'exam',
    icon: '📋',
    title: 'Examen Grupal',
    tag: 'Concurso',
    what: 'Un “game show” por equipos con marcador en tiempo real, música, comodines y un tablero de avance con avatares.',
    steps: [
      'Sube un archivo JSON con las preguntas o créalas con el editor visual (“Diseñar Examen”).',
      'Ajusta el Game Show: temporizador, comodines (50/50, escudo, congelar), rebote y suspenso.',
      'Asigna turnos a los equipos que creaste previamente.',
      'Juega y sigue el marcador y el tablero de avance en vivo.',
    ],
    tip: 'Usa “Copiar Plantilla” para ver el formato exacto del JSON de preguntas.',
  },
  {
    id: 'ruleta',
    icon: '🎡',
    title: 'Ruleta',
    tag: 'Azar',
    what: 'Una ruleta giratoria para elegir un tema, una actividad o un estudiante al azar de forma visual.',
    steps: [
      'Escribe las opciones en el panel de la derecha, una por línea.',
      'Pulsa “¡Girar!” y espera a que se detenga.',
      'Usa “Limpiar” para vaciar las opciones.',
    ],
    tip: 'Perfecta cuando quieres que la clase vea el resultado con emoción.',
  },
  {
    id: 'bingo',
    icon: '🔢',
    title: 'Bingo',
    tag: 'Dinámica',
    what: 'Un cantador de números al azar sin repeticiones para dinámicas de bingo en clase.',
    steps: [
      'Elige el rango de números (1–20, 1–30, 1–50, 1–75 o 1–90).',
      'Pulsa “Sacar número” cada vez que quieras cantar uno nuevo.',
      'Consulta los “Números Cantados” y el progreso en pantalla.',
      'Usa “Reiniciar” para empezar una partida nueva.',
    ],
    tip: 'Ningún número se repite hasta reiniciar la partida.',
  },
  {
    id: 'trivia',
    icon: '💡',
    title: 'Trivia Relámpago',
    tag: 'Preguntas',
    what: 'Un desafío de preguntas rápidas con temporizador para dinamizar la participación individual.',
    steps: [
      'Escribe tu banco de preguntas con el formato pregunta | respuesta, una por línea.',
      'Elige el tiempo por pregunta (15s a 60s).',
      'Pulsa “Nueva pregunta” para comenzar el reto.',
      'Registra aciertos y fallos con el marcador.',
    ],
    tip: 'La “Vista previa” te deja revisar todas las preguntas antes de jugar.',
  },
  {
    id: 'touch',
    icon: '✋',
    title: 'Orden por toque',
    tag: 'Táctil',
    what: 'Decide rápidamente el ORDEN de intervención: todos ponen el dedo en la pantalla y la app asigna los turnos.',
    steps: [
      'Pide a los participantes que coloquen un dedo dentro de la zona.',
      'Mantengan los dedos presionados unos 3 segundos.',
      'La app asignará el orden de intervención a cada dedo.',
    ],
    tip: 'Funciona mejor en tabletas o pantallas táctiles grandes.',
  },
  {
    id: 'touch-uneven',
    icon: '🎯',
    title: 'Dedo Disparejo',
    tag: 'Táctil',
    what: 'Elige a UNA sola persona al azar: todos ponen un dedo y la app selecciona al “elegido”.',
    steps: [
      'Todos colocan un dedo en la pantalla al mismo tiempo.',
      'Espera a que la app haga la selección.',
      'El dedo marcado es el elegido para participar.',
    ],
    tip: 'Ideal para escoger a un único voluntario de forma divertida.',
  },
];

const EXTRAS = [
  {
    icon: '⌨️',
    title: 'Atajos de teclado',
    body: 'Pulsa 1, 2 o 3 para cambiar el semáforo (verde, amarillo, rojo) y R para activar o desactivar el Código Rojo, sin importar en qué pestaña estés.',
  },
  {
    icon: '🎨',
    title: 'Temas visuales',
    body: 'Con el selector de la parte superior cambia entre los estilos Kawaii, Lipari, Tokyo y Lisbon para adaptar los colores a tu gusto o al proyector.',
  },
  {
    icon: '✏️',
    title: 'Personaliza el encabezado',
    body: 'Haz clic sobre el título y el subtítulo de la app para editarlos con el nombre de tu materia o curso.',
  },
  {
    icon: '💾',
    title: 'Tus datos se guardan solos',
    body: 'Toda la información se guarda localmente en este navegador. Usa “Exportar JSON” en Progreso RPG para respaldarla o llevarla a otro equipo.',
  },
];

const Help = () => {
  const goTo = (id) => {
    const el = document.getElementById(`help-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderItem = (item) => (
    <div key={item.id} id={`help-${item.id}`} className="help-item">
      <div className="help-item-head">
        <span className="help-item-icon" aria-hidden>{item.icon}</span>
        <h3>{item.title}</h3>
        <span className="help-item-tag">{item.tag}</span>
      </div>
      <p className="help-item-what">{item.what}</p>
      <ol className="help-steps">
        {item.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <p className="help-tip"><span aria-hidden>💡</span> {item.tip}</p>
    </div>
  );

  return (
    <div className="help-guide">
      <div className="card help-hero">
        <div className="help-hero-emoji" aria-hidden>📖</div>
        <h2>Guía de uso de MedClass Pro</h2>
        <p>
          Aquí encontrarás, paso a paso, para qué sirve y cómo usar cada parte de la app.
          Toca cualquier herramienta del índice para saltar directo a su explicación.
        </p>
        <div className="help-index">
          {[...GESTION, ...HERRAMIENTAS].map((it) => (
            <button key={it.id} className="help-index-chip" onClick={() => goTo(it.id)}>
              <span aria-hidden>{it.icon}</span> {it.title}
            </button>
          ))}
        </div>
      </div>

      <div className="help-group-title"><span aria-hidden>🏫</span> Gestión de Clase</div>
      <div className="help-list">{GESTION.map(renderItem)}</div>

      <div className="help-group-title"><span aria-hidden>🧰</span> Herramientas</div>
      <div className="help-list">{HERRAMIENTAS.map(renderItem)}</div>

      <div className="help-group-title"><span aria-hidden>✨</span> Trucos y extras</div>
      <div className="card help-extras">
        {EXTRAS.map((e) => (
          <div key={e.title} className="help-extra">
            <span className="help-extra-icon" aria-hidden>{e.icon}</span>
            <div>
              <strong>{e.title}</strong>
              <p>{e.body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="smallout help-foot">
        ¿Lista para empezar? Vuelve a <strong>Clase en Vivo ⚡</strong> y proyecta la app en tu aula.
      </p>
    </div>
  );
};

export default Help;
