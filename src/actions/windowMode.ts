import { Action } from '../action_types';
import { enterNormalMode } from '../modes';
import { Mode } from '../modes_types';
import { parseKeysExact } from '../parse_keys';
import { exec } from '../exec';

// https://docs.helix-editor.com/keymap.html#window-mode
export const windowActions: Action[] = [
  // New window modes (moving existing windows)
  parseKeysExact(['m', 'v'], [Mode.Window], (helixState) => {
    exec('workbench.action.moveEditorToNextGroup');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['m', 's'], [Mode.Window], (helixState) => {
    exec('workbench.action.moveEditorToBelowGroup');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['m', 'p'], [Mode.Window], (helixState) => {
    exec('workbench.action.moveEditorToPreviousGroup');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['m', 'w'], [Mode.Window], (helixState) => {
    exec('workbench.action.moveEditorToNewWindow');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['m', 'j'], [Mode.Window], (helixState) => {
    exec('workbench.action.restoreEditorsToMainWindow');
    enterNormalMode(helixState);
  }),

  // Crtl+w actions
  parseKeysExact(['w'], [Mode.Window], (helixState) => {
    exec('workbench.action.navigateEditorGroups');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['v'], [Mode.Window], (helixState) => {
    exec('workbench.action.splitEditor');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['s'], [Mode.Window], (helixState) => {
    exec('workbench.action.splitEditorDown');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['F'], [Mode.Window], (helixState) => {
    exec('editor.action.revealDefinitionAside');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['f'], [Mode.Window], (helixState) => {
    exec('editor.action.revealDefinitionAside');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['h'], [Mode.Window], (helixState) => {
    exec('workbench.action.focusLeftGroup');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['l'], [Mode.Window], (helixState) => {
    exec('workbench.action.focusRightGroup');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['j'], [Mode.Window], (helixState) => {
    exec('workbench.action.focusBelowGroup');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['k'], [Mode.Window], (helixState) => {
    exec('workbench.action.focusAboveGroup');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['q'], [Mode.Window], (helixState) => {
    exec('workbench.action.closeActiveEditor');
    enterNormalMode(helixState);
  }),

  // Alias q (for vim compatibility)
  parseKeysExact(['c'], [Mode.Window], (helixState) => {
    exec('workbench.action.closeActiveEditor');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['o'], [Mode.Window], (helixState) => {
    exec('workbench.action.closeOtherEditors');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['H'], [Mode.Window], (helixState) => {
    exec('workbench.action.moveActiveEditorGroupLeft');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['L'], [Mode.Window], (helixState) => {
    exec('workbench.action.moveActiveEditorGroupRight');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['n'], [Mode.Window], (helixState) => {
    exec('workbench.action.files.newUntitledFile');
    enterNormalMode(helixState);
  }),

  parseKeysExact(['b'], [Mode.Window], (helixState) => {
    exec('workbench.action.toggleSidebarVisibility');
    enterNormalMode(helixState);
  }),
];
