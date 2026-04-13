import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

const TILE_COLORS = ['var(--bg)', 'var(--secondary)', 'var(--good)', 'var(--warn)'];

const BoardGame = ({ teams = [], totalSteps = 100, scores = {}, avatars = {}, activeTeam = null }) => {
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
    <div className="card" style={{
      width: '100%',
      maxWidth: '480px', // Slightly smaller for safety
      margin: '0 auto',
      aspectRatio: '1',
      background: 'var(--bg-secondary)',
      borderRadius: '20px',
      position: 'relative',
      padding: '2px',
      overflow: 'hidden',
      border: '4px solid var(--line)'
    }}>
      {/* Grid Tiles */}
      {tiles.map((t) => {
        const { x, y } = getPosition(t);
        const isStart = t === 0;
        const isFinish = t === totalSteps - 1;
        const isMilestone = (t + 1) % 10 === 0;
        
        let tileBg = 'var(--bg)';
        if (isStart) tileBg = 'var(--good)';
        else if (isFinish) tileBg = 'var(--primary)';
        else if (isMilestone) tileBg = 'var(--bg-secondary)';

        return (
          <div
            key={t}
            style={{
              position: 'absolute',
              width: '10%',
              height: '10%',
              left: `${x * 10}%`,
              top: `${y * 10}%`,
              background: tileBg,
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6rem',
              fontWeight: '700',
              color: 'var(--text)',
              opacity: isMilestone ? 1 : 0.8,
              boxSizing: 'border-box'
            }}
          >
            {t + 1}
          </div>
        );
      })}

      {/* Avatars as Compact Tokens */}
      {teams.map((team, idx) => {
        const score = scores[team] || 0;
        const clampedScore = Math.max(0, Math.min(totalSteps - 1, Math.floor(score)));
        const { x, y } = getPosition(clampedScore);
        const isActive = activeTeam === team;

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
              top: `${posY}%`,
              scale: isActive ? 1.2 : 1,
              zIndex: isActive ? 200 : 100 + idx
            }}
            transition={{ 
              type: "spring", 
              stiffness: 350, 
              damping: 25,
            }}
            style={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          >
            <motion.div 
              animate={isActive ? { scale: [1, 1.1, 1] } : {}} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                width: '32px',
                height: '32px',
                background: isActive ? 'var(--primary)' : 'var(--bg)',
                border: `3px solid ${isActive ? 'var(--text)' : 'var(--line)'}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? '0 0 15px var(--primary)' : '2px 2px 0px var(--line)',
                fontSize: '1rem',
                position: 'relative'
              }}
            >
                {avatars[team] || '👤'}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.5rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    border: '1px solid var(--line)'
                  }}>
                    TURNO
                  </div>
                )}
            </motion.div>
          </motion.div>
        );
      })}

      {/* Subtle decorative elements matching theme */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, opacity: 0.15 }}>
          <path d="M 50 150 Q 150 50 250 150" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
          <path d="M 350 450 Q 250 350 150 450" fill="none" stroke="var(--warn)" strokeWidth="4" />
      </svg>
    </div>
  );
};

export default BoardGame;
