import { Action } from '../action_types';
import { enterViewMode } from '../modes';
import { Mode } from '../modes_types';
import { parseKeysExact } from '../parse_keys';
import { exec } from '../exec';

// https://docs.helix-editor.com/keymap.html#view-mode
export const viewActions: Action[] = [
  parseKeysExact(['Z'], [Mode.Normal, Mode.Select], (helixState) => {
    enterViewMode(helixState);
  }),

  // align view center
  parseKeysExact(['z', 'c'], [Mode.Normal, Mode.Select], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'center',
    });
  }),

  parseKeysExact(['c'], [Mode.View], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'center',
    });
  }),

  // align view top
  parseKeysExact(['z', 't'], [Mode.Normal, Mode.Select], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'top',
    });
  }),

  parseKeysExact(['t'], [Mode.View], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'top',
    });
  }),

  // align view bottom
  parseKeysExact(['z', 'b'], [Mode.Normal, Mode.Select], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'bottom',
    });
  }),

  parseKeysExact(['b'], [Mode.View], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'bottom',
    });
  }),

  parseKeysExact(['z', 't'], [Mode.Normal, Mode.Select], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'top',
    });
  }),

  parseKeysExact(['t'], [Mode.View], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'top',
    });
  }),

  parseKeysExact(['z', 'j'], [Mode.Normal, Mode.Select], () => {
    exec('scrollLineDown');
  }),

  parseKeysExact(['j'], [Mode.View], () => {
    exec('scrollLineDown');
  }),

  parseKeysExact(['z', 'k'], [Mode.Normal, Mode.Select], () => {
    exec('scrollLineUp');
  }),

  parseKeysExact(['k'], [Mode.View], () => {
    exec('scrollLineUp');
  }),

  parseKeysExact(['z', 'z'], [Mode.Normal, Mode.Select], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'center',
    });
  }),

  parseKeysExact(['z'], [Mode.View], (_, editor) => {
    exec('revealLine', {
      lineNumber: editor.selection.active.line,
      at: 'center',
    });
  }),
];
