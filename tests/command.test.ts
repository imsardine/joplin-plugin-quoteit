import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { captureSnapshot } from '../src/snapshot';
import { copyInternal } from '../src/command';
import contentScript from '../src/contentScript';
import { CodeMirrorControl } from 'api/types';

const editor = { noteId: 'a'.repeat(32), selection: 'ell' };

const note = { id: editor.noteId, title: 'Note', source_url: '' };

type CommandIo = Parameters<typeof copyInternal>[0];

const ioDefaults: CommandIo = {
  readEditor: async () => ({ ...editor }),
  readNote: async () => ({ ...note }),
  writeClipboard: async () => {},
  notify: async () => {},
};

describe('Successful capture and copy', () => {
  test('copies the selection supplied by the editor adapter', async () => {
    let output: string;
    const io = {
      ...ioDefaults,
      readEditor: async () => ({ ...editor, selection: 'Captured passage' }),
      writeClipboard: async (text) => {
        output = text;
      },
    };

    await copyInternal(io);

    const expected = [
      '> Captured passage',
      '>',
      '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    ].join('\n');

    assert.equal(output, expected);
  });

  test('uses the host note ID without imposing a local ID format', async () => {
    const noteId = 'host-note-id';
    let output: string;
    const io = {
      ...ioDefaults,
      readEditor: async () => ({ ...editor, noteId, selection: '' }),
      readNote: async () => ({ ...note, id: noteId }),
      writeClipboard: async (text) => {
        output = text;
      },
    };

    await copyInternal(io);

    assert.equal(output, '[Note](:/host-note-id)');
  });

  test('captures a frozen source and writes quotation', async () => {
    let output: string;
    const io = {
      ...ioDefaults,
      writeClipboard: async (text) => {
        output = text;
      },
    };
    await copyInternal(io);
    // prettier-ignore
    const expected = [
    '> ell',
    '>',
    '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
  ].join('\n');

    assert.equal(output, expected);
    const snapshot = await captureSnapshot(io.readEditor, io.readNote);
    assert.ok(Object.isFrozen(snapshot));
  });
});

describe('Capture source and validation', () => {
  test('copies the first captured source without rereading editor or note', async () => {
    let editorReads = 0;
    let noteReads = 0;
    let output: string;
    const errors: string[] = [];
    const io = {
      ...ioDefaults,
      readEditor: async () => {
        editorReads += 1;
        if (editorReads > 1) {
          return { ...editor, selection: 'later selection' };
        }

        return { ...editor };
      },
      readNote: async (id) => {
        assert.equal(id, editor.noteId);
        noteReads += 1;
        return { ...note, title: noteReads === 1 ? 'First title' : 'Later title' };
      },
      writeClipboard: async (text) => {
        output = text;
      },
      notify: async (message) => {
        errors.push(message);
      },
    };

    await copyInternal(io);

    // prettier-ignore
    const expected = [
      '> ell', 
      '>', 
      '> -- [First title](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)'
    ].join('\n');

    assert.equal(output, expected);
    assert.deepEqual(errors, []);
    assert.equal(editorReads, 1);
    assert.equal(noteReads, 1);
  });

  test('preserves clipboard when note and editor identities differ', async () => {
    let clipboard = 'previous clipboard';
    let error: string;
    const io = {
      ...ioDefaults,
      readNote: async () => ({ ...note, id: 'b'.repeat(32) }),
      writeClipboard: async (text) => {
        clipboard = text;
      },
      notify: async (message) => {
        error = message;
      },
    };

    await copyInternal(io);

    assert.equal(clipboard, 'previous clipboard');
    assert.match(error, /retry/);
  });
});

describe('Host and clipboard failures', () => {
  test('clipboard rejection reports failure', async () => {
    let error: string;
    const io: CommandIo = {
      ...ioDefaults,
      writeClipboard: async () => {
        throw new Error('clipboard unavailable');
      },
      notify: async (message) => {
        error = message;
      },
    };

    await copyInternal(io);
    assert.match(error, /clipboard unavailable/);
  });

  test('metadata retrieval rejection preserves clipboard', async () => {
    let writes = 0,
      error: string;
    const io: CommandIo = {
      ...ioDefaults,
      readNote: async () => {
        throw new Error('note unavailable');
      },
      writeClipboard: async () => {
        writes++;
      },
      notify: async (message) => {
        error = message;
      },
    };

    await copyInternal(io);
    assert.equal(writes, 0);
    assert.match(error, /note unavailable/);
  });

  test('reports non-Error host failures without writing clipboard', async () => {
    let writes = 0;
    let error: string;
    const io: CommandIo = {
      ...ioDefaults,
      readEditor: async () => {
        throw 'Host unavailable';
      },
      writeClipboard: async () => {
        writes++;
      },
      notify: async (message) => {
        error = message;
      },
    };

    await copyInternal(io);

    assert.equal(writes, 0);
    assert.match(error, /Host unavailable/);
  });
});

describe('CM6 adapter', () => {
  test('CM6 uses primary range even when another range contains text', () => {
    let capture: () => {
      selection: string;
    };
    const state = {
      selection: {
        main: { from: 2, to: 2 },
        ranges: [
          { from: 0, to: 5 },
          { from: 2, to: 2 },
        ],
      },
      facet: () => editor.noteId,
      doc: {
        sliceString: (from: number, to: number) => 'hello'.slice(from, to),
      },
    };
    contentScript().plugin({
      cm6: {},
      editor: { state },
      joplinExtensions: { noteIdFacet: {} },
      registerCommand: (name, callback) => {
        capture = callback;
      },
    } as CodeMirrorControl);
    assert.equal(capture().selection, '');
  });

  test('does not register the CM6 command when the host has no cm6 marker', () => {
    let registered = false;
    contentScript().plugin({
      editor: {},
      joplinExtensions: { noteIdFacet: {} },
      registerCommand: () => {
        registered = true;
      },
    } as unknown as CodeMirrorControl);

    assert.equal(registered, false);
  });
});
