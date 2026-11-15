// Synchronous localStorage persistence & Daily Seed parser
// Payload < 1.5 KB, key: ram99_save_v1

import { TurnEngine, KernelPatch } from '../core/turnEngine.ts';
import { encodeBoardToBase64 } from '../core/grid.ts';

const SAVE_KEY = 'ram99_save_v1';

export interface SavePayload {
  v: number;
  mode: string;
  seed: number;
  turn: number;
  cpu: number;
  maxCpu: number;
  patches: KernelPatch[];
  grid: string;
  queue: number[];
}

export function saveGame(engine: TurnEngine): void {
  try {
    const payload: SavePayload = {
      v: 1,
      mode: 'endless',
      seed: Date.now(),
      turn: engine.getTurn(),
      cpu: engine.getCpu(),
      maxCpu: engine.getMaxCpu(),
      patches: engine.getKernelPatches(),
      grid: encodeBoardToBase64(engine.getBoard()),
      queue: engine.getSpawnQueue().map(e => e.type),
    };
    const json = JSON.stringify(payload);
    // Keep under 1.5 KB
    if (json.length > 1500) {
      // Trim: still save, but flagged
    }
    localStorage.setItem(SAVE_KEY, json);
  } catch {
    // localStorage may be unavailable or quota exceeded
  }
}

export function loadGame(engine: TurnEngine): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    return engine.deserialize(raw);
  } catch {
    return false;
  }
}

export function clearGame(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
}

export function dailySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export function isDailyReset(seed: number): boolean {
  return seed !== dailySeed();
}
