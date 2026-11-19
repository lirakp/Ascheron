// Minimale DOM-Helfer für das Overlay-UI
export const UI = () => document.getElementById('ui')!;

type Child = Node | string | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'disabled') (el as HTMLButtonElement).disabled = !!v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function btn(label: string, onClick: () => void, opts: { cls?: string; disabled?: boolean; title?: string } = {}): HTMLButtonElement {
  return h('button', { class: 'b ' + (opts.cls ?? ''), disabled: opts.disabled, title: opts.title, onclick: (e: Event) => { e.stopPropagation(); onClick(); } }, label);
}

export function clear(el: HTMLElement): void { while (el.firstChild) el.removeChild(el.firstChild); }

let modalStack: HTMLElement[] = [];
export function isModalOpen(): boolean { return modalStack.length > 0 || !!document.querySelector('.dialog,.cc,.title-screen'); }

export function openModal(title: string, sub: string | null, body: HTMLElement | ((close: () => void) => HTMLElement), foot?: (close: () => void) => HTMLElement[], width = 720): () => void {
  const back = h('div', { class: 'modal-back' });
  const close = () => { back.remove(); modalStack = modalStack.filter((m) => m !== back); onModalChange(); };
  const bodyEl = typeof body === 'function' ? body(close) : body;
  const panel = h('div', { class: 'panel modal', style: `width:${width}px` },
    h('h2', {}, title), sub ? h('div', { class: 'sub' }, sub) : null,
    h('div', { class: 'body' }, bodyEl),
    h('div', { class: 'foot' }, ...(foot ? foot(close) : []), btn('Schließen [Esc]', close)));
  back.appendChild(panel);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  UI().appendChild(back);
  modalStack.push(back);
  onModalChange();
  return close;
}

export function closeTopModal(): boolean {
  const m = modalStack.pop();
  if (!m) return false;
  m.remove(); onModalChange();
  return true;
}
export function closeAllModals(): void { while (closeTopModal()) { /* */ } }

let modalListeners: (() => void)[] = [];
export function onModalChangeSubscribe(f: () => void): void { modalListeners.push(f); }
function onModalChange(): void { modalListeners.forEach((f) => f()); }

export function toast(msg: string, kind: '' | 'big' | 'bad' = '', ms = 2600): void {
  let wrap = document.querySelector('.toast-wrap') as HTMLElement | null;
  if (!wrap) { wrap = h('div', { class: 'toast-wrap passthru' }); UI().appendChild(wrap); }
  const t = h('div', { class: 'toast ' + kind }, msg);
  wrap.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

export interface DialogLine { who?: string; text: string; opts?: { label: string; fn: () => void }[]; }

let dialogOpen = false;
export function isDialogOpen(): boolean { return dialogOpen; }

/** Zeigt Dialogzeilen nacheinander. Weiter mit Leertaste/Enter/Klick. */
export function dialog(lines: DialogLine[], done?: () => void): void {
  let i = 0;
  dialogOpen = true;
  const box = h('div', { class: 'panel dialog' });
  UI().appendChild(box);
  const keyH = (e: KeyboardEvent) => {
    if (['Space', 'Enter', 'KeyE'].includes(e.code)) { e.preventDefault(); if (!lines[i]?.opts) next(); }
  };
  const finish = () => { window.removeEventListener('keydown', keyH, true); box.remove(); dialogOpen = false; done?.(); };
  const next = () => { i++; if (i >= lines.length) finish(); else render(); };
  const render = () => {
    clear(box);
    const L = lines[i];
    if (L.who) box.appendChild(h('div', { class: 'who' }, L.who));
    box.appendChild(h('div', { class: 'txt' }, L.text));
    if (L.opts) {
      box.appendChild(h('div', { class: 'opts' }, ...L.opts.map((o) => btn(o.label, () => { finish(); o.fn(); }))));
    } else box.appendChild(h('div', { class: 'cont' }, '▼ Leertaste'));
  };
  box.addEventListener('click', () => { if (!lines[i]?.opts) next(); });
  setTimeout(() => window.addEventListener('keydown', keyH, true), 120);
  render();
}

export function bar(cls: string, v: number, max: number): HTMLElement {
  return h('div', { class: 'bar ' + cls }, h('i', { style: `width:${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%` }));
}
