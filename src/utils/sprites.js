// Catálogo de avatares para el examen grupal. Cada ruta apunta a un PNG
// transparente de public/personajes (se precachea para uso sin conexión);
// los emojis se muestran como texto. Los valores que se guardan en
// teamAvatars son exactamente estas cadenas.
const png = (names) => names.map(n => `/personajes/${n}.png`);
const range = (prefix, count) =>
  Array.from({ length: count }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`);

export const SPRITE_CATEGORIES = [
  {
    id: 'pocket',
    label: 'Bichos',
    items: png([
      'abra', 'charmander', 'drowzee', 'dugtrio', 'electrode', 'gengar', 'gloom-f',
      ...range('gb', 46),
    ]),
  },
  {
    id: 'mazmorra',
    label: 'Mazmorra',
    items: png([
      'zelda-calabaza', 'zelda-calabaza-azul', 'zelda-totem-verde', 'zelda-totem-azul',
      'zelda-totem-morado', 'zelda-totem-rojo', 'zelda-totem-grito', 'zelda-blob-naranja',
      'zelda-fantasma-azul', 'zelda-gato-naranja', 'zelda-gato-rugido', 'zelda-cangrejo-rojo',
      'zelda-pulpo-rojo', 'zelda-cristal-lila', 'zelda-pilar', 'zelda-hada-verde',
      'zelda-escudo-rojo', 'zelda-mago-azul', 'zelda-arana-morada', 'zelda-murcielago-morado',
      'zelda-arana-grande',
    ]),
  },
  {
    id: 'heroes',
    label: 'Héroes 8-bit',
    items: png(['link-nes', 'samus-nes', 'pit-nes', 'mario-1', 'mario-2', 'mario-salto']),
  },
  {
    id: 'medicos',
    label: 'Médicos',
    items: ['🩺', '🧠', '🫀', '💊', '🧬', '🔬', '🦴', '🩹', '🌡️', '🏥', '⚕️', '🦷', '🧪', '👁️', '👂', '🦠'],
  },
];

export const ALL_SPRITES = SPRITE_CATEGORIES.flatMap(c => c.items);

export const isEmojiAvatar = (value) =>
  typeof value === 'string' && !value.startsWith('/') && !value.startsWith('http') && !value.includes('.');
