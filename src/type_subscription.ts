import * as vscode from 'vscode';

import { HelixState } from './helix_state_types';

export function addTypeSubscription(
  vimState: HelixState,
  typeHandler: (vimState: HelixState, char: string) => void,
): void {
  if (vimState.typeSubscription) return;
  vimState.typeSubscription = vscode.commands.registerCommand('type', (e) => {
    typeHandler(vimState, e.text);
  });
}

export function removeTypeSubscription(vimState: HelixState): void {
  // Keep it while recording a macro so insert mode typing is recorded too
  if (vimState.macro.recording) return;
  vimState.typeSubscription?.dispose();
  vimState.typeSubscription = undefined;
}
