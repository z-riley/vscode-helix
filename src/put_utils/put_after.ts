import * as vscode from 'vscode';

import { HelixState } from '../helix_state_types';
import { enterNormalMode, setModeCursorStyle, setRelativeLineNumbers } from '../modes';
import { Mode } from '../modes_types';
import * as positionUtils from '../position_utils';
import {
  adjustInsertPositions,
  getInsertRangesFromBeginning,
  getInsertRangesFromEnd,
  getRegisterContentsList,
} from './common';
import { edit } from '../exec';

export function putAfter(vimState: HelixState, editor: vscode.TextEditor) {
  const registerContentsList = getRegisterContentsList(vimState, editor);
  if (registerContentsList === undefined) return;

  if (vimState.mode === Mode.Normal) {
    if (vimState.registers.linewise) {
      normalModeLinewise(vimState, editor, registerContentsList);
    } else {
      normalModeCharacterwise(vimState, editor, registerContentsList);
    }
  } else {
    selectMode(vimState, editor, registerContentsList);
  }
}

function normalModeLinewise(
  vimState: HelixState,
  editor: vscode.TextEditor,
  registerContentsList: (string | undefined)[],
) {
  const insertContentsList = registerContentsList.map((contents) => {
    if (contents === undefined) return undefined;
    else return `\n${contents}`;
  });

  const insertPositions = editor.selections.map((selection) => {
    const lineLength = editor.document.lineAt(selection.active.line).text.length;
    return new vscode.Position(selection.active.line, lineLength);
  });

  const adjustedInsertPositions = adjustInsertPositions(insertPositions, insertContentsList);
  const rangeBeginnings = adjustedInsertPositions.map((position) => new vscode.Position(position.line + 1, 0));

  edit(editor, (editBuilder) => {
    insertPositions.forEach((position, i) => {
      const contents = insertContentsList[i];
      if (contents === undefined) return;

      editBuilder.insert(position, contents);
    });
  }).then(() => {
    editor.selections = rangeBeginnings.map((position) => new vscode.Selection(position, position));
  });

  vimState.lastPutRanges = {
    ranges: getInsertRangesFromBeginning(rangeBeginnings, registerContentsList),
    linewise: true,
  };
}

function normalModeCharacterwise(
  vimState: HelixState,
  editor: vscode.TextEditor,
  registerContentsList: (string | undefined)[],
) {
  const insertPositions = editor.selections.map((selection) => selection.end);
  const adjustedInsertPositions = adjustInsertPositions(insertPositions, registerContentsList);
  const insertRanges = getInsertRangesFromBeginning(adjustedInsertPositions, registerContentsList);

  edit(editor, (editBuilder) => {
    insertPositions.forEach((insertPosition, i) => {
      const registerContents = registerContentsList[i];
      if (registerContents === undefined) return;

      editBuilder.insert(insertPosition, registerContents);
    });
  }).then(() => {
    editor.selections = editor.selections.map((selection, i) => {
      const range = insertRanges[i];
      if (range === undefined) return selection;

      const position = positionUtils.left(range.end);
      return new vscode.Selection(position, position);
    });
  });

  vimState.lastPutRanges = {
    ranges: insertRanges,
    linewise: false,
  };
}

function selectMode(vimState: HelixState, editor: vscode.TextEditor, registerContentsList: (string | undefined)[]) {
  const insertContentsList = vimState.registers.linewise
    ? registerContentsList.map((contents) => {
        if (!contents) return undefined;
        else return '\n' + contents + '\n';
      })
    : registerContentsList;

  edit(editor, (editBuilder) => {
    editor.selections.forEach((selection, i) => {
      const contents = insertContentsList[i];
      if (contents === undefined) return;

      editBuilder.delete(selection);
      editBuilder.insert(selection.start, contents);
    });
  }).then(() => {
    vimState.lastPutRanges = {
      ranges: getInsertRangesFromEnd(
        editor.document,
        editor.selections.map((selection) => selection.active),
        insertContentsList,
      ),
      linewise: vimState.registers.linewise,
    };

    editor.selections = editor.selections.map((selection) => {
      const newPosition = positionUtils.left(selection.active);
      return new vscode.Selection(newPosition, newPosition);
    });
  });

  enterNormalMode(vimState);
  setModeCursorStyle(vimState.mode, editor);
  setRelativeLineNumbers(vimState.mode, editor);
}
