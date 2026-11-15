import { describe, it, expect } from 'bun:test';
import { encodeBoardToBase64, decodeBoardFromBase64 } from '../core/grid.ts';
import { CELL_APP_TAB, CELL_MEMORY_LEAK, CELL_EMPTY } from '../core/grid.ts';

describe('persistence Base64 serializer', () => {
  it('encodes and decodes 256-byte board state consistently', () => {
    const b: any = {
      cellType: new Uint8Array(64).fill(CELL_EMPTY),
      cellTier: new Uint8Array(64),
      cellTimer: new Uint8Array(64),
      cellFlags: new Uint8Array(64),
    };
    b.cellType[0] = CELL_APP_TAB;
    b.cellTier[0] = 1;
    b.cellType[5] = CELL_MEMORY_LEAK;
    b.cellTier[5] = 2;
    b.cellTimer[5] = 2;
    b.cellFlags[10] = 0x08; // CLUSTER_READY

    const encoded = encodeBoardToBase64(b);
    expect(encoded.length).toBe(344); // 256 bytes -> base64
    const decoded = decodeBoardFromBase64(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.cellType[0]).toBe(CELL_APP_TAB);
    expect(decoded!.cellTier[0]).toBe(1);
    expect(decoded!.cellType[5]).toBe(CELL_MEMORY_LEAK);
    expect(decoded!.cellTier[5]).toBe(2);
    expect(decoded!.cellTimer[5]).toBe(2);
    expect(decoded!.cellFlags[10] & 0x08).toBe(0x08);
  });

  it('payload stays under 1.5 KB', () => {
    const payload = JSON.stringify({ v: 1, grid: encodeBoardToBase64({
      cellType: new Uint8Array(64),
      cellTier: new Uint8Array(64),
      cellTimer: new Uint8Array(64),
      cellFlags: new Uint8Array(64),
    }), queue: [1, 2, 1] });
    expect(payload.length).toBeLessThan(1500);
  });
});
