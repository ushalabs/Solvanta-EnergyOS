/**
 * The bill picker needs native modules that an older app build may not include, and importing a missing
 * native module throws while the screen loads. They are loaded here, only when the user asks to pick a file,
 * so the rest of the screen works either way.
 */
export const PICKER_UNAVAILABLE = 'Picking a file needs an updated app build. Enter the units below instead.';

export class BillPickerUnavailableError extends Error {
  constructor() {
    super(PICKER_UNAVAILABLE);
    this.name = 'BillPickerUnavailableError';
  }
}

type PickerModule = typeof import('expo-document-picker');
type FileConstructor = typeof import('expo-file-system').File;
export type BillPicker = { DocumentPicker: PickerModule; File: FileConstructor | null };

/** `web` skips expo-file-system, because the browser hands over a File directly. */
export function loadBillPicker(platform: string): BillPicker {
  try {
    const DocumentPicker: PickerModule = require('expo-document-picker');
    const File: FileConstructor | null = platform === 'web' ? null : require('expo-file-system').File;
    return { DocumentPicker, File };
  } catch {
    throw new BillPickerUnavailableError();
  }
}
