import { rowsToText, textToRows, stepTime, setFrom, setTo, addRow, canAddRow, removeRow, hasOverlap, formatTime } from '../src/api/outageRows';
import { parseOutages } from '../src/api/simulation';

describe('rows to text and back', () => {
  test('rows become the existing minute-range text', () => {
    expect(rowsToText([{ from: 480, to: 600 }])).toBe('480-600');
    expect(rowsToText([{ from: 480, to: 600 }, { from: 1080, to: 1200 }])).toBe('480-600, 1080-1200');
    expect(rowsToText([])).toBe('');
  });
  test('text becomes rows, in the order written', () => {
    expect(textToRows('480-600')).toEqual([{ from: 480, to: 600 }]);
    expect(textToRows(' 1080-1200 ,480-600')).toEqual([{ from: 1080, to: 1200 }, { from: 480, to: 600 }]);
    expect(textToRows('')).toEqual([]);
    expect(textToRows('  ')).toEqual([]);
  });
  test('round trip keeps the text the request already used', () => {
    for (const text of ['480-600', '0-60, 720-780', '1380-1440']) expect(rowsToText(textToRows(text)!)).toBe(text);
  });
  test('the text from rows is accepted by the existing validation, unchanged', () => {
    const rows = [{ from: 480, to: 600 }, { from: 1080, to: 1200 }];
    expect(parseOutages(rowsToText(rows))).toEqual([{ start_min: 480, end_min: 600 }, { start_min: 1080, end_min: 1200 }]);
  });
  test('text that cannot be shown as rows is refused with null', () => {
    for (const bad of ['nonsense', '480', '480-', '600-480', '480-480', '481-600', '480-1500', '-5-60', '480-600-700', '480-600,']) expect(textToRows(bad)).toBeNull();
  });
});

describe('editing times', () => {
  test('steps stay inside the bounds', () => {
    expect(stepTime(480, 60, 0, 1440)).toBe(540);
    expect(stepTime(10, -60, 0, 1440)).toBe(0);
    expect(stepTime(1430, 60, 0, 1440)).toBe(1440);
  });
  test('moving From past To pushes To along, so a row is never empty or reversed', () => {
    expect(setFrom({ from: 480, to: 600 }, 660)).toEqual({ from: 660, to: 675 });
    expect(setFrom({ from: 480, to: 600 }, 540)).toEqual({ from: 540, to: 600 });
    expect(setFrom({ from: 480, to: 600 }, 5000)).toEqual({ from: 1425, to: 1440 });
    expect(setFrom({ from: 480, to: 600 }, -30)).toEqual({ from: 0, to: 600 });
  });
  test('moving To before From pulls From back', () => {
    expect(setTo({ from: 480, to: 600 }, 420)).toEqual({ from: 405, to: 420 });
    expect(setTo({ from: 480, to: 600 }, 720)).toEqual({ from: 480, to: 720 });
    expect(setTo({ from: 480, to: 600 }, 9999)).toEqual({ from: 480, to: 1440 });
    expect(setTo({ from: 480, to: 600 }, 0)).toEqual({ from: 0, to: 15 });
  });
  test('every edit gives a row the server accepts', () => {
    let row = { from: 480, to: 600 };
    for (const d of [-600, 60, 15, 900, -15, -3000]) { row = setFrom(row, row.from + d); expect(parseOutages(rowsToText([row]))).toHaveLength(1); row = setTo(row, row.to - d); expect(parseOutages(rowsToText([row]))).toHaveLength(1); }
  });
  test('times are shown as HH:MM', () => { expect(formatTime(0)).toBe('00:00'); expect(formatTime(495)).toBe('08:15'); expect(formatTime(1440)).toBe('24:00'); });
});

describe('adding and removing rows', () => {
  test('the first added outage is 08:00 to 09:00', () => { expect(addRow([])).toEqual([{ from: 480, to: 540 }]); });
  test('the next one starts where the last ends and lasts an hour', () => {
    expect(addRow([{ from: 480, to: 600 }])).toEqual([{ from: 480, to: 600 }, { from: 600, to: 660 }]);
    expect(addRow([{ from: 1200, to: 1410 }])[1]).toEqual({ from: 1410, to: 1440 });
  });
  test('there is no room after the end of the day', () => {
    expect(canAddRow([{ from: 1380, to: 1440 }])).toBe(false);
    expect(addRow([{ from: 1380, to: 1440 }])).toEqual([{ from: 1380, to: 1440 }]);
    expect(canAddRow([])).toBe(true);
  });
  test('removing a row leaves the others in order', () => {
    expect(removeRow([{ from: 0, to: 60 }, { from: 120, to: 180 }, { from: 240, to: 300 }], 1)).toEqual([{ from: 0, to: 60 }, { from: 240, to: 300 }]);
  });
  test('a row added after a normal row never overlaps it', () => { expect(hasOverlap(addRow([{ from: 480, to: 600 }]))).toBe(false); });
});

describe('overlap', () => {
  test('rows that share a minute overlap, touching rows do not', () => {
    expect(hasOverlap([{ from: 480, to: 600 }, { from: 540, to: 660 }])).toBe(true);
    expect(hasOverlap([{ from: 480, to: 600 }, { from: 600, to: 660 }])).toBe(false);
    expect(hasOverlap([{ from: 1080, to: 1200 }, { from: 480, to: 600 }])).toBe(false);
    expect(hasOverlap([])).toBe(false);
  });
});
