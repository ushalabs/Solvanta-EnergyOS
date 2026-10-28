import { darkTokens, lightTokens, HERO_LIME_GRADIENT, SPACING, RADIUS } from '../src/theme/tokens';

describe('Solvanta Mobile Design Tokens (UI Spec Compliance)', () => {
  test('Dark theme tokens match reference-matched specification', () => {
    expect(darkTokens.background).toBe('#090B0A');
    expect(darkTokens.surface).toBe('#1B1D1B');
    expect(darkTokens.surfaceElevated).toBe('#262927');
    expect(darkTokens.lime).toBe('#C6F43D');
    expect(darkTokens.limeBright).toBe('#E1FF67');
    expect(darkTokens.limeDeep).toBe('#99D40A');
    expect(darkTokens.onLime).toBe('#182107');
    expect(darkTokens.border).toBe('#343A33');
    expect(darkTokens.textPrimary).toBe('#F7F8F5');
  });

  test('Light theme tokens maintain semantic balance and readability', () => {
    expect(lightTokens.background).toBe('#F5F7F1');
    expect(lightTokens.surface).toBe('#FFFFFF');
    expect(lightTokens.lime).toBe('#9CCC17');
    expect(lightTokens.textPrimary).toBe('#1A2019');
    expect(lightTokens.border).toBe('#DCE3D7');
  });

  test('Signature hero lime gradient matches 3-stop specification', () => {
    expect(HERO_LIME_GRADIENT).toEqual(['#E1FF67', '#C6F43D', '#99D40A']);
  });

  test('Floating dock radius and card radius meet layout bounds', () => {
    expect(RADIUS.card).toBe(20);
    expect(RADIUS.dock).toBe(30);
    expect(SPACING.horizontalPadding).toBe(18);
  });
});
