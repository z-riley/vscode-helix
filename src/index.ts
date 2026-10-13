import * as vscode from 'vscode';

import { symbolProvider } from './SymbolProvider';
import { copySelectionsToLine, Direction, incrementOrCase, switchToUppercase } from './actions/actions';
import { commandLine } from './commandLine';
import { escapeHandler } from './escape_handler';
import { onDidChangeActiveTextEditor, onDidChangeTextDocument } from './eventHandlers';
import { HelixState } from './helix_state_types';
import { cancelReplay, execKeyCommand, recordKey, registerReplayCommand, setMacroTypeHandler } from './macro';
import {
  enterDisabledMode,
  enterNormalMode,
  enterSearchPromptMode,
  enterWindowMode,
  setModeCursorStyle,
  setRelativeLineNumbers,
} from './modes';
import { Mode } from './modes_types';
import * as scrollCommands from './scroll_commands';
import { searchState } from './search';
import { flipSelection } from './selection_utils';
import { typeHandler } from './type_handler';
import { addTypeSubscription, removeTypeSubscription } from './type_subscription';

const globalhelixState: HelixState = {
  typeSubscription: undefined,
  mode: Mode.Normal,
  keysPressed: [],
  numbersPressed: [],
  resolveCount: function () {
    // We can resolve this lazily as not every function will need it
    // So we don't want it running on every keystroke or every command
    return parseInt(this.numbersPressed.join(''), 10) || 1;
  },
  registers: {
    contentsList: [],
    linewise: true,
  },
  symbolProvider,
  editorState: {
    activeEditor: undefined,
    previousEditor: undefined,
    lastModifiedDocument: undefined,
  },
  commandLine,
  searchState,
  currentSelections: [],
  appendShiftedCursor: false,
  repeatLastMotion: () => undefined,
  lastPutRanges: {
    ranges: [],
    linewise: true,
  },
  macro: {
    recording: undefined,
    register: undefined,
    replaying: false,
    cancelled: false,
  },
};

/** Registers a command bound to a key in package.json, recording it into any macro being recorded */
function registerKeyCommand(command: string, callback: () => unknown): vscode.Disposable {
  registerReplayCommand(command, callback);
  return vscode.commands.registerCommand(command, () => {
    // Replay calls these directly, so this escape was pressed by the user
    if (command === 'extension.helixKeymap.escapeKey' && cancelReplay(globalhelixState)) return;
    recordKey(globalhelixState, { kind: 'command', command });
    return callback();
  });
}

/** This is the main entry point into the Helix VSCode extension */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => onDidChangeActiveTextEditor(globalhelixState, editor)),
    vscode.workspace.onDidChangeTextDocument((e) => onDidChangeTextDocument(globalhelixState, e)),
    registerKeyCommand('extension.helixKeymap.escapeKey', () => escapeHandler(globalhelixState)),
    registerKeyCommand('extension.helixKeymap.scrollDownHalfPage', scrollCommands.scrollDownHalfPage),
    registerKeyCommand('extension.helixKeymap.scrollUpHalfPage', scrollCommands.scrollUpHalfPage),
    registerKeyCommand('extension.helixKeymap.scrollDownPage', scrollCommands.scrollDownPage),
    registerKeyCommand('extension.helixKeymap.scrollUpPage', scrollCommands.scrollUpPage),
    registerKeyCommand('extension.helixKeymap.enterSearchMode', () => enterSearchPromptMode(globalhelixState)),
    registerKeyCommand('extension.helixKeymap.exitSearchMode', () =>
      globalhelixState.searchState.enter(globalhelixState),
    ),
    registerKeyCommand('extension.helixKeymap.enterWindowMode', () => enterWindowMode(globalhelixState)),
    registerKeyCommand('extension.helixKeymap.backspaceSearchMode', () => {
      globalhelixState.searchState.backspace(globalhelixState);
    }),
    registerKeyCommand('extension.helixKeymap.backspaceCommandMode', () => {
      globalhelixState.commandLine.backspace(globalhelixState);
    }),
    registerKeyCommand('extension.helixKeymap.nextSearchResult', () =>
      globalhelixState.searchState.nextSearchResult(globalhelixState),
    ),
    registerKeyCommand('extension.helixKeymap.previousSearchResult', () =>
      globalhelixState.searchState.previousSearchResult(globalhelixState),
    ),
    vscode.commands.registerCommand('extension.helixKeymap.exec', (args: { command: string; args?: unknown }) =>
      execKeyCommand(globalhelixState, args),
    ),
    vscode.commands.registerCommand('extension.helixKeymap.enterDisabledMode', () => {
      enterDisabledMode(globalhelixState);
    }),
    vscode.commands.registerCommand('extension.helixKeymap.enableHelix', () => {
      enterNormalMode(globalhelixState);
      setModeCursorStyle(globalhelixState.mode, vscode.window.activeTextEditor!);
      setRelativeLineNumbers(globalhelixState.mode, vscode.window.activeTextEditor!);
      addTypeSubscription(globalhelixState, typeHandler);
    }),
    registerKeyCommand('extension.helixKeymap.flipSelection', () => {
      flipSelection(vscode.window.activeTextEditor);
    }),
    registerKeyCommand('extension.helixKeymap.clipboardPasteAction', () => {
      return vscode.env.clipboard.readText().then((text) => {
        globalhelixState.searchState.addText(globalhelixState, text);
      });
    }),
    registerKeyCommand('extension.helixKeymap.repeatLastMotion', () => {
      globalhelixState.repeatLastMotion(globalhelixState, vscode.window.activeTextEditor!);
    }),
    registerKeyCommand('extension.helixKeymap.switchToUppercase', () => {
      switchToUppercase(vscode.window.activeTextEditor!);
    }),
    registerKeyCommand('extension.helixKeymap.copySelectionsToPrevLine', () => {
      copySelectionsToLine(vscode.window.activeTextEditor!, Direction.Up, globalhelixState.resolveCount());
      globalhelixState.numbersPressed = [];
    }),
    registerKeyCommand('extension.helixKeymap.increment', () => {
      incrementOrCase(vscode.window.activeTextEditor!, 1);
    }),
    registerKeyCommand('extension.helixKeymap.decrement', () => {
      incrementOrCase(vscode.window.activeTextEditor!, -1);
    }),
  );

  setMacroTypeHandler(typeHandler);
  enterNormalMode(globalhelixState);
  addTypeSubscription(globalhelixState, typeHandler);

  if (vscode.window.activeTextEditor) {
    setModeCursorStyle(globalhelixState.mode, vscode.window.activeTextEditor);
    setRelativeLineNumbers(globalhelixState.mode, vscode.window.activeTextEditor);
    onDidChangeActiveTextEditor(globalhelixState, vscode.window.activeTextEditor);
  }
}

export function deactivate(): void {
  removeTypeSubscription(globalhelixState);
}
