// Turn engine: player actions, process AI, spawn commit, uptime check

import {
  BoardState, CELL_COUNT, CELL_EMPTY, CELL_APP_TAB, CELL_MEMORY_LEAK,
  CELL_FREEZE_BLOATWARE, CELL_BACKGROUND_TRACKER, CELL_ZIPPED,
  FLAG_IS_FROZEN, FLAG_INCOMING_SPAWN, FLAG_WILL_REPLICATE, FLAG_CLUSTER_READY,
  xy, neighbors, calcRAMPercent, encodeBoardToBase64, decodeBoardFromBase64,
  copyBoard,
} from './grid.ts';
import { detectClusters } from './floodFill.ts';
import { Mulberry32 } from './prng.ts';

export enum GameStatus {
  PLAYING = 'playing',
  KERNEL_PANIC = 'kernel_panic',
}

export enum KernelPatch {
  ZRAM = 'zram',
  WATCHDOG = 'watchdog',
  OVERCLOCK = 'overclock',
}

export interface GameConfig {
  maxCpu: number;
  leakTimer: number;
  zramBonus: number;
}

export interface TurnResult {
  status: GameStatus;
  ramPercent: number;
  cpu: number;
  turn: number;
  kernelPatches: KernelPatch[];
}

export interface SpawnEntry {
  type: number;
  tier: number;
}

function createBoard(): BoardState {
  return {
    cellType: new Uint8Array(CELL_COUNT),
    cellTier: new Uint8Array(CELL_COUNT),
    cellTimer: new Uint8Array(CELL_COUNT),
    cellFlags: new Uint8Array(CELL_COUNT),
  };
}

export class TurnEngine {
  private board: BoardState;
  private undoBuffer = new Uint8Array(256); // single-step undo (4 x 64 bytes)
  private turn = 0;
  private cpu = 3;
  private maxCpu = 3;
  private kernelPatches: KernelPatch[] = [];
  private prng: Mulberry32;
  private spawnQueue: SpawnEntry[] = [];
  private status: GameStatus = GameStatus.PLAYING;
  private isMuted = false;
  private config: GameConfig;

  constructor(seed: number, config: Partial<GameConfig> = {}) {
    this.board = createBoard();
    this.prng = new Mulberry32(seed);
    this.config = {
      maxCpu: config.maxCpu ?? 3,
      leakTimer: config.leakTimer ?? 2,
      zramBonus: config.zramBonus ?? 3,
    };
    this.cpu = this.maxCpu;
    this.initializeBoard();
  }

  // ---- Getters ----
  getBoard(): BoardState { return this.board; }
  getTurn(): number { return this.turn; }
  getCpu(): number { return this.cpu; }
  getMaxCpu(): number { return this.maxCpu; }
  getStatus(): GameStatus { return this.status; }
  getKernelPatches(): KernelPatch[] { return this.kernelPatches; }
  getSpawnQueue(): SpawnEntry[] { return [...this.spawnQueue]; }
  getRamPercent(): number { return calcRAMPercent(this.board); }
  isMutedEnabled(): boolean { return this.isMuted; }

  setMuted(muted: boolean): void { this.isMuted = muted; }

  private initializeBoard(): void {
    const startTypes = [CELL_APP_TAB, CELL_APP_TAB, CELL_MEMORY_LEAK];
    for (let i = 0; i < 5; i++) {
      const pos = this.prng.nextInt(0, CELL_COUNT - 1);
      if (this.board.cellType[pos] === CELL_EMPTY) {
        this.board.cellType[pos] = this.prng.pick(startTypes);
        this.board.cellTier[pos] = this.prng.nextInt(1, 3);
      }
    }
    this.spawnQueue = this.generateSpawnQueue(3);
    this.updateSpawnTelegraph();
    detectClusters(this.board);
  }

  private generateSpawnQueue(count: number): SpawnEntry[] {
    const queue: SpawnEntry[] = [];
    const weights = [CELL_APP_TAB, CELL_APP_TAB, CELL_MEMORY_LEAK, CELL_BACKGROUND_TRACKER];
    for (let i = 0; i < count; i++) {
      const t = this.prng.pick(weights);
      queue.push({ type: t, tier: this.prng.nextInt(1, 3) });
    }
    return queue;
  }

  private updateSpawnTelegraph(): void {
    for (let i = 0; i < CELL_COUNT; i++) {
      this.board.cellFlags[i] &= ~FLAG_INCOMING_SPAWN;
    }
    let marked = 0;
    const targets = this.prng.nextInt(2, 3);
    let tries = 0;
    while (marked < targets && tries < 50) {
      const pos = this.prng.nextInt(0, CELL_COUNT - 1);
      tries++;
      if (this.board.cellType[pos] === CELL_EMPTY && !(this.board.cellFlags[pos] & FLAG_INCOMING_SPAWN)) {
        this.board.cellFlags[pos] |= FLAG_INCOMING_SPAWN;
        marked++;
      }
    }
  }

  // ---- Player Actions ----

  swap(i: number, j: number): boolean {
    if (this.status !== GameStatus.PLAYING) return false;
    if (this.cpu < 1) return false;
    if (!this.areAdjacent(i, j)) return false;

    const a = this.board.cellType[i];
    const b = this.board.cellType[j];
    if (a === CELL_EMPTY && b === CELL_EMPTY) return false;
    if ((this.board.cellFlags[i] & FLAG_IS_FROZEN) || (this.board.cellFlags[j] & FLAG_IS_FROZEN)) {
      return false;
    }

    this.saveUndo();

    const tmpType = this.board.cellType[i];
    this.board.cellType[i] = this.board.cellType[j];
    this.board.cellType[j] = tmpType;

    const tmpTier = this.board.cellTier[i];
    this.board.cellTier[i] = this.board.cellTier[j];
    this.board.cellTier[j] = tmpTier;

    const tmpTimer = this.board.cellTimer[i];
    this.board.cellTimer[i] = this.board.cellTimer[j];
    this.board.cellTimer[j] = tmpTimer;

    const tmpFlags = this.board.cellFlags[i];
    this.board.cellFlags[i] = this.board.cellFlags[j];
    this.board.cellFlags[j] = tmpFlags;

    this.cpu -= 1;
    detectClusters(this.board);
    return true;
  }

  compress(): { compressed: boolean; ramFreed: number } {
    if (this.status !== GameStatus.PLAYING) return { compressed: false, ramFreed: 0 };

    const clusterCells: number[] = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      if (this.board.cellFlags[i] & FLAG_CLUSTER_READY) {
        clusterCells.push(i);
      }
    }
    if (clusterCells.length < 3) return { compressed: false, ramFreed: 0 };

    this.saveUndo();

    const anchor = clusterCells[0];
    this.board.cellType[anchor] = CELL_ZIPPED;
    this.board.cellTier[anchor] = 1;
    this.board.cellTimer[anchor] = 0;
    this.board.cellFlags[anchor] &= ~FLAG_CLUSTER_READY;

    for (let c = 1; c < clusterCells.length; c++) {
      const ci = clusterCells[c];
      this.board.cellType[ci] = CELL_EMPTY;
      this.board.cellTier[ci] = 0;
      this.board.cellTimer[ci] = 0;
      this.board.cellFlags[ci] &= ~FLAG_CLUSTER_READY;
    }

    this.cpu = Math.min(this.maxCpu, this.cpu + 1);
    detectClusters(this.board);
    return { compressed: true, ramFreed: 4 };
  }

  forceStop(i: number): boolean {
    if (this.status !== GameStatus.PLAYING) return false;
    if (this.cpu < 2) return false;
    if (this.board.cellType[i] === CELL_EMPTY) return false;

    this.saveUndo();

    this.board.cellType[i] = CELL_EMPTY;
    this.board.cellTier[i] = 0;
    this.board.cellTimer[i] = 0;
    this.board.cellFlags[i] = 0;

    this.cpu -= 2;
    detectClusters(this.board);
    return true;
  }

  purgeLine(rowOrCol: number, isRow: boolean): boolean {
    if (this.status !== GameStatus.PLAYING) return false;
    if (this.cpu < 3) return false;

    let count = 0;
    this.saveUndo();

    for (let i = 0; i < CELL_COUNT; i++) {
      const { x, y } = xy(i);
      const inLine = isRow ? y === rowOrCol : x === rowOrCol;
      if (!inLine) continue;
      if (this.board.cellType[i] === CELL_APP_TAB && this.board.cellTier[i] === 1) {
        this.board.cellType[i] = CELL_EMPTY;
        this.board.cellTier[i] = 0;
        this.board.cellTimer[i] = 0;
        this.board.cellFlags[i] = 0;
        count++;
      }
    }

    if (count === 0) return false;

    this.cpu -= 3;
    detectClusters(this.board);
    return true;
  }

  undo(): boolean {
    if (this.status !== GameStatus.PLAYING) return false;
    const buf = this.undoBuffer;
    this.board.cellType.set(buf.subarray(0, 64));
    this.board.cellTier.set(buf.subarray(64, 128));
    this.board.cellTimer.set(buf.subarray(128, 192));
    this.board.cellFlags.set(buf.subarray(192, 256));
    detectClusters(this.board);
    return true;
  }

  private saveUndo(): void {
    const buf = this.undoBuffer;
    buf.set(this.board.cellType, 0);
    buf.set(this.board.cellTier, 64);
    buf.set(this.board.cellTimer, 128);
    buf.set(this.board.cellFlags, 192);
  }

  private areAdjacent(i: number, j: number): boolean {
    const { x: x1, y: y1 } = xy(i);
    const { x: x2, y: y2 } = xy(j);
    return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
  }

  // ---- Process AI (PROCESS_TICK) ----

  private processAI(): void {
    // Background Tracker: move 1 step toward nearest empty cell
    for (let i = 0; i < CELL_COUNT; i++) {
      if (this.board.cellType[i] === CELL_BACKGROUND_TRACKER) {
        this.moveTracker(i);
      }
    }

    // Memory Leak: if timer <= 0, replicate
    for (let i = 0; i < CELL_COUNT; i++) {
      if (this.board.cellType[i] === CELL_MEMORY_LEAK) {
        if (this.board.cellTimer[i] <= 0) {
          this.replicateLeak(i);
          this.board.cellTimer[i] = this.config.leakTimer;
        } else {
          this.board.cellTimer[i]--;
        }
      }
    }

    // Freeze Bloatware: set IS_FROZEN on all orthogonal neighbors
    for (let i = 0; i < CELL_COUNT; i++) {
      if (this.board.cellType[i] === CELL_FREEZE_BLOATWARE) {
        for (const nb of neighbors(i)) {
          this.board.cellFlags[nb] |= FLAG_IS_FROZEN;
        }
      }
    }
  }

  private moveTracker(i: number): void {
    const empties = this.findEmptyNeighbors(i);
    if (empties.length === 0) return;
    const target = this.prng.pick(empties);
    this.board.cellType[target] = CELL_BACKGROUND_TRACKER;
    this.board.cellTier[target] = this.board.cellTier[i];
    this.board.cellTimer[target] = 0;
    this.board.cellFlags[target] = this.board.cellFlags[i] & ~FLAG_IS_FROZEN;
    this.board.cellType[i] = CELL_EMPTY;
    this.board.cellTier[i] = 0;
    this.board.cellTimer[i] = 0;
    this.board.cellFlags[i] = 0;
  }

  private findEmptyNeighbors(i: number): number[] {
    const out: number[] = [];
    const { x, y } = xy(i);
    if (x > 0 && this.board.cellType[i - 1] === CELL_EMPTY) out.push(i - 1);
    if (x < 7 && this.board.cellType[i + 1] === CELL_EMPTY) out.push(i + 1);
    if (y > 0 && this.board.cellType[i - 8] === CELL_EMPTY) out.push(i - 8);
    if (y < 7 && this.board.cellType[i + 8] === CELL_EMPTY) out.push(i + 8);
    return out;
  }

  private replicateLeak(i: number): void {
    const empties = this.findEmptyNeighbors(i);
    if (empties.length === 0) return;

    let target = -1;
    for (const e of empties) {
      if (this.board.cellFlags[e] & FLAG_WILL_REPLICATE) {
        target = e;
        break;
      }
    }
    if (target < 0) target = this.prng.pick(empties);

    this.board.cellType[target] = CELL_MEMORY_LEAK;
    this.board.cellTier[target] = 1;
    this.board.cellTimer[target] = this.config.leakTimer;
    this.board.cellFlags[target] = 0;

    for (let k = 0; k < CELL_COUNT; k++) {
      this.board.cellFlags[k] &= ~FLAG_WILL_REPLICATE;
    }
  }

  // ---- Spawn Commit (SPAWN_COMMIT) ----

  private commitSpawns(): void {
    for (let i = 0; i < CELL_COUNT; i++) {
      if (this.board.cellFlags[i] & FLAG_INCOMING_SPAWN) {
        if (this.spawnQueue.length > 0) {
          const entry = this.spawnQueue.shift()!;
          this.board.cellType[i] = entry.type;
          this.board.cellTier[i] = entry.tier;
          this.board.cellTimer[i] = entry.type === CELL_MEMORY_LEAK ? this.config.leakTimer : 0;
          this.board.cellFlags[i] &= ~FLAG_INCOMING_SPAWN;
        } else {
          this.board.cellFlags[i] &= ~FLAG_INCOMING_SPAWN;
        }
      }
    }
    while (this.spawnQueue.length < 3) {
      this.spawnQueue.push(...this.generateSpawnQueue(1));
    }
    this.updateSpawnTelegraph();
  }

  // ---- End Turn Pipeline ----

  endTurn(): TurnResult {
    if (this.status !== GameStatus.PLAYING) {
      return this.result();
    }

    this.processAI();
    this.commitSpawns();

    this.turn++;
    const ram = calcRAMPercent(this.board);

    if (ram >= 99) {
      this.status = GameStatus.KERNEL_PANIC;
      return this.result();
    }

    if (this.turn % 10 === 0) {
      const patch = this.prng.pick([KernelPatch.ZRAM, KernelPatch.WATCHDOG, KernelPatch.OVERCLOCK]);
      this.kernelPatches.push(patch);
      this.applyPatch(patch);
    }

    this.cpu = this.maxCpu;
    return this.result();
  }

  private applyPatch(patch: KernelPatch): void {
    switch (patch) {
      case KernelPatch.WATCHDOG:
        this.config.leakTimer = 3;
        break;
      case KernelPatch.OVERCLOCK:
        this.maxCpu = 4;
        this.cpu = this.maxCpu;
        break;
      case KernelPatch.ZRAM:
        break;
    }
  }

  private result(): TurnResult {
    return {
      status: this.status,
      ramPercent: calcRAMPercent(this.board),
      cpu: this.cpu,
      turn: this.turn,
      kernelPatches: [...this.kernelPatches],
    };
  }

  // ---- Serialization ----

  serialize(): string {
    const payload = {
      v: 1,
      mode: 'endless',
      seed: this.prng.nextUint32(),
      turn: this.turn,
      cpu: this.cpu,
      maxCpu: this.maxCpu,
      patches: this.kernelPatches,
      grid: encodeBoardToBase64(this.board),
      queue: this.spawnQueue.map(e => e.type),
    };
    return JSON.stringify(payload);
  }

  deserialize(json: string): boolean {
    try {
      const p = JSON.parse(json);
      this.turn = p.turn ?? 0;
      this.cpu = p.cpu ?? this.maxCpu;
      this.maxCpu = p.maxCpu ?? 3;
      this.kernelPatches = p.patches ?? [];
      this.status = GameStatus.PLAYING;
      const board = decodeBoardFromBase64(p.grid);
      if (!board) return false;
      copyBoard(this.board, board);
      this.spawnQueue = (p.queue ?? []).map((t: number) => ({ type: t, tier: 1 }));
      detectClusters(this.board);
      return true;
    } catch {
      return false;
    }
  }
}
