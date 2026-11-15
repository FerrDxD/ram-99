import { describe, it, expect } from 'bun:test';
import { TurnEngine } from './turnEngine.ts';
import { CELL_APP_TAB, CELL_MEMORY_LEAK, CELL_FREEZE_BLOATWARE } from './grid.ts';

describe('turn engine RAM calculation', () => {
  it('starts with 5 starting App Tabs = 10% RAM', () => {
    const e = new TurnEngine(12345);
    expect(e.getRamPercent()).toBe(10);
  });

  it('triggers Kernel Panic at >= 99% RAM', () => {
    const e = new TurnEngine(12345);
    const board = e.getBoard();
    // Fill board with Memory Leak (3% each) -> 64 * 3 = 192% -> clamped at 100
    for (let i = 0; i < 64; i++) {
      board.cellType[i] = CELL_MEMORY_LEAK;
      board.cellTier[i] = 1;
    }
    const res = e.endTurn();
    expect(res.status).toBe('kernel_panic');
    expect(res.ramPercent).toBeGreaterThanOrEqual(99);
  });

  it('restores CPU at turn start', () => {
    const e = new TurnEngine(12345);
    const board = e.getBoard();
    board.cellType[0] = CELL_APP_TAB; board.cellTier[0] = 1;
    board.cellType[1] = CELL_APP_TAB; board.cellTier[1] = 1;
    e.swap(0, 1);
    expect(e.getCpu()).toBe(2);
    e.endTurn();
    expect(e.getCpu()).toBe(3);
  });

  it('compress restores +1 CPU', () => {
    const e = new TurnEngine(12345);
    const board = e.getBoard();
    // Create 3 adjacent App Tabs tier 1
    board.cellType[0] = CELL_APP_TAB; board.cellTier[0] = 1;
    board.cellType[1] = CELL_APP_TAB; board.cellTier[1] = 1;
    board.cellType[8] = CELL_APP_TAB; board.cellTier[8] = 1;
    // Manually set cluster-ready flags
    board.cellFlags[0] |= 0x08;
    board.cellFlags[1] |= 0x08;
    board.cellFlags[8] |= 0x08;
    const res = e.compress();
    expect(res.compressed).toBe(true);
    expect(e.getCpu()).toBe(3); // +1 restored, capped at maxCpu 3
  });
});
