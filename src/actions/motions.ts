import * as vscode from 'vscode';

import { Action } from '../action_types';
import { HelixState } from '../helix_state_types';
import { Mode } from '../modes_types';
import { paragraphBackward, paragraphForward } from '../paragraph_utils';
import { parseKeysExact, parseKeysRegex } from '../parse_keys';
import * as positionUtils from '../position_utils';
import { searchBackward, searchForward } from '../search_utils';
import { helixToVscodeSelection, vscodeToHelixSelection } from '../selection_utils';
import { fixSelectionAnchors } from '../selection_fix_utils';
import { whitespaceWordRanges, wordRanges } from '../word_utils';
import KeyMap from './keymaps';
import { exec } from '../exec';

export const motions: Action[] = [
  parseKeysExact([KeyMap.Motions.MoveRight], [Mode.Select], (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      for (let i = 0; i < vimState.resolveCount(); i++) position = positionUtils.rightWrap(document, position);
      return position;
    });
  }),

  parseKeysExact([KeyMap.Motions.MoveLeft], [Mode.Select], (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      for (let i = 0; i < vimState.resolveCount(); i++) position = positionUtils.leftWrap(document, position);
      return position;
    });
  }),

  parseKeysExact([KeyMap.Motions.MoveRight], [Mode.Normal], (vimState, editor) => {
    collapseToCursor(editor);
    const count = vimState.resolveCount();
    exec('cursorMove', {
      to: 'right',
      by: 'character',
      value: count,
    });
  }),

  parseKeysExact([KeyMap.Motions.MoveLeft], [Mode.Normal], (vimState, editor) => {
    collapseToCursor(editor);
    const count = vimState.resolveCount();
    exec('cursorMove', {
      to: 'left',
      by: 'character',
      value: count,
    });
  }),

  parseKeysExact([KeyMap.Motions.MoveUp], [Mode.Normal], (vimState, editor) => {
    collapseToCursor(editor);
    exec('cursorMove', {
      to: 'up',
      by: 'wrappedLine',
      value: vimState.resolveCount(),
    });
  }),
  parseKeysExact([KeyMap.Motions.MoveUp], [Mode.Select], (vimState, editor) => {
    const originalSelections = editor.selections;

    exec('cursorMove', {
      to: 'up',
      by: 'wrappedLine',
      select: true,
      value: vimState.resolveCount(),
    }).then(() => {
      fixSelectionAnchors(editor, originalSelections);
    });
  }),
  parseKeysExact([KeyMap.Motions.MoveDown], [Mode.Normal], (vimState, editor) => {
    collapseToCursor(editor);
    exec('cursorMove', {
      to: 'down',
      by: 'wrappedLine',
      value: vimState.resolveCount(),
    });
  }),
  parseKeysExact([KeyMap.Motions.MoveDown], [Mode.Select], (vimState, editor) => {
    const originalSelections = editor.selections;

    exec('cursorMove', {
      to: 'down',
      by: 'wrappedLine',
      select: true,
      value: vimState.resolveCount(),
    }).then(() => {
      fixSelectionAnchors(editor, originalSelections);
    });
  }),

  parseKeysExact(['w'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      createWordForwardHandler(wordRanges)(vimState, editor);
    }
  }),
  parseKeysExact(['W'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      createWordForwardHandler(whitespaceWordRanges)(vimState, editor);
    }
  }),

  parseKeysExact(['b'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      createWordBackwardHandler(wordRanges)(vimState, editor);
    }
  }),
  parseKeysExact(['B'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      createWordBackwardHandler(whitespaceWordRanges)(vimState, editor);
    }
  }),

  parseKeysExact(['e'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      createWordEndHandler(wordRanges)(vimState, editor);
    }
  }),
  parseKeysExact(['E'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      createWordEndHandler(whitespaceWordRanges)(vimState, editor);
    }
  }),

  parseKeysRegex(/^f([\s\S])$/, /^(f|f.)$/, [Mode.Normal, Mode.Select], (vimState, editor, match) => {
    findForward(vimState, editor, match);

    vimState.repeatLastMotion = (innerVimState, innerEditor) => {
      findForward(innerVimState, innerEditor, match);
    };
  }),

  parseKeysRegex(/^F([\s\S])$/, /^(F|F.)$/, [Mode.Normal, Mode.Select], (vimState, editor, match) => {
    findBackward(vimState, editor, match);

    vimState.repeatLastMotion = (innerVimState, innerEditor) => {
      findBackward(innerVimState, innerEditor, match);
    };
  }),

  parseKeysRegex(/^t([\s\S])$/, /^t$/, [Mode.Normal, Mode.Select], (vimState, editor, match) => {
    tillForward(vimState, editor, match);

    vimState.repeatLastMotion = (innerVimState, innerEditor) => {
      tillForward(innerVimState, innerEditor, match);
    };
  }),

  parseKeysRegex(/^T([\s\S])$/, /^T$/, [Mode.Normal, Mode.Select], (vimState, editor, match) => {
    tillBackward(vimState, editor, match);

    vimState.repeatLastMotion = (innerVimState, innerEditor) => {
      tillBackward(innerVimState, innerEditor, match);
    };
  }),

  parseKeysExact(['}'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      return new vscode.Position(paragraphForward(document, position.line), 0);
    });
  }),

  parseKeysExact([']', 'p'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      execMotion(vimState, editor, ({ document, position }) => {
        return new vscode.Position(paragraphForward(document, position.line), 0);
      });
    }
  }),

  parseKeysExact(['{'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      return new vscode.Position(paragraphBackward(document, position.line), 0);
    });
  }),

  parseKeysExact(['[', 'p'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      execMotion(vimState, editor, ({ document, position }) => {
        return new vscode.Position(paragraphBackward(document, position.line), 0);
      });
    }
  }),

  parseKeysExact([KeyMap.Motions.MoveLineEnd], [Mode.Normal, Mode.Select], (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      const lineLength = document.lineAt(position.line).text.length;
      return position.with({ character: Math.max(lineLength - 1, 0) });
    });
  }),

  parseKeysExact([KeyMap.Motions.MoveLineStart], [Mode.Normal, Mode.Select], (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      const line = document.lineAt(position.line);
      return position.with({
        character: line.firstNonWhitespaceCharacterIndex,
      });
    });
  }),

  parseKeysExact(['H'], [Mode.Normal], (_vimState, _editor) => {
    exec('cursorMove', {
      to: 'viewPortTop',
      by: 'line',
    });
  }),
  parseKeysExact(['H'], [Mode.Select], (_vimState, editor) => {
    const originalSelections = editor.selections;

    exec('cursorMove', {
      to: 'viewPortTop',
      by: 'line',
      select: true,
    }).then(() => {
      fixSelectionAnchors(editor, originalSelections);
    });
  }),
  parseKeysExact(['M'], [Mode.Normal], (_vimState, _editor) => {
    exec('cursorMove', {
      to: 'viewPortCenter',
      by: 'line',
    });
  }),
  parseKeysExact(['M'], [Mode.Select], (_vimState, editor) => {
    const originalSelections = editor.selections;

    exec('cursorMove', {
      to: 'viewPortCenter',
      by: 'line',
      select: true,
    }).then(() => {
      fixSelectionAnchors(editor, originalSelections);
    });
  }),
  parseKeysExact(['L'], [Mode.Normal], (_vimState, _editor) => {
    exec('cursorMove', {
      to: 'viewPortBottom',
      by: 'line',
    });
  }),
  parseKeysExact(['L'], [Mode.Select], (_vimState, editor) => {
    const originalSelections = editor.selections;

    exec('cursorMove', {
      to: 'viewPortBottom',
      by: 'line',
      select: true,
    }).then(() => {
      fixSelectionAnchors(editor, originalSelections);
    });
  }),
];

type MotionArgs = {
  document: vscode.TextDocument;
  position: vscode.Position;
  selectionIndex: number;
  vimState: HelixState;
};

type RegexMotionArgs = {
  document: vscode.TextDocument;
  position: vscode.Position;
  selectionIndex: number;
  vimState: HelixState;
  match: RegExpMatchArray;
};

function execRegexMotion(
  vimState: HelixState,
  editor: vscode.TextEditor,
  match: RegExpMatchArray,
  regexMotion: (args: RegexMotionArgs) => vscode.Position,
) {
  return execMotion(vimState, editor, (motionArgs) => {
    return regexMotion({
      ...motionArgs,
      match: match,
    });
  });
}

function execMotion(vimState: HelixState, editor: vscode.TextEditor, motion: (args: MotionArgs) => vscode.Position) {
  const document = editor.document;

  const newSelections = editor.selections.map((selection, i) => {
    if (vimState.mode === Mode.Normal) {
      const newPosition = motion({
        document: document,
        position: selection.active,
        selectionIndex: i,
        vimState: vimState,
      });
      return new vscode.Selection(selection.active, newPosition);
    } else if (vimState.mode === Mode.Select) {
      const vimSelection = vscodeToHelixSelection(document, selection);
      const motionPosition = motion({
        document: document,
        position: vimSelection.active,
        selectionIndex: i,
        vimState: vimState,
      });

      return helixToVscodeSelection(document, new vscode.Selection(vimSelection.anchor, motionPosition));
    } else {
      return selection;
    }
  });

  editor.selections = newSelections;

  editor.revealRange(
    new vscode.Range(newSelections[0].active, newSelections[0].active),
    vscode.TextEditorRevealType.InCenterIfOutsideViewport,
  );
}

function findForward(vimState: HelixState, editor: vscode.TextEditor, outerMatch: RegExpMatchArray): void {
  const count = vimState.resolveCount();
  if (vimState.mode === Mode.Normal) collapseToCursor(editor);

  execRegexMotion(vimState, editor, outerMatch, ({ document, position, match }) => {
    const result = searchNth(count, position, (from) => searchForward(document, match[1], from.translate(0, 1)));
    if (!result) return position;

    // Wraps so that selecting a newline extends to the start of the next line
    const target = positionUtils.rightWrap(document, result);
    // Select-mode selections stop on the character before the target
    return vimState.mode === Mode.Select ? positionLeftWrap(document, target) : target;
  });
}

function findBackward(vimState: HelixState, editor: vscode.TextEditor, outerMatch: RegExpMatchArray): void {
  const count = vimState.resolveCount();
  if (vimState.mode === Mode.Normal) collapseToCursor(editor);

  execRegexMotion(vimState, editor, outerMatch, ({ document, position, match }) => {
    const result = searchNth(count, position, (from) =>
      searchBackward(document, match[1], positionLeftWrap(document, from)),
    );
    return result ?? position;
  });
}

function tillForward(vimState: HelixState, editor: vscode.TextEditor, outerMatch: RegExpMatchArray): void {
  const count = vimState.resolveCount();
  if (vimState.mode === Mode.Normal) collapseToCursor(editor);

  execRegexMotion(vimState, editor, outerMatch, ({ document, position, match }) => {
    const result = searchNth(count, position, (from) => searchForward(document, match[1], from.translate(0, 1)));
    if (!result) return position;
    // Select-mode selections stop on the character before the target
    return vimState.mode === Mode.Select ? positionLeftWrap(document, result) : result;
  });
}

function tillBackward(vimState: HelixState, editor: vscode.TextEditor, outerMatch: RegExpMatchArray): void {
  const count = vimState.resolveCount();
  if (vimState.mode === Mode.Normal) collapseToCursor(editor);

  execRegexMotion(vimState, editor, outerMatch, ({ document, position, match }) => {
    const result = searchNth(count, position, (from) =>
      searchBackward(document, match[1], positionLeftWrap(document, from)),
    );
    // Stop just after the match, wrapping past a newline
    return result ? positionUtils.rightWrap(document, result) : position;
  });
}

// Run a search count times, each one starting from the last match
function searchNth(
  count: number,
  position: vscode.Position,
  search: (from: vscode.Position) => vscode.Position | undefined,
): vscode.Position | undefined {
  let result: vscode.Position | undefined = position;
  for (let i = 0; i < count && result; i++) {
    result = search(result);
  }
  return result;
}

function collapseToCursor(editor: vscode.TextEditor): void {
  // Setting selections resets VS Code's remembered column, so leave bare cursors alone
  if (editor.selections.every((selection) => selection.isEmpty)) return;

  editor.selections = editor.selections.map((selection) => {
    const cursor =
      selection.isEmpty || selection.isReversed
        ? selection.active
        : positionLeftWrap(editor.document, selection.active);
    return new vscode.Selection(cursor, cursor);
  });
}

function positionLeftWrap(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
  if (position.character === 0) {
    if (position.line === 0) {
      return position;
    } else {
      const lineLength = document.lineAt(position.line - 1).text.length;
      return new vscode.Position(position.line - 1, lineLength);
    }
  } else {
    return position.with({ character: position.character - 1 });
  }
}

function createWordForwardHandler(
  wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: HelixState, editor: vscode.TextEditor) => void {
  return (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      const isSelect = vimState.mode === Mode.Select;
      // In Select mode the cursor already sits just before a word, so look past it
      let searchAfter = isSelect ? position.character + 1 : position.character;

      // Stop at the next word start, or the end of the document if there isn't one
      let target = document.lineAt(document.lineCount - 1).range.end;
      for (let line = position.line; line < document.lineCount; line++) {
        const word = wordRangesFunction(document.lineAt(line).text).find((x) => x.start > searchAfter);

        if (word) {
          target = new vscode.Position(line, word.start);
          break;
        }

        // Nothing left on this line, so search the next one from its start
        searchAfter = -1;
      }

      // Select-mode selections stop on the character before the target
      return isSelect ? positionLeftWrap(document, target) : target;
    });
  };
}

function createWordBackwardHandler(
  wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: HelixState, editor: vscode.TextEditor) => void {
  return (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      let character = position.character;
      // Try the current line and if we're at the end go to the next line
      // This way we're only keeping one line of text in memory at a time
      // i is representing the relative line number we're on from where we started
      for (let i = position.line; i >= 0; i--) {
        const lineText = document.lineAt(i).text;
        const ranges = wordRangesFunction(lineText);

        const result = ranges.reverse().find((x) => x.start < character);

        if (result) {
          return position.with({ character: result.start, line: i });
        }

        // If we don't find anything on this line, search the next and reset the character to 0
        character = Infinity;
      }
      // We may be at the end of the document or nothing else matches
      return position;
    });
  };
}

function createWordEndHandler(
  wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: HelixState, editor: vscode.TextEditor) => void {
  return (vimState, editor) => {
    execMotion(vimState, editor, ({ document, position }) => {
      let character = position.character;
      // Try the current line and if we're at the end go to the next line
      // This way we're only keeping one line of text in memory at a time
      // i is representing the relative line number we're on from where we started
      for (let i = 0; i < document.lineCount - position.line; i++) {
        const lineNumber = position.line + i;
        const lineText = document.lineAt(lineNumber).text;
        const ranges = wordRangesFunction(lineText);

        const result = ranges.find((x) => x.end > character);

        if (result) {
          if (vimState.mode === Mode.Normal) {
            return position.with({ character: result.end + 1, line: lineNumber });
          } else {
            return position.with({ character: result.end, line: lineNumber });
          }
        }
        // Nothing left on this line, so search the next one from its start
        character = -1;
      }

      // We may be at the end of the document or nothing else matches
      return position;
    });
  };
}
