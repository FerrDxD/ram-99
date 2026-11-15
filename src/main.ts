// Entry point: gesture handler, HUD wiring, resume loader, auto-save

import { TurnEngine } from './core/turnEngine.ts';
import { initGrid, renderBoard, setRam, setUptime, setCpu, setQueue,
  setForceStopActive, setMuteButton, showOverlay, getCellElement } from './render/domGrid.ts';
import { playSwapClick, playCompressChirp, playForceStopThud, playMemoryWarning, setMuted as audioSetMuted, resumeAudio } from './audio/synth.ts';
import { saveGame, loadGame, clearGame, dailySeed } from './storage/persistence.ts';
import { CELL_EMPTY, CELL_APP_TAB, FLAG_CLUSTER_READY } from './core/grid.ts';

// ---- DOM refs ----
const gridContainer = document.getElementById('grid')!;
const btnForceStop = document.getElementById('btnForceStop')!;
const btnUndo = document.getElementById('btnUndo')!;
const btnEndTurn = document.getElementById('btnEndTurn')!;
const btnMute = document.getElementById('btnMute')!;
const btnRestart = document.getElementById('btnRestart')!;
const btnPlayAgain = document.getElementById('btnPlayAgain')!;
const btnSound = document.getElementById('btnSound')!;

// ---- Engine ----
const seed = dailySeed();
const engine = new TurnEngine(seed);
let forceStopMode = false;
let undoUsedThisTurn = false;

// ---- Init ----
initGrid(gridContainer, onCellTap);
renderBoard(engine.getBoard());
setRam(engine.getRamPercent());
setUptime(engine.getTurn());
setCpu(engine.getCpu(), engine.getMaxCpu());
setQueue(engine.getSpawnQueue());
setMuteButton(engine.isMutedEnabled());

// Try resume from localStorage
loadGame(engine);
renderBoard(engine.getBoard());
setRam(engine.getRamPercent());
setUptime(engine.getTurn());
setCpu(engine.getCpu(), engine.getMaxCpu());
setQueue(engine.getSpawnQueue());

// ---- Auto-save helper ----
function autoSave(): void {
  saveGame(engine);
}

// ---- Swipe gesture ----
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

gridContainer.addEventListener('pointerdown', (e) => {
  touchStartX = e.clientX;
  touchStartY = e.clientY;
  touchStartTime = performance.now();
}, { passive: true });

gridContainer.addEventListener('pointerup', (e) => {
  const dx = e.clientX - touchStartX;
  const dy = e.clientY - touchStartY;
  const dist = Math.hypot(dx, dy);
  const dt = performance.now() - touchStartTime;

  // Only treat as swipe if far enough and quick enough
  if (dist < 18 || dt > 300) return;

  const target = (e.target as HTMLElement).closest('.cell') as HTMLElement | null;
  if (!target) return;
  const fromIdx = Number((target as HTMLElement).dataset['idx']);

  let toIdx = -1;
  if (Math.abs(dx) > Math.abs(dy)) {
    toIdx = dx > 0 ? fromIdx + 1 : fromIdx - 1;
    // Clamp to row boundary
    if (dx > 0 && (fromIdx % 8) === 7) toIdx = -1;
    if (dx < 0 && (fromIdx % 8) === 0) toIdx = -1;
  } else {
    toIdx = dy > 0 ? fromIdx + 8 : fromIdx - 8;
    if (dy > 0 && Math.floor(fromIdx / 8) === 7) toIdx = -1;
    if (dy < 0 && Math.floor(fromIdx / 8) === 0) toIdx = -1;
  }

  if (toIdx >= 0 && toIdx < 64) {
    if (engine.swap(fromIdx, toIdx)) {
      playSwapClick();
      if (!engine.isMutedEnabled()) navigator.vibrate?.([8]);
      renderBoard(engine.getBoard());
      setRam(engine.getRamPercent());
      setCpu(engine.getCpu(), engine.getMaxCpu());
      autoSave();
    } else if ((engine.getBoard().cellFlags[fromIdx] ?? 0) & 1 || (engine.getBoard().cellFlags[toIdx] ?? 0) & 1) {
      // Frozen shake
      target.classList.add('shake');
      setTimeout(() => target.classList.remove('shake'), 150);
    }
  }
}, { passive: true });

// CSS keyframe shake injected once
const style = document.createElement('style');
style.textContent = `
  @keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-4px); } 100% { transform: translateX(0); } }
  .shake { animation: shake 150ms ease-in-out; }
`;
document.head.appendChild(style);

// ---- Cell tap ----
function onCellTap(i: number): void {
  const board = engine.getBoard();
  const cellType = board.cellType[i];
  const flags = board.cellFlags[i];

  if (forceStopMode) {
    if (cellType === CELL_EMPTY) return;
    if (engine.forceStop(i)) {
      playForceStopThud();
      navigator.vibrate?.([25]);
      forceStopMode = false;
      setForceStopActive(false);
      renderBoard(engine.getBoard());
      setRam(engine.getRamPercent());
      setCpu(engine.getCpu(), engine.getMaxCpu());
      autoSave();
    }
    return;
  }

  // Tap on cluster-ready group -> Compress (0 cycle, bonus +1)
  if (flags & FLAG_CLUSTER_READY && cellType === CELL_APP_TAB) {
    const res = engine.compress();
    if (res.compressed) {
      playCompressChirp();
      navigator.vibrate?.([12, 24, 18]);
      renderBoard(engine.getBoard());
      setRam(engine.getRamPercent());
      setCpu(engine.getCpu(), engine.getMaxCpu());
      autoSave();
    }
    return;
  }

  // Otherwise, just visual feedback (selection could be expanded later)
  const btn = getCellElement(i);
  if (btn) {
    btn.classList.add('ring');
    setTimeout(() => btn.classList.remove('ring'), 150);
  }
}

// ---- Force Stop toggle ----
btnForceStop.addEventListener('click', () => {
  forceStopMode = !forceStopMode;
  setForceStopActive(forceStopMode);
  if (forceStopMode) {
    playForceStopThud();
  }
});

// ---- Undo ----
btnUndo.addEventListener('click', () => {
  if (undoUsedThisTurn) return;
  if (engine.undo()) {
    undoUsedThisTurn = true;
    playSwapClick();
    renderBoard(engine.getBoard());
    setRam(engine.getRamPercent());
    setCpu(engine.getCpu(), engine.getMaxCpu());
    autoSave();
  }
});

// ---- End Turn ----
btnEndTurn.addEventListener('click', () => {
  undoUsedThisTurn = false;
  const res = engine.endTurn();
  renderBoard(engine.getBoard());
  setRam(res.ramPercent);
  setUptime(res.turn);
  setCpu(res.cpu, engine.getMaxCpu());
  setQueue(engine.getSpawnQueue());
  autoSave();

  if (res.status === 'kernel_panic') {
    playMemoryWarning();
    navigator.vibrate?.([160]);
    showOverlay('Kernel Panic', 'Beban RAM mencapai 99%. Sistem mati.');
  } else if (res.ramPercent >= 85) {
    playMemoryWarning();
    navigator.vibrate?.([8]);
  }
});

// ---- Mute ----
btnMute.addEventListener('click', () => {
  const muted = !engine.isMutedEnabled();
  engine.setMuted(muted);
  audioSetMuted(muted);
  setMuteButton(muted);
  if (!muted) resumeAudio();
});

btnSound.addEventListener('click', () => {
  const muted = !engine.isMutedEnabled();
  engine.setMuted(muted);
  audioSetMuted(muted);
  setMuteButton(muted);
  if (!muted) resumeAudio();
});

// ---- Restart ----
btnRestart.addEventListener('click', () => {
  clearGame();
  location.reload();
});

// ---- Play again ----
btnPlayAgain.addEventListener('click', () => {
  clearGame();
  location.reload();
});

// ---- Visibility change auto-save ----
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    autoSave();
  }
});

// ---- Audio resume on first interaction ----
const ensureAudio = () => { resumeAudio(); };
document.addEventListener('pointerdown', ensureAudio, { once: true });
document.addEventListener('keydown', ensureAudio, { once: true });
