// Genera los efectos de sonido y pistas de espera locales de la app
// (reemplazan a los antiguos previews de assets.mixkit.co, que requerían
// internet). Todo se sintetiza aquí y se codifica a MP3 con lamejs, así que
// los archivos de public/sounds/ son reproducibles y ajustables.
//
// Uso:  node scripts/generate-sounds.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';

const SR = 44100; // sample rate
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds');

// ---------------------------------------------------------------------------
// Utilidades de síntesis (mono, Float64Array en rango aprox. [-1, 1])
// ---------------------------------------------------------------------------

const buf = (seconds) => new Float64Array(Math.round(seconds * SR));

const TWO_PI = Math.PI * 2;

// Osciladores por fase acumulada (permiten glissandos sin saltos de fase).
function makeOsc(shape) {
    return (phase) => {
        const p = phase - Math.floor(phase);
        switch (shape) {
            case 'sine': return Math.sin(TWO_PI * p);
            case 'square': return p < 0.5 ? 1 : -1;
            case 'saw': return 2 * p - 1;
            case 'triangle': return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
            default: throw new Error(shape);
        }
    };
}

// Añade sobre `out` un tono con frecuencia/amplitud variables en el tiempo.
function tone(out, { shape = 'sine', freq, amp, start = 0, dur, detune = 0 }) {
    const osc = makeOsc(shape);
    const i0 = Math.round(start * SR);
    const n = Math.min(Math.round(dur * SR), out.length - i0);
    let phase = 0;
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        const f = (typeof freq === 'function' ? freq(t, t / (n / SR)) : freq) * (1 + detune);
        phase += f / SR;
        const a = typeof amp === 'function' ? amp(t, t / (n / SR)) : amp;
        out[i0 + i] += osc(phase) * a;
    }
}

// Ruido blanco con envolvente.
function noise(out, { amp, start = 0, dur }) {
    const i0 = Math.round(start * SR);
    const n = Math.min(Math.round(dur * SR), out.length - i0);
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        const a = typeof amp === 'function' ? amp(t, t / (n / SR)) : amp;
        out[i0 + i] += (Math.random() * 2 - 1) * a;
    }
}

// Envolvente exponencial decreciente.
const decay = (peak, tau) => (t) => peak * Math.exp(-t / tau);

// Ataque-decaimiento lineal simple (para notas musicales suaves).
const ad = (peak, attack, dur) => (t) =>
    t < attack ? peak * (t / attack) : peak * Math.max(0, 1 - (t - attack) / (dur - attack));

// Filtro paso bajo de un polo (in situ).
function lowpass(out, cutoffHz) {
    const a = 1 - Math.exp(-TWO_PI * cutoffHz / SR);
    let y = 0;
    for (let i = 0; i < out.length; i++) {
        y += a * (out[i] - y);
        out[i] = y;
    }
}

// Paso banda sencillo (paso bajo - paso bajo más grave) para percusión de ruido.
function bandpass(out, lowHz, highHz) {
    const hi = Float64Array.from(out);
    lowpass(hi, highHz);
    const lo = Float64Array.from(out);
    lowpass(lo, lowHz);
    for (let i = 0; i < out.length; i++) out[i] = hi[i] - lo[i];
}

// Eco con retroalimentación (da espacio a las pistas musicales).
function echo(out, delaySec, feedback, mix) {
    const d = Math.round(delaySec * SR);
    for (let i = d; i < out.length; i++) {
        out[i] += out[i - d] * feedback * mix;
    }
}

// Normaliza al pico deseado y aplica soft-clip de seguridad.
function finalize(out, peak = 0.89) {
    let max = 1e-9;
    for (const v of out) max = Math.max(max, Math.abs(v));
    const g = peak / max;
    for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * g * 1.1) * 0.95;
    return out;
}

// Fundido de entrada/salida para que los loops no truenen al repetirse.
function fade(out, inSec = 0.02, outSec = 0.05) {
    const nIn = Math.round(inSec * SR);
    const nOut = Math.round(outSec * SR);
    for (let i = 0; i < nIn; i++) out[i] *= i / nIn;
    for (let i = 0; i < nOut; i++) out[out.length - 1 - i] *= i / nOut;
    return out;
}

const NOTE = (semisFromA4) => 440 * Math.pow(2, semisFromA4 / 12);
// Semitonos desde A4 para nombres útiles.
const N = {
    C2: -33, G2: -26, A2: -24, C3: -21, D3: -19, E3: -17, F3: -16, G3: -14,
    A3: -12, B3: -10, C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, A4: 0,
    B4: 2, C5: 3, D5: 5, E5: 7, G5: 10, A5: 12, C6: 15,
};
const F = Object.fromEntries(Object.entries(N).map(([k, v]) => [k, NOTE(v)]));

// Percusión sintetizada -------------------------------------------------------
function kick(out, start) {
    tone(out, { shape: 'sine', start, dur: 0.22, amp: decay(0.9, 0.07), freq: (t) => 120 * Math.exp(-t / 0.04) + 45 });
}
function hat(out, start, amp = 0.16, dur = 0.05) {
    const seg = buf(dur);
    noise(seg, { amp: decay(amp, dur / 3), dur });
    bandpass(seg, 5000, 12000);
    const i0 = Math.round(start * SR);
    for (let i = 0; i < seg.length && i0 + i < out.length; i++) out[i0 + i] += seg[i];
}
function snare(out, start, amp = 0.4) {
    const dur = 0.16;
    const seg = buf(dur);
    noise(seg, { amp: decay(amp, 0.045), dur });
    bandpass(seg, 900, 6500);
    const i0 = Math.round(start * SR);
    for (let i = 0; i < seg.length && i0 + i < out.length; i++) out[i0 + i] += seg[i];
    tone(out, { shape: 'sine', start, dur: 0.08, amp: decay(amp * 0.5, 0.03), freq: 190 });
}

// ---------------------------------------------------------------------------
// Efectos de sonido
// ---------------------------------------------------------------------------

function sfxClick() {
    const out = buf(0.09);
    tone(out, { shape: 'sine', freq: 1900, dur: 0.05, amp: decay(0.6, 0.012) });
    tone(out, { shape: 'sine', freq: 3800, dur: 0.03, amp: decay(0.25, 0.006) });
    return finalize(out, 0.5);
}

function sfxTick() {
    const out = buf(0.1);
    tone(out, { shape: 'sine', freq: 1050, dur: 0.06, amp: decay(0.8, 0.01) });
    tone(out, { shape: 'sine', freq: 2600, dur: 0.03, amp: decay(0.3, 0.005) });
    return finalize(out, 0.6);
}

function sfxBoing() {
    const out = buf(0.55);
    tone(out, {
        shape: 'sine', dur: 0.55, amp: decay(0.9, 0.18),
        freq: (t) => (520 * Math.exp(-t / 0.16) + 130) * (1 + 0.06 * Math.sin(TWO_PI * 18 * t)),
    });
    return finalize(out, 0.75);
}

function sfxBuzzer() {
    const out = buf(0.85);
    const am = (t) => 0.5 * (1 + 0.35 * Math.sin(TWO_PI * 7 * t)) * (t > 0.75 ? (0.85 - t) / 0.1 : 1);
    tone(out, { shape: 'square', freq: 208, dur: 0.85, amp: am });
    tone(out, { shape: 'saw', freq: 156, dur: 0.85, amp: (t) => am(t) * 0.7 });
    lowpass(out, 2400);
    return finalize(out, 0.8);
}

function sfxDrumroll() {
    const dur = 1.8;
    const out = buf(dur);
    // Golpes de redoble acelerando y creciendo hasta el final.
    let t = 0;
    while (t < dur - 0.1) {
        const progress = t / dur;
        snare(out, t, 0.12 + 0.3 * progress);
        t += 0.055 - 0.02 * progress; // acelera
    }
    snare(out, dur - 0.09, 0.75); // golpe final
    return finalize(out, 0.7);
}

function sfxLose() {
    const out = buf(1.5);
    // Arpegio descendente clásico de "game over".
    const seq = [F.E4, F.C4, F.A3, F.F3];
    seq.forEach((f, i) => {
        const start = i * 0.22;
        tone(out, {
            shape: 'square', start, dur: 0.24, freq: f,
            amp: (t) => 0.32 * Math.min(1, t / 0.01) * Math.max(0, 1 - t / 0.24),
        });
    });
    // Nota final grave que cae desafinándose.
    tone(out, {
        shape: 'square', start: 0.92, dur: 0.55,
        freq: (t) => F.E3 * Math.exp(-t / 1.6),
        amp: (t) => 0.34 * Math.min(1, t / 0.01) * Math.max(0, 1 - t / 0.55),
    });
    lowpass(out, 3200);
    return finalize(out, 0.72);
}

// ---------------------------------------------------------------------------
// Pistas de espera (loops)
// ---------------------------------------------------------------------------

// "Pensando..." — arpegios suaves y lentos, ambiente tranquilo (Am-F-C-G).
function trackThinking() {
    const bpm = 72, beat = 60 / bpm, bars = 8;
    const out = buf(bars * 4 * beat);
    const chords = [
        [F.A3, F.C4, F.E4], [F.F3, F.A3, F.C4],
        [F.C4, F.E4, F.G4], [F.G3, F.B3, F.D4],
    ];
    for (let bar = 0; bar < bars; bar++) {
        const chord = chords[bar % 4];
        const barStart = bar * 4 * beat;
        // Bajo suave en la raíz.
        tone(out, { shape: 'sine', start: barStart, dur: 4 * beat, freq: chord[0] / 2, amp: ad(0.22, 0.4, 4 * beat) });
        // Arpegio de corcheas subiendo y bajando.
        const pattern = [0, 1, 2, 1, 0, 1, 2, 1];
        pattern.forEach((idx, step) => {
            const start = barStart + step * beat / 2;
            tone(out, { shape: 'triangle', start, dur: beat * 0.9, freq: chord[idx] * 2, amp: ad(0.16, 0.02, beat * 0.9) });
        });
    }
    echo(out, beat * 0.75, 0.4, 0.5);
    lowpass(out, 5000);
    return fade(finalize(out, 0.62), 0.05, 0.4);
}

// "Tensión Máxima" — pulso grave insistente en menor, con campanadas escasas.
function trackTension() {
    const bpm = 100, beat = 60 / bpm, bars = 8;
    const out = buf(bars * 4 * beat);
    for (let bar = 0; bar < bars; bar++) {
        const barStart = bar * 4 * beat;
        const root = bar % 4 === 3 ? F.G2 : F.A2; // leve movimiento armónico
        for (let e = 0; e < 8; e++) {
            const start = barStart + e * beat / 2;
            const f = e % 2 === 0 ? root : root * 2;
            tone(out, { shape: 'saw', start, dur: beat * 0.42, freq: f, amp: ad(0.3, 0.005, beat * 0.42) });
        }
        // Tic de reloj en cada tiempo (sensación de cuenta regresiva).
        for (let q = 0; q < 4; q++) hat(out, barStart + q * beat, 0.1, 0.03);
        // Campanada tensa (tritono) al inicio de cada 2 compases.
        if (bar % 2 === 0) {
            tone(out, { shape: 'sine', start: barStart, dur: 2 * beat, freq: F.E4 * Math.SQRT2, amp: ad(0.09, 0.3, 2 * beat) });
        }
    }
    lowpass(out, 3800);
    echo(out, beat / 2, 0.3, 0.4);
    return fade(finalize(out, 0.66), 0.05, 0.3);
}

// "Divertido" — melodía pentatónica saltarina en mayor con bajo alegre.
function trackFun() {
    const bpm = 116, beat = 60 / bpm, bars = 8;
    const out = buf(bars * 4 * beat);
    const bass = [F.C3, F.G3, F.A3, F.G3, F.F3, F.C3, F.G3, F.G2];
    const melody = [ // pares [semitono relativo a C5 en pentatónica, paso de corchea]
        [F.C5, 0], [F.E4, 1], [F.G4, 2], [F.A4, 3], [F.G4, 4], [F.E4, 6],
        [F.C5, 8], [F.A4, 9], [F.G4, 10], [F.E4, 12], [F.G4, 13], [F.C5, 14],
    ];
    for (let bar = 0; bar < bars; bar++) {
        const barStart = bar * 4 * beat;
        // Bajo con rebote (negra y contratiempo).
        const root = bass[bar % bass.length];
        for (let q = 0; q < 4; q++) {
            tone(out, { shape: 'triangle', start: barStart + q * beat, dur: beat * 0.5, freq: root / 2, amp: ad(0.3, 0.005, beat * 0.5) });
            tone(out, { shape: 'triangle', start: barStart + (q + 0.5) * beat, dur: beat * 0.3, freq: root, amp: ad(0.14, 0.005, beat * 0.3) });
        }
        // Melodía en compases alternos para que respire.
        if (bar % 2 === 0) {
            melody.forEach(([f, step]) => {
                const start = barStart + step * beat / 4 * 2;
                if (start < barStart + 8 * beat) {
                    tone(out, { shape: 'square', start, dur: beat * 0.42, freq: f, amp: ad(0.11, 0.01, beat * 0.42) });
                }
            });
        }
        hat(out, barStart + 0.5 * beat, 0.09);
        hat(out, barStart + 1.5 * beat, 0.09);
        hat(out, barStart + 2.5 * beat, 0.09);
        hat(out, barStart + 3.5 * beat, 0.09);
    }
    echo(out, beat * 0.5, 0.25, 0.35);
    lowpass(out, 6000);
    return fade(finalize(out, 0.64), 0.05, 0.3);
}

// "Energía" — beat bailable: bombo en negras, hats a contratiempo y bajo en 16avos.
function trackDance() {
    const bpm = 126, beat = 60 / bpm, bars = 8;
    const out = buf(bars * 4 * beat);
    const roots = [F.A2, F.A2, F.F3 / 2, F.G3 / 2]; // Am, Am, F, G (una octava abajo)
    for (let bar = 0; bar < bars; bar++) {
        const barStart = bar * 4 * beat;
        const root = roots[bar % 4];
        for (let q = 0; q < 4; q++) {
            kick(out, barStart + q * beat);
            hat(out, barStart + (q + 0.5) * beat, 0.14);
        }
        snare(out, barStart + 1 * beat, 0.25);
        snare(out, barStart + 3 * beat, 0.25);
        // Bajo en semicorcheas alternando octavas.
        for (let s = 0; s < 16; s++) {
            const f = s % 4 === 2 ? root * 2 : root;
            tone(out, { shape: 'saw', start: barStart + s * beat / 4, dur: beat * 0.2, freq: f, amp: ad(0.2, 0.004, beat * 0.2) });
        }
        // Acorde punteado al inicio del compás.
        [root * 2, root * 2.52, root * 3].forEach((f) => {
            tone(out, { shape: 'square', start: barStart + 2 * beat, dur: beat * 0.3, freq: f, amp: ad(0.06, 0.005, beat * 0.3) });
        });
    }
    lowpass(out, 5200);
    return fade(finalize(out, 0.7), 0.03, 0.25);
}

// ---------------------------------------------------------------------------
// Codificación MP3 y escritura
// ---------------------------------------------------------------------------

function toMp3(samples, kbps = 112) {
    const enc = new Mp3Encoder(1, SR, kbps);
    const int16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
    }
    const chunks = [];
    const BLOCK = 1152;
    for (let i = 0; i < int16.length; i += BLOCK) {
        const mp3buf = enc.encodeBuffer(int16.subarray(i, i + BLOCK));
        if (mp3buf.length > 0) chunks.push(Buffer.from(mp3buf));
    }
    const end = enc.flush();
    if (end.length > 0) chunks.push(Buffer.from(end));
    return Buffer.concat(chunks);
}

const FILES = {
    'sfx-click.mp3': sfxClick,
    'sfx-tick.mp3': sfxTick,
    'sfx-boing.mp3': sfxBoing,
    'sfx-buzzer.mp3': sfxBuzzer,
    'sfx-drumroll.mp3': sfxDrumroll,
    'sfx-lose.mp3': sfxLose,
    'musica-pensando.mp3': trackThinking,
    'musica-tension.mp3': trackTension,
    'musica-divertida.mp3': trackFun,
    'musica-energia.mp3': trackDance,
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, gen] of Object.entries(FILES)) {
    const samples = gen();
    const mp3 = toMp3(samples);
    writeFileSync(join(OUT_DIR, name), mp3);
    console.log(`${name}  ${(samples.length / SR).toFixed(1)}s  ${(mp3.length / 1024).toFixed(0)} KB`);
}
console.log('\nListo: archivos escritos en public/sounds/');
