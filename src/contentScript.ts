import { CodeMirrorControl } from 'api/types';
import type { EditorSnapshot } from './snapshot';

export default () => ({
  plugin: (control: CodeMirrorControl) => {
    // Joplin exposes cm6 on its CodeMirror 6 wrapper; CM5 is outside our scope.
    if (!control.cm6) {
      return;
    }
    control.registerCommand('quoteItSnapshot', (): EditorSnapshot => {
      const state = control.editor.state;
      const { from, to } = state.selection.main;
      return {
        noteId: state.facet(control.joplinExtensions.noteIdFacet),
        selection: state.doc.sliceString(from, to),
      };
    });
  },
});
