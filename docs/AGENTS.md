# AI Agent Operational Guidelines: RAM-99: Task Manager Survival

Dokumen ini adalah kontrak aturan wajib bagi setiap AI *coding assistant* yang menulis, memodifikasi, atau mengaudit kode dalam repositori **RAM-99: Task Manager Survival**. Seluruh keputusan teknis harus mematuhi batasan ekstrem perangkat target (**RAM 2 GB / Storage 32 GB**).

## 1. Identitas Proyek & Batasan Keras (Hard Limits)

* **Nama Proyek:** RAM-99: Task Manager Survival
* **Arsitektur:** *Pure Turn-Based Grid Strategy Puzzle* (Static 64-Cell DOM Grid + TypedArray Engine + Procedural Web Audio).
* **Anggaran Perangkat Keras:**
  * Ukuran *bundle* produksi terkompresi: `<= 180 KB`.
  * Aset eksternal (`.png`, `.jpg`, `.svg` eksternal, `.mp3`, `.wav`, `.woff2`): `0 KB` (Dilarang keras memuat berkas media eksternal).
  * Konsumsi memori *runtime* (JS Heap + DOM): `<= 25 MB`.
  * Beban CPU saat *idle* (ketika menunggu pemain berpikir): `0%` (Tanpa *game loop* atau timer latar belakang yang terus berjalan).

## 2. Aturan Tooling & Dependensi

1. **Wajib Menggunakan Bun:**
   * Seluruh perintah instalasi, eksekusi skrip, pengujian unit, dan *bundling* **wajib** menggunakan `bun` (`bun install`, `bun run`, `bun test`, `bun build`).
   * **DILARANG** menjalankan `npm`, `yarn`, `pnpm`, atau `npx`. Jangan pernah membuat file `package-lock.json`, `yarn.lock`, atau `pnpm-lock.yaml`.
2. **Zero Runtime Dependencies:**
   * Bagian `"dependencies"` di `package.json` wajib selalu kosong (`{}`).
   * Dilarang menginstal *framework* UI, *state manager*, atau pustaka animasi pihak ketiga (seperti React, Vue, Svelte, Redux, GSAP, atau Howler.js). Hanya paket tipe statis di `"devDependencies"` (`@types/bun`, `typescript`) yang diizinkan.

## 3. Hukum Manajemen Memori & Rendering ("The 2/32 Grid Commandments")

Untuk mencegah *Out-Of-Memory (OOM) Tab Kill* oleh sistem operasi Android, pemborosan VRAM/RAM akibat *backing store* kanvas, dan *Garbage Collection (GC) stutter*, agen **wajib** mematuhi aturan berikut:

### 3.1 Dilarang Menggunakan Canvas/WebGL & Render Loop Aktif

* **Dilarang** menggunakan elemen `<canvas>` atau konteks WebGL untuk merender papan permainan $8 \times 8$. Gunakan elemen DOM statis dan transisi CSS ringan (`transform`, `opacity`) agar tajam di semua layar DPI tanpa mengalokasikan *bitmap buffer* besar.
* **Dilarang** memanggil `requestAnimationFrame` atau `setInterval` yang terus berjalan di latar belakang. Eksekusi kode hanya boleh dipicu oleh *event* sentuhan pengguna (`pointerdown` / `click` / gestur *swipe*).

### 3.2 Struktur Papan TypedArray & Zero-GC Flood-Fill

* Status papan berukuran $8 \times 8$ ($64$ sel) wajib disimpan dalam array bertipe datar (`Uint8Array(64)`) di `src/core/grid.ts`: `cellType`, `cellTier`, `cellTimer`, dan `cellFlags`.
* Algoritma deteksi kelompok (*cluster*) di `src/core/floodFill.ts` **dilarang** mengalokasikan `new Set()`, `new Map()`, atau array baru (`[]`) setiap kali pemain menggeser blok. Wajib menggunakan buffer statis `visitedBuf: Uint8Array(64)` dan `queueBuf: Uint8Array(64)` yang dialokasikan satu kali saat startup.

### 3.3 Static DOM Recycling (Anti-DOM Thrashing)

* Saat inisialisasi di `src/render/domGrid.ts`, bangun tepat $64$ elemen sel papan satu kali saja.
* **Dilarang** menggunakan `innerHTML` untuk merender ulang papan setiap giliran. Lakukan *dirty checking* per indeks ($0 \dots 63$) dan perbarui hanya atribut `data-type`, `data-tier`, `data-flags`, serta `textContent` pada sel yang mengalami perubahan nilai.

### 3.4 Single-Step Undo & Synchronous Base64 Auto-Save

* Fitur *Undo* ($1$ langkah per giliran) wajib menggunakan satu buffer statis berukuran $256\text{ bytes}$ (`undoBuffer: Uint8Array(256)`) dengan penyalinan `.set()` tanpa kloning objek JSON.
* Setiap aksi pemain (`Swap`, `Compress`, `Force Stop`, `Purge Line`, `End Turn`) serta event `visibilitychange === 'hidden'` wajib langsung menyandikan $256\text{ bytes}$ papan menjadi string Base64 dan menyimpannya ke `localStorage` (`ram99_save_v1`) dengan ukuran total payload `< 1.5 KB`.

### 3.5 Web Audio API & Mode Mute

* Setiap fungsi pemutar efek klik atau alarm memori di `src/audio/synth.ts` wajib diawali dengan pengecekan `if (isMuted || !audioCtx) return;`.
* Seluruh *oscillator* sementara wajib langsung memanggil `.disconnect()` pada event `onended`.

## 4. Konvensi Kode & Desain Mekanik

* **TypeScript Strict:** Gunakan `"strict": true` dan hindari penggunaan tipe `any`.
* **Determinisme Penuh:** Seluruh penentuan koordinat kemunculan proses baru (*Incoming Spawn*) dan pergerakan *Background Tracker* wajib menggunakan PRNG `Mulberry32` (`src/core/prng.ts`). **Dilarang** memanggil `Math.random()`.
* **Desain Mute-First & Telegraphing:** Seluruh informasi taktis—termasuk sel mana yang akan kedatangan proses baru (`INCOMING_SPAWN`), arah pembelahan *Memory Leak* (`WILL_REPLICATE`), sel yang membeku (`IS_FROZEN`), dan kelompok yang siap digabung (`CLUSTER_READY`)—**wajib** terlihat jelas secara visual di atas sel papan tanpa memerlukan petunjuk suara.
* **Ergonomi Satu Tangan:** Papan $8 \times 8$ harus mempertahankan rasio aspek `1:1` dan seluruh tombol aksi (*Force Stop*, *Undo*, *End Turn*) wajib ditempatkan di area bawah layar agar mudah dijangkau ibu jari.

## 5. Struktur Direktori yang Diizinkan

Jangan membuat direktori baru di luar struktur arsitektur berikut tanpa persetujuan eksplisit:

```
ram-99/
├── index.html              # Shell HTML portrait & critical inline CSS
├── package.json            # Konfigurasi proyek (hanya devDependencies)
├── bun.lockb               # Lockfile biner milik Bun
├── tsconfig.json           # Konfigurasi TypeScript strict
└── src/
    ├── main.ts             # Entry point, gesture handler, & resume loader
    ├── core/               # TypedArray grid, Zero-GC flood-fill, turn engine, & PRNG
    ├── render/             # Static 64-cell DOM updater & HUD renderer
    ├── audio/              # Web Audio API mechanical click & alert synth
    └── storage/            # Synchronous localStorage & Daily Seed parser
```

## 6. Alur Kerja Agen & Verifikasi

Sebelum menandai sebuah tugas selesai, agen wajib menjalankan langkah verifikasi berikut secara berurutan:

1. **Pemeriksaan Tipe TypeScript:**
   Jalankan `bun x tsc --noEmit` untuk memastikan nol galat tipe di seluruh modul.
2. **Pengujian Unit Logika Grid & Serialisasi:**
   Jalankan `bun test` untuk memvalidasi:
   * Akurasi deteksi kelompok $\ge 3$ proses sejenis pada `floodFill.ts` tanpa alokasi array baru.
   * Akurasi kalkulasi persentase beban RAM dan pemicu *Kernel Panic* pada batas $\ge 99\%$.
   * Konsistensi encoding/decoding Base64 $256\text{ bytes}$ papan dan ukuran payload `localStorage` (`< 1.5 KB`).
3. **Audit Ukuran Bundle Produksi:**
   Jalankan perintah *build* produksi:
   ```bash
   bun build ./src/main.ts --outdir ./dist --minify --sourcemap=none --target=browser
   ```
   Pastikan total ukuran seluruh hasil kompilasi di folder `./dist` berada di bawah batas `180 KB`.
4. **Audit DOM & Idle CPU:**
   Pastikan tidak ada pembuatan elemen DOM baru di dalam siklus giliran dan tidak ada timer aktif yang tertinggal saat pemain sedang diam.