import * as vscode from 'vscode';

/**
 * Async work started by actions. Actions fire commands and edits without awaiting them, which is fine at
 * human typing speed, but macro replay must wait for everything to land before dispatching the next key.
 */
const pending = new Set<Thenable<unknown>>();

function track<T>(promise: Thenable<T>): Thenable<T> {
  pending.add(promise);
  const done = () => pending.delete(promise);
  promise.then(done, done);
  return promise;
}

/** Tracked `vscode.commands.executeCommand` */
export function exec<T = unknown>(command: string, ...rest: unknown[]): Thenable<T> {
  return track(vscode.commands.executeCommand<T>(command, ...rest));
}

/** Tracked `editor.edit` */
export function edit(
  editor: vscode.TextEditor,
  callback: (editBuilder: vscode.TextEditorEdit) => void,
  options?: { undoStopBefore: boolean; undoStopAfter: boolean },
): Thenable<boolean> {
  return track(editor.edit(callback, options));
}

/** Long enough for any editing command; commands waiting on the user (e.g. rename) shouldn't block forever */
const SETTLE_TIMEOUT_MS = 2000;

/**
 * Resolves once all tracked work, including work started by continuations of tracked work, has finished.
 * VS Code sends the resulting document and selection changes before replying, so state is then up to date.
 */
export async function settle(): Promise<void> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (pending.size > 0 && Date.now() < deadline) {
    const timeout = new Promise((resolve) => setTimeout(resolve, deadline - Date.now()));
    await Promise.race([Promise.allSettled([...pending]), timeout]);
  }
}
