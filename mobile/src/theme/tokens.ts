// ==============================================================================
// Solvanta Design Tokens
// Visual reference: docs/design-reference/ (DESIGN_TOKENS.md and the six screen images).
// Dark values come from DESIGN_TOKENS.md. That folder has no light theme, so light values are unchanged.
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
  // Accents safe for text/icons on surfaces. Spec colours such as light-mode lime are fills.
  limeText: string;
  amberText: string;
  redText: string;
  greenText: string;
  cyanText: string;
  limeMark: string;             // Chart bars and drawn geometry on surfaces
  limeTint: string;
  amberTint: string;
  redTint: string;
  greenTint: string;
  cyanTint: string;
  divider: string;
  limeGlow: string;             // Soft glow behind lime buttons, the hub and the active dock item
}

export const darkTokens: ColorTokens = {
  background: '#090C0A',        // Full canvas
  backgroundRaised: '#0C100D',  // Nested cards; not in the reference, set between background and card
  surface: '#101512',           // Cards
  surfaceElevated: '#1A221D',   // Icon tiles, chips, stat wells
  border: '#1E2621',            // 1px card border
  textPrimary: '#E8EEEA',       // Main text
  textSecondary: '#8A968F',     // Muted text
  textMuted: '#6F7A74',         // Dimmer than the reference's muted; too faint for body text
  lime: '#B8F23A',              // Accent
  limeBright: '#C6F94A',        // Button gradient start
  limeDeep: '#A9E42C',          // Button gradient end
  onLime: '#182107',            // Dark text/icon on lime; not in the reference, kept
  cyan: '#5CD8FF',              // Grid / comparison curves
  amber: '#FFC46B',             // Warnings / generator power
  red: '#FF6B5A',               // Faults / unmet critical demand
  green: '#34D8B0',             // Teal in the reference: positive status
  overlay: 'rgba(9, 12, 10, 0.75)',
  shadow: 'rgba(0, 0, 0, 0.6)',
  limeText: '#B8F23A',
  amberText: '#FFC46B',
  redText: '#FF6B5A',
  greenText: '#34D8B0',
  cyanText: '#5CD8FF',
  limeMark: '#B8F23A',
  limeTint: 'rgba(184, 242, 58, 0.14)',
  amberTint: 'rgba(255, 196, 107, 0.14)',
  redTint: 'rgba(255, 107, 90, 0.14)',
  greenTint: 'rgba(52, 216, 176, 0.14)',
  cyanTint: 'rgba(92, 216, 255, 0.14)',
  divider: 'rgba(255, 255, 255, 0.08)',
  limeGlow: 'rgba(184, 242, 58, 0.3)',
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
  limeText: '#4A6500',
  amberText: '#8A5300',
  redText: '#A32C3B',
  greenText: '#0E6B49',
  cyanText: '#066A7B',
  limeMark: '#6F9600',
  limeTint: 'rgba(156, 204, 23, 0.18)',
  amberTint: 'rgba(179, 109, 0, 0.12)',
  redTint: 'rgba(185, 54, 70, 0.10)',
  greenTint: 'rgba(20, 131, 90, 0.10)',
  cyanTint: 'rgba(8, 126, 145, 0.10)',
  divider: 'rgba(26, 32, 25, 0.10)',
  limeGlow: 'rgba(156, 204, 23, 0.3)',
};

// The reference gradient runs #C6F94A to #A9E42C; the accent sits between them.
export const HERO_LIME_GRADIENT: [string, string, string] = [
  '#C6F94A',
  '#B8F23A',
  '#A9E42C',
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
  horizontalPadding: 16,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  button: 16,
  card: 18,
  dock: 26,
  pill: 99,
};

// Floating bottom dock. Screens use these to keep pinned content clear of it.
export const DOCK = {
  height: 64,
  activeSize: 44,
  minBottom: 12,
};

export const TYPOGRAPHY = {
  kpiNumber: 28,
  heading: 22,
  screenTitle: 19,
  sectionTitle: 16,
  body: 14,
  caption: 12,
  micro: 10,
};
