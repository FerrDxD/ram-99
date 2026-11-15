# Contributing to RAM-99

Thank you for considering a contribution to **RAM-99: Task Manager Survival**.  
This is a hard-constraint game project targeting entry-level mobile devices. Every change must respect the **2/32 Grid Commandments** (2 GB RAM / 32 GB storage, < 180 KB bundle, < 25 MB runtime, 0% idle CPU).

---

## How to Contribute

### 1. Fork and Clone

```bash
git clone https://github.com/FerrDxD/ram-99.git
cd ram-99
bun install
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes

Follow the coding standards below. Test locally:

```bash
# TypeScript strict check
bun x tsc --noEmit

# Unit tests
bun test

# Production build (must stay < 180 KB)
bun run build

# Dev server
bun run dev
```

### 4. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add kernel patch selection screen
fix: undo buffer not resetting on end turn
docs: update ARCHITECT.md with new flood-fill detail
```

### 5. Push and Open a Pull Request

```bash
git push origin feature/your-feature-name
```

Open a PR against `main`. Describe what changed, why, and how you verified it.

---

## Coding Standards

### Mandatory (non-negotiable)

| Rule | Requirement |
|------|-------------|
| **Package Manager** | Bun only. `npm`, `yarn`, `pnpm`, `npx` are prohibited. No `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`. |
| **Dependencies** | `"dependencies": {}` must stay empty. Zero runtime dependencies. Only `@types/bun` and `typescript` in `devDependencies`. |
| **TypeScript** | `"strict": true`. No `any`. Zero `tsc --noEmit` errors. |
| **Rendering** | No `<canvas>`, no WebGL. Static 64-cell DOM grid only. No `requestAnimationFrame` or `setInterval` background loops. |
| **Memory** | Board state in `Uint8Array(64)` flat arrays. No `new Set()`, `new Map()`, or `new Array()` per turn in `floodFill.ts`. Use static buffers. |
| **DOM** | Exactly 64 cell elements created once. No `innerHTML` re-render per turn. Dirty-check per index; update only changed attributes. |
| **Audio** | Web Audio API only. Every synth function starts with `if (isMuted || !audioCtx) return;`. Oscillators `.disconnect()` on `onended`. |
| **Randomness** | Mulberry32 PRNG only. `Math.random()` is prohibited. |
| **Persistence** | Auto-save to `localStorage` (`ram99_save_v1`) every action + `visibilitychange === 'hidden'`. Payload < 1.5 KB. |
| **Bundle** | Production build via `bun build` must be < 180 KB total. |
| **File Structure** | Do not create directories outside `src/{core,render,audio,storage}` without explicit approval. |

### Prohibited

- React, Vue, Svelte, or any UI framework
- State managers (Redux, Zustand, etc.)
- Animation libraries (GSAP, etc.)
- Audio libraries (Howler.js, etc.)
- External images, fonts, or audio files (`.png`, `.jpg`, `.svg`, `.woff2`, `.mp3`, `.wav`)
- `Math.random()`
- `innerHTML` for board rendering
- Background timers or render loops

---

## Review Checklist

Before requesting review, confirm:

- [ ] `bun x tsc --noEmit` passes with 0 errors
- [ ] `bun test` passes all tests
- [ ] `bun run build` produces < 180 KB bundle
- [ ] No new runtime dependencies added
- [ ] No canvas/WebGL/render-loop usage
- [ ] TypedArray buffers reused, no per-turn allocations in hot path
- [ ] Mute-first design respected (all info visible without audio)
- [ ] One-thumb ergonomics preserved (bottom dock, 1:1 grid)
- [ ] Commit message follows Conventional Commits

---

## Documentation

Design documents live in `docs/`:

- `PRD.md` — Product Requirements
- `DESIGN.md` — Game, Audio & UX Design
- `ARCHITECT.md` — Technical Architecture
- `AGENTS.md` — AI Agent Operational Guidelines (read this before writing code)

Update the relevant doc if your change affects design or architecture.

---

## Questions?

Open an issue or start a discussion. Be respectful, be concise, and respect the hardware budget.
