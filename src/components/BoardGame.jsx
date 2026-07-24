import { motion } from 'motion/react';
import React from 'react';

// Soft kawaii pastels cycled along the winding trail.
const PASTELS = [
  'var(--kawaii-pink)',
  'var(--kawaii-peach)',
  'var(--kawaii-lemon)',
  'var(--kawaii-mint)',
  'var(--kawaii-sky)',
  'var(--kawaii-lavender)',
];

// Little scrapbook doodle-stickers scattered behind the board.
const STICKERS = [
  { e: '⭐', top: '6%', left: '4%', size: '1.5rem', rot: -18 },
  { e: '🌸', top: '3%', left: '88%', size: '1.6rem', rot: 12 },
  { e: '☁️', top: '46%', left: '2%', size: '1.7rem', rot: -6 },
  { e: '💖', top: '70%', left: '92%', size: '1.4rem', rot: 16 },
  { e: '✨', top: '90%', left: '10%', size: '1.4rem', rot: -10 },
  { e: '🍬', top: '92%', left: '80%', size: '1.5rem', rot: 8 },
];

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

  const center = (index) => {
    const { x, y } = getPosition(index);
    return { cx: x * 10 + 5, cy: y * 10 + 5 };
  };

  // Build the winding dashed trail that threads every tile centre in order.
  const trail = tiles
    .map((t) => {
      const { cx, cy } = center(t);
      return `${cx},${cy}`;
    })
    .join(' ');

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        aspectRatio: '1',
        position: 'relative',
        padding: 'clamp(10px, 2.5%, 22px)',
        borderRadius: '28px',
        overflow: 'hidden',
        // Soft paper with a faint dotted grid — scrapbook page.
        background:
          'radial-gradient(circle at 1px 1px, var(--line-soft) 1px, transparent 0) 0 0 / 18px 18px, ' +
          'linear-gradient(145deg, var(--bg-secondary), var(--bg-tint))',
        border: '3px solid var(--line-soft)',
        boxShadow: 'var(--shadow-lg), inset 0 0 0 6px rgba(255,255,255,0.5)',
      }}
    >
      {/* Scrapbook doodle stickers */}
      {STICKERS.map((s, i) => (
        <div
          key={`st-${i}`}
          aria-hidden
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            fontSize: s.size,
            transform: `rotate(${s.rot}deg)`,
            opacity: 0.55,
            pointerEvents: 'none',
            zIndex: 1,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
          }}
        >
          {s.e}
        </div>
      ))}

      {/* Inner play area keeps a padded margin so the trail never clips */}
      <div style={{ position: 'absolute', inset: 'clamp(10px, 2.5%, 22px)' }}>
        {/* Winding trail behind the tiles */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
        >
          <polyline
            points={trail}
            fill="none"
            stroke="var(--line-soft)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={trail}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.5 5"
            opacity="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Grid Tiles */}
        {tiles.map((t) => {
          const { x, y } = getPosition(t);
          const isStart = t === 0;
          const isFinish = t === totalSteps - 1;
          const isMilestone = (t + 1) % 10 === 0 && !isFinish;

          let tileBg = PASTELS[Math.floor(t / 5) % PASTELS.length];
          let ring = 'rgba(255,255,255,0.85)';
          let label = t + 1;
          let extra = null;

          if (isStart) {
            tileBg = 'linear-gradient(135deg, var(--kawaii-mint), var(--good))';
            extra = '🏁';
          } else if (isFinish) {
            tileBg = 'linear-gradient(135deg, var(--kawaii-lemon), var(--warn))';
            ring = 'rgba(255,255,255,0.95)';
            extra = '🏆';
          } else if (isMilestone) {
            ring = 'var(--warn)';
            extra = '⭐';
          }

          return (
            <div
              key={t}
              style={{
                position: 'absolute',
                width: '10%',
                height: '10%',
                left: `${x * 10}%`,
                top: `${y * 10}%`,
                padding: '1.1%',
                boxSizing: 'border-box',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: tileBg,
                  border: `2px solid ${ring}`,
                  borderRadius: '30%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: 'rgba(74,59,68,0.85)',
                  lineHeight: 1,
                  boxShadow: (isStart || isFinish || isMilestone)
                    ? '0 4px 10px rgba(150,100,120,0.28)'
                    : '0 2px 5px rgba(150,100,120,0.16)',
                  position: 'relative',
                  transform: (isStart || isFinish) ? 'scale(1.04)' : 'none',
                }}
              >
                {extra ? (
                  <span style={{ fontSize: (isStart || isFinish) ? '0.95rem' : '0.75rem', lineHeight: 1 }}>{extra}</span>
                ) : (
                  label
                )}
                {isMilestone && (
                  <span style={{ fontSize: '0.42rem', fontWeight: 800, opacity: 0.85 }}>{label}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Avatars as cute pin tokens */}
        {teams.map((team, idx) => {
          const score = scores[team] || 0;
          const clampedScore = Math.max(0, Math.min(totalSteps - 1, Math.floor(score)));
          const { x, y } = getPosition(clampedScore);
          const isActive = activeTeam === team;

          const posX = x * 10 + 5;
          const posY = y * 10 + 5;
          const accent = PASTELS[idx % PASTELS.length];

          return (
            <motion.div
              key={team}
              layout
              initial={false}
              animate={{
                left: `${posX}%`,
                top: `${posY}%`,
                scale: isActive ? 1.25 : 1,
                zIndex: isActive ? 300 : 100 + idx,
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ position: 'absolute', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
            >
              <motion.div
                animate={isActive ? { y: [0, -4, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-16px',
                      background: 'linear-gradient(135deg, var(--primary), var(--kawaii-lavender))',
                      color: 'white',
                      padding: '2px 7px',
                      borderRadius: '8px',
                      fontSize: '0.5rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 3px 8px var(--accent-glow)',
                      border: '1.5px solid white',
                    }}
                  >
                    TURNO
                  </div>
                )}
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    background: isActive
                      ? 'linear-gradient(135deg, var(--primary), var(--kawaii-lavender))'
                      : 'var(--bg-secondary)',
                    border: `3px solid ${isActive ? 'white' : accent}`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive
                      ? '0 0 0 3px var(--accent-glow), 0 6px 14px rgba(150,100,120,0.35)'
                      : '0 4px 10px rgba(150,100,120,0.28)',
                    fontSize: '0.85rem',
                    overflow: 'hidden',
                  }}
                >
                  {(avatars[team]?.startsWith('data:image') || avatars[team]?.includes('.png')) ? (
                    <img
                      src={avatars[team]}
                      alt={team}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    avatars[team] || '👤'
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardGame;
