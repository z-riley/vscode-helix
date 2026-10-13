import * as vscode from 'vscode';

import * as positionUtils from './position_utils';
import { exec } from './exec';

export function vscodeToHelixSelection(
  document: vscode.TextDocument,
  vscodeSelection: vscode.Selection,
): vscode.Selection {
  if (vscodeSelection.active.isBefore(vscodeSelection.anchor)) {
    return new vscode.Selection(positionUtils.leftWrap(document, vscodeSelection.anchor), vscodeSelection.active);
  } else {
    return new vscode.Selection(vscodeSelection.anchor, positionUtils.leftWrap(document, vscodeSelection.active));
  }
}

export function helixToVscodeSelection(
  document: vscode.TextDocument,
  vimSelection: vscode.Selection,
): vscode.Selection {
  if (vimSelection.active.isBefore(vimSelection.anchor)) {
    return new vscode.Selection(positionUtils.rightWrap(document, vimSelection.anchor), vimSelection.active);
  } else {
    return new vscode.Selection(vimSelection.anchor, positionUtils.rightWrap(document, vimSelection.active));
  }
}

export function flipSelection(editor: vscode.TextEditor | undefined) {
  if (!editor) {
    return;
  }

  editor.selections = editor.selections.map((s) => new vscode.Selection(s.active, s.anchor));
  // When flipping selection the new active position may be off screen, so reveal line to the active location
  exec('revealLine', {
    lineNumber: editor.selection.active.line,
    at: 'center',
  });
}
