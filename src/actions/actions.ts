import * as vscode from 'vscode';
import { Action } from '../action_types';
import { HelixState } from '../helix_state_types';
import { replayMacro, toggleRecording } from '../macro';
import {
  enterCommandMode,
  enterInsertMode,
  enterNormalMode,
  enterSearchPromptMode,
  enterSelectRegexPromptMode,
  enterSelectMode,
  setModeCursorStyle,
  setRelativeLineNumbers,
} from '../modes';
import { Mode } from '../modes_types';
import { parseKeysExact, parseKeysRegex } from '../parse_keys';
import * as positionUtils from '../position_utils';
import { putAfter } from '../put_utils/put_after';
import { putBefore } from '../put_utils/put_before';
import { removeTypeSubscription } from '../type_subscription';
import { flashYankHighlight } from '../yank_highlight';
import { gotoActions } from './gotoMode';
import KeyMap from './keymaps';
import { matchActions } from './matchMode';
import { isSingleLineRange, yank } from './operators';
import { spaceActions } from './spaceMode';
import { unimparedActions } from './unimpared';
import { viewActions } from './viewMode';
import { windowActions } from './windowMode';
import { exec, edit } from '../exec';

export enum Direction {
  Up,
  Down,
}

export const actions: Action[] = [
  parseKeysExact(['p'], [Mode.Occurrence], () => {
    exec('editor.action.addSelectionToPreviousFindMatch');
  }),

  parseKeysExact(['a'], [Mode.Occurrence], () => {
    exec('editor.action.selectHighlights');
  }),

  parseKeysExact(['n'], [Mode.Normal], (helixState) => {
    if (helixState.searchState.selectRegexActive) {
      exec('actions.findWithSelection');
      helixState.searchState.selectRegexActive = false;
      return;
    }

    exec('editor.action.nextMatchFindAction');
  }),

  parseKeysExact(['N'], [Mode.Normal], (helixState) => {
    if (helixState.searchState.selectRegexActive) {
      exec('actions.findWithSelection');
      helixState.searchState.selectRegexActive = false;
      return;
    }
    exec('editor.action.previousMatchFindAction');
  }),

  parseKeysExact(['?'], [Mode.Normal], (helixState) => {
    enterSearchPromptMode(helixState);
    helixState.searchState.previousSearchResult(helixState);
  }),

  // Selection Stuff
  parseKeysExact(['s'], [Mode.Normal, Mode.Select], (helixState, editor) => {
    enterSelectRegexPromptMode(helixState);
    // if we enter select mode we should save the current selections
    helixState.currentSelections = editor.selections;
  }),

  parseKeysExact([','], [Mode.Normal, Mode.Select], (_, editor) => {
    // Keep primary selection only
    editor.selections = editor.selections.slice(0, 1);
  }),

  parseKeysExact(['/'], [Mode.Normal], (helixState) => {
    enterSearchPromptMode(helixState);
  }),

  parseKeysExact([':'], [Mode.Normal], (helixState) => {
    enterCommandMode(helixState);
  }),

  parseKeysExact(['*'], [Mode.Normal], (_) => {
    exec('actions.findWithSelection');
  }),

  parseKeysExact(['>'], [Mode.Normal, Mode.Select], (_) => {
    exec('editor.action.indentLines');
  }),

  parseKeysExact(['<'], [Mode.Normal, Mode.Select], (_) => {
    exec('editor.action.outdentLines');
  }),

  parseKeysExact(['='], [Mode.Normal, Mode.Select], (_) => {
    exec('editor.action.formatSelection');
  }),

  parseKeysExact(['`'], [Mode.Normal], (_vimState, editor) => {
    // Take the selection and make it all lowercase
    edit(editor, (editBuilder) => {
      editor.selections.forEach((selection) => {
        const text = editor.document.getText(selection);
        editBuilder.replace(selection, text.toLowerCase());
      });
    });
  }),

  parseKeysExact(['~'], [Mode.Normal], (_vimState, editor) => {
    // Switch the case of the selection (so if upper case make lower case and vice versa)
    edit(editor, (editBuilder) => {
      editor.selections.forEach((selection) => {
        const text = editor.document.getText(selection);
        editBuilder.replace(
          selection,
          text.replace(/./g, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())),
        );
      });
    });
  }),

  // 	replace
  parseKeysRegex(/^r([\s\S])$/, /^r$/, [Mode.Normal, Mode.Select], (_helixState, editor, match) => {
    edit(editor, (builder) => {
      editor.selections.forEach((selection) => {
        const range = selection.isEmpty
          ? new vscode.Range(selection.active, selection.active.translate(0, 1))
          : selection;
        builder.replace(range, editor.document.getText(range).replace(/[^\r\n]/g, match[1]));
      });
    });
  }),

  // existing
  parseKeysExact([KeyMap.Actions.InsertMode], [Mode.Normal, Mode.Select, Mode.Occurrence], (vimState, editor) => {
    enterInsertMode(vimState);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
    removeTypeSubscription(vimState);
  }),

  parseKeysExact([KeyMap.Actions.InsertAtLineStart], [Mode.Normal], (vimState, editor) => {
    editor.selections = editor.selections.map((selection) => {
      const character = editor.document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
      const newPosition = selection.active.with({ character: character });
      return new vscode.Selection(newPosition, newPosition);
    });

    enterInsertMode(vimState);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
    removeTypeSubscription(vimState);
  }),

  parseKeysExact(['a'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    enterInsertMode(vimState, false);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
    removeTypeSubscription(vimState);
  }),

  parseKeysExact([KeyMap.Actions.InsertAtLineEnd], [Mode.Normal], (vimState, editor) => {
    editor.selections = editor.selections.map((selection) => {
      const lineLength = editor.document.lineAt(selection.active.line).text.length;
      const newPosition = selection.active.with({ character: lineLength });
      return new vscode.Selection(newPosition, newPosition);
    });

    enterInsertMode(vimState);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
    removeTypeSubscription(vimState);
  }),

  parseKeysExact(['v'], [Mode.Normal], (vimState, editor) => {
    enterSelectMode(vimState);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
  }),

  parseKeysExact(['x'], [Mode.Normal, Mode.Select], (vimState, _editor) => {
    const count = vimState.resolveCount();
    for (let i = 0; i < count; i++) {
      exec('expandLineSelection');
    }
  }),

  parseKeysExact([KeyMap.Actions.NewLineBelow], [Mode.Normal], (vimState, editor) => {
    enterInsertMode(vimState);
    exec('editor.action.insertLineAfter');
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
    removeTypeSubscription(vimState);
  }),

  parseKeysExact([KeyMap.Actions.NewLineAbove], [Mode.Normal], (vimState, editor) => {
    enterInsertMode(vimState);
    exec('editor.action.insertLineBefore');
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
    removeTypeSubscription(vimState);
  }),

  parseKeysExact(['p'], [Mode.Normal, Mode.Select], putAfter),
  parseKeysExact(['P'], [Mode.Normal], putBefore),

  parseKeysExact(['u'], [Mode.Normal, Mode.Select], () => {
    exec('undo');
  }),

  parseKeysExact(['U'], [Mode.Normal, Mode.Select], () => {
    exec('redo');
  }),

  parseKeysExact(['d', 'd'], [Mode.Normal], (vimState, editor) => {
    deleteLine(vimState, editor);
  }),

  parseKeysExact(['D'], [Mode.Normal], () => {
    exec('deleteAllRight');
  }),

  parseKeysRegex(/(\\d+)g/, /^g$/, [Mode.Normal, Mode.Select], (_helixState, _editor, match) => {
    new vscode.Position(parseInt(match[1]), 0);
  }),

  // add 1 character swap
  parseKeysRegex(/^x(.)$/, /^x$/, [Mode.Normal, Mode.Select], (_vimState, editor, match) => {
    edit(editor, (builder) => {
      editor.selections.forEach((s) => {
        const oneChar = s.with({
          end: s.active.with({
            character: s.active.character + 1,
          }),
        });
        builder.replace(oneChar, match[1]);
      });
    });
  }),

  // same for duplicate command
  parseKeysRegex(
    RegExp(`^q(\\d+)(${KeyMap.Motions.MoveUp}|${KeyMap.Motions.MoveDown})$`),
    /^(q|q\d+)$/,
    [Mode.Normal, Mode.Select],
    (_vimState, editor, match) => {
      const lineCount = parseInt(match[1]);
      const direction = match[2] == KeyMap.Motions.MoveUp ? Direction.Up : Direction.Down;
      // console.log(`delete ${lineCount} lines up`);
      editor.selections = makeMultiLineSelection(editor, lineCount, direction);
      exec('editor.action.copyLinesDownAction');
    },
  ),

  parseKeysExact(['c', 'c'], [Mode.Normal], (vimState, editor) => {
    edit(editor, (editBuilder) => {
      editor.selections.forEach((selection) => {
        const line = editor.document.lineAt(selection.active.line);
        editBuilder.delete(
          new vscode.Range(
            selection.active.with({
              character: line.firstNonWhitespaceCharacterIndex,
            }),
            selection.active.with({ character: line.text.length }),
          ),
        );
      });
    });

    enterInsertMode(vimState);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
    removeTypeSubscription(vimState);
  }),

  parseKeysExact(['C'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    copySelectionsToLine(editor, Direction.Down, vimState.resolveCount());
  }),

  parseKeysExact(['y', 'y'], [Mode.Normal], (vimState, editor) => {
    yankLine(vimState, editor);

    // Yank highlight
    const highlightRanges = editor.selections.map((selection) => {
      const lineLength = editor.document.lineAt(selection.active.line).text.length;
      return new vscode.Range(
        selection.active.with({ character: 0 }),
        selection.active.with({ character: lineLength }),
      );
    });
    flashYankHighlight(editor, highlightRanges);
  }),

  parseKeysExact(['y'], [Mode.Normal, Mode.Select], (vimState, editor) => {
    // Yank highlight
    const highlightRanges = editor.selections.map((selection) => selection.with());

    // We need to detect if the ranges are lines because we need to handle them differently
    highlightRanges.every((range) => isSingleLineRange(range));
    yank(vimState, editor, highlightRanges, false);
    flashYankHighlight(editor, highlightRanges);
    if (vimState.mode === Mode.Select) {
      enterNormalMode(vimState);
    }
  }),

  parseKeysExact(['Q'], [Mode.Normal, Mode.Select], (vimState) => {
    toggleRecording(vimState);
  }),

  parseKeysExact(['q'], [Mode.Normal, Mode.Select], (vimState) => {
    void replayMacro(vimState, vimState.resolveCount());
  }),

  parseKeysExact(['S'], [Mode.Normal], (vimState, editor) => {
    editor.selections = editor.selections.map((selection) => {
      return new vscode.Selection(selection.active, positionUtils.lineEnd(editor.document, selection.active));
    });

    enterSelectMode(vimState);
    setModeCursorStyle(vimState.mode, editor);
    setRelativeLineNumbers(vimState.mode, editor);
  }),

  parseKeysExact([';'], [Mode.Normal], (_vimState, editor) => {
    const active = editor.selection.active;
    editor.selection = new vscode.Selection(active, active);
  }),

  ...gotoActions,
  ...windowActions,
  ...viewActions,
  ...spaceActions,
  ...matchActions,
  ...unimparedActions,
];

function makeMultiLineSelection(
  editor: vscode.TextEditor,
  lineCount: number,
  direction: Direction,
): vscode.Selection[] {
  return editor.selections.map((selection) => {
    if (direction == Direction.Up) {
      const endLine = selection.active.line - lineCount + 1;
      const startPos = positionUtils.lineEnd(editor.document, selection.active);
      const endPos = endLine >= 0 ? new vscode.Position(endLine, 0) : new vscode.Position(0, 0);
      return new vscode.Selection(startPos, endPos);
    } else {
      const endLine = selection.active.line + lineCount - 1;
      const startPos = new vscode.Position(selection.active.line, 0);
      const endPos =
        endLine < editor.document.lineCount
          ? new vscode.Position(endLine, editor.document.lineAt(endLine).text.length)
          : positionUtils.lastChar(editor.document);

      return new vscode.Selection(startPos, endPos);
    }
  });
}

function deleteLines(editor: vscode.TextEditor, lineCount: number, direction: Direction = Direction.Down): void {
  const selections = editor.selections.map((selection) => {
    if (direction == Direction.Up) {
      const endLine = selection.active.line - lineCount;
      if (endLine >= 0) {
        const startPos = positionUtils.lineEnd(editor.document, selection.active);
        const endPos = new vscode.Position(endLine, editor.document.lineAt(endLine).text.length);
        return new vscode.Selection(startPos, endPos);
      } else {
        const startPos =
          selection.active.line + 1 <= editor.document.lineCount
            ? new vscode.Position(selection.active.line + 1, 0)
            : positionUtils.lineEnd(editor.document, selection.active);

        const endPos = new vscode.Position(0, 0);
        return new vscode.Selection(startPos, endPos);
      }
    } else {
      const endLine = selection.active.line + lineCount;
      if (endLine <= editor.document.lineCount - 1) {
        const startPos = new vscode.Position(selection.active.line, 0);
        const endPos = new vscode.Position(endLine, 0);
        return new vscode.Selection(startPos, endPos);
      } else {
        const startPos =
          selection.active.line - 1 >= 0
            ? new vscode.Position(
                selection.active.line - 1,
                editor.document.lineAt(selection.active.line - 1).text.length,
              )
            : new vscode.Position(selection.active.line, 0);

        const endPos = positionUtils.lastChar(editor.document);
        return new vscode.Selection(startPos, endPos);
      }
    }
  });

  edit(editor, (builder) => {
    selections.forEach((sel) => builder.replace(sel, ''));
  }).then(() => {
    editor.selections = editor.selections.map((selection) => {
      const character = editor.document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
      const newPosition = selection.active.with({ character: character });
      return new vscode.Selection(newPosition, newPosition);
    });
  });
}

function deleteLine(_vimState: HelixState, editor: vscode.TextEditor, direction: Direction = Direction.Down): void {
  deleteLines(editor, 1, direction);
}

function yankLine(vimState: HelixState, editor: vscode.TextEditor): void {
  vimState.registers = {
    contentsList: editor.selections.map((selection) => {
      return editor.document.lineAt(selection.active.line).text;
    }),
    linewise: true,
  };
}

// Copy each selection onto the next line(s) that are long enough to hold it
export function copySelectionsToLine(editor: vscode.TextEditor, direction: Direction, count: number): void {
  const step = direction === Direction.Down ? 1 : -1;
  const copies: vscode.Selection[] = [];

  editor.selections.forEach(({ anchor, active }) => {
    let found = 0;
    for (let offset = step; found < count; offset += step) {
      const anchorLine = anchor.line + offset;
      const activeLine = active.line + offset;
      if (Math.min(anchorLine, activeLine) < 0 || Math.max(anchorLine, activeLine) >= editor.document.lineCount) break;

      // Skip lines too short to hold the selection at the same columns
      if (
        editor.document.lineAt(anchorLine).text.length >= anchor.character &&
        editor.document.lineAt(activeLine).text.length >= active.character
      ) {
        copies.push(new vscode.Selection(anchorLine, anchor.character, activeLine, active.character));
        found++;
      }
    }
  });

  editor.selections = [...editor.selections, ...copies];
}

export function switchToUppercase(editor: vscode.TextEditor): void {
  edit(editor, (editBuilder) => {
    editor.selections.forEach((selection) => {
      const text = editor.document.getText(selection);
      editBuilder.replace(selection, text.toUpperCase());
    });
  });
}

// Increment/decrement the number under each cursor, or upper/lowercase a letter
export function incrementOrCase(editor: vscode.TextEditor, delta: 1 | -1): void {
  edit(editor, (editBuilder) => {
    editor.selections.forEach(({ start }) => {
      // The whole number under the cursor, including any minus sign
      const number = [...editor.document.lineAt(start.line).text.matchAll(/-?\d+/g)]
        .map((match) => ({ text: match[0], from: match.index!, to: match.index! + match[0].length }))
        .find(({ from, to }) => from <= start.character && start.character < to);
      if (number) {
        const range = new vscode.Range(start.line, number.from, start.line, number.to);
        editBuilder.replace(range, (BigInt(number.text) + BigInt(delta)).toString());
        return;
      }

      const range = new vscode.Range(start, start.translate(0, 1));
      const char = editor.document.getText(range);
      if (/\p{L}/u.test(char)) {
        editBuilder.replace(range, delta > 0 ? char.toUpperCase() : char.toLowerCase());
      }
    });
  });
}
