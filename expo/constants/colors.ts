export const INK = '#160D28';

export const palette = {
  navy: '#00274C',
  blue: '#2D6BFF',
  skyBlue: '#6EB8FF',
  orange: '#F57C00',
  amber: '#FFB84D',
  rust: '#C2410C',
} as const;

// Neo-brutalist palette: flat opaque surfaces, solid ink borders, no
// translucency. Every screen sits on a flat cream canvas (`background`);
// cards are pure white (`card`) so they read as distinct surfaces before
// their ink border/hard-shadow is even accounted for. `primary` carries
// most interactive UI (buttons, active tab tint, links) so it uses the
// palette's vivid blue rather than the darker brand navy, which is
// reserved for `secondary`/decorative accents and hero/masthead fills.
export default {
  light: {
    ink: INK,
    text: INK,
    textSecondary: '#4E5F7A',
    placeholder: '#8B8398',
    background: '#FFF7EC',
    backgroundSecondary: palette.skyBlue,
    card: '#FFFFFF',
    inputBackground: '#FFFFFF',
    border: INK,
    tint: palette.navy,
    primary: palette.blue,
    secondary: palette.navy,
    accent: palette.orange,
    success: palette.blue,
    error: palette.rust,
    warning: palette.amber,
    tabIconDefault: '#6B6478',
    tabIconSelected: palette.blue,
    feedBackground: '#FFF7EC',
    link: palette.blue,
    qrBackground: palette.skyBlue,
  },
} as const;
