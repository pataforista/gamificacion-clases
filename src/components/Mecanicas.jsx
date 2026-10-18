import React, { useState, useEffect, useRef } from 'react';
import { RNG } from '../utils/rng';
import { usePersistence } from '../hooks/usePersistence';
import {
  MECANICAS, CATEGORIAS, NIVELES, MODALIDADES, CATEGORIA_IDS,
  mecanicasActivas, variante,
} from '../data/mecanicas';

// Sorteo de mecánicas: herramienta PRIVADA del docente. No proyecta nada: sin
// canvas, animación, confeti ni sonido. El docente lee la consigna en voz alta.

const fmt = (seg) => {
  const s = Math.max(0, Math.ceil(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const faseDe = (timer, now) => {
  if (!timer) return { fase: null, restante: 0 };
  const t = (now - timer.start) / 1000;
  if (t < timer.piensa) return { fase: 'piensa', restante: timer.piensa - t };
  if (t < timer.piensa + timer.total) return { fase: 'habla', restante: timer.piensa + timer.total - t };
  return { fase: 'fin', restante: 0 };
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const Mecanicas = ({ pickerItems = [] }) => {
  const { state, updateState } = usePersistence();
  const cfg = state.mecanicas;

  const [actual, setActual] = useState(null); // { id, alumno }
  const [timer, setTimer] = useState(null);   // { start, piensa, total }
  const [now, setNow] = useState(0);
  const [registro, setRegistro] = useState([]);
  const [aviso, setAviso] = useState('');
  const lastFase = useRef(null);

  const activas = mecanicasActivas(cfg);
  const mecanica = actual ? MECANICAS.find(m => m.id === actual.id) : null;
  const v = mecanica ? variante(mecanica, cfg) : null;
  const { fase, restante } = faseDe(timer, now);

  // Reloj: solo corre mientras hay una cuenta regresiva en marcha.
  const corriendo = timer !== null && fase !== 'fin';
  useEffect(() => {
    if (!corriendo) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [corriendo]);

  // Aviso silencioso: vibra al cambiar de fase (solo en celulares compatibles).
  useEffect(() => {
    if (fase && fase !== lastFase.current && lastFase.current !== null && navigator.vibrate) {
      navigator.vibrate(fase === 'fin' ? [200, 100, 200] : 120);
    }
    lastFase.current = fase;
  }, [fase]);

  const setCfg = (patch) => updateState({ mecanicas: { ...cfg, ...patch } });

  const alternar = (campo, valor) => {
    const lista = cfg[campo];
    setCfg({ [campo]: lista.includes(valor) ? lista.filter(x => x !== valor) : [...lista, valor] });
  };

  const detener = () => { setTimer(null); };

  const sortear = () => {
    if (activas.length === 0) {
      setAviso('Activa al menos una categoría para poder sortear.');
      return;
    }
    setAviso('');
    detener();
    const clave = RNG.keyFromItems(`mecanicas-${cfg.nivel}`, activas.map(m => m.id));
    const m = RNG.pick(activas, clave);
    setActual({ id: m.id, alumno: null });
  };

  const sortearAlumno = () => {
    if (!actual) return;
    if (pickerItems.length === 0) {
      setAviso('La lista de clase está vacía. Agrégala en la pestaña Sorteo.');
      return;
    }
    setAviso('');
    const alumno = RNG.pick(pickerItems, RNG.keyFromItems('mecanicas-alumno', pickerItems));
    setActual({ ...actual, alumno });
  };

  const iniciar = () => {
    if (!v) return;
    const ahora = Date.now();
    lastFase.current = null;
    setNow(ahora);
    setTimer({ start: ahora, piensa: v.pensarSeg || 0, total: v.tiempoSeg });
  };

  const cerrar = (resultado) => {
    if (!mecanica) return;
    setRegistro(prev => [{
      mecanica: v.nombre,
      nivel: cfg.nivel,
      alumno: actual.alumno || '',
      resultado,
      hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    }, ...prev]);
    detener();
    setActual(null);
  };

  // Misma mecánica en la lámina que sigue: reinicia el tiempo y el alumno.
  const siguienteLamina = () => {
    detener();
    setActual({ ...actual, alumno: null });
  };

  const exportarCSV = () => {
    const filas = [['hora', 'nivel', 'mecanica', 'alumno', 'resultado'],
      ...[...registro].reverse().map(r => [r.hora, r.nivel, r.mecanica, r.alumno, r.resultado])];
    const csv = filas.map(f => f.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registro-mecanicas.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const rotuloFase = { piensa: 'Piensen en dupla', habla: 'Tiempo', fin: 'Tiempo terminado' };

  return (
    <div className="grid">
      <div className="card">
        <h2>Mecánicas</h2>
        <p className="muted">
          Herramienta privada: no se proyecta nada. Sortea, lee la consigna en voz alta y da el tiempo.
        </p>

        <div className="seg" role="group" aria-label="Nivel" style={{ marginBottom: '0.75rem' }}>
          {Object.entries(NIVELES).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={cfg.nivel === id}
              onClick={() => setCfg({ nivel: id })}
            >
              {label}
            </button>
          ))}
        </div>

        <button type="button" className="btn primary" style={{ width: '100%', minHeight: '3rem' }} onClick={sortear}>
          {actual ? 'Otra mecánica' : 'Sortear mecánica'}
        </button>

        <div aria-live="polite">
          {aviso && <p className="smallout" role="status">{aviso}</p>}

          {mecanica && v && (
            <div className={`mec-card ${mecanica.categoria}`} data-testid="resultado">
              <div className="mec-meta">
                {CATEGORIAS[mecanica.categoria]} · {MODALIDADES[v.modalidad]} · {fmt(v.tiempoSeg)}
                {v.pensarSeg ? ` + ${v.pensarSeg} s para pensar` : ''}
              </div>
              <h3>{v.nombre}</h3>
              <p className="mec-consigna">{v.consigna}</p>
              {v.arranque && <p className="mec-arranque">Frase de arranque: “{v.arranque}”</p>}
              {v.requiereSiguiente && <p className="mec-nota">Avanza a la lámina siguiente antes de empezar.</p>}
              {actual.alumno && <p className="mec-alumno">Participa: {actual.alumno}</p>}
            </div>
          )}
        </div>

        {mecanica && (
          <>
            {timer && (
              <div className={`mec-timer ${fase}`} role="timer" data-testid="cronometro">
                <div className="mec-fase">{rotuloFase[fase]}</div>
                <div className="mec-tiempo">{fase === 'fin' ? '0:00' : fmt(restante)}</div>
              </div>
            )}

            <div className="mec-acciones">
              {timer
                ? <button type="button" className="btn" onClick={detener}>Detener tiempo</button>
                : <button type="button" className="btn primary" onClick={iniciar}>Iniciar tiempo</button>}
              <button type="button" className="btn" onClick={sortearAlumno}>¿Quién?</button>
              <button type="button" className="btn" onClick={siguienteLamina}>Siguiente lámina</button>
            </div>
            <div className="mec-acciones">
              <button type="button" className="btn good" onClick={() => cerrar('hecho')}>Hecho</button>
              <button type="button" className="btn" onClick={() => cerrar('pasó')}>Pasó</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <details>
          <summary><strong>Configuración</strong></summary>
          <div className="mec-config" style={{ marginTop: '0.75rem' }}>
            <label>
              <input
                type="checkbox"
                checked={cfg.pensarAntes}
                onChange={(e) => setCfg({ pensarAntes: e.target.checked })}
              />{' '}
              Pensar en dupla antes de hablar (pregrado)
            </label>
            <div className="mec-grupo">Categorías</div>
            {CATEGORIA_IDS.map(id => (
              <label key={id}>
                <input type="checkbox" checked={cfg.categorias.includes(id)} onChange={() => alternar('categorias', id)} />{' '}
                {CATEGORIAS[id]}
              </label>
            ))}
            <div className="mec-grupo">Casillas extra</div>
            {MECANICAS.filter(m => m.extra).map(m => (
              <label key={m.id}>
                <input type="checkbox" checked={cfg.extras.includes(m.id)} onChange={() => alternar('extras', m.id)} />{' '}
                {m[cfg.nivel].nombre}
              </label>
            ))}
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              {activas.length} mecánica(s) en el sorteo. No se repiten hasta agotar todas.
            </p>
          </div>
        </details>

        <div className="divider" />

        <details>
          <summary><strong>Registro de la sesión ({registro.length})</strong></summary>
          <div style={{ marginTop: '0.75rem' }}>
            {registro.length === 0
              ? <p className="muted">Todavía no hay mecánicas registradas.</p>
              : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {registro.map((r, i) => (
                      <div key={i} className="smallout" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span>{r.mecanica}{r.alumno ? ` · ${r.alumno}` : ''}</span>
                        <span className="muted">{r.resultado} · {r.hora}</span>
                      </div>
                    ))}
                  </div>
                  <div className="row" style={{ marginTop: '0.75rem' }}>
                    <button type="button" className="btn" onClick={exportarCSV}>Exportar CSV</button>
                    <button type="button" className="btn" onClick={() => setRegistro([])}>Vaciar</button>
                  </div>
                </>
              )}
          </div>
        </details>
      </div>
    </div>
  );
};

export default Mecanicas;
