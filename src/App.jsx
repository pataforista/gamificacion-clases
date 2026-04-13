import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistence } from './hooks/usePersistence';
import { AudioProvider } from './components/AudioContext';
import RPGDash from './components/RPGDash';
import FlowControl from './components/FlowControl';
import Dice from './components/Dice';
import TouchOrder from './components/TouchOrder';
import Picker from './components/Picker';
import Teams from './components/Teams';
import GroupExam from './components/GroupExam';
import Ruleta from './components/Ruleta';
import Bingo from './components/Bingo';
import Trivia from './components/Trivia';
import Help from './components/Help';
import './index.css';

const App = () => {
  const { state, updateState } = usePersistence();
  const [activeTab, setActiveTab] = useState('progreso');
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'theme-memphis');

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  React.useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const pickerItems = state.pickerItems && state.pickerItems.length > 0 
    ? state.pickerItems 
    : ['Estudiante de Medicina A', 'Estudiante de Medicina B', 'Residente R1', 'Interno de Pregrado', 'Jefe de Servicio'];

  const setPickerItems = (items) => updateState({ pickerItems: items });

  const tabs = [
    { id: 'progreso', label: 'Progreso RPG' },
    { id: 'control', label: 'Control de Flujo' },
    { id: 'dice', label: 'Dado' },
    { id: 'touch', label: 'Orden por toque' },
    { id: 'picker', label: 'Sorteo' },
    { id: 'teams', label: 'Equipos' },
    { id: 'exam', label: 'Examen grupal' },
    { id: 'ruleta', label: 'Ruleta' },
    { id: 'bingo', label: 'Bingo' },
    { id: 'trivia', label: 'Trivia ⚡' },
    { id: 'help', label: 'Ayuda' },
  ];

  return (
    <AudioProvider>
      <div className={`app-container ${theme}`}>


        <header>
          <div className="title">MedClass Pro</div>
          <div className="row" style={{ justifyContent: 'center', gap: '10px' }}>
            <div className="pill">GAMIFICACIÓN MÉDICA · PREMIUM</div>
            <select 
              value={theme} 
              onChange={(e) => updateTheme(e.target.value)}
              className="pill"
              style={{ background: 'var(--bg-secondary)', border: '2px solid var(--line)', padding: '2px 10px', cursor: 'pointer', outline: 'none' }}
            >
              <option value="theme-memphis">Estilo Memphis</option>
              <option value="theme-lipari">Tema Lipari 🛋️</option>
              <option value="theme-tokyo">Tema Tokyo ✈️</option>
              <option value="theme-lisbon">Tema Lisbon 🌿</option>
            </select>
          </div>
        </header>

        <main>
          <div className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="content">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {activeTab === 'progreso' && <RPGDash />}
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
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </AudioProvider>
  );
};

export default App;
