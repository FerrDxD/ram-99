// Static 64-cell DOM updater & HUD renderer
// Builds exactly 64 cells once, dirty-checks per index, no innerHTML re-render

import { BoardState, CELL_COUNT, CELL_EMPTY, CELL_APP_TAB, CELL_MEMORY_LEAK,
  CELL_FREEZE_BLOATWARE, CELL_BACKGROUND_TRACKER, CELL_ZIPPED,
  FLAG_IS_FROZEN, FLAG_INCOMING_SPAWN, FLAG_WILL_REPLICATE, FLAG_CLUSTER_READY } from '../core/grid.ts';

const TYPE_SYMBOLS: Record<number, string> = {
  [CELL_EMPTY]: '',
  [CELL_APP_TAB]: '▣',
  [CELL_MEMORY_LEAK]: '▲',
  [CELL_FREEZE_BLOATWARE]: '❖',
  [CELL_BACKGROUND_TRACKER]: '◎',
  [CELL_ZIPPED]: '◆',
};

const TYPE_CLASSES: Record<number, string> = {
  [CELL_EMPTY]: 'empty',
  [CELL_APP_TAB]: 'app-tab',
  [CELL_MEMORY_LEAK]: 'memory-leak',
  [CELL_FREEZE_BLOATWARE]: 'freeze-bloatware',
  [CELL_BACKGROUND_TRACKER]: 'background-tracker',
  [CELL_ZIPPED]: 'zipped',
};

let cells: HTMLButtonElement[] = [];
let lastType = new Uint8Array(CELL_COUNT);
let lastTier = new Uint8Array(CELL_COUNT);
let lastTimer = new Uint8Array(CELL_COUNT);
let lastFlags = new Uint8Array(CELL_COUNT);

export function initGrid(container: HTMLElement, onCellClick: (i: number) => void): void {
  container.innerHTML = '';
  cells = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const btn = document.createElement('button');
    btn.className = 'cell empty';
    (btn.dataset as { [k: string]: string })['idx'] = String(i);
    btn.type = 'button';
    btn.addEventListener('click', () => onCellClick(i));
    container.appendChild(btn);
    cells.push(btn);
    lastType[i] = 255; // force initial render
    lastTier[i] = 255;
    lastTimer[i] = 255;
    lastFlags[i] = 255;
  }
}

export function renderBoard(board: BoardState): void {
  for (let i = 0; i < CELL_COUNT; i++) {
    const t = board.cellType[i];
    const tier = board.cellTier[i];
    const timer = board.cellTimer[i];
    const flags = board.cellFlags[i];
    if (t === lastType[i] && tier === lastTier[i] && timer === lastTimer[i] && flags === lastFlags[i]) {
      continue;
    }
    const btn = cells[i];
    const typeClass = TYPE_CLASSES[t] ?? 'empty';
    btn.className = `cell ${typeClass}`;
    (btn.dataset as { [k: string]: string })['type'] = String(t);
    (btn.dataset as { [k: string]: string })['tier'] = String(tier);
    (btn.dataset as { [k: string]: string })['flags'] = String(flags);

    // Symbol
    const sym = TYPE_SYMBOLS[t] ?? '';
    btn.innerHTML = '';

    // Tier label (top-left)
    const tierEl = document.createElement('span');
    tierEl.className = 'tier';
    tierEl.textContent = t === CELL_EMPTY ? '' : `T${tier}`;
    btn.appendChild(tierEl);

    // Symbol (center)
    const symEl = document.createElement('span');
    symEl.className = 'symbol';
    symEl.textContent = sym;
    btn.appendChild(symEl);

    // Timer / RAM weight (bottom-right)
    let timerText = '';
    if (t === CELL_MEMORY_LEAK) timerText = String(timer > 0 ? timer : 0);
    else if (t === CELL_APP_TAB) timerText = `+${tier * 2}%`;
    else if (t === CELL_MEMORY_LEAK) timerText = `+3%`;
    else if (t === CELL_FREEZE_BLOATWARE) timerText = `+4%`;
    else if (t === CELL_BACKGROUND_TRACKER) timerText = `+2%`;
    else if (t === CELL_ZIPPED) timerText = '-2%';
    const timerEl = document.createElement('span');
    timerEl.className = 'timer';
    timerEl.textContent = timerText;
    btn.appendChild(timerEl);

    // Flags
    if (flags & FLAG_IS_FROZEN) btn.classList.add('frozen');
    if (flags & FLAG_INCOMING_SPAWN) btn.classList.add('incoming');
    if (flags & FLAG_CLUSTER_READY) btn.classList.add('cluster-ready');
    if (flags & FLAG_WILL_REPLICATE) {
      // Show direction arrow based on which empty neighbor is target
    }

    lastType[i] = t;
    lastTier[i] = tier;
    lastTimer[i] = timer;
    lastFlags[i] = flags;
  }
}



// ---- HUD ----

export function setRam(percent: number): void {
  const el = document.getElementById('ramPct');
  if (el) el.textContent = `${percent} / 99%`;
  const fill = document.getElementById('ramFill') as HTMLElement | null;
  if (fill) {
    fill.style.width = `${percent}%`;
    fill.classList.toggle('danger', percent >= 85);
  }
  const status = document.getElementById('hudStatus');
  if (status) {
    status.textContent = percent >= 85 ? 'PERINGATAN: Beban Tinggi' : 'Siap';
    status.style.color = percent >= 85 ? '#EF4444' : '#38BDF8';
  }
}

export function setUptime(turn: number): void {
  const el = document.getElementById('uptime');
  if (el) el.textContent = `${turn}T`;
}

export function setCpu(cpu: number, maxCpu: number): void {
  const el = document.getElementById('cpuCycles');
  if (el) el.textContent = `CPU: ${cpu}/${maxCpu}`;
  const dots = document.getElementById('cpuDots');
  if (!dots) return;
  dots.innerHTML = '';
  for (let i = 0; i < maxCpu; i++) {
    const d = document.createElement('div');
    d.className = `cpu-dot ${i < cpu ? 'filled' : 'empty'}`;
    dots.appendChild(d);
  }
}

export function setQueue(queue: { type: number; tier: number }[]): void {
  const container = document.getElementById('queueItems');
  if (!container) return;
  container.innerHTML = '';
  const symbols: Record<number, string> = {
    0: '', 1: '▣', 2: '▲', 3: '❖', 4: '◎', 5: '◆',
  };
  for (const entry of queue) {
    const cell = document.createElement('div');
    cell.className = 'queue-cell';
    cell.textContent = symbols[entry.type] ?? '?';
    cell.title = `T${entry.tier}`;
    container.appendChild(cell);
  }
}

export function setForceStopActive(active: boolean): void {
  const btn = document.getElementById('btnForceStop');
  if (btn) btn.classList.toggle('active', active);
}

export function setMuteButton(muted: boolean): void {
  const btn = document.getElementById('btnSound');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}

export function showOverlay(title: string, msg: string): void {
  const overlay = document.getElementById('overlay');
  const tEl = document.getElementById('overlayTitle');
  const mEl = document.getElementById('overlayMsg');
  if (overlay) overlay.classList.add('visible');
  if (tEl) tEl.textContent = title;
  if (mEl) mEl.textContent = msg;
}

export function hideOverlay(): void {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.remove('visible');
}

export function getCellElement(i: number): HTMLButtonElement | undefined {
  return cells[i];
}
