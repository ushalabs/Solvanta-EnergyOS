// ==============================================================================
// Solvanta Design Tokens
// Authoritative visual reference: design/reference/Neon_Smart_Home_Reference.png
// ==============================================================================

export interface ColorTokens {
  background: string;
  backgroundRaised: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  lime: string;
  limeBright: string;
  limeDeep: string;
  onLime: string;
  cyan: string;
  amber: string;
  red: string;
  green: string;
  overlay: string;
  shadow: string;
}

export const darkTokens: ColorTokens = {
  background: '#090B0A',        // Full canvas; near-black, not navy
  backgroundRaised: '#121513',  // Scrolling sections / floating dock background
  surface: '#1B1D1B',           // Matte graphite cards matching reference
  surfaceElevated: '#262927',   // Chips, stat wells, selected item rows
  border: '#343A33',            // Low-contrast thin hairline outlines
  textPrimary: '#F7F8F5',       // Primary crisp high-contrast text
  textSecondary: '#A6ADA4',     // Subtitles / supporting labels
  textMuted: '#737B72',         // Quiet hints / units / provenance tags
  lime: '#C6F43D',              // Electric acid-lime active state & actions
  limeBright: '#E1FF67',        // Gradient highlight apex
  limeDeep: '#99D40A',          // Gradient depth base
  onLime: '#182107',            // High-contrast dark text/icon on lime
  cyan: '#28CEDB',              // Grid / comparison / alternative curves
  amber: '#F9BC46',             // Warnings / generator power
  red: '#FF626A',               // Faults / unmet critical demand
  green: '#4DE1A2',             // Positive verification / 100% coverage
  overlay: 'rgba(9, 11, 10, 0.75)',
  shadow: 'rgba(0, 0, 0, 0.6)',
};

export const lightTokens: ColorTokens = {
  background: '#F5F7F1',        // Crisp light canvas
  backgroundRaised: '#EAEEE7',  // Elevated sections
  surface: '#FFFFFF',           // Clean white cards
  surfaceElevated: '#F0F3ED',   // Subtle grey chips and stat wells
  border: '#DCE3D7',            // Soft outline borders
  textPrimary: '#1A2019',       // Deep graphite typography
  textSecondary: '#5C685D',     // Secondary slate text
  textMuted: '#859182',         // Muted labels
  lime: '#9CCC17',              // Refined solar lime
  limeBright: '#B8E436',        // Gradient highlight
  limeDeep: '#7FAB00',          // Gradient depth
  onLime: '#142008',            // Dark glyph on lime
  cyan: '#087E91',              // Blue-cyan accents
  amber: '#B36D00',             // Deep amber warnings
  red: '#B93646',               // Crimson alerts
  green: '#14835A',             // Forest green success
  overlay: 'rgba(245, 247, 241, 0.85)',
  shadow: 'rgba(0, 0, 0, 0.08)',
};

export const HERO_LIME_GRADIENT: [string, string, string] = [
  '#E1FF67',
  '#C6F43D',
  '#99D40A',
];

export const HERO_LIME_GRADIENT_LIGHT: [string, string, string] = [
  '#B8E436',
  '#9CCC17',
  '#7FAB00',
];

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  cardPadding: 16,
  horizontalPadding: 18,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  card: 20,
  dock: 30,
  pill: 99,
};

export const TYPOGRAPHY = {
  kpiNumber: 28,
  heading: 22,
  sectionTitle: 16,
  body: 14,
  caption: 12,
  micro: 10,
};
