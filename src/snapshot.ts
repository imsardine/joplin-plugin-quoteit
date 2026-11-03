import type { QuotationSource } from './quotation';

export interface EditorSnapshot {
  noteId: string;
  selection: string;
}

export interface SourceNote {
  id: string;
  title: string;
  source_url: string;
}

export async function captureSnapshot(
  readEditor: () => Promise<EditorSnapshot>,
  readNote: (id: string) => Promise<SourceNote>,
): Promise<Readonly<QuotationSource>> {
  // Use the first captured editor state and fetch its note metadata once.
  const initialEditor = await readEditor();
  const initialNote = await readNote(initialEditor.noteId);
  const noteIdentityMismatch = initialNote.id !== initialEditor.noteId;
  if (noteIdentityMismatch) {
    throw new Error(
      'The source note does not match the captured editor. Select the passage again and retry.',
    );
  }

  return Object.freeze({
    noteId: initialEditor.noteId,
    title: initialNote.title,
    selection: initialEditor.selection,
  });
}
