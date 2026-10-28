import React, { useState } from 'react';
import { SPRITE_CATEGORIES, ALL_SPRITES, isEmojiAvatar } from '../utils/sprites';

const AvatarSelector = ({ teams = [], onComplete }) => {
  const [selections, setSelections] = useState({});
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [categoryId, setCategoryId] = useState(SPRITE_CATEGORIES[0].id);

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

  const category = SPRITE_CATEGORIES.find(c => c.id === categoryId) || SPRITE_CATEGORIES[0];
  const currentPick = selections[currentTeam];

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: 'var(--primary)' }}>¡Elige tu personaje!</h2>
      <div className="divider"></div>
      
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Equipo: <span style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>{currentTeam}</span>
        </div>
        <div className="pill">Paso {activeTeamIdx + 1} de {teams.length}</div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.75rem' }}>
        {SPRITE_CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`btn${c.id === category.id ? ' primary' : ''}`}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}
            onClick={() => setCategoryId(c.id)}
          >
            {c.label} <span style={{ opacity: 0.7 }}>({c.items.length})</span>
          </button>
        ))}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
        gap: '1rem',
        maxHeight: '340px',
        overflowY: 'auto',
        padding: '1rem',
        border: '2px dashed var(--line)',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.05)'
      }}>
        {category.items.map((path) => {
          // Un avatar tomado por OTRO equipo no se puede repetir (siempre alcanzan:
          // hay muchos más avatares que equipos posibles).
          const isMine = currentPick === path;
          const isTaken = !isMine && teams.length <= ALL_SPRITES.length && Object.values(selections).includes(path);
          const isEmoji = isEmojiAvatar(path);
          return (
            <button
              key={path}
              className="btn"
              disabled={isTaken}
              aria-pressed={isMine}
              style={{ 
                padding: '0.5rem', 
                background: 'var(--bg)',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isTaken ? '2px solid rgba(255,0,0,0.5)' : isMine ? '2px solid var(--primary)' : '2px solid var(--line)',
                opacity: isTaken ? 0.3 : 1,
                fontSize: isEmoji ? '2.2rem' : 'inherit'
              }}
              onClick={() => handleSelect(path)}
            >
              {isEmoji ? path : <img src={path} alt="avatar" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
            </button>
          );
        })}
      </div>

      <div className="divider"></div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={() => setActiveTeamIdx(Math.max(0, activeTeamIdx - 1))} disabled={activeTeamIdx === 0}>Anterior</button>
          <button className="btn" onClick={() => setActiveTeamIdx(Math.min(teams.length - 1, activeTeamIdx + 1))} disabled={activeTeamIdx >= teams.length - 1 || !currentPick}>Siguiente</button>
        </div>
        <button 
            className="btn primary" 
            disabled={Object.keys(selections).length < teams.length}
            onClick={() => onComplete(selections)}
        >
          ¡Comenzar Examen!
        </button>
      </div>

      {Object.keys(selections).length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {teams.map(t => {
                  const sel = selections[t];
                  if (!sel) return null;
                  const isEmoji = isEmojiAvatar(sel);
                  return (
                      <div key={t} className="pill" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px' }}>
                          <span style={{ fontWeight: 900 }}>{t}:</span>
                          {isEmoji ? (
                              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{sel}</span>
                          ) : (
                              <img src={sel} width="20" height="20" style={{ borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                          )}
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
};

export default AvatarSelector;
