import React, { useState, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistence } from './hooks/usePersistence';
import { AudioProvider } from './components/AudioContext';
import LiveClass from './components/LiveClass';

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

const App = () => {
  const { state, updateState } = usePersistence();
  const [activeTab, setActiveTab] = useState('live');
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'theme-memphis');
  const [globalTimer, setGlobalTimer] = useState(0);

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    const themeClasses = ['theme-memphis', 'theme-lipari', 'theme-tokyo', 'theme-lisbon'];
    themeClasses.forEach(c => document.body.classList.remove(c));
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

  // Una sola fila de pestañas: los dos grupos se separan con un divisor
  // discreto en vez de dos bloques con título (menos ruido visual).
  const tabs = [
    { id: 'live', label: 'Clase en Vivo' },
    { id: 'progreso', label: 'Progreso RPG' },
    { id: 'control', label: 'Control de Flujo' },
    { id: 'picker', label: 'Sorteo' },
    { id: 'teams', label: 'Equipos' },
    { divider: true },
    { id: 'dice', label: 'Dado' },
    { id: 'exam', label: 'Examen grupal' },
    { id: 'ruleta', label: 'Ruleta' },
    { id: 'bingo', label: 'Bingo' },
    { id: 'trivia', label: 'Trivia' },
    { id: 'touch', label: 'Orden por toque' },
    { id: 'help', label: 'Ayuda' },
  ];

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

        <header>
          <div 
            className="title editable-text" 
            title="Haz clic para editar el nombre de la materia"
            contentEditable 
            suppressContentEditableWarning 
            onBlur={(e) => updateState({ customTitle: e.target.innerText })}
          >
            {state.customTitle || "MedClass Pro"}
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: '10px' }}>
            <div 
                className="pill editable-text" 
                title="Haz clic para editar el subtítulo"
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => updateState({ customSubtitle: e.target.innerText })}
            >
                {state.customSubtitle || "GAMIFICACIÓN MÉDICA · PREMIUM"}
            </div>
            <select 
              value={theme} 
              onChange={(e) => updateTheme(e.target.value)}
              className="pill"
              style={{ background: 'var(--bg-secondary)', border: '2px solid var(--line)', padding: '2px 10px', cursor: 'pointer' }}
            >
              <option value="theme-memphis">Estilo Kawaii 🎀</option>
              <option value="theme-lipari">Tema Lipari 🛋️</option>
              <option value="theme-tokyo">Tema Tokyo ✈️</option>
              <option value="theme-lisbon">Tema Lisbon 🌿</option>
            </select>
          </div>
        </header>

        <main>
          <nav className="tabs" aria-label="Herramientas">
            {tabs.map((tab, i) => (
              tab.divider
                ? <span key={`div-${i}`} className="tab-divider" aria-hidden />
                : (
                  <button
                    key={tab.id}
                    className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                )
            ))}
          </nav>

          <div className="content">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <Suspense fallback={<div className="card pulse" style={{ textAlign: 'center', padding: '2rem' }}>Cargando módulo premium...</div>}>
                  {activeTab === 'live' && <LiveClass pickerItems={pickerItems} />}
                  {activeTab === 'progreso' && <RPGDash theme={theme} updateTheme={updateTheme} />}
                  {activeTab === 'control' && <FlowControl pickerItems={pickerItems} />}
                  {activeTab === 'dice' && <Dice />}
                  {activeTab === 'touch' && <TouchOrder />}
                  {activeTab === 'picker' && <Picker items={pickerItems} onItemsChange={setPickerItems} />}
                  {activeTab === 'teams' && <Teams pickerItems={pickerItems} />}
                  {activeTab === 'exam' && <GroupExam pickerItems={pickerItems} />}
                  {activeTab === 'ruleta' && <Ruleta items={pickerItems} />}
                  {activeTab === 'bingo' && <Bingo />}
                  {activeTab === 'trivia' && <Trivia pickerItems={pickerItems} />}
                  {activeTab === 'help' && <Help />}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </AudioProvider>
  );
};

export default App;
