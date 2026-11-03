import { ColorTokens, darkTokens, lightTokens } from '../src/theme/tokens';

const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const TEXT: Array<keyof ColorTokens> = ['textPrimary', 'textSecondary', 'limeText', 'amberText', 'redText', 'greenText', 'cyanText'];
const BACKGROUNDS: Array<keyof ColorTokens> = ['background', 'backgroundRaised', 'surface', 'surfaceElevated'];

describe.each([['dark', darkTokens], ['light', lightTokens]] as const)('%s theme contrast (WCAG AA)', (_mode, t) => {
  test.each(TEXT.flatMap(fg => BACKGROUNDS.map(bg => [fg, bg] as const)))('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
  test('text on lime fills is at least 4.5:1', () => {
    for (const fill of [t.lime, t.limeBright, t.limeDeep]) expect(contrast(t.onLime, fill)).toBeGreaterThanOrEqual(4.5);
  });
  test('chart and geometry marks are at least 3:1 on surfaces', () => {
    for (const bg of [t.surface, t.surfaceElevated]) expect(contrast(t.limeMark, bg)).toBeGreaterThanOrEqual(3);
  });
});

test('light-mode lime stays a fill: it would fail as text on white, which is why limeText exists', () => {
  expect(contrast(lightTokens.lime, lightTokens.surface)).toBeLessThan(3);
  expect(contrast(lightTokens.limeText, lightTokens.surface)).toBeGreaterThanOrEqual(4.5);
});
