// Reads the Month / Units history table of a Pakistani (PITC) electricity bill from positioned OCR words.
// Port of read_table() in backend/app/services/bill_history.py; the OCR itself now runs on the device.
export type Word = { text: string; x: number; y: number; height: number };

const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
const MONTH_PATTERN = /^([a-z]{3,9})[\s./'\-–]*(20\d{2}|\d{2})$/i;
const UNIT_PATTERN = /^(?:\d{1,7}|\d{1,3}(?:,\d{3}){1,2})(?:\.\d{1,2})?$/;

export function parseMonth(text: string): string | null {
  const match = MONTH_PATTERN.exec(text.trim());
  if (!match || !MONTHS.includes(match[1].slice(0, 3).toLowerCase())) return null;
  const month = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()) + 1;
  return `20${match[2].slice(-2)}-${String(month).padStart(2, '0')}`;
}

export function parseUnits(text: string): number | null {
  const cleaned = text.trim().replace(/^RP\s+/i, '');
  if (!UNIT_PATTERN.test(cleaned)) return null;
  const value = Number(cleaned.replace(/,/g, ''));
  return value < 10_000_000 ? value : null;
}

export function latestYear(readings: Record<string, number>): Record<string, number> {
  const months = Object.keys(readings).sort();
  if (!months.length) return {};
  const [year, month] = months[months.length - 1].split('-').map(Number);
  const total = year * 12 + month - 12;
  const earliest = `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
  return Object.fromEntries(months.filter(m => m >= earliest).map(m => [m, readings[m]]));
}

/** Read the PITC history table using its column headings as anchors. */
export function readTable(words: Word[]): Record<string, number> {
  let best: Record<string, number> = {};
  for (const monthLabel of words) {
    if (monthLabel.text.toLowerCase() !== 'month') continue;
    const header = words.filter(w => w.x > monthLabel.x && Math.abs(w.y - monthLabel.y) <= monthLabel.height).sort((a, b) => a.x - b.x);
    const unitsLabel = header.find(w => w.text.toLowerCase() === 'units');
    if (!unitsLabel) continue;
    const billLabel = header.find(w => w.x > unitsLabel.x && w.text.toLowerCase() === 'bill');
    if (!billLabel) continue;
    // Exclude other fields on the same page and the adjacent bill/payment columns.
    const monthRight = (monthLabel.x + unitsLabel.x) / 2;
    const monthLeft = 2 * monthLabel.x - monthRight;
    const unitsRight = (unitsLabel.x + billLabel.x) / 2;
    const table = words.filter(w => monthLeft <= w.x && w.x < unitsRight && monthLabel.y + monthLabel.height < w.y && w.y < monthLabel.y + 34 * monthLabel.height);
    const monthWords = table.filter(w => w.x < monthRight);
    const unitWords = table.filter(w => w.x >= monthRight);
    const readings: Record<string, number> = {};
    const conflicts = new Set<string>();
    for (const word of monthWords) {
      let month = parseMonth(word.text);
      if (month === null) {
        // PDF or OCR can split the month name, dash, and year into separate tokens.
        const row = monthWords.filter(item => Math.abs(item.y - word.y) <= word.height * 0.65).sort((a, b) => a.x - b.x);
        if (row[0] !== word) continue;
        month = parseMonth(row.map(item => item.text).join(' '));
      }
      if (month === null) continue;
      const candidates = unitWords
        .filter(item => Math.abs(item.y - word.y) <= Math.max(item.height, word.height) * 0.7 && item.text.toLowerCase() !== 'rp')
        .map(item => parseUnits(item.text));
      if (candidates.length !== 1 || candidates[0] === null) continue;
      if (month in readings && readings[month] !== candidates[0]) conflicts.add(month);
      readings[month] = candidates[0];
    }
    const kept = latestYear(Object.fromEntries(Object.entries(readings).filter(([m]) => !conflicts.has(m))));
    if (Object.keys(kept).length > Object.keys(best).length) best = kept;
  }
  return best;
}

/** ML Kit returns text elements with frames; each element becomes one positioned word. */
export type OcrElement = { text: string; frame?: { left: number; top: number; width: number; height: number } };

export function wordsFromElements(elements: OcrElement[]): Word[] {
  return elements.filter(e => e.frame && e.text.trim()).map(e => ({
    text: e.text.trim(), x: e.frame!.left + e.frame!.width / 2, y: e.frame!.top + e.frame!.height / 2, height: e.frame!.height,
  }));
}
