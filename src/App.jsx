import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistence } from './hooks/usePersistence';
import { AudioProvider } from './components/AudioContext';
import Ballpit from './components/Ballpit';
import RPGDash from './components/RPGDash';
import FlowControl from './components/FlowControl';
import Dice from './components/Dice';
import TouchOrder from './components/TouchOrder';
import Picker from './components/Picker';
import Teams from './components/Teams';
import GroupExam from './components/GroupExam';
import Help from './components/Help';
import './index.css';

const App = () => {
  const { state, updateState } = usePersistence();
  const [activeTab, setActiveTab] = useState('progreso');

  const pickerItems = state.pickerItems || [];
  const setPickerItems = (items) => updateState({ pickerItems: items });

  const tabs = [
    { id: 'progreso', label: 'Progreso RPG' },
    { id: 'control', label: 'Control de Flujo' },
    { id: 'dice', label: 'Dado' },
    { id: 'touch', label: 'Orden por toque' },
    { id: 'picker', label: 'Sorteo' },
    { id: 'teams', label: 'Equipos' },
    { id: 'exam', label: 'Examen grupal' },
    { id: 'help', label: 'Ayuda' },
  ];

  return (
    <AudioProvider>
      <div className="app-container">
        <div className="ballpit-bg">
          <Ballpit
            count={50}
            gravity={0.1}
            friction={0.99}
            wallBounce={0.9}
            followCursor={true}
            colors={[0x6366f1, 0x2dd4bf, 0xf59e0b]}
          />
        </div>

        <header>
          <div className="title">MedClass Pro</div>
          <div className="pill">GAMIFICACIÓN MÉDICA · PREMIUM</div>
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
