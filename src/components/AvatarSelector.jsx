import React, { useState } from 'react';
import { KAOMOJIS } from '../utils/kaomojiData';

const AvatarSelector = ({ teams = [], onComplete }) => {
  const [selections, setSelections] = useState({});
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [category, setCategory] = useState('joy');

  const handleSelect = (kaomoji) => {
    const team = teams[activeTeamIdx];
    const newSelections = { ...selections, [team]: kaomoji };
    setSelections(newSelections);

    if (activeTeamIdx < teams.length - 1) {
      setActiveTeamIdx(prev => prev + 1);
    }
  };

  const currentTeam = teams[activeTeamIdx];

  if (!currentTeam) return null;

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: 'var(--memphis-magenta)' }}>🎬 ¡Elige tu Avatar!</h2>
      <div className="divider"></div>
      
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Equipo: <span style={{ color: 'var(--memphis-cyan)', fontSize: '1.5rem' }}>{currentTeam}</span>
        </div>
        <div className="pill">Paso {activeTeamIdx + 1} de {teams.length}</div>
      </div>

      <div className="tabs" style={{ justifyContent: 'center' }}>
        <button className={`tab ${category === 'joy' ? 'active' : ''}`} onClick={() => setCategory('joy')}>Felicidad</button>
        <button className={`tab ${category === 'love' ? 'active' : ''}`} onClick={() => setCategory('love')}>Amor</button>
        <button className={`tab ${category === 'embarrassment' ? 'active' : ''}`} onClick={() => setCategory('embarrassment')}>Tímido</button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
        gap: '0.5rem',
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '1rem',
        border: '2px dashed var(--line)',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.05)'
      }}>
        {KAOMOJIS[category].map((k, i) => (
          <button
            key={i}
            className="btn"
            style={{ 
              padding: '0.5rem', 
              fontSize: '1.2rem', 
              background: 'white',
              height: '45px'
            }}
            onClick={() => handleSelect(k)}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="divider"></div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn" onClick={() => setActiveTeamIdx(Math.max(0, activeTeamIdx - 1))} disabled={activeTeamIdx === 0}>Anterior</button>
        <button 
            className="btn primary" 
            disabled={Object.keys(selections).length < teams.length}
            onClick={() => onComplete(selections)}
        >
          ¡Comenzar Examen! 🚀
        </button>
      </div>

      {Object.keys(selections).length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {teams.map(t => selections[t] && (
                  <div key={t} className="pill" style={{ fontSize: '0.7rem' }}>
                      {t}: {selections[t]}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default AvatarSelector;
