import React, { useState, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistence } from './hooks/usePersistence';
import { AudioProvider } from './components/AudioContext';
import LiveClass from './components/LiveClass';
import {
  Activity, Trophy, Timer, Shuffle, Users, Dices, ClipboardCheck,
  Disc3, Grid3x3, Zap, Hand, CircleHelp,
} from 'lucide-react';

// Only the landing tab (LiveClass) is eagerly imported. Every other tab is
// lazy-loaded so heavy libraries (mathjs via rpg-dice-roller, gsap) stay out of
// the initial bundle and load on demand when their tab is opened.
const RPGDash = lazy(() => import('./components/RPGDash'));
const FlowControl = lazy(() => import('./components/FlowControl'));
const Dice = lazy(() => import('./components/Dice'));
const Picker = lazy(() => import('./components/Picker'));
const Teams = lazy(() => import('./components/Teams'));
const TouchOrder = lazy(() => import('./components/TouchOrder'));
const GroupExam = lazy(() => import('./components/GroupExam'));
const Ruleta = lazy(() => import('./components/Ruleta'));
const Bingo = lazy(() => import('./components/Bingo'));
const Trivia = lazy(() => import('./components/Trivia'));
const Help = lazy(() => import('./components/Help'));
import './index.css';

// Cada tema es una combinación de papel + tintas de impresión.
const THEMES = [
  { id: 'theme-prado', label: 'Prado' },
  { id: 'theme-lila', label: 'Lila' },
  { id: 'theme-kraft', label: 'Kraft' },
  { id: 'theme-neza', label: 'Neza' },
  { id: 'theme-noche', label: 'Noche' },
  { id: 'theme-memphis', label: 'Kawaii' },
];
const DEFAULT_THEME = 'theme-prado';

// Dos grupos: lo que se usa para conducir la clase y las dinámicas de juego.
const NAV_GROUPS = [
  {
    label: 'En clase',
    items: [
      { id: 'live', label: 'Clase en vivo', Icon: Activity },
      { id: 'control', label: 'Control de flujo', Icon: Timer },
      { id: 'picker', label: 'Sorteo', Icon: Shuffle },
      { id: 'teams', label: 'Equipos', Icon: Users },
      { id: 'progreso', label: 'Progreso RPG', Icon: Trophy },
    ],
  },
  {
    label: 'Juegos',
    items: [
      { id: 'exam', label: 'Examen grupal', Icon: ClipboardCheck },
      { id: 'trivia', label: 'Trivia', Icon: Zap },
      { id: 'ruleta', label: 'Ruleta', Icon: Disc3 },
      { id: 'bingo', label: 'Bingo', Icon: Grid3x3 },
      { id: 'dice', label: 'Dado', Icon: Dices },
      { id: 'touch', label: 'Orden por toque', Icon: Hand },
    ],
  },
];
const HELP_TAB = { id: 'help', label: 'Ayuda', Icon: CircleHelp };
const MODULE_IDS = [...NAV_GROUPS.flatMap(g => g.items.map(t => t.id)), HELP_TAB.id];

const App = () => {
  const { state, updateState } = usePersistence();
  const [activeTab, setActiveTab] = useState('live');
  const [visited, setVisited] = useState(() => new Set(['live']));
  const openTab = (id) => {
    setActiveTab(id);
    setVisited(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  };
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    return THEMES.some(t => t.id === saved) ? saved : DEFAULT_THEME;
  });
  const [globalTimer, setGlobalTimer] = useState(0);

  const updateTheme = (requested) => {
    // Un respaldo antiguo puede traer un tema que ya no existe.
    const newTheme = THEMES.some(t => t.id === requested) ? requested : DEFAULT_THEME;
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    THEMES.forEach(t => document.body.classList.remove(t.id));
    document.body.classList.add(theme);
  }, [theme]);

  // Global Timer Sync for Overlay — single source of truth for red-code countdown
  useEffect(() => {
    if (!state.isRedCodeActive || !state.redCodeEndTime) {
      if (globalTimer !== 0) setGlobalTimer(0);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((state.redCodeEndTime - Date.now()) / 1000));
      setGlobalTimer(diff);
      if (diff === 0) {
        updateState({ isRedCodeActive: false, redCodeEndTime: null });
        if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRedCodeActive, state.redCodeEndTime]);

  // Keyboard Shortcuts (skip when typing in inputs or editable header)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const t = e.target;
      if (!t) return;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;

      // El Examen Grupal usa 1-9 para responder opciones: ahí las teclas
      // numéricas no deben cambiar el semáforo.
      const numericShortcutsEnabled = activeTab !== 'exam';

      switch(e.key.toLowerCase()) {
        case '1': if (numericShortcutsEnabled) updateState({ traffic: 'green' }); break;
        case '2': if (numericShortcutsEnabled) updateState({ traffic: 'yellow' }); break;
        case '3': if (numericShortcutsEnabled) updateState({ traffic: 'red' }); break;
        case 'r':
          if (state.isRedCodeActive) {
            updateState({ isRedCodeActive: false, redCodeEndTime: null });
          } else {
            const endTime = Date.now() + (30 * 1000);
            updateState({ traffic: 'red', isRedCodeActive: true, redCodeEndTime: endTime });
          }
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isRedCodeActive, updateState, activeTab]);

  const pickerItems = state.pickerItems && state.pickerItems.length > 0 
    ? state.pickerItems 
    : ['Estudiante A', 'Estudiante B', 'Residente', 'Interno', 'Jefe'];

  const setPickerItems = (items) => updateState({ pickerItems: items });

  const renderModule = (id, isActive) => {
    switch (id) {
      case 'live': return <LiveClass pickerItems={pickerItems} />;
      case 'progreso': return <RPGDash theme={theme} updateTheme={updateTheme} />;
      case 'control': return <FlowControl pickerItems={pickerItems} />;
      case 'dice': return <Dice />;
      case 'touch': return <TouchOrder isActive={isActive} />;
      case 'picker': return <Picker items={state.pickerItems || []} onItemsChange={setPickerItems} />;
      case 'teams': return <Teams pickerItems={pickerItems} />;
      case 'exam': return <GroupExam pickerItems={pickerItems} isActive={isActive} />;
      case 'ruleta': return <Ruleta items={pickerItems} />;
      case 'bingo': return <Bingo />;
      case 'trivia': return <Trivia pickerItems={pickerItems} isActive={isActive} />;
      case 'help': return <Help />;
      default: return null;
    }
  };

  const renderTab = ({ id, label, Icon }) => (
    <button
      key={id}
      className={`tab ${activeTab === id ? 'active' : ''}`}
      aria-current={activeTab === id ? 'page' : undefined}
      onClick={(e) => {
        openTab(id);
        // En móvil la navegación se desliza: deja la pestaña elegida a la vista.
        e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }}
    >
      <Icon size={18} strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </button>
  );

  return (
    <AudioProvider>
      <div className={`app-container ${theme}`}>
        {/* Floating Traffic Bar */}
        <div className={`floating-traffic-bar active-${state.traffic}`} />

        {/* Global Red Code Overlay */}
        <AnimatePresence>
          {state.isRedCodeActive && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="red-code-overlay active"
            >
              <div className="red-code-label">ATENCIÓN PLENA</div>
              <div className="giant-timer">{globalTimer}</div>
              <button className="btn primary" onClick={() => updateState({ isRedCodeActive: false, redCodeEndTime: null })}>
                Cerrar Temporizador
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="app-shell">
        <aside className="sidebar">
          <div className="brand" aria-label="Herramientas didácticas">
            <svg className="pulse-mark" viewBox="0 0 44 22" aria-hidden>
              <path d="M1 12h10l3-6 4 13 5-17 3 10h3l2-3 2 3h10" />
            </svg>
            <span className="brand-name">Herramientas didácticas</span>
          </div>

          <nav aria-label="Herramientas">
            {NAV_GROUPS.map(group => (
              <div className="nav-group" key={group.label}>
                <div className="nav-group-label">{group.label}</div>
                {group.items.map(renderTab)}
              </div>
            ))}
          </nav>

          <div className="sidebar-foot">
            {renderTab(HELP_TAB)}
            <label className="theme-picker">
              <span>Tema</span>
              <select value={theme} onChange={(e) => updateTheme(e.target.value)} aria-label="Tema visual">
                {THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
          </div>
        </aside>

        <div className="workspace">
        <header className="topbar">
          <div>
            <h1
              className="title editable-text"
              title="Haz clic para editar el nombre de la materia"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateState({ customTitle: e.target.innerText.trim() })}
            >
              {state.customTitle || "Herramientas didácticas"}
            </h1>
            <div
              className="subtitle editable-text"
              title="Haz clic para editar el subtítulo"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateState({ customSubtitle: e.target.innerText.trim() })}
            >
              {state.customSubtitle || "Gamificación para la clase de medicina"}
            </div>
          </div>
        </header>

        <main>
          <div className="content">
            {/* Los módulos ya abiertos se quedan montados (sólo se ocultan): así
                cambiar de pestaña a mitad de un examen, un bingo o un sorteo de
                equipos no borra el progreso. Cada uno se carga la primera vez
                que se visita. */}
            {MODULE_IDS.filter(id => visited.has(id)).map(id => (
              <section
                key={id}
                className="module-pane"
                hidden={id !== activeTab}
                aria-hidden={id !== activeTab}
              >
                <Suspense fallback={<div className="card pulse" style={{ textAlign: 'center', padding: '2rem' }}>Cargando…</div>}>
                  {renderModule(id, id === activeTab)}
                </Suspense>
              </section>
            ))}
          </div>
        </main>
        </div>
        </div>
      </div>
    </AudioProvider>
  );
};

export default App;
