import React, { useState } from 'react';
import Ballpit from './components/Ballpit';
import RPGDash from './components/RPGDash';
import FlowControl from './components/FlowControl';
import Dice from './components/Dice';
import TouchOrder from './components/TouchOrder';
import Picker from './components/Picker';
import Teams from './components/Teams';
import GroupExam from './components/GroupExam';
import './index.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('progreso');
  const [pickerItems, setPickerItems] = useState([]);

  const tabs = [
    { id: 'progreso', label: 'Progreso RPG' },
    { id: 'control', label: 'Control de Flujo' },
    { id: 'dice', label: 'Dado' },
    { id: 'touch', label: 'Orden por toque' },
    { id: 'picker', label: 'Sorteo' },
    { id: 'teams', label: 'Equipos' },
    { id: 'exam', label: 'Examen grupal' },
  ];

  return (
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
        <div className="title">QuickRand</div>
        <div className="pill">PREMIUM EDITION · VITE + REACT</div>
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
          {activeTab === 'progreso' && <RPGDash />}
          {activeTab === 'control' && <FlowControl pickerItems={pickerItems} />}
          {activeTab === 'dice' && <Dice />}
          {activeTab === 'touch' && <TouchOrder />}
          {activeTab === 'picker' && <Picker onItemsChange={setPickerItems} />}
          {activeTab === 'teams' && <Teams pickerItems={pickerItems} />}
          {activeTab === 'exam' && <GroupExam pickerItems={pickerItems} />}
        </div>
      </main>
    </div>
  );
};

export default App;
