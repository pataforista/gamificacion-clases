import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

const TILE_COLORS = ['#FFFFFF', '#00D9FF', '#CCFF00', '#FFD60A'];

const BoardGame = ({ teams = [], totalSteps = 100, scores = {}, avatars = {} }) => {
  const gridSize = 10;
  const tiles = Array.from({ length: totalSteps }, (_, i) => i);

  // Snake pattern calculation (Boustrophedon)
  const getPosition = (index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const isEvenRow = row % 2 === 0;
    const x = isEvenRow ? col : (gridSize - 1 - col);
    const y = gridSize - 1 - row;
    return { x, y };
  };

  return (
    <div style={{
      width: '100%',
      aspectRatio: '1',
      background: 'var(--bg-secondary)',
      border: '6px solid var(--line)',
      borderRadius: '24px',
      position: 'relative',
      padding: '4px',
      boxShadow: '10px 10px 0px var(--line)',
      overflow: 'hidden'
    }}>
      {/* Grid Tiles */}
      {tiles.map((t) => {
        const { x, y } = getPosition(t);
        const isStart = t === 0;
        const isFinish = t === totalSteps - 1;
        const color = (t + 1) % 10 === 0 ? 'var(--memphis-yellow)' : 'var(--bg)';

        return (
          <div
            key={t}
            style={{
              position: 'absolute',
              width: '10%',
              height: '10%',
              left: `${x * 10}%`,
              top: `${y * 10}%`,
              background: isStart ? 'var(--good)' : isFinish ? 'var(--memphis-magenta)' : color,
              border: '2px solid var(--line)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: '900',
              color: 'var(--text)',
              boxShadow: 'inset 2px 2px 0px rgba(255,255,255,0.1), inset -2px -2px 0px rgba(0,0,0,0.2)',
              boxSizing: 'border-box'
            }}
          >
            {t + 1}
          </div>
        );
      })}

      {/* Avatars */}
      {teams.map((team, idx) => {
        const score = scores[team] || 0;
        const clampedScore = Math.max(0, Math.min(totalSteps - 1, Math.floor(score)));
        const { x, y } = getPosition(clampedScore);

        // Calculate visual position in percentage
        const posX = (x * 10) + 5;
        const posY = (y * 10) + 5;

        return (
          <motion.div
            key={team}
            layout
            initial={false}
            animate={{ 
              left: `${posX}%`, 
              top: `${posY}%` 
            }}
            transition={{ 
              type: "spring", 
              stiffness: 350, 
              damping: 25,
              layout: { duration: 0.6 }
            }}
            style={{
              position: 'absolute',
              zIndex: 100,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 2 + (idx * 0.3), ease: "easeInOut" }}
              style={{
                background: 'var(--memphis-cyan)',
                border: '3px solid var(--line)',
                borderRadius: '12px',
                padding: '4px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '4px 4px 0px var(--line)',
                whiteSpace: 'nowrap'
              }}
            >
                <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>{avatars[team] || '👤'}</div>
                <div style={{ fontSize: '0.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>{team.slice(0, 5)}</div>
            </motion.div>
          </motion.div>
        );
      })}

      {/* Decorative SVG for Snakes and Ladders (Simple lines/curves) */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, opacity: 0.3 }}>
          <path d="M 50 150 Q 150 50 250 150" fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round" />
          <path d="M 350 450 Q 250 350 150 450" fill="none" stroke="var(--memphis-purple)" strokeWidth="6" strokeDasharray="10 5" />
          <line x1="10%" y1="90%" x2="40%" y2="60%" stroke="var(--line)" strokeWidth="4" />
          <line x1="60%" y1="30%" x2="90%" y2="10%" stroke="var(--line)" strokeWidth="4" />
      </svg>
    </div>
  );
};

export default BoardGame;
