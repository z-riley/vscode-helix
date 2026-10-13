import { Selection, TextEditorRevealType } from 'vscode';
import { Action } from '../action_types';
import { Mode } from '../modes_types';
import { parseKeysExact } from '../parse_keys';
import { exec } from '../exec';

export const unimparedActions: Action[] = [
  parseKeysExact([']', 'D'], [Mode.Normal], () => {
    exec('editor.action.marker.next');
  }),

  parseKeysExact(['[', 'D'], [Mode.Normal], () => {
    exec('editor.action.marker.prev');
  }),

  parseKeysExact([']', 'd'], [Mode.Normal], () => {
    exec('editor.action.marker.nextInFiles');
  }),

  parseKeysExact(['[', 'd'], [Mode.Normal], () => {
    exec('editor.action.marker.prevInFiles');
  }),

  parseKeysExact(['[', 'g'], [Mode.Normal], () => {
    // There is no way to check if we're in compare editor mode or not so i need to call both commands
    exec('workbench.action.compareEditor.previousChange');
    exec('workbench.action.editor.previousChange');
  }),

  parseKeysExact([']', 'g'], [Mode.Normal], () => {
    // There is no way to check if we're in compare editor mode or not so i need to call both commands
    exec('workbench.action.compareEditor.nextChange');
    exec('workbench.action.editor.nextChange');
  }),

  parseKeysExact([']', 'f'], [Mode.Normal], (helixState, editor) => {
    const range = helixState.symbolProvider.getNextFunctionRange(editor);
    if (range) {
      editor.revealRange(range, TextEditorRevealType.InCenter);
      editor.selection = new Selection(range.start, range.end);
    }
  }),

  parseKeysExact(['[', 'f'], [Mode.Normal], (helixState, editor) => {
    const range = helixState.symbolProvider.getPreviousFunctionRange(editor);
    if (range) {
      editor.revealRange(range, TextEditorRevealType.InCenter);
      editor.selection = new Selection(range.start, range.end);
    }
  }),
];
