import joplin from 'api';
import { ContentScriptType, MenuItemLocation, ToastType } from 'api/types';
import { copyInternal } from './command';

joplin.plugins.register({
  onStart: async () => {
    const isDesktop = (await joplin.versionInfo()).platform === 'desktop';
    await joplin.contentScripts.register(
      ContentScriptType.CodeMirrorPlugin,
      'quoteItEditor',
      './contentScript.js',
    );
    await joplin.commands.register({
      name: 'quoteItInternal',
      label: 'Quote It: Internal',
      // Desktop context keys differ from mobile. Keep palette access while
      // requiring the Markdown editing pane; copying also works on read-only notes.
      ...(isDesktop
        ? {
            enabledCondition:
              'markdownEditorPaneVisible && oneNoteSelected && noteIsMarkdown && (!modalDialogVisible || gotoAnythingVisible)',
          }
        : {}),
      execute: async () =>
        copyInternal({
          readEditor: () =>
            joplin.commands.execute('editor.execCommand', { name: 'quoteItSnapshot' }),
          readNote: (id) =>
            joplin.data.get(['notes', id], { fields: ['id', 'title', 'source_url'] }),
          writeClipboard: (text) => joplin.clipboard.writeText(text),
          notify: (message) => joplin.views.dialogs.showToast({ message, type: ToastType.Error }),
        }),
    });
    await joplin.views.menuItems.create(
      'quoteItInternalMenu',
      'quoteItInternal',
      MenuItemLocation.EditorContextMenu,
    );
  },
});
