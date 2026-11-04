import { config, QuoteConfig } from './config';
import { captureSnapshot, EditorSnapshot, SourceNote } from './snapshot';
import { QuotationSource, renderQuotation } from './quotation';

export async function runQuoteCommand(io: {
  readEditor: () => Promise<EditorSnapshot>;
  readNote: (id: string) => Promise<SourceNote>;
  writeClipboard: (text: string) => Promise<void>;
  notify: (message: string) => Promise<unknown>;
  selectMode?: () => Promise<'internal' | 'external' | 'cancel'>;
}) {
  const options = config;
  try {
    const source = await captureSnapshot(io.readEditor, io.readNote);

    if (io.selectMode) {
      const mode = await io.selectMode();
      if (mode === 'cancel') {
        return;
      }
      if (mode === 'external') {
        throw new Error('External mode is not available yet. Choose Internal to copy a note link.');
      }
    }

    await copyQuotation(source, options, io.writeClipboard);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await io.notify(`Quote It could not copy the quotation. ${reason}`);
  }
}

async function copyQuotation(
  source: Readonly<QuotationSource>,
  options: Readonly<QuoteConfig>,
  writeClipboard: (text: string) => Promise<void>,
) {
  const quotation = renderQuotation(source, options);
  await writeClipboard(quotation);
}
