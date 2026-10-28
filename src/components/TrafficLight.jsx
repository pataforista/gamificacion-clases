import React from 'react';
import { Users, MessageCircleQuestion, VolumeX } from 'lucide-react';

// Semáforo de la clase. Se usa en "Clase en vivo" y en "Control de flujo".
// Cada luz lleva color, icono y texto: el estado se entiende aunque el
// proyector lave los colores o alguien no distinga rojo y verde.
const TRAFFIC_STATES = [
    { id: 'green', label: 'Libre', hint: 'Trabajo en equipo', Icon: Users },
    { id: 'yellow', label: 'Dudas', hint: 'Preguntas', Icon: MessageCircleQuestion },
    { id: 'red', label: 'Silencio', hint: 'Explicación', Icon: VolumeX },
];

const TrafficLight = ({ value = 'green', onChange, compact = false }) => (
    <div className={`traffic-row${compact ? ' compact' : ''}`} role="group" aria-label="Semáforo de la clase">
        {TRAFFIC_STATES.map(({ id, label, hint, Icon }) => {
            const active = value === id;
            return (
                <button
                    key={id}
                    type="button"
                    className={`traffic-btn${active ? ' active' : ''}`}
                    data-state={id}
                    aria-pressed={active}
                    onClick={() => onChange(id)}
                >
                    <Icon className="traffic-icon" size={compact ? 22 : 28} strokeWidth={2.4} aria-hidden />
                    <span className="traffic-label">{label}</span>
                    {!compact && <span className="traffic-hint">{hint}</span>}
                </button>
            );
        })}
    </div>
);

export default TrafficLight;
