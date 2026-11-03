import { config } from './config';
import { captureSnapshot, EditorSnapshot, SourceNote } from './snapshot';
import { renderQuotation } from './quotation';

export async function copyInternal(io: {
  readEditor: () => Promise<EditorSnapshot>;
  readNote: (id: string) => Promise<SourceNote>;
  writeClipboard: (text: string) => Promise<void>;
  notify: (message: string) => Promise<unknown>;
}) {
  const options = config;
  try {
    const source = await captureSnapshot(io.readEditor, io.readNote);
    const quotation = renderQuotation(source, options);
    await io.writeClipboard(quotation);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await io.notify(`Quote It could not copy the quotation. ${reason}`);
  }
}
