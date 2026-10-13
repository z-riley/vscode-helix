import { Selection, window } from 'vscode';
import { Action } from '../action_types';
import { Mode } from '../modes_types';
import { parseKeysExact } from '../parse_keys';
import { exec } from '../exec';

// https://docs.helix-editor.com/keymap.html#goto-mode
export const gotoActions: Action[] = [
  // G actions
  parseKeysExact(['g', '.'], [Mode.Normal], () => {
    exec('workbench.action.navigateToLastEditLocation');
  }),

  parseKeysExact(['g', 'e'], [Mode.Normal], () => {
    exec('cursorBottom');
  }),

  parseKeysExact(['g', 'e'], [Mode.Select], () => {
    exec('cursorBottomSelect');
  }),

  parseKeysExact(['g', 'g'], [Mode.Normal], (helixState, editor) => {
    const count = helixState.resolveCount();
    if (count !== 1) {
      const range = editor.document.lineAt(count - 1).range;
      editor.selection = new Selection(range.start, range.end);
      editor.revealRange(range);
      return;
    }

    exec('cursorTop');
  }),

  parseKeysExact(['g', 'g'], [Mode.Select], (helixState, editor) => {
    const count = helixState.resolveCount();
    if (count !== 1) {
      const position = editor.selection.active;
      const range = editor.document.lineAt(count - 1).range;
      if (position.isBefore(range.start)) {
        editor.selection = new Selection(position, range.end);
      } else {
        editor.selection = new Selection(position, range.start);
      }
      return;
    }

    exec('cursorTopSelect');
  }),

  parseKeysExact(['g', 'h'], [Mode.Normal], () => {
    exec('cursorLineStart');
  }),

  parseKeysExact(['g', 'h'], [Mode.Select], () => {
    exec('cursorLineStartSelect');
  }),

  parseKeysExact(['g', 'l'], [Mode.Normal], () => {
    exec('cursorLineEnd');
  }),

  parseKeysExact(['g', 'l'], [Mode.Select], () => {
    exec('cursorLineEndSelect');
  }),

  parseKeysExact(['g', 's'], [Mode.Normal], () => {
    exec('cursorHome');
  }),

  parseKeysExact(['g', 's'], [Mode.Select], () => {
    exec('cursorHomeSelect');
  }),

  parseKeysExact(['g', 'd'], [Mode.Normal], () => {
    exec('editor.action.revealDefinition');
  }),

  parseKeysExact(['g', 'i'], [Mode.Normal], () => {
    exec('editor.action.goToImplementation');
  }),

  parseKeysExact(['g', 'y'], [Mode.Normal], () => {
    exec('editor.action.goToTypeDefinition');
  }),

  parseKeysExact(['g', 'r'], [Mode.Normal], () => {
    exec('editor.action.goToReferences');
  }),

  parseKeysExact(['g', 't'], [Mode.Normal], () => {
    exec('cursorPageUp');
  }),

  parseKeysExact(['g', 't'], [Mode.Select], () => {
    exec('cursorPageUpSelect');
  }),

  parseKeysExact(['g', 'b'], [Mode.Normal], () => {
    exec('cursorPageDown');
  }),

  parseKeysExact(['g', 'b'], [Mode.Select], () => {
    exec('cursorPageDownSelect');
  }),

  parseKeysExact(['g', 'c'], [Mode.Normal], () => {
    exec('cursorMove', {
      to: 'viewPortCenter',
    });
  }),

  parseKeysExact(['g', 'c'], [Mode.Select], () => {
    exec('cursorMove', {
      to: 'viewPortCenter',
      select: true,
    });
  }),

  parseKeysExact(['g', 'k'], [Mode.Normal], () => {
    exec('scrollLineUp');
  }),

  parseKeysExact(['g', 'j'], [Mode.Normal], () => {
    exec('scrollLineDown');
  }),

  parseKeysExact(['g', 'a'], [Mode.Normal], (helixState) => {
    // VS Code has no concept of "last accessed file" so instead we'll need to keep track of previous text editors
    const editor = helixState.editorState.previousEditor;
    if (!editor) return;

    window.showTextDocument(editor.document);
  }),

  parseKeysExact(['g', 'm'], [Mode.Normal], (helixState) => {
    // VS Code has no concept of "last accessed file" so instead we'll need to keep track of previous text editors
    const document = helixState.editorState.lastModifiedDocument;
    if (!document) return;

    window.showTextDocument(document);
  }),

  parseKeysExact(['g', 'n'], [Mode.Normal], () => {
    exec('workbench.action.nextEditor');
  }),

  parseKeysExact(['g', 'p'], [Mode.Normal], () => {
    exec('workbench.action.previousEditor');
  }),
];
