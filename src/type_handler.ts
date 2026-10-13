import * as vscode from 'vscode';

import { actions } from './actions';
import { exec } from './exec';
import { HelixState } from './helix_state_types';
import { recordKey } from './macro';
import { Mode } from './modes_types';
import { ParseKeysStatus } from './parse_keys_types';
import { StatusBar } from './statusBar';

export function typeHandler(helixState: HelixState, char: string): void {
  recordKey(helixState, { kind: 'char', text: char });

  // Only subscribed in insert mode while recording a macro
  if (helixState.mode === Mode.Insert) {
    exec('default:type', { text: char });
    return;
  }
  if (helixState.mode === Mode.SearchPrompt || helixState.mode === Mode.SelectRegexPrompt) {
    helixState.searchState.addChar(helixState, char);
    return;
  }
  if (helixState.mode == Mode.CommandlineInProgress) {
    helixState.commandLine.addChar(helixState, char);
    return;
  }
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  // Handle number prefixes
  if (/[0-9]/.test(char) && helixState.keysPressed.length === 0) {
    helixState.numbersPressed.push(char);
    StatusBar.clear(helixState);
    return;
  }

  helixState.keysPressed.push(char);

  try {
    let could = false;
    for (const action of actions) {
      const result = action(helixState, helixState.keysPressed, editor);

      if (result === ParseKeysStatus.YES) {
        helixState.keysPressed = [];
        helixState.numbersPressed = [];
        StatusBar.clear(helixState);
        break;
      } else if (result === ParseKeysStatus.MORE_INPUT) {
        could = true;
      }
    }

    if (!could) {
      helixState.keysPressed = [];
      helixState.numbersPressed = [];
    }
  } catch (error) {
    console.error(error);
  }
}
