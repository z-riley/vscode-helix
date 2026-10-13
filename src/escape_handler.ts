import * as vscode from 'vscode';

import { commandLine } from './commandLine';
import { HelixState } from './helix_state_types';
import { enterNormalMode, setModeCursorStyle, setRelativeLineNumbers } from './modes';
import { Mode } from './modes_types';
import * as positionUtils from './position_utils';
import { StatusBar } from './statusBar';
import { typeHandler } from './type_handler';
import { addTypeSubscription } from './type_subscription';
import { exec } from './exec';

export function escapeHandler(vimState: HelixState): void {
  const editor = vscode.window.activeTextEditor;

  if (!editor) return;

  if (vimState.mode === Mode.Insert || vimState.mode === Mode.Occurrence) {
    const shiftBack = vimState.mode === Mode.Insert && vimState.appendShiftedCursor;
    vimState.appendShiftedCursor = false;
    editor.selections = editor.selections.map((selection) => {
      const position = shiftBack ? positionUtils.left(selection.active) : selection.active;
      return new vscode.Selection(position, position);
    });

    enterNormalMode(vimState);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
    addTypeSubscription(vimState, typeHandler);
  } else if (vimState.mode === Mode.Normal) {
    // Clear multiple cursors
    if (editor.selections.length > 1) {
      editor.selections = [editor.selections[0]];
    }
    // There is no way to check if find widget is open, so just close it
    exec('closeFindWidget');
  } else if (vimState.mode === Mode.Select) {
    editor.selections = editor.selections.map((selection) => {
      const newPosition = new vscode.Position(selection.active.line, Math.max(selection.active.character - 1, 0));
      return new vscode.Selection(newPosition, newPosition);
    });

    enterNormalMode(vimState);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
  } else if (vimState.mode === Mode.SearchPrompt || vimState.mode === Mode.SelectRegexPrompt) {
    enterNormalMode(vimState);
    vimState.searchState.clearSearchString(vimState);
    // To match Helix UI go back to the last active position on escape
    if (vimState.searchState.lastActivePosition) {
      editor.selection = new vscode.Selection(
        vimState.searchState.lastActivePosition,
        vimState.searchState.lastActivePosition,
      );
      vimState.editorState.activeEditor?.revealRange(
        editor.selection,
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
      );
    }
  } else if (vimState.mode === Mode.View || vimState.mode === Mode.CommandlineInProgress) {
    commandLine.clearCommandString(vimState);
    enterNormalMode(vimState);
  }

  vimState.keysPressed = [];
  vimState.numbersPressed = [];
  StatusBar.clear(vimState);
}
