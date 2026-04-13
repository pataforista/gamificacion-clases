import React, { useState } from 'react';

const POKEMONS = [
  '/personajes/abra.png',
  '/personajes/charmander.png',
  '/personajes/drowzee.png',
  '/personajes/dugtrio.png',
  '/personajes/electrode.png',
  '/personajes/gengar.png',
  '/personajes/gloom-f.png'
];

const AvatarSelector = ({ teams = [], onComplete }) => {
  const [selections, setSelections] = useState({});
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);

  const handleSelect = (pokemonPath) => {
    const team = teams[activeTeamIdx];
    const newSelections = { ...selections, [team]: pokemonPath };
    setSelections(newSelections);

    if (activeTeamIdx < teams.length - 1) {
      setActiveTeamIdx(prev => prev + 1);
    }
  };

  const currentTeam = teams[activeTeamIdx];

  if (!currentTeam) return null;

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: 'var(--primary)' }}>🎭 ¡Elige tu Pokémon!</h2>
      <div className="divider"></div>
      
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Equipo: <span style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>{currentTeam}</span>
        </div>
        <div className="pill">Paso {activeTeamIdx + 1} de {teams.length}</div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
        gap: '1rem',
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '1rem',
        border: '2px dashed var(--line)',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.05)'
      }}>
        {POKEMONS.map((path, i) => {
          // Check if this pokemon is already selected by another team
          const isTaken = Object.values(selections).includes(path);
          return (
            <button
              key={i}
              className="btn"
              disabled={isTaken}
              style={{ 
                padding: '0.5rem', 
                background: 'var(--bg)',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isTaken ? '2px solid rgba(255,0,0,0.5)' : '2px solid var(--line)',
                opacity: isTaken ? 0.3 : 1
              }}
              onClick={() => handleSelect(path)}
            >
              <img src={path} alt="pokemon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          );
        })}
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
                  <div key={t} className="pill" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {t}: <img src={selections[t]} width="20" height="20" style={{ borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default AvatarSelector;
