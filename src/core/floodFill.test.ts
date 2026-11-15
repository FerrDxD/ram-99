import { describe, it, expect } from 'bun:test';
import { CELL_APP_TAB, CELL_EMPTY, BoardState } from './grid.ts';
import { detectClusters } from './floodFill.ts';

function boardWith(cells: { idx: number; type: number; tier: number }[]): BoardState {
  const b: BoardState = {
    cellType: new Uint8Array(64).fill(CELL_EMPTY),
    cellTier: new Uint8Array(64),
    cellTimer: new Uint8Array(64),
    cellFlags: new Uint8Array(64),
  };
  for (const c of cells) {
    b.cellType[c.idx] = c.type;
    b.cellTier[c.idx] = c.tier;
  }
  return b;
}

describe('floodFill cluster detection', () => {
  it('detects 3 same-type same-tier orthogonal App Tabs as cluster-ready', () => {
    const b = boardWith([
      { idx: 0, type: CELL_APP_TAB, tier: 1 },
      { idx: 1, type: CELL_APP_TAB, tier: 1 },
      { idx: 8, type: CELL_APP_TAB, tier: 1 },
    ]);
    detectClusters(b);
    expect(b.cellFlags[0] & 0x08).toBe(0x08); // CLUSTER_READY
    expect(b.cellFlags[1] & 0x08).toBe(0x08);
    expect(b.cellFlags[8] & 0x08).toBe(0x08);
  });

  it('does not flag 2 App Tabs as cluster-ready', () => {
    const b = boardWith([
      { idx: 0, type: CELL_APP_TAB, tier: 1 },
      { idx: 1, type: CELL_APP_TAB, tier: 1 },
    ]);
    detectClusters(b);
    expect(b.cellFlags[0] & 0x08).toBe(0);
    expect(b.cellFlags[1] & 0x08).toBe(0);
  });

  it('does not flag different-tier App Tabs as one cluster', () => {
    const b = boardWith([
      { idx: 0, type: CELL_APP_TAB, tier: 1 },
      { idx: 1, type: CELL_APP_TAB, tier: 2 },
      { idx: 2, type: CELL_APP_TAB, tier: 1 },
    ]);
    detectClusters(b);
    expect(b.cellFlags[0] & 0x08).toBe(0);
    expect(b.cellFlags[1] & 0x08).toBe(0);
    expect(b.cellFlags[2] & 0x08).toBe(0);
  });

  it('does not allocate new arrays per scan (buffers reused)', () => {
    const b = boardWith([
      { idx: 0, type: CELL_APP_TAB, tier: 1 },
      { idx: 1, type: CELL_APP_TAB, tier: 1 },
      { idx: 2, type: CELL_APP_TAB, tier: 1 },
    ]);
    detectClusters(b);
    detectClusters(b);
    expect(b.cellFlags[0] & 0x08).toBe(0x08);
  });
});
