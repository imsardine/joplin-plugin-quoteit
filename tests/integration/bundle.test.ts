import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { Toast } from 'api/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

// Resolve delivery artifacts from this file, independently of the shell's cwd.
const dist = resolve(__dirname, '../../../dist');
async function loadPlugin(
  selection = 'Selected **passage**',
  platform: 'desktop' | 'mobile' = 'desktop',
) {
  const noteId = 'a'.repeat(32);
  const copied: string[] = [];
  const errors: string[] = [];
  const modalMessages: string[] = [];
  const commands: Record<
    string,
    {
      label: string;
      enabledCondition?: string;
      execute: () => Promise<void>;
    }
  > = {};
  const editorCommands: Record<string, () => unknown> = {};
  let start: () => Promise<void>;
  let failClipboard = false;
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
              selection: { main: { from: 0, to: selection.length } },
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
        assert.ok(editorCommands[args.name], 'Bundled editor command must be registered');
        return editorCommands[args.name]();
      },
    },
    data: {
      get: async (path: string[]) => {
        assert.equal(path[0], 'notes');
        assert.equal(path[1], noteId);
        return { id: noteId, title: 'Source **note**', source_url: '' };
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
      menuItems: {
        create: async (_id: string, command: string, location: string) => {
          assert.equal(command, 'quoteItInternal');
          assert.equal(location, 'editorContextMenu');
        },
      },
      dialogs: {
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
  assert.equal(commands.quoteItInternal.label, 'Quote It: Internal');
  return {
    copied,
    errors,
    modalMessages,
    enabledCondition: commands.quoteItInternal.enabledCondition,
    copy: commands.quoteItInternal.execute,
    failClipboard: () => {
      failClipboard = true;
    },
  };
}

test('delivery bundles connect the registered command, CM6 capture and clipboard', async () => {
  const plugin = await loadPlugin();
  await plugin.copy();
  const expected = [
    '> Selected **passage**',
    '>',
    '> -- [Source **note**](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
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
});

test('mobile registration does not use desktop-only command context variables', async () => {
  const plugin = await loadPlugin('', 'mobile');

  assert.equal(plugin.enabledCondition, undefined);
});

test('delivery bundles copy a link for whitespace-only selection', async () => {
  const whitespaceOnly = [' ', '\t'].join('\n');
  const plugin = await loadPlugin(whitespaceOnly);
  await plugin.copy();
  assert.deepEqual(plugin.copied, ['[Source **note**](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)']);
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
