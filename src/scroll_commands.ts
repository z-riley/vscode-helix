import { exec } from './exec';

function editorScroll(to: string, by: string) {
  exec('editorScroll', {
    to: to,
    by: by,
    revealCursor: true,
    value: 1,
  });
}

export function scrollDownHalfPage(): void {
  editorScroll('down', 'halfPage');
}

export function scrollUpHalfPage(): void {
  editorScroll('up', 'halfPage');
}

export function scrollDownPage(): void {
  editorScroll('down', 'page');
}

export function scrollUpPage(): void {
  editorScroll('up', 'page');
}
