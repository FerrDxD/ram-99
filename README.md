# RAM-99: Task Manager Survival

> **Systemic Grid Strategy Puzzle • Turn-Based Survival • Mobile Web**
> 
> _You are the System Kernel. The device's RAM limit is both the battlefield and the enemy._

---

## About

**RAM-99: Task Manager Survival** is a turn-based grid strategy puzzle where your phone's own memory limitation becomes the core mechanic. You play as the System Kernel, managing an 8×8 memory sector board. Every turn, new processes spawn, replicate, freeze neighbors, and consume resources. Merge, defrag, force stop, and purge before the RAM meter hits **99%** — or suffer a Kernel Panic.

Built for entry-level devices (2 GB RAM / 32 GB storage). Zero external assets. Zero render loop. Sub-180 KB bundle.

---

## Highlights

| Feature | Detail |
|---------|--------|
| **Genre** | Turn-based grid strategy puzzle |
| **Board** | 8×8 deterministic memory grid (64 sectors) |
| **Platform** | Mobile web browser (Chrome / Android WebView), portrait 100dvh |
| **Bundle size** | < 180 KB (production, minified) |
| **Runtime RAM** | < 25 MB |
| **Cold load** | ≤ 0.8 s on slow 3G |
| **Idle CPU** | 0% (event-driven, no game loop) |
| **External assets** | 0 KB (no images, audio, or fonts) |
| **Save system** | Synchronous auto-save to `localStorage` every turn (< 1.5 KB) |
| **Audio** | Procedural Web Audio API synthesis (mute-first) |
| **Tech** | Bun + TypeScript (strict), static DOM grid, TypedArray engine |

---

## Quick Start

### Play in browser

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Open http://localhost:5173 in Chrome or Edge
```

### Production build

```bash
bun run build
# Output in ./dist/ (main.js ~18 KB)
# Serve dist/ over HTTP; do not open index.html via file://
```

### Controls

| Action | Input |
|--------|-------|
| Swap / Defrag (1 CPU Cycle) | Swipe one cell to an adjacent cell |
| Compress (0 Cycle, +1 CPU bonus) | Tap a `CLUSTER_READY` group (≥3 same-type App Tabs) |
| Force Stop (2 CPU Cycles) | Tap **[FORCE STOP (2)]**, then tap target process |
| Undo last action | Tap **[UNDO]** |
| End Turn | Tap **[END TURN >>]** |
| Mute / Unmute | Tap **[🔊/🔇]** |
| Restart | Tap **[RESTART]** |

---

## Tech Stack

- **Runtime & Bundler:** Bun (≥ 1.1)
- **Language:** TypeScript (`strict: true`)
- **Rendering:** Static 64-cell DOM grid + CSS (no `<canvas>`, no WebGL)
- **State:** Flat `Uint8Array` TypedArrays (zero GC per turn)
- **PRNG:** Mulberry32 (deterministic, seedable — no `Math.random`)
- **Audio:** Web Audio API procedural synthesis
- **Persistence:** `localStorage` with Base64-encoded 256-byte board state
- **Tests:** Bun test
- **Package Manager:** Bun only (`npm`, `yarn`, `pnpm` prohibited)

---

## Project Structure

```
ram-99/
├── index.html              # Shell HTML + critical inline CSS
├── package.json            # Project config (devDependencies only)
├── bun.lockb               # Bun lockfile
├── tsconfig.json           # TypeScript strict config
├── README.md               # This file
├── CONTRIBUTING.md         # Contribution guidelines
├── CODE_OF_CONDUCT.md      # Community standards
├── SECURITY.md             # Security policy
├── dist/                   # Production build output
├── docs/                   # Design documents (PRD, DESIGN, ARCHITECT, AGENTS)
│   ├── PRD.md
│   ├── DESIGN.md
│   ├── ARCHITECT.md
│   └── AGENTS.md
└── src/
    ├── main.ts             # Entry point, gesture handler, resume loader
    ├── dev-server.ts       # Local HTTP dev server
    ├── core/
    │   ├── grid.ts         # TypedArray 64-cell state + Base64 serializer
    │   ├── floodFill.ts    # Zero-GC BFS cluster detector
    │   ├── turnEngine.ts   # Turn pipeline, AI process, uptime check
    │   └── prng.ts         # Mulberry32 deterministic PRNG
    ├── render/
    │   └── domGrid.ts      # Static 64-cell DOM updater + HUD renderer
    ├── audio/
    │   └── synth.ts        # Web Audio API procedural synth
    └── storage/
        └── persistence.ts  # localStorage auto-save + Daily Seed
```

---

## Design Philosophy

**"Tactile Hardware Telemetry"** — Anti-slop policy:

- **Zero fake syntax:** No decorative `//`, `root@>`, or ASCII dividers. Every label has real telemetry function (`MEM 62%`, `UPTIME 12`, `CPU 3/3`).
- **Swiss grid:** Sharp 1px–2px separators, `border-radius: 2px–4px`, modular structure for 360 px screens.
- **No blur or heavy gradients:** No `box-shadow` or `backdrop-filter` that slow entry-level GPUs. Button depth via double borders or `border-bottom` shift on press.
- **Mute-first telegraphing:** All tactical info (incoming spawn, replication vector, frozen cells, cluster-ready) is visual — no audio required.
- **One-thumb ergonomics:** 8×8 grid 1:1 aspect, all action buttons in the bottom thumb zone.

---

## Performance Budgets (Hard Limits)

| Metric | Target |
|--------|--------|
| Bundle size (gzipped) | < 180 KB |
| Runtime RAM (tab) | < 25 MB |
| Cold load (slow 3G) | ≤ 0.8 s |
| Idle CPU (thinking state) | 0% |
| Auto-save payload | < 1.5 KB |

---

## License

MIT License. See `LICENSE` for details.

---

## Acknowledgments

Inspired by industrial samplers (Teenage Engineering EP-133) and classic OS resource monitors (BeOS / Windows 98 System Monitor).

Built with Bun.  
RAM-99 © 2026
