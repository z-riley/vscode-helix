# Helix Emulation for Visual Studio Code

<div style="display: flex;" align="center">
<img src="./docs/img/helixLogo.png" width=12%>
  &nbsp;
  &nbsp;
<img src="./docs/img/Visual_Studio_Code_1.35_icon.png" width=18%>
</div>
<br />

This is a Visual Studio Code implementation of Helix Keybindings.

It is a maintained fork of [jasonwilliams/vscode-helix](https://github.com/jasonwilliams/vscode-helix). If you have the original (`jasew.vscode-helix-emulation`) installed, uninstall it first as the two will conflict.

It is a work in progress; feel free to raise issues or contribute on the issue tracker.

## Installation

You can install the extension from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=z-riley.helix-emulation) or [Open VSX](https://open-vsx.org/extension/z-riley/helix-emulation).

## Commands

Commands are hardcoded to the [default keymap](https://docs.helix-editor.com/keymap.html). Hopefully this can be adjusted to the user's keymap in the future.

If something doesn't work, please open an issue.

## Performance

For added performance, you can try adding the following [setting](https://github.com/microsoft/vscode/issues/75627#issuecomment-1078827311), and reload/restart VS Code:

```json
"extensions.experimental.affinity": {
  "z-riley.helix-emulation": 1
}
```

## Differences

There are some differences between this extension and native Helix:

- Both are visually different and offer different features (such as VS Code having multiple windows and tabs rather than buffers)
- VS Code not having TreeSitter or an AST, so we need to find other ways of achieving the same action.
- Additional keybindings to match more how VS Code works
- `mif/maf` both do the same thing. They select the outer function range. Getting the inner function body isn't achievable because LSP doesn't give us that, and we can't hardcode blocks (incompatibility with Python for example)

### Window Mode

Because Visual Studio Code has tabs, there are new window commands.

| Command          | Description                                             |
| ---------------- | ------------------------------------------------------- |
| `ctrl + w, m, v` | Move editor to the next group vertically (to the right) |
| `ctrl + w, m, s` | Move editor to the next group horizontally (below)      |
| `ctrl + w, m, p` | Move editor back to the previous group                  |
| `ctrl + w, m, w` | Move editor out into a new window (experimental)        |
| `ctrl + w, m, j` | Rejoin editor with main window (experimental)           |
| `ctrl + w, c`    | Close window (alias to ctrl + w, q)                     |
| `ctrl + w, n`    | New untitled editor (prev ctrl+n/cmd+n in VS Code)      |
| `ctrl + w, b`    | Toggle sidebar visibility (prev ctrl+b in VS Code)      |

### Movements

| Command   | Description                                      |
| --------- | ------------------------------------------------ |
| `alt + k` | Move line(s) up                                  |
| `alt + j` | Move line(s) down                                |
| `alt + d` | Add selection to next match (Ctrl+d in VS Code)  |
| `alt + m` | Move selection to next match (Ctrl+k in VS Code) |

### Macros

`Q` starts and stops recording a macro, and `q` replays it (`3q` replays it 3 times). Keys are recorded and replayed as in Helix, so macros work with multiple cursors. Differences from Helix:

- Only the default `@` register is supported (no `"x` register selection).
- A replay isn't a single undo step, as VS Code doesn't let extensions group undo stops.
- An accepted completion is recorded as the text it inserted. Mouse clicks, IME composition and UI commands (quick open, rename, etc.) aren't recorded.

### Line Number Toggle

The extension includes a line number toggle feature that automatically switches between relative and absolute line numbers based on the current editor mode:

- **Normal and Select modes**: Shows relative line numbers for easier navigation with motions like `10j` or `5k`
- **Insert mode**: Shows absolute line numbers for clearer positioning context

To enable this feature, add the following setting to your VS Code configuration:

```json
"helixKeymap.toggleRelativeLineNumbers": true
```

This behaviour matches Helix's approach to line numbers, helping you take advantage of relative line numbers for efficient movement commands while providing absolute numbers when editing text.
