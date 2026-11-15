// Zero-GC BFS cluster detector for >= 3 same-type same-tier orthogonal cells
// Uses statically allocated buffers only (no new Set/Map/array per scan)

import { CELL_COUNT, BoardState, CELL_APP_TAB, CELL_EMPTY, FLAG_CLUSTER_READY } from './grid.ts';

const visitedBuf = new Uint8Array(CELL_COUNT);
const queueBuf = new Uint8Array(CELL_COUNT);
// memberBuf stores component members found during BFS (bounded by 64, reused)
const memberBuf = new Uint8Array(CELL_COUNT);

export function detectClusters(board: BoardState): void {
  // Clear cluster-ready flags and visited
  for (let i = 0; i < CELL_COUNT; i++) {
    board.cellFlags[i] &= ~FLAG_CLUSTER_READY;
    visitedBuf[i] = 0;
  }

  for (let start = 0; start < CELL_COUNT; start++) {
    if (visitedBuf[start]) continue;
    if (board.cellType[start] === CELL_EMPTY) continue;
    if (board.cellType[start] !== CELL_APP_TAB) continue;

    const tier = board.cellTier[start];
    let head = 0;
    let tail = 0;
    let memberCount = 0;

    visitedBuf[start] = 1;
    queueBuf[tail++] = start;
    memberBuf[memberCount++] = start;

    while (head < tail) {
      const cur = queueBuf[head++];
      const x = cur % 8;
      const y = (cur / 8) | 0;

      // Left
      if (x > 0) { const nb = cur - 1; if (!visitedBuf[nb] && board.cellType[nb] === CELL_APP_TAB && board.cellTier[nb] === tier) { visitedBuf[nb] = 1; queueBuf[tail++] = nb; memberBuf[memberCount++] = nb; } }
      // Right
      if (x < 7) { const nb = cur + 1; if (!visitedBuf[nb] && board.cellType[nb] === CELL_APP_TAB && board.cellTier[nb] === tier) { visitedBuf[nb] = 1; queueBuf[tail++] = nb; memberBuf[memberCount++] = nb; } }
      // Up
      if (y > 0) { const nb = cur - 8; if (!visitedBuf[nb] && board.cellType[nb] === CELL_APP_TAB && board.cellTier[nb] === tier) { visitedBuf[nb] = 1; queueBuf[tail++] = nb; memberBuf[memberCount++] = nb; } }
      // Down
      if (y < 7) { const nb = cur + 8; if (!visitedBuf[nb] && board.cellType[nb] === CELL_APP_TAB && board.cellTier[nb] === tier) { visitedBuf[nb] = 1; queueBuf[tail++] = nb; memberBuf[memberCount++] = nb; } }
    }

    if (memberCount >= 3) {
      for (let m = 0; m < memberCount; m++) {
        board.cellFlags[memberBuf[m]] |= FLAG_CLUSTER_READY;
      }
    }
  }
}
