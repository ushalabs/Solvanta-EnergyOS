// On-device bill reading: ML Kit's positioned text goes through the same table reader the backend used.
const mockRecognize = jest.fn();
jest.mock('@react-native-ml-kit/text-recognition', () => ({ __esModule: true, default: { recognize: (...args: unknown[]) => mockRecognize(...args) } }));
import { readBillOnDevice, OCR_UNAVAILABLE, PDF_NOT_SUPPORTED } from '../src/local/billOcr';

const element = (text: string, left: number, top: number) => ({ text, frame: { left: left - 10, top: top - 5, width: 20, height: 10 } });
const line = (...elements: ReturnType<typeof element>[]) => ({ text: elements.map(e => e.text).join(' '), elements });

beforeEach(() => mockRecognize.mockReset());

test('reads the Month / Units table from recognized text', async () => {
  mockRecognize.mockResolvedValue({ blocks: [{ lines: [
    line(element('Month', 100, 100), element('Units', 200, 100), element('Bill', 300, 100)),
    line(element('Jan-26', 100, 130), element('310', 200, 130), element('9,000', 300, 130)),
    line(element('Feb', 92, 150), element('26', 112, 150), element('285', 200, 150), element('8,100', 300, 150)),
  ] }] });
  expect(await readBillOnDevice({ uri: 'file:///bill.jpg', mimeType: 'image/jpeg' })).toEqual([
    { month: '2026-01', units_kwh: 310 }, { month: '2026-02', units_kwh: 285 },
  ]);
  expect(mockRecognize).toHaveBeenCalledWith('file:///bill.jpg');
});

test('PDF bills get a clear message instead of a failed read', async () => {
  await expect(readBillOnDevice({ uri: 'file:///bill.pdf', name: 'bill.pdf' })).rejects.toThrow(PDF_NOT_SUPPORTED);
  expect(mockRecognize).not.toHaveBeenCalled();
});

test('a build without the native module says it needs an update', async () => {
  mockRecognize.mockRejectedValue(new TypeError("Cannot read property 'recognize' of undefined"));
  await expect(readBillOnDevice({ uri: 'file:///bill.png' })).rejects.toThrow(OCR_UNAVAILABLE);
});
