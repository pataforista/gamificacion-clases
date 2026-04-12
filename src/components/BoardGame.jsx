import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

const TILE_COLORS = ['#FFFFFF', '#00D9FF', '#CCFF00', '#FFD60A'];

const BoardGame = ({ teams = [], totalSteps = 100, scores = {}, avatars = {} }) => {
  const gridSize = Math.ceil(Math.sqrt(totalSteps));
  const tiles = Array.from({ length: totalSteps }, (_, i) => i);

  // Calculate X, Y for a snake pattern
  const getPosition = (index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const isEvenRow = row % 2 === 0;
    
    // Invert col on odd rows for snake effect
    const x = isEvenRow ? col : (gridSize - 1 - col);
    const y = gridSize - 1 - row; // Start from bottom
    
    return { x: x * 65, y: y * 65 };
  };

  return (
    <div className="board-game-container" style={{ 
      padding: '3rem', 
      background: 'rgba(255,255,255,0.02)', 
      backgroundImage: 'radial-gradient(rgba(255,0,110,0.1) 2px, transparent 2px)',
      backgroundSize: '30px 30px',
      borderRadius: '24px',
      overflow: 'auto',
      maxHeight: '70vh',
      display: 'flex',
      justifyContent: 'center',
      position: 'relative',
      border: '4px solid var(--line)'
    }}>
      <div style={{ 
        position: 'relative', 
        width: gridSize * 65, 
        height: gridSize * 65,
        minWidth: gridSize * 65,
        minHeight: gridSize * 65
      }}>
        {/* Render Tiles */}
        {tiles.map((t) => {
          const { x, y } = getPosition(t);
          const isStart = t === 0;
          const isFinish = t === totalSteps - 1;
          const isMilestone = (t + 1) % 10 === 0 && !isFinish;
          
          let bgColor = TILE_COLORS[t % TILE_COLORS.length];
          if (isStart) bgColor = 'var(--good)';
          if (isFinish) bgColor = 'var(--memphis-magenta)';
          if (isMilestone) bgColor = 'var(--memphis-yellow)';

          return (
            <div
              key={t}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: isStart || isFinish || isMilestone ? 60 : 50,
                height: isStart || isFinish || isMilestone ? 60 : 50,
                background: bgColor,
                border: `4px solid #000`,
                borderRadius: isMilestone ? '12px' : '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isStart || isFinish ? '0.8rem' : '0.9rem',
                fontWeight: 900,
                color: '#000',
                boxShadow: '4px 4px 0px rgba(0,0,0,1)',
                zIndex: isStart || isFinish ? 2 : 1,
                transform: isStart || isFinish || isMilestone ? 'translate(-5px, -5px)' : 'none'
              }}
            >
              {isStart ? 'INICIO' : isFinish ? 'META 🏆' : isMilestone ? `Nivel ${(t+1)/10}` : t + 1}
            </div>
          );
        })}

        {/* Render Team Avatars */}
        {teams.map((team, idx) => {
          const score = scores[team] || 0;
          // Score is directly proportional to board tile as scaled in GroupExam
          // Clamp to totalSteps - 1
          const rawPosition = Math.floor(score);
          const position = Math.min(totalSteps - 1, rawPosition);
          const { x, y } = getPosition(position);

          // Offset slightly if multiple teams on same tile
          const offsetX = (idx % 2) * 10 - 5;
          const offsetY = Math.floor(idx / 2) * 10 - 5;

          return (
            <motion.div
              key={team}
              layout
              initial={false}
              animate={{ 
                left: x + 5 + offsetX, 
                top: y - 10 + offsetY,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25,
                layout: { duration: 0.6 }
              }}
              style={{
                position: 'absolute',
                zIndex: 10,
              }}
              title={team}
            >
              <motion.div 
                animate={{ y: [0, -8, 0] }} 
                transition={{ repeat: Infinity, duration: 1.5 + (idx * 0.2), ease: "easeInOut" }}
                style={{
                  background: 'var(--memphis-cyan)',
                  border: '3px solid black',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: '4px 4px 0px black',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px', lineHeight: 1 }}>{avatars[team] || '👤'}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>{team.slice(0, 8)}</div>
                  {/* Little speech bubble tail */}
                  <div style={{
                      position: 'absolute',
                      bottom: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderTop: '8px solid black'
                  }}></div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardGame;
