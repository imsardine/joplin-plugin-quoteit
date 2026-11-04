import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { ButtonSpec, DialogResult, Toast } from 'api/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

// Resolve delivery artifacts from this file, independently of the shell's cwd.
const dist = resolve(__dirname, '../../../dist');
async function loadPlugin(
  selection = 'Selected **passage**',
  platform: 'desktop' | 'mobile' = 'desktop',
) {
  let noteId = 'a'.repeat(32);
  let title = 'Source **note**';
  const copied: string[] = [];
  const errors: string[] = [];
  const modalMessages: string[] = [];
  const toolbarButtons: { command: string; location: string }[] = [];
  const menus: string[] = [];
  let dialogHtml = '';
  let dialogButtons: ButtonSpec[] = [];
  let dialogOpens = 0;
  let selectMode: () => Promise<DialogResult | null> = async () => ({ id: 'internal' });
  const commands: Record<
    string,
    {
      label: string;
      iconName?: string;
      enabledCondition?: string;
      execute: () => Promise<void>;
    }
  > = {};
  const editorCommands: Record<string, () => unknown> = {};
  let start: () => Promise<void>;
  let failClipboard = false;
  let failCapture = false;
  let editorReads = 0;
  let noteReads = 0;
  const api = {
    versionInfo: async () => ({ platform }),
    plugins: {
      register: (plugin: { onStart: () => Promise<void> }) => {
        start = plugin.onStart;
      },
    },
    contentScripts: {
      register: async (type: string, id: string, path: string) => {
        assert.equal(type, 'codeMirrorPlugin');
        assert.equal(id, 'quoteItEditor');
        const exports: {
          default?: () => {
            plugin: (control: unknown) => void;
          };
        } = {};
        runInNewContext(readFileSync(resolve(dist, path), 'utf8'), { exports });
        exports.default().plugin({
          cm6: {},
          editor: {
            state: {
              get selection() {
                return { main: { from: 0, to: selection.length } };
              },
              doc: {
                toString: () => selection,
                sliceString: (from: number, to: number) => selection.slice(from, to),
              },
              facet: () => noteId,
            },
          },
          joplinExtensions: { noteIdFacet: {} },
          registerCommand: (name: string, callback: () => unknown) => {
            editorCommands[name] = callback;
          },
        });
      },
    },
    commands: {
      register: async (
        command: (typeof commands)[string] & {
          name: string;
        },
      ) => {
        commands[command.name] = command;
      },
      execute: async (
        name: string,
        args: {
          name: string;
        },
      ) => {
        assert.equal(name, 'editor.execCommand');
        editorReads += 1;
        if (failCapture) {
          throw new Error('Editor unavailable. Open a Markdown note and retry.');
        }
        assert.ok(editorCommands[args.name], 'Bundled editor command must be registered');
        return editorCommands[args.name]();
      },
    },
    data: {
      get: async (path: string[]) => {
        noteReads += 1;
        assert.equal(path[0], 'notes');
        assert.equal(path[1], noteId);
        return { id: noteId, title, source_url: '' };
      },
    },
    clipboard: {
      writeText: async (text: string) => {
        if (failClipboard) {
          throw new Error('Clipboard unavailable');
        }
        copied.push(text);
      },
    },
    views: {
      toolbarButtons: {
        create: async (_id: string, command: string, location: string) => {
          toolbarButtons.push({ command, location });
        },
      },
      menuItems: {
        create: async (_id: string, command: string, location: string) => {
          assert.equal(command, 'quoteItInternal');
          assert.equal(location, 'editorContextMenu');
          menus.push(command);
        },
      },
      dialogs: {
        create: async () => 'modeSelector',
        setHtml: async (_handle: string, html: string) => {
          dialogHtml = html;
        },
        setButtons: async (_handle: string, buttons: ButtonSpec[]) => {
          dialogButtons = buttons;
        },
        open: async () => {
          dialogOpens += 1;
          return selectMode();
        },
        showMessageBox: async (message: string) => {
          modalMessages.push(message);
        },
        showToast: async (toast: Toast) => {
          assert.equal(toast.type, 'error');
          errors.push(toast.message);
        },
      },
    },
  };
  runInNewContext(readFileSync(resolve(dist, 'index.js'), 'utf8'), { joplin: api, console });
  await start();
  const copyCommand = commands[platform === 'desktop' ? 'quoteItInternal' : 'quoteIt'];
  return {
    copied,
    errors,
    modalMessages,
    toolbarButtons,
    menus,
    commands,
    get dialogHtml() {
      return dialogHtml;
    },
    get dialogButtons() {
      return dialogButtons;
    },
    get dialogOpens() {
      return dialogOpens;
    },
    selectMode: (callback: typeof selectMode) => {
      selectMode = callback;
    },
    changeSource: () => {
      noteId = 'b'.repeat(32);
      title = 'Later note';
      selection = 'Later selection';
    },
    get editorReads() {
      return editorReads;
    },
    get noteReads() {
      return noteReads;
    },
    enabledCondition: copyCommand.enabledCondition,
    copy: copyCommand.execute,
    failClipboard: () => {
      failClipboard = true;
    },
    failCapture: () => {
      failCapture = true;
    },
  };
}

test('delivery bundles connect the registered command, CM6 capture and clipboard', async () => {
  const plugin = await loadPlugin();
  await plugin.copy();
  const expected = [
    '> Selected **passage**',
    '>',
    '> -- [Source \\*\\*note\\*\\*](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
  ].join('\n');

  assert.deepEqual(plugin.copied, [expected]);
  assert.deepEqual(plugin.errors, []);
});

test('desktop registration restricts copying to a visible Markdown editor and source note', async () => {
  const plugin = await loadPlugin();

  assert.equal(
    plugin.enabledCondition,
    'markdownEditorPaneVisible && oneNoteSelected && noteIsMarkdown && (!modalDialogVisible || gotoAnythingVisible)',
  );
  assert.equal(plugin.commands.quoteItInternal.label, 'Quote It: Internal');
  assert.deepEqual(plugin.toolbarButtons, []);
  assert.deepEqual(plugin.menus, ['quoteItInternal']);
});

describe('Mobile delivery flow', () => {
  test('captures before opening the selector and copies the original source after navigation', async () => {
    const plugin = await loadPlugin('Selected **passage**', 'mobile');
    plugin.selectMode(async () => {
      assert.equal(plugin.editorReads, 1);
      assert.equal(plugin.noteReads, 1);
      assert.deepEqual(plugin.copied, []);
      plugin.changeSource();
      return { id: 'internal' };
    });

    await plugin.copy();

    const expected = [
      '> Selected **passage**',
      '>',
      '> -- [Source \\*\\*note\\*\\*](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    ].join('\n');

    assert.equal(plugin.dialogOpens, 1);
    assert.deepEqual(plugin.copied, [expected]);
    assert.deepEqual(plugin.errors, []);
    assert.equal(plugin.editorReads, 1);
    assert.equal(plugin.noteReads, 1);
  });

  for (const { name, selection } of [
    { name: 'empty', selection: '' },
    { name: 'whitespace-only', selection: [' ', '\t'].join('\n') },
  ]) {
    test(`copies a link without a format warning for ${name} selection`, async () => {
      const plugin = await loadPlugin(selection, 'mobile');

      await plugin.copy();

      assert.equal(plugin.dialogOpens, 1);
      assert.deepEqual(plugin.copied, [
        '[Source \\*\\*note\\*\\*](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
      ]);
      assert.deepEqual(plugin.errors, []);
    });
  }

  for (const { name, response } of [
    { name: 'Cancel', response: { id: 'cancel' } },
    { name: 'host dismissal', response: null },
  ]) {
    test(`${name} leaves the clipboard alone without error feedback`, async () => {
      const plugin = await loadPlugin('Selected passage', 'mobile');
      plugin.selectMode(async () => response);

      await plugin.copy();

      assert.deepEqual(plugin.copied, []);
      assert.deepEqual(plugin.errors, []);
    });
  }

  test('External explains its availability without copying an Internal quotation', async () => {
    const plugin = await loadPlugin('Selected passage', 'mobile');
    plugin.selectMode(async () => ({ id: 'external' }));

    await plugin.copy();

    assert.deepEqual(plugin.copied, []);
    assert.equal(plugin.errors.length, 1);
    assert.match(plugin.errors[0], /External.*not available.*Internal/);
  });

  test('capture failure reports an error before opening the selector or writing clipboard', async () => {
    const plugin = await loadPlugin('Selected passage', 'mobile');
    plugin.failCapture();

    await plugin.copy();

    assert.equal(plugin.dialogOpens, 0);
    assert.deepEqual(plugin.copied, []);
    assert.equal(plugin.errors.length, 1);
    assert.match(plugin.errors[0], /Open a Markdown note and retry/);
  });

  test('selector failure reports an error without writing clipboard', async () => {
    const plugin = await loadPlugin('Selected passage', 'mobile');
    plugin.selectMode(async () => {
      throw new Error('Selector unavailable');
    });

    await plugin.copy();

    assert.deepEqual(plugin.copied, []);
    assert.equal(plugin.errors.length, 1);
    assert.match(plugin.errors[0], /Selector unavailable/);
  });

  test('clipboard failure after choosing Internal reports an error without a modal', async () => {
    const plugin = await loadPlugin('Selected passage', 'mobile');
    plugin.failClipboard();

    await plugin.copy();

    assert.equal(plugin.dialogOpens, 1);
    assert.deepEqual(plugin.copied, []);
    assert.deepEqual(plugin.modalMessages, []);
    assert.equal(plugin.errors.length, 1);
    assert.match(plugin.errors[0], /Clipboard unavailable/);
  });
});

test('mobile registration does not use desktop-only command context variables', async () => {
  const plugin = await loadPlugin('', 'mobile');

  assert.equal(plugin.enabledCondition, undefined);
});

test('mobile exposes one Quote It editor toolbar button with Internal and External choices', async () => {
  const plugin = await loadPlugin('Selected **passage**', 'mobile');

  assert.deepEqual(plugin.toolbarButtons, [{ command: 'quoteIt', location: 'editorToolbar' }]);
  assert.deepEqual(plugin.menus, []);
  assert.equal(plugin.commands.quoteIt.label, 'Quote It');
  assert.ok(plugin.commands.quoteIt.iconName);
  assert.match(plugin.dialogHtml, /Quote It/);
  const choices = Array.from(plugin.dialogButtons, ({ id, title }) => ({ id, title }));
  assert.deepEqual(choices, [
    { id: 'internal', title: 'Internal' },
    { id: 'external', title: 'External (coming soon)' },
    { id: 'cancel', title: 'Cancel' },
  ]);
});

test('delivery bundles copy a link for whitespace-only selection', async () => {
  const whitespaceOnly = [' ', '\t'].join('\n');
  const plugin = await loadPlugin(whitespaceOnly);
  await plugin.copy();
  assert.deepEqual(plugin.copied, [
    '[Source \\*\\*note\\*\\*](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
  ]);
});

test('delivery bundle reports clipboard failure with an error toast and no modal', async () => {
  const plugin = await loadPlugin();
  plugin.failClipboard();
  await plugin.copy();
  assert.deepEqual(plugin.copied, []);
  assert.deepEqual(plugin.modalMessages, []);
  assert.equal(plugin.errors.length, 1);
  assert.match(plugin.errors[0], /Clipboard unavailable/);
});
