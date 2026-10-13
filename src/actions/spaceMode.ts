import { Action } from '../action_types';
import { enterWindowMode } from '../modes';
import { Mode } from '../modes_types';
import { parseKeysExact } from '../parse_keys';
import { exec } from '../exec';

// https://docs.helix-editor.com/keymap.html#space-mode
export const spaceActions: Action[] = [
  // Open File Picker
  parseKeysExact([' ', 'f'], [Mode.Normal], () => {
    exec('workbench.action.quickOpen');
  }),

  parseKeysExact([' ', 'g'], [Mode.Normal], () => {
    exec('workbench.debug.action.focusBreakpointsView');
  }),

  parseKeysExact([' ', 'k'], [Mode.Normal], () => {
    exec('editor.action.showHover');
  }),

  parseKeysExact([' ', 's'], [Mode.Normal], () => {
    exec('workbench.action.gotoSymbol');
  }),

  parseKeysExact([' ', 'S'], [Mode.Normal], () => {
    exec('workbench.action.showAllSymbols');
  }),

  // View problems in current file
  parseKeysExact([' ', 'd'], [Mode.Normal], () => {
    exec('workbench.actions.view.problems');
    // It's not possible to set active file on and off, you can only toggle it, which makes implementing this difficult
    // For now both d and D will do the same thing and search all of the workspace

    // Leaving this here for future reference
    // exec('workbench.actions.workbench.panel.markers.view.toggleActiveFile');
  }),

  // View problems in workspace
  parseKeysExact([' ', 'D'], [Mode.Normal], () => {
    // alias of 'd'. See above
    exec('workbench.actions.view.problems');
  }),

  parseKeysExact([' ', 'r'], [Mode.Normal], () => {
    exec('editor.action.rename');
  }),

  parseKeysExact([' ', 'a'], [Mode.Normal], () => {
    exec('editor.action.quickFix');
  }),

  parseKeysExact([' ', 'w'], [Mode.Normal], (helixState) => {
    enterWindowMode(helixState);
  }),

  parseKeysExact([' ', '/'], [Mode.Normal], () => {
    exec('workbench.action.findInFiles');
  }),

  parseKeysExact([' ', '?'], [Mode.Normal], () => {
    exec('workbench.action.showCommands');
  }),
];
