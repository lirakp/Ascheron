import { closeTopModal, isDialogOpen } from '../ui/dom';

let escHandler: (() => void) | null = null;
export function setEsc(f: (() => void) | null): void { escHandler = f; }

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' && e.code !== 'Tab') return;
  e.preventDefault();
  if (closeTopModal()) return;
  if (isDialogOpen()) return;
  escHandler?.();
});
