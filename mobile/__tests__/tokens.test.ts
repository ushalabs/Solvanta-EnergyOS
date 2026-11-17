import { darkTokens, lightTokens, HERO_LIME_GRADIENT, SPACING, RADIUS, TYPOGRAPHY } from '../src/theme/tokens';

// docs/design-reference/ (DESIGN_TOKENS.md and the six screen images) is the visual reference.
describe('Solvanta mobile design tokens', () => {
  test('dark theme matches docs/design-reference/DESIGN_TOKENS.md', () => {
    expect(darkTokens.background).toBe('#090C0A');
    expect(darkTokens.surface).toBe('#101512');
    expect(darkTokens.border).toBe('#1E2621');
    expect(darkTokens.surfaceElevated).toBe('#1A221D');
    expect(darkTokens.textPrimary).toBe('#E8EEEA');
    expect(darkTokens.textSecondary).toBe('#8A968F');
    expect(darkTokens.lime).toBe('#B8F23A');
    expect(darkTokens.limeBright).toBe('#C6F94A');
    expect(darkTokens.limeDeep).toBe('#A9E42C');
    expect(darkTokens.limeGlow).toBe('rgba(184, 242, 58, 0.3)');
    expect(darkTokens.flowLine).toBe('#6AE800');
    expect(darkTokens.panelFill).toBe('#16264F');
    expect(darkTokens.cyan).toBe('#5CD8FF');
    expect(darkTokens.amber).toBe('#FFC46B');
    expect(darkTokens.green).toBe('#34D8B0');
    expect(darkTokens.red).toBe('#FF6B5A');
  });

  test('light theme is unchanged, because the reference folder is dark only', () => {
    expect(lightTokens.background).toBe('#F5F7F1');
    expect(lightTokens.surface).toBe('#FFFFFF');
    expect(lightTokens.lime).toBe('#9CCC17');
    expect(lightTokens.textPrimary).toBe('#1A2019');
    expect(lightTokens.border).toBe('#DCE3D7');
  });

  test('button gradient runs between the reference stops', () => {
    expect(HERO_LIME_GRADIENT[0]).toBe('#C6F94A');
    expect(HERO_LIME_GRADIENT[2]).toBe('#A9E42C');
  });

  test('shape and type follow the reference in both themes', () => {
    expect(RADIUS.card).toBe(18);
    expect(RADIUS.button).toBe(16);
    expect(RADIUS.dock).toBe(26);
    expect(SPACING.horizontalPadding).toBe(16);
    expect(TYPOGRAPHY.screenTitle).toBe(19);
  });
});
