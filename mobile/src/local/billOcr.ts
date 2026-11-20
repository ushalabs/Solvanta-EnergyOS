// Reads monthly units from a photo or screenshot of an electricity bill, on the device (Google ML Kit text recognition).
import { readTable, wordsFromElements, type OcrElement } from './engines/billHistory';

export const OCR_UNAVAILABLE = 'Reading a bill needs an updated app build. Enter the units below instead.';
export const PDF_NOT_SUPPORTED = 'PDF bills cannot be read on the device yet. Upload a screenshot or photo of the Month / Units table instead.';

export class BillReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillReadError';
  }
}

type Recognizer = { recognize(uri: string): Promise<{ blocks: Array<{ lines: Array<OcrElement & { elements?: OcrElement[] }> }> }> };

/** Loaded only when a bill is read, so a build without the native module still opens the screen. */
function recognizer(): Recognizer {
  try {
    const module = require('@react-native-ml-kit/text-recognition');
    return module.default ?? module;
  } catch {
    throw new BillReadError(OCR_UNAVAILABLE);
  }
}

export async function readBillOnDevice(asset: { uri: string; name?: string | null; mimeType?: string | null }) {
  if (asset.mimeType === 'application/pdf' || asset.name?.toLowerCase().endsWith('.pdf')) throw new BillReadError(PDF_NOT_SUPPORTED);
  let result;
  try {
    result = await recognizer().recognize(asset.uri);
  } catch (error) {
    if (error instanceof BillReadError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    // A build made before the module was added has no native side to call.
    if (/native module|not linked|undefined is not an object|cannot read propert/i.test(message)) throw new BillReadError(OCR_UNAVAILABLE);
    throw new BillReadError('The bill could not be read. Choose a clear JPG or PNG of the usage table.');
  }
  const elements = result.blocks.flatMap(block => block.lines.flatMap(line => (line.elements?.length ? line.elements : [line])));
  const readings = readTable(wordsFromElements(elements));
  return Object.keys(readings).sort().map(month => ({ month, units_kwh: readings[month] }));
}
