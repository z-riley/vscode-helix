import * as vscode from 'vscode';

import { HelixState } from './helix_state_types';
import { Mode } from './modes_types';
import { removeTypeSubscription } from './type_subscription';
import { exec } from './exec';
import { cancelRecording } from './macro';

export function enterInsertMode(helixState: HelixState, before = true): void {
  // To fix https://github.com/jasonwilliams/vscode-helix/issues/14 we should clear selections on entering insert mode
  // Helix doesn't clear selections on insert but doesn't overwrite the selection either, so our best option is to just clear them
  const editor = helixState.editorState.activeEditor!;

  helixState.appendShiftedCursor = false;
  editor.selections = editor.selections.map((selection) => {
    let position = before ? selection.start : selection.end;
    // With no selection, append goes after the character under the block cursor
    if (!before && selection.isEmpty) {
      const shifted = editor.document.validatePosition(position.translate(0, 1));
      if (!shifted.isEqual(position)) helixState.appendShiftedCursor = true;
      position = shifted;
    }
    return new vscode.Selection(position, position);
  });

  helixState.mode = Mode.Insert;
  setModeContext('extension.helixKeymap.insertMode');
  helixState.commandLine.setText('', helixState);
}

export function enterNormalMode(helixState: HelixState): void {
  helixState.mode = Mode.Normal;
  setModeContext('extension.helixKeymap.normalMode');
  helixState.commandLine.setText('', helixState);
}

export function enterSearchPromptMode(helixState: HelixState): void {
  helixState.mode = Mode.SearchPrompt;
  setModeContext('extension.helixKeymap.searchPromptMode');
  helixState.commandLine.setText('', helixState);
}

export function enterCommandMode(helixState: HelixState): void {
  helixState.mode = Mode.CommandlineInProgress;
  setModeContext('extension.helixKeymap.commandMode');
  helixState.commandLine.setText('', helixState);
}

export function enterSelectRegexPromptMode(helixState: HelixState): void {
  helixState.mode = Mode.SelectRegexPrompt;
  setModeContext('extension.helixKeymap.selectRegexPromptMode');
  helixState.commandLine.setText('', helixState);
}

export function enterWindowMode(helixState: HelixState): void {
  helixState.mode = Mode.Window;
  setModeContext('extension.helixKeymap.windowMode');
  helixState.commandLine.setText('', helixState);
}

export function enterSelectMode(helixState: HelixState): void {
  helixState.mode = Mode.Select;
  setModeContext('extension.helixKeymap.selectMode');
  helixState.commandLine.setText('', helixState);
}

export function enterViewMode(helixState: HelixState): void {
  helixState.mode = Mode.View;
  setModeContext('extension.helixKeymap.viewMode');
  helixState.commandLine.setText('', helixState);
}

export function enterDisabledMode(helixState: HelixState): void {
  helixState.mode = Mode.Disabled;
  setModeCursorStyle(helixState.mode, helixState.editorState.activeEditor!);
  setRelativeLineNumbers(helixState.mode, helixState.editorState.activeEditor!);
  cancelRecording(helixState);
  removeTypeSubscription(helixState);
  setModeContext('extension.helixKeymap.disabledMode');
  helixState.commandLine.setText('', helixState);
}

function setModeContext(key: string) {
  const modeKeys = [
    'extension.helixKeymap.insertMode',
    'extension.helixKeymap.normalMode',
    'extension.helixKeymap.selectMode',
    'extension.helixKeymap.searchPromptMode',
    'extension.helixKeymap.selectRegexPromptMode',
    'extension.helixKeymap.viewMode',
    'extension.helixKeymap.disabledMode',
    'extension.helixKeymap.commandMode',
  ];

  modeKeys.forEach((modeKey) => {
    exec('setContext', modeKey, key === modeKey);
  });
}

export function setModeCursorStyle(mode: Mode, editor: vscode.TextEditor): void {
  if (mode === Mode.Insert || mode === Mode.Occurrence || mode === Mode.Disabled) {
    editor.options.cursorStyle = vscode.TextEditorCursorStyle.Line;
  } else if (mode === Mode.Normal) {
    editor.options.cursorStyle = vscode.TextEditorCursorStyle.Block;
  } else if (mode === Mode.Select) {
    editor.options.cursorStyle = vscode.TextEditorCursorStyle.Block;
  }
}

export function setRelativeLineNumbers(mode: Mode, editor: vscode.TextEditor): void {
  const config = vscode.workspace.getConfiguration('helixKeymap');
  const isEnabledToggleRelativeLineNumbers = config.get<boolean>('toggleRelativeLineNumbers', false);

  if (!isEnabledToggleRelativeLineNumbers) {
    return;
  }

  if (mode === Mode.Insert) {
    editor.options.lineNumbers = vscode.TextEditorLineNumbersStyle.On;
  } else {
    editor.options.lineNumbers = vscode.TextEditorLineNumbersStyle.Relative;
  }
}
