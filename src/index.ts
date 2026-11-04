import joplin from 'api';
import { ContentScriptType, MenuItemLocation, ToastType, ToolbarButtonLocation } from 'api/types';
import { runQuoteCommand } from './command';

joplin.plugins.register({
  onStart: async () => {
    const isDesktop = (await joplin.versionInfo()).platform === 'desktop';
    await joplin.contentScripts.register(
      ContentScriptType.CodeMirrorPlugin,
      'quoteItEditor',
      './contentScript.js',
    );
    const io = {
      readEditor: () => joplin.commands.execute('editor.execCommand', { name: 'quoteItSnapshot' }),
      readNote: (id: string) =>
        joplin.data.get(['notes', id], { fields: ['id', 'title', 'source_url'] }),
      writeClipboard: (text: string) => joplin.clipboard.writeText(text),
      notify: (message: string) =>
        joplin.views.dialogs.showToast({ message, type: ToastType.Error }),
    };

    if (!isDesktop) {
      const selector = await joplin.views.dialogs.create('quoteItMode');
      await joplin.views.dialogs.setHtml(
        selector,
        '<h2>Quote It</h2><p>Choose a source link for your quotation.</p>',
      );
      await joplin.views.dialogs.setButtons(selector, [
        { id: 'internal', title: 'Internal' },
        { id: 'external', title: 'External (coming soon)' },
        { id: 'cancel', title: 'Cancel' },
      ]);
      await joplin.commands.register({
        name: 'quoteIt',
        label: 'Quote It',
        iconName: 'fas fa-quote-right',
        execute: async () =>
          runQuoteCommand({
            ...io,
            selectMode: async () => {
              const result = await joplin.views.dialogs.open(selector);
              if (result?.id === 'internal' || result?.id === 'external') {
                return result.id;
              }

              return 'cancel';
            },
          }),
      });
      await joplin.views.toolbarButtons.create(
        'quoteItToolbar',
        'quoteIt',
        ToolbarButtonLocation.EditorToolbar,
      );
      return;
    }

    await joplin.commands.register({
      name: 'quoteItInternal',
      label: 'Quote It: Internal',
      // Keep palette access while requiring the Markdown editing pane;
      // copying also works on read-only notes.
      enabledCondition:
        'markdownEditorPaneVisible && oneNoteSelected && noteIsMarkdown && (!modalDialogVisible || gotoAnythingVisible)',
      execute: async () => runQuoteCommand(io),
    });
    await joplin.views.menuItems.create(
      'quoteItInternalMenu',
      'quoteItInternal',
      MenuItemLocation.EditorContextMenu,
    );
  },
});
