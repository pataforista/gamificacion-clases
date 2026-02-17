import React from 'react';

const Help = () => {
    return (
        <div className="card help-section" style={{ lineHeight: '1.8' }}>
            <h2 style={{ color: 'var(--primary)' }}>¿Cómo funciona MedClass Pro?</h2>

            <section style={{ marginBottom: '2rem' }}>
                <h3>1. Sistema RPG (Jerarquía Médica)</h3>
                <p>
                    El sistema está diseñado para motivar la participación mediante una jerarquía de hospital (Interno → Residente → Jefe de Servicio).
                    Gana <strong>XP</strong> mediante aciertos en clase y gestiona la <strong>Energía del Grupo</strong> (Salud) para penalizar errores o falta de atención.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h3>2. Control de Flujo</h3>
                <p>
                    Utiliza el <strong>Semáforo</strong> para indicar la fase actual de la clase:
                    <ul>
                        <li><span style={{ color: 'var(--traffic-green)' }}>● Verde:</span> Trabajo en equipo o libre.</li>
                        <li><span style={{ color: 'var(--traffic-yellow)' }}>● Amarillo:</span> Transición o resolución de dudas.</li>
                        <li><span style={{ color: 'var(--traffic-red)' }}>● Rojo:</span> Explicación del docente (silencio total).</li>
                    </ul>
                    El <strong>Código Rojo</strong> es un temporizador rápido de 30s para retomar el control del aula inmediatamente.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h3>3. Herramientas de Azar</h3>
                <p>
                    <strong>Sorteo:</strong> Ingresa una lista de nombres. El motor garantiza un reparto equitativo (nadie sale dos veces hasta que todos hayan salido).
                    <br /><strong>Dados 3D:</strong> Permite lanzar dados físicos simulados o usar fórmulas complejas de RPG (ej: <code>2d20 + 5</code>).
                    <br /><strong>Touch Order:</strong> Coloca los dedos en la pantalla para decidir un orden de intervención rápido.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h3>4. Examen Grupal</h3>
                <p>
                    Carga un archivo JSON con preguntas y opciones. Puedes asignar turnos a los equipos creados previamente y llevar un marcador en tiempo real.
                </p>
            </section>

            <div className="divider"></div>

            <p className="smallout" style={{ textAlign: 'center' }}>
                Toda la información se guarda localmente en este navegador. <br />
                Usa <strong>Exportar JSON</strong> en la pestaña Progreso para no perder tus datos al cambiar de equipo.
            </p>
        </div>
    );
};

export default Help;
