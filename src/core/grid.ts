// TypedArray 64-cell board state & Base64 serializer (zero dynamic allocation per turn)

export const GRID_SIZE = 8;
export const CELL_COUNT = 64;

// Cell types
export const CELL_EMPTY = 0;
export const CELL_APP_TAB = 1;
export const CELL_MEMORY_LEAK = 2;
export const CELL_FREEZE_BLOATWARE = 3;
export const CELL_BACKGROUND_TRACKER = 4;
export const CELL_ZIPPED = 5;

// RAM weights per cell type (tier-independent base)
export const RAM_WEIGHT: Record<number, number> = {
  [CELL_EMPTY]: 0,
  [CELL_APP_TAB]: 2,
  [CELL_MEMORY_LEAK]: 3,
  [CELL_FREEZE_BLOATWARE]: 4,
  [CELL_BACKGROUND_TRACKER]: 2,
  [CELL_ZIPPED]: -2,
};

// Flag bitmask
export const FLAG_IS_FROZEN = 0x01;
export const FLAG_INCOMING_SPAWN = 0x02;
export const FLAG_WILL_REPLICATE = 0x04;
export const FLAG_CLUSTER_READY = 0x08;

export interface BoardState {
  cellType: Uint8Array;
  cellTier: Uint8Array;
  cellTimer: Uint8Array;
  cellFlags: Uint8Array;
}

export function createBoard(): BoardState {
  return {
    cellType: new Uint8Array(CELL_COUNT),
    cellTier: new Uint8Array(CELL_COUNT),
    cellTimer: new Uint8Array(CELL_COUNT),
    cellFlags: new Uint8Array(CELL_COUNT),
  };
}

export function cloneBoard(src: BoardState): BoardState {
  return {
    cellType: new Uint8Array(src.cellType),
    cellTier: new Uint8Array(src.cellTier),
    cellTimer: new Uint8Array(src.cellTimer),
    cellFlags: new Uint8Array(src.cellFlags),
  };
}

export function copyBoard(dst: BoardState, src: BoardState): void {
  dst.cellType.set(src.cellType);
  dst.cellTier.set(src.cellTier);
  dst.cellTimer.set(src.cellTimer);
  dst.cellFlags.set(src.cellFlags);
}

export function idx(x: number, y: number): number {
  return y * GRID_SIZE + x;
}

export function xy(i: number): { x: number; y: number } {
  return { x: i % GRID_SIZE, y: Math.floor(i / GRID_SIZE) };
}

export function neighbors(i: number): number[] {
  const { x, y } = xy(i);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < GRID_SIZE - 1) out.push(i + 1);
  if (y > 0) out.push(i - GRID_SIZE);
  if (y < GRID_SIZE - 1) out.push(i + GRID_SIZE);
  return out;
}

export function calcRAMPercent(board: BoardState): number {
  let total = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    const w = RAM_WEIGHT[board.cellType[i]] ?? 0;
    total += w > 0 ? w : 0;
  }
  return Math.min(100, total);
}

// Base64 encode/decode for 256-byte board state (4 arrays x 64 bytes)
const b64chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBoardToBase64(board: BoardState): string {
  const buf = new Uint8Array(256);
  buf.set(board.cellType, 0);
  buf.set(board.cellTier, 64);
  buf.set(board.cellTimer, 128);
  buf.set(board.cellFlags, 192);
  let out = '';
  for (let i = 0; i < buf.length; i += 3) {
    const b0 = buf[i];
    const b1 = buf[i + 1] ?? 0;
    const b2 = buf[i + 2] ?? 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += b64chars[(triple >>> 18) & 63];
    out += b64chars[(triple >>> 12) & 63];
    out += i + 1 < buf.length ? b64chars[(triple >>> 6) & 63] : '=';
    out += i + 2 < buf.length ? b64chars[triple & 63] : '=';
  }
  return out;
}

export function decodeBoardFromBase64(str: string): BoardState | null {
  const buf = new Uint8Array(256);
  let bi = 0;
  for (let i = 0; i < str.length; i += 4) {
    const c0 = b64chars.indexOf(str[i]);
    const c1 = b64chars.indexOf(str[i + 1] ?? '=');
    const c2 = b64chars.indexOf(str[i + 2] ?? '=');
    const c3 = b64chars.indexOf(str[i + 3] ?? '=');
    if (c0 < 0 || c1 < 0) return null;
    const triple = (c0 << 18) | (c1 << 12) | ((c2 >= 0 ? c2 : 0) << 6) | (c3 >= 0 ? c3 : 0);
    buf[bi++] = (triple >>> 16) & 255;
    if (c2 >= 0 && bi < 256) buf[bi++] = (triple >>> 8) & 255;
    if (c3 >= 0 && bi < 256) buf[bi++] = triple & 255;
    if (bi >= 256) break;
  }
  if (bi < 256) return null;
  return {
    cellType: new Uint8Array(buf.slice(0, 64)),
    cellTier: new Uint8Array(buf.slice(64, 128)),
    cellTimer: new Uint8Array(buf.slice(128, 192)),
    cellFlags: new Uint8Array(buf.slice(192, 256)),
  };
}
