import type { Disposable, TextDocument } from 'vscode';
import { Range, Selection, TextEditor } from 'vscode';
import type { SymbolProvider } from './SymbolProvider';
import type { MacroState } from './macro';
import { CommandLine } from './commandLine';
import type { Mode } from './modes_types';
import { SearchState } from './search';

/** This represents the global Helix state used across the board */
export type HelixState = {
  typeSubscription: Disposable | undefined;
  mode: Mode;
  keysPressed: string[];
  numbersPressed: string[];
  resolveCount: () => number;
  registers: {
    contentsList: (string | undefined)[];
    linewise: boolean;
  };
  symbolProvider: SymbolProvider;
  editorState: {
    activeEditor: TextEditor | undefined;
    previousEditor: TextEditor | undefined;
    lastModifiedDocument: TextDocument | undefined;
  };
  commandLine: CommandLine;
  searchState: SearchState;
  /**
   * The selections we're searching in when calling select
   * This is better kept on the global state as it's used for multiple things
   */
  currentSelections: readonly Selection[];
  /** Set when `a` moved the cursor right on entering insert mode, so escape can move it back */
  appendShiftedCursor: boolean;
  repeatLastMotion: (vimState: HelixState, editor: TextEditor) => void;
  lastPutRanges: {
    ranges: (Range | undefined)[];
    linewise: boolean;
  };
  macro: MacroState;
};
