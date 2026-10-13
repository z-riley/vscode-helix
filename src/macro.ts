import * as vscode from 'vscode';

import { edit, exec, settle } from './exec';
import { HelixState } from './helix_state_types';
import { Mode } from './modes_types';
import { StatusBar } from './statusBar';
import { removeTypeSubscription } from './type_subscription';

/**
 * A single recorded keypress. Like Helix, macros are recorded and replayed as keys, so replay goes
 * through the same dispatch as typing and every action applies to all cursors as usual.
 */
export type MacroKey =
  /** A key that reached the `type` command */
  | { kind: 'char'; text: string }
  /** A key bound to a command in package.json */
  | { kind: 'command'; command: string; args?: unknown }
  /** An accepted completion, stored as its effect: replace `before`/`after` chars around the cursor with `text` */
  | { kind: 'completion'; before: number; after: number; text: string };

export type MacroState = {
  /** Keys recorded so far, or undefined when not recording */
  recording: MacroKey[] | undefined;
  /** The `@` register */
  register: MacroKey[] | undefined;
  replaying: boolean;
  /** Set by escape during a replay, to stop it after the current key */
  cancelled: boolean;
};

const REGISTER = '@';

/** Set from index.ts; importing the type handler here would create an import cycle through the actions */
let typeHandler: (helixState: HelixState, char: string) => void = () => undefined;

export function setMacroTypeHandler(handler: typeof typeHandler): void {
  typeHandler = handler;
}

/**
 * The extension's own key commands, which replay calls directly rather than through VS Code. Besides being faster,
 * this means a key command that runs during a replay was pressed by the user.
 */
const keyCommands = new Map<string, () => unknown>();

export function registerReplayCommand(command: string, callback: () => unknown): void {
  keyCommands.set(command, callback);
}

/** Stops a running replay after its current key. Returns false if nothing is replaying */
export function cancelReplay(helixState: HelixState): boolean {
  if (!helixState.macro.replaying) return false;
  helixState.macro.cancelled = true;
  return true;
}

export function recordKey(helixState: HelixState, key: MacroKey): void {
  // Keys dispatched by a replay are already represented by the `q` that started it
  const { recording, replaying } = helixState.macro;
  if (!recording || replaying) return;

  const maxKeys = vscode.workspace.getConfiguration('helixKeymap').get<number>('macroMaxKeys', 100);
  if (maxKeys > 0 && recording.length >= maxKeys) {
    // Probably a forgotten recording, so don't overwrite the register with it
    cancelRecording(helixState);
    StatusBar.clear(helixState);
    vscode.window.showWarningMessage(`Macro recording discarded: reached limit of ${maxKeys} keys.`);
    return;
  }
  recording.push(key);
}

export function isRecording(helixState: HelixState): boolean {
  return helixState.macro.recording !== undefined;
}

export function toggleRecording(helixState: HelixState): void {
  const recording = helixState.macro.recording;
  if (!recording) {
    helixState.macro.recording = [];
    setRecordingContext(true);
    return;
  }

  // Drop the `Q` that ended the recording
  recording.pop();
  helixState.macro.register = recording;
  helixState.macro.recording = undefined;
  setRecordingContext(false);
  // The type handler clears the status bar once this action returns, so show the message after that
  void Promise.resolve().then(() => StatusBar.setText(helixState, `Recorded to register [${REGISTER}]`));
}

export function cancelRecording(helixState: HelixState): void {
  if (!helixState.macro.recording) return;
  helixState.macro.recording = undefined;
  setRecordingContext(false);
  // The type subscription is kept in insert mode only while recording
  if (helixState.mode === Mode.Insert) removeTypeSubscription(helixState);
}

export async function replayMacro(helixState: HelixState, count: number): Promise<void> {
  const keys = helixState.macro.register;
  if (!keys) {
    StatusBar.displayError(helixState, `Register [${REGISTER}] empty`);
    return;
  }
  if (helixState.macro.replaying) {
    StatusBar.displayError(
      helixState,
      `Cannot replay from register [${REGISTER}] because already replaying from same register`,
    );
    return;
  }

  helixState.macro.replaying = true;
  helixState.macro.cancelled = false;
  try {
    // Let the `q` keypress finish before dispatching anything
    await settle();
    replay: for (let i = 0; i < count; i++) {
      for (let k = 0; k < keys.length; k++) {
        if (helixState.macro.cancelled) break replay;
        const key = keys[k];
        if (key.kind === 'char' && helixState.mode === Mode.Insert) {
          // Type a run of text in one go; VS Code still types it char by char, so auto-closing etc. is unchanged
          let text = key.text;
          while (keys[k + 1]?.kind === 'char') text += (keys[++k] as { text: string }).text;
          await exec('default:type', { text });
        } else {
          await dispatch(helixState, key);
        }
        await settle();
      }
    }
    if (helixState.mode === Mode.Insert) {
      await exec('hideSuggestWidget');
    }
    if (helixState.macro.cancelled) {
      StatusBar.setText(helixState, 'Macro replay cancelled');
    }
  } catch (error) {
    console.error(error);
  } finally {
    helixState.macro.replaying = false;
    helixState.macro.cancelled = false;
  }
}

async function dispatch(helixState: HelixState, key: MacroKey): Promise<void> {
  switch (key.kind) {
    case 'char':
      typeHandler(helixState, key.text);
      return;
    case 'command': {
      const callback = keyCommands.get(key.command);
      await (callback ? callback() : exec(key.command, key.args));
      return;
    }
    case 'completion': {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const { document } = editor;
      const offsets = editor.selections
        .map(({ active }) => document.offsetAt(active))
        .map((offset) => ({ start: Math.max(offset - key.before, 0), end: offset + key.after }))
        .sort((a, b) => a.start - b.start);
      await edit(editor, (builder) =>
        offsets.forEach(({ start, end }) =>
          builder.replace(new vscode.Range(document.positionAt(start), document.positionAt(end)), key.text),
        ),
      );
      // Put each cursor at the end of its inserted text, as accepting the completion did
      let shift = 0;
      editor.selections = offsets.map(({ start, end }) => {
        const position = document.positionAt(start + shift + key.text.length);
        shift += key.text.length - (end - start);
        return new vscode.Selection(position, position);
      });
      return;
    }
  }
}

/**
 * Runs a command bound to a key in package.json, recording it first. Accepted completions are recorded as the
 * text they inserted, since replay can't reproduce the suggestion list.
 */
export async function execKeyCommand(
  helixState: HelixState,
  { command, args }: { command: string; args?: unknown },
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!isRecording(helixState) || helixState.macro.replaying || !isCompletionCommand(command) || !editor) {
    recordKey(helixState, { kind: 'command', command, args });
    await exec(command, args);
    return;
  }

  const cursor = editor.selection.active;
  const cursorOffset = editor.document.offsetAt(cursor);
  let completion: MacroKey | undefined;
  const listener = vscode.workspace.onDidChangeTextDocument((e) => {
    if (completion || e.document !== editor.document) return;
    // The change at the primary cursor, in pre-change coordinates
    const change = e.contentChanges.find(({ range }) => range.contains(cursor));
    if (!change) return;
    completion = {
      kind: 'completion',
      before: cursorOffset - change.rangeOffset,
      after: change.rangeOffset + change.rangeLength - cursorOffset,
      text: change.text,
    };
  });
  try {
    await exec(command, args);
    await settle();
  } finally {
    listener.dispose();
  }
  if (completion) recordKey(helixState, completion);
}

function isCompletionCommand(command: string): boolean {
  return command === 'acceptSelectedSuggestion' || command === 'editor.action.inlineSuggest.commit';
}

function setRecordingContext(recording: boolean): void {
  vscode.commands.executeCommand('setContext', 'extension.helixKeymap.recordingMacro', recording);
}
