# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS + TypeScript, Bun runtime, zero runtime dependencies (per ARCHITECT.md / AGENTS.md)

## Users

Pengguna smartphone kelas entry-level (RAM 2 GB / Storage 32 GB) yang menyukai game teka-teki taktis singkat dan langsung terbuka tanpa waktu tunggu, sering bermain di tempat umum dalam kondisi ponsel senyap (mute) pada layar kecil (360 px).

## Product Purpose

RAM-99: Task Manager Survival adalah game teka-teki strategi berbasis giliran (turn-based grid puzzle) berukuran 8x8 yang menjadikan keterbatasan memori ponsel itu sendiri sebagai tema dan mekanik inti. Pemain berperan sebagai System Kernel yang menjaga kestabilan perangkat dengan mengelola proses aplikasi di papan memori sebelum beban RAM mencapai 99% (Kernel Panic).

## Positioning

Alih-alih menyembunyikan keterbatasan spesifikasi ponsel, game ini merayakannya melalui antarmuka gaya Task Manager / System Monitor retro. Bundle di bawah 180 KB, 0 KB aset eksternal, konsumsi RAM runtime di bawah 25 MB, cold load time <= 0.8 detik, dan beban CPU 0% saat idle turn state.

## Operating Context

Mobile web browser (Chrome / Android WebView), orientasi portrait (100dvh), interaksi satu ibu jari, tanpa login akun atau penyimpanan cloud, auto-save sinkron ke localStorage setiap giliran untuk ketahanan terhadap tab-reload.

## Capabilities and Constraints

- Mesin grid 8x8 deterministik dengan PRNG Mulberry32 (tidak ada Math.random)
- 4 tipe proses: App Tab, Memory Leak, Freeze Bloatware, Background Tracker, dan hasil kompresi Zipped Archive
- Aksi taktis: Swap/Defrag (1 Cycle), Compress (0 Cycle, bonus +1 Cycle), Force Stop (2 Cycles), Purge Line (3 Cycles)
- 3 CPU Cycles per giliran, sistem Kernel Patches setiap kelipatan 10 giliran
- Auto-sinkronisasi ke localStorage (< 1.5 KB) setiap aksi dan event visibilitychange hidden
- Web Audio API procedural sound synthesis (0 KB file audio), mode Mute instan
- Haptic feedback via navigator.vibrate
- Zero external assets (no png/svg/mp3/wav/woff2), zero canvas/WebGL, zero render loop

## Brand Commitments

Nama: RAM-99: Task Manager Survival. Estetika: Tactile Hardware Telemetry & Classic OS Resource Monitor (industrial sampler + BeOS / Windows 98 System Monitor). Zero fake syntax & zero fluff.

## Evidence on Hand

docs/PRD.md (Product Requirements Document v1.0 MVP), docs/DESIGN.md (Game, Audio & UX Design Document v1.0), docs/ARCHITECT.md (Technical Architecture v1.0), docs/AGENTS.md (AI Agent Operational Guidelines).

## Product Principles

1. Mute-first telegraphing: semua informasi taktis terlihat secara visual tanpa petunjuk suara.
2. Zero-GC: buffer statis TypedArray, tidak ada alokasi array baru per giliran.
3. Anti-DOM thrashing: 64 elemen sel dibuat satu kali, dirty-check per indeks, tidak ada innerHTML render ulang.
4. Ergonomi satu tangan: papan 8x8 rasio 1:1, tombol aksi di paruh bawah layar.

## Accessibility & Inclusion

Kontras tinggi untuk telemetri status, ukuran target sentuh yang memadai untuk satu ibu jari, tanpa dependensi audio untuk memahami permainan (mute-first).
