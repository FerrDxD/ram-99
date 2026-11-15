# Security Policy

## Supported Versions

| Version | Supported | Notes |
|---------|-----------|-------|
| 1.0.x   | ✅ Yes    | Current stable release (MVP) |
| < 1.0   | ❌ No     | Pre-release, unsupported |

---

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in RAM-99, please report it responsibly.

### How to Report

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Email the maintainer at the contact listed in the repository profile, or use GitHub Security Advisories (private).
3. Include:
   - A clear description of the vulnerability
   - Steps to reproduce
   - Affected version(s)
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- We will acknowledge your report within **5 business days**.
- We will provide an initial assessment within **10 business days**.
- We will work with you on a fix and timeline for disclosure.
- We will credit you in the release notes (unless you prefer to remain anonymous).

---

## Security Scope

### In Scope

- Source code in `src/`
- Build output in `dist/`
- Configuration files (`package.json`, `tsconfig.json`, `bun.lockb`)
- Design documents in `docs/`

### Out of Scope

- Third-party services or CDNs (RAM-99 uses none by design)
- User's local device security (browser sandbox, OS, etc.)
- `localStorage` contents (client-side only, no sensitive data stored)
- Social engineering or physical access attacks

---

## Security Design

RAM-99 is designed with a **zero-trust, minimal-attack-surface** philosophy:

| Control | Implementation |
|---------|---------------|
| **Zero runtime dependencies** | `"dependencies": {}`. No supply-chain risk from npm packages. |
| **No external assets** | No images, fonts, or audio files loaded from network. Zero CORS / mixed-content exposure. |
| **No authentication** | No login, no accounts, no server, no cloud storage. No session hijacking vector. |
| **No render loop** | Event-driven only. No `requestAnimationFrame` or `setInterval` background activity. |
| **No `innerHTML`** | Board rendered via `document.createElement` + dirty-check. XSS surface eliminated. |
| **Web Audio API early-return** | Every synth function checks `isMuted || !audioCtx` before executing. |
| **Deterministic PRNG** | Mulberry32 (seedable). No `Math.random()`. Reproducible behavior for auditing. |
| **Client-side save only** | `localStorage` payload < 1.5 KB, contains only game state (turn, RAM, board). No PII. |
| **TypeScript strict** | `strict: true`, no `any`. Type errors caught at build time. |

---

## Disclosure Policy

- We do not offer bug bounties or financial rewards at this time.
- Vulnerability reports are handled privately and confidentially.
- Public disclosure will be coordinated with the reporter.
- Fixed vulnerabilities will be documented in release notes and `CHANGELOG.md`.

---

## Contacts

- **Security contact:** Via GitHub Security Advisories or repository maintainer email
- **Project:** https://github.com/FerrDxD/ram-99

---

Thank you for helping keep RAM-99 safe and secure.
