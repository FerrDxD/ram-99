# Technical Architecture Document: RAM-99: Task Manager Survival

| Atribut | Detail | 
| ----- | ----- | 
| **Nama Proyek** | RAM-99: Task Manager Survival | 
| **Versi Dokumen** | 1.0 | 
| **Target Runtime** | Mobile Web Browser (Chrome / Android WebView) | 
| **Batasan Hardware** | RAM 2 GB / Storage 32 GB ($\le 25\text{ MB}$ Heap, $\le 180\text{ KB}$ Bundle) | 
| **Tooling & Runtime** | **Bun** (Wajib — dilarang menggunakan `npm`, `yarn`, atau `pnpm`) | 

## 1. Tech Stack & Tooling Policy

Untuk menjaga ukuran *bundle* di bawah $180\text{ KB}$ dan menekan penggunaan memori *runtime* di bawah $25\text{ MB}$ pada perangkat *entry-level*, proyek ini menerapkan kebijakan **Zero Runtime Dependencies** dan **Zero Bitmap Canvas Overhead**:

* **Package Manager, Task Runner & Bundler:** **Bun** ($\ge 1.1$). Digunakan untuk mengelola dependensi *dev*, menjalankan *dev server*, mengeksekusi pengujian unit logika grid, dan memproduksi *bundle* akhir via `bun build`. Penggunaan `npm`, `yarn`, `pnpm`, atau `npx` **dilarang keras**.

* **Bahasa Pemrograman:** TypeScript (`strict: true`), dikompilasi langsung menggunakan transpiler bawaan Bun.

* **Rendering Engine:** **Static Pre-Mounted DOM Grid (64 Cells) + Hardware-Accelerated CSS**. Tidak menggunakan `<canvas>` maupun WebGL agar browser tidak perlu mengalokasikan *backing store* bitmap GPU beresolusi tinggi (menghemat $4\text{--}8\text{ MB}$ VRAM/RAM pada layar HD+ murah) sekaligus memastikan teks angka dan ikon SVG inline tampil tajam di semua tingkat DPI.

* **Execution Model:** **Pure Turn-Based Event-Driven**. Tidak ada `requestAnimationFrame` atau `setInterval` yang berjalan di latar belakang. Saat pemain sedang berpikir, beban CPU berada di angka $0\%$.

* **Audio Engine:** Native Web Audio API (sintesis bunyi klik mekanis dan alarm memori secara *real-time* dengan *early-return* saat mode *Mute* aktif).

## 2. Arsitektur Sistem Tingkat Tinggi

Seluruh siklus permainan berjalan secara sinkron dan deterministik setiap kali pengguna melakukan sentuhan (*Swipe* atau *Tap*):

```
+-------------------------------------------------------------------+
|                        BROWSER / WEBVIEW                          |
|  +------------------------+       +----------------------------+  |
|  |  Touch / Gesture Input |       |   Static 64-Cell DOM Grid  |  |
|  | (Swipe Swap / Tap Use) |       |  (CSS Grid + data-* attrs) |  |
|  +-----------+------------+       +-------------+--------------+  |
|              |                                  ^                 |
|              v                                  | (Sync Diff)     |
|  +-------------------------------------------------------------+  |
|  |             DETERMINISTIC TURN & GRID ENGINE                |  |
|  |  +-------------------+  +---------------+  +-------------+  |  |
|  |  |  TypedArray Grid  |  |  Zero-GC      |  | Telegraph & |  |  |
|  |  |  (64-Byte State)  |  |  Flood-Fill   |  | Process AI  |  |  |
|  |  +---------+---------+  +-------+-------+  +------+------+  |  |
|  +------------|--------------------|-----------------|---------+  |
|               |                    |                 |            |
|               v                    v                 v            |
|  +-----------------------------+  +----------------------------+  |
|  |   UNDO BUFFER & AUTO-SAVE   |  |   PROCEDURAL UI SYNTH      |  |
|  | (Pre-allocated + Storage)   |  |  (Web Audio API Clicks)    |  |
|  +-----------------------------+  +----------------------------+  |
+-------------------------------------------------------------------+

```

## 3. Strategi Manajemen Memori & Struktur Data

Untuk mencegah *Garbage Collection (GC) stutter* dan *Out-Of-Memory (OOM) Tab Kill* pada perangkat berspesifikasi 2/32, seluruh status papan $8 \times 8$ ($64$ sel) direpresentasikan menggunakan array bertipe datar (*flat TypedArrays*) yang dialokasikan satu kali saat aplikasi dimuat:

### 3.1 Representasi Papan Berbasis TypedArray ($64$ Sel)

Indeks sel dihitung dengan rumus $i = y \times 8 + x$ di mana $x, y \in \{0 \dots 7\}$:

* `cellType: Uint8Array(64)` — Jenis entitas (`0 = Empty`, `1 = AppTab`, `2 = MemoryLeak`, `3 = FreezeBloatware`, `4 = BackgroundTracker`, `5 = ZippedArchive`).

* `cellTier: Uint8Array(64)` — Tingkat kepadatan/level proses (`1` hingga `4`).

* `cellTimer: Uint8Array(64)` — Penghitung mundur aksi proses (misalnya sisa giliran sebelum *Memory Leak* membelah diri).

* `cellFlags: Uint8Array(64)` — *Bitmask* status ubin:

  * Bit `0` (`0x01`): `IS_FROZEN` (terkunci oleh *Freeze Bloatware* di sebelahnya).

  * Bit `1` (`0x02`): `INCOMING_SPAWN` (ditandai akan kedatangan proses baru pada akhir giliran).

  * Bit `2` (`0x04`): `WILL_REPLICATE` (arah target pembelahan *Memory Leak*).

  * Bit `3` (`0x08`): `CLUSTER_READY` (bagian dari kelompok $\ge 3$ proses sejenis yang siap di-*Compress*).

### 3.2 Zero-GC Flood-Fill untuk Deteksi Cluster

Untuk mendeteksi apakah $\ge 3$ *App Tab* dengan tingkat yang sama terhubung secara ortogonal tanpa mengalokasikan `Set` atau array baru setiap langkah:

* Dialokasikan dua buffer statis berukuran $64$ byte saat startup: `visitedBuf: Uint8Array(64)` dan `queueBuf: Uint8Array(64)`.

* Sebelum pemindaian dimulai, `visitedBuf.fill(0)` dipanggil.

* Algoritma *Breadth-First Search (BFS)* menggunakan indeks pointer `head` dan `tail` pada `queueBuf`. Jika jumlah anggota komponen terhubung $\ge 3$, bit `CLUSTER_READY` (`0x08`) langsung disematkan pada `cellFlags` masing-masing sel tersebut. Kompleksitas waktu dijamin $O(64)$ dengan alokasi memori dinamis sebesar $0\text{ bytes}$.

### 3.3 Static DOM Recycling

* Saat inisialisasi (`src/render/domGrid.ts`), program membuat tepat $64$ elemen `<button class="cell" data-idx="0..63">` di dalam kontainer CSS Grid $8 \times 8$.

* Pada setiap pembaruan papan, engine membandingkan nilai baru dengan bayangan status sebelumnya (*dirty check* per sel). Hanya sel yang berubah yang diperbarui atribut `data-type`, `data-tier`, `data-flags`, dan `textContent`-nya.

## 4. Algoritma Resolusi Giliran & Telegraphing

### 4.1 Pipeline 4 Fase Per Giliran

Setiap langkah permainan mengeksekusi pipeline deterministik berikut:

1. **Fase Aksi Pemain (`PLAYER_ACTION`):** Pemain melakukan *Swap* (`1 CPU Cycle`), *Compress* (`0 Cycle`, memulihkan `+1 Cycle`), *Force Stop* (`2 Cycles`), atau *Purge Line* (`3 Cycles`). Setiap aksi langsung memicu pembaruan `CLUSTER_READY` dan penghitungan ulang persentase beban RAM:
   

   $$
   \text{RAM}\% = \min\left(100, \sum_{i=0}^{63} \text{Weight}(\text{cellType}[i], \text{cellTier}[i])\right)
   $$

2. **Fase Eksekusi AI Proses (`PROCESS_TICK`):** Ketika pemain menekan *End Turn*:

   * *Background Tracker* berpindah $1$ langkah menuju sel kosong terdekat menggunakan PRNG deterministik.

   * *Memory Leak* dengan `cellTimer === 0` membelah diri ke sel kosong yang telah ditandai sebelumnya (`WILL_REPLICATE`), lalu mengatur ulang timernya.

   * *Freeze Bloatware* menyegarkan bit `IS_FROZEN` pada seluruh tetangga ortogonalnya.

3. **Fase Komit Proses Masuk (`SPAWN_COMMIT`):** Sel yang memiliki tanda `INCOMING_SPAWN` diisi oleh proses baru dari antrean, lalu sistem menghitung dan menandai koordinat `INCOMING_SPAWN` untuk giliran berikutnya agar pemain selalu dapat merencanakan strategi terlebih dahulu (*telegraphing*).

4. **Fase Evaluasi Uptime (`UPTIME_CHECK`):** Jika $\text{RAM}\% \ge 99$, permainan berpindah ke status `KERNEL_PANIC`. Jika tidak, `turnCount` bertambah $1$, dan setiap kelipatan $10$ giliran memicu layar pemilihan *Kernel Patch*.

### 4.2 Single-Step Undo Buffer (*System Restore Point*)

Untuk mendukung fitur *Undo* $1$ langkah tanpa membebani memori, dialokasikan satu buffer cadangan statis berukuran $256\text{ bytes}$ (`undoBuffer: Uint8Array(256)`) yang menyimpan salinan `cellType`, `cellTier`, `cellTimer`, dan `cellFlags` tepat sebelum aksi pemain dijalankan menggunakan metode `.set()` bawaan `TypedArray`.

## 5. Ketahanan State & Pemulihan Tab-Reload

Mengantisipasi sistem operasi Android yang mematikan tab browser di latar belakang pada perangkat RAM 2 GB:

1. **Trigger Penyimpanan Otomatis:**

   * Setiap kali pemain menyelesaikan aksi (`Swap`, `Compress`, `Force Stop`) atau menekan `End Turn`.

   * Cadangan tambahan pada event `document.addEventListener('visibilitychange')` saat status berubah menjadi `hidden`.

2. **Skema Payload Kompak ($< 1.5\text{ KB}$):**
   Disimpan di `localStorage` dengan kunci `ram99_save_v1`:

   ```
   {
     "v": 1,
     "mode": "endless",
     "seed": 20261115,
     "turn": 14,
     "cpu": 2,
     "maxCpu": 3,
     "patches": [1, 0, 2],
     "grid": "base64_encoded_256_bytes_board_state",
     "queue": [1, 2, 1]
   }
   
   ```

   *(Catatan: Empat array 64-byte papan digabung menjadi 256 byte dan disandikan ke string Base64 sepanjang 344 karakter, menjaga ukuran total JSON di bawah $600\text{ bytes}$.)*

3. **Instant Resume:** Saat halaman dimuat ulang, mesin langsung mendekode string Base64 kembali ke `TypedArray` papan dalam waktu $< 1\text{ ms}$ dan menampilkan kondisi papan terakhir secara instan.

## 6. Struktur Direktori & Alur Build (Bun)

```
ram-99/
├── index.html              # Shell HTML portrait & critical inline CSS
├── package.json            # Konfigurasi proyek (hanya devDependencies)
├── bun.lockb               # Lockfile biner milik Bun
├── tsconfig.json           # Konfigurasi TypeScript strict
└── src/
    ├── main.ts             # Entry point, gesture handler, & resume loader
    ├── core/
    │   ├── grid.ts         # TypedArray 64-cell state & Base64 serializer
    │   ├── floodFill.ts    # Zero-GC BFS cluster detector
    │   ├── turnEngine.ts   # Pipeline resolusi giliran, AI proses, & RAM calc
    │   └── prng.ts         # Mulberry32 deterministic seed generator
    ├── render/
    │   └── domGrid.ts      # Static 64-cell DOM updater & HUD renderer
    ├── audio/
    │   └── synth.ts        # Web Audio API mechanical click & alert synth
    └── storage/
        └── persistence.ts  # Synchronous localStorage & Daily Seed parser

```

### Perintah Pengembangan & Produksi (Bun)

```
# 1. Instalasi dependensi pengembangan (TypeScript & Bun types)
bun install

# 2. Menjalankan server pengembangan lokal dengan hot-reload
bun run src/main.ts --hot

# 3. Menjalankan unit test untuk flood-fill, kalkulasi RAM, & Base64 serializer
bun test

# 4. Build produksi terkompresi (target < 180 KB)
bun build ./src/main.ts --outdir ./dist --minify --sourcemap=none --target=browser

```