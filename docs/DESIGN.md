# Game, Audio & UX Design Document: RAM-99: Task Manager Survival

| Atribut | Detail | 
| ----- | ----- | 
| **Nama Proyek** | RAM-99: Task Manager Survival | 
| **Versi Dokumen** | 1.0 | 
| **Estetika Visual** | Tactile Hardware Telemetry & Classic OS Resource Monitor | 
| **Audio Direction** | Procedural Micro-Switch & System Bus Foley (Web Audio API) | 
| **Target Layar** | Mobile Portrait (`360x640` hingga `412x915` CSS px) | 

## 1. Filosofi Visual: "Tactile Hardware Telemetry" (Anti-Slop Policy)

Banyak game bertema komputer terjebak pada klise visual generik seperti hujan matriks hijau neon, teks *hacker* palsu, atau dekorasi sintaks komentar tidak fungsional (seperti `// RAM-99` atau `// manage your file`) yang justru mengotori keterbacaan layar kecil.

**RAM-99: Task Manager Survival** menolak seluruh dekorasi semacam itu dan mengambil inspirasi dari **perangkat keras sampler industrial (seperti Teenage Engineering EP-133)** serta **antarmuka utilitas sistem operasi klasik (BeOS / Windows 98 System Monitor)**:

* **Zero Fake Syntax & Zero Fluff:** Tidak ada teks hiasan `//`, tanda prompt `root@>`, atau garis pemisah ASCII palsu di dalam antarmuka. Setiap label memiliki fungsi telemetri nyata (`MEM 62%`, `UPTIME 12`, `CPU 3/3`).

* **Grid Swiss yang Tegas:** Seluruh komponen dipisahkan oleh garis pembatas solid $1\text{px}$–$2\text{px}$ dengan sudut tajam (`border-radius: 2px` hingga `4px`), menciptakan struktur modular yang rapi pada layar $360\text{px}$.

* **Tanpa Blur & Gradien Berat:** Dilarang menggunakan `box-shadow` buram atau `backdrop-filter: blur()` yang memperlambat GPU *entry-level*. Kedalaman tombol fisik diciptakan menggunakan bingkai ganda atau pergeseran batas bawah (`border-bottom: 3px solid`) yang turun saat ditekan.

### 1.1 Palet Warna Fungsional (Theme Presets)

Warna tidak dipakai sebagai hiasan, melainkan sebagai kode status telemetri berstandar kontras tinggi:

| Nama Tema | Latar Utama (`--bg`) | Permukaan Sel (`--surface`) | Garis & Teks (`--ink`) | Aksen Sistem (`--accent`) | Kritis / Leak (`--danger`) | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **Industrial Slate (Default)** | `#121417` | `#1C2026` | `#ECEFF4` | `#38BDF8` | `#F97316` | 
| **Classic OS 98** | `#C0C0C0` | `#DFDFDF` | `#111111` | `#000080` | `#B91C1C` | 
| **E-Ink Telemetry** | `#F4F3EE` | `#E6E4DD` | `#18181B` | `#2563EB` | `#DC2626` | 

## 2. Semiotika Papan $8 \times 8$ & Telegraphing (Mute-First)

Karena permainan berjalan di atas 64 sel DOM statis tanpa aset gambar eksternal, setiap tipe proses harus langsung dikenali dalam sekilas pandang melalui kombinasi **bentuk geometris CSS/Unicode**, **warna latar**, dan **angka status** menggunakan `font-variant-numeric: tabular-nums`.

### 2.1 Anatomi Sel Memori

Setiap sel pada papan $8 \times 8$ memiliki tinggi dan lebar proporsional (`aspect-ratio: 1 / 1`) dengan tata letak internal sebagai berikut:

* **Pojok Kiri Atas (`10px`):** Kode singkat proses atau tingkat kepadatan (`T1`, `T2`, `T3`).

* **Tengah Sel (`18px` Bold):** Simbol geometris inti proses.

* **Pojok Kanan Bawah (`10px`):** Penghitung mundur (*timer*) atau bobot konsumsi RAM (`+2%`).

### 2.2 Simbologi 5 Entitas Proses

1. **App Tab (Proses Standar):** Kotak berlapis (`▣`) dengan aksen biru (`#38BDF8`). Menampilkan label tingkat (`T1`–`T3`). Ketika $\ge 3$ *App Tab* sejenis terhubung, bingkai sel berubah menjadi garis solid terang yang berdenyut halus sebagai tanda siap di-*Compress*.

2. **Zipped Archive (Hasil Kompresi):** Segel berlian padat (`◆`) berwarna hijau zamrud (`#10B981`). Menempati hanya 1 slot namun mereduksi beban RAM total.

3. **Memory Leak (Proses Bocor):** Segitiga peringatan (`▲`) berwarna oranye (`#F97316`) dengan angka hitung mundur besar (`2` $\rightarrow$ `1`) di sudut sel.

4. **Freeze Bloatware (Proses Pembeku):** Kristal silang (`❖`) berwarna cyan pucat (`#22D3EE`). Sel tetangga yang terkunci (`IS_FROZEN`) mendapatkan bingkai dalam bergaris diagonal (*CSS repeating-linear-gradient* ringan) dan ikon gembok kecil di sudut.

5. **Background Tracker (Pelacak Latar):** Lingkaran bidik (`◎`) berwarna ungu (`#A855F7`). Ketika berjumlah $\ge 3$ di papan, indikator `CPU` di panel bawah berkedip kuning sebagai peringatan pengurangan kapasitas aksi.

### 2.3 Sistem Telegraphing Giliran Berikutnya

Untuk memastikan pemain dapat merencanakan strategi tanpa kejutan yang tidak adil:

* **Incoming Spawn (`INCOMING_SPAWN`):** Sel kosong yang akan terisi pada akhir giliran menampilkan bingkai sudut putus-putus (`dashed`) berwarna redup dengan pratinjau simbol proses yang akan masuk.

* **Replication Vector (`WILL_REPLICATE`):** *Memory Leak* yang akan membelah diri pada giliran ini menampilkan panah kecil (`→`, `↓`, `←`, `↑`) yang menunjuk langsung ke sel kosong targetnya.

## 3. Desain Audio Prosedural (Micro-Switch & Bus Foley)

Seluruh efek suara disintesis secara *real-time* melalui Web Audio API dengan karakter suara mekanis yang kering, pendek, dan tidak melelahkan telinga (*fatigue-free*) pada *speaker* mono ponsel murah:

1. **Swap / Defrag (`Tactile Keycap Click`):**

   * *Waveform:* Impuls `triangle` sangat singkat ($18\text{ ms}$) dengan sapuan frekuensi dari $620\text{ Hz}$ turun ke $180\text{ Hz}$ untuk meniru bunyi sakelar mekanis.

2. **Compress / Merge (`Data Zip Chirp`):**

   * *Waveform:* `sine` dengan sapuan naik cepat dari $330\text{ Hz}$ ke $880\text{ Hz}$ selama $95\text{ ms}$, diikuti nada konfirmasi singkat pada $1174.66\text{ Hz}$ ($\text{D}_6$, $40\text{ ms}$).

3. **Force Stop (`Process Terminate Thud`):**

   * *Waveform:* `square` melewati `BiquadFilterNode` (`lowpass` $450\text{ Hz}$) dari $150\text{ Hz}$ turun ke $55\text{ Hz}$ selama $110\text{ ms}$.

4. **Memory Warning (`85%+ RAM Alert`):**

   * *Waveform:* Dua ketukan pendek `sine` pada $784\text{ Hz}$ ($\text{G}_5$, masing-masing $35\text{ ms}$ dengan jeda $45\text{ ms}$) hanya ketika beban memori baru melewati ambang batas $85\%$.

## 4. Desain Mute-First & Umpan Balik Haptik

* **Visualisasi Ambang Kritis (`85% - 98%`):** Saat beban RAM menyentuh angka $\ge 85\%$, meteran RAM di bagian atas berubah dari warna aksen menjadi merah bata (`#EF4444`) dan bingkai luar papan $8 \times 8$ berubah menjadi garis putus-putus peringatan.

* **Haptic Feedback (`navigator.vibrate`):**

  * *Swap sel berhasil:* Getaran mikro `[8]` $\text{ms}$.

  * *Compress kelompok proses:* Getaran ganda `[12, 24, 18]` $\text{ms}$.

  * *Force Stop:* Getaran tegas tunggal `[25]` $\text{ms}$.

  * *Kernel Panic (`99%`):* Getaran panjang `[160]` $\text{ms}$.

## 5. Tata Letak UX/UI & Ergonomi Satu Tangan

Antarmuka disusun dalam satu layar penuh (`100dvh`, `overflow: hidden`) dengan seluruh kendali utama berada di paruh bawah layar agar mudah dijangkau ibu jari.

```
+---------------------------------------+
| MEM  64 / 99%          UPTIME  14T    |  <-- Telemetry Header (52px)
| [|||||||||||||||||||||-----------]    |      Segmented RAM Bar
+---------------------------------------+
| NEXT:  [▣ T1]  [▲ 2]  [▣ T1]   [🔊][↺]|  <-- Incoming Queue & Tools (40px)
+---------------------------------------+
|                                       |
|  +---+---+---+---+---+---+---+---+    |
|  |T1 |T1 |   |▲ 2|→  |   |   |   |    |
|  +---+---+---+---+---+---+---+---+    |
|  |T1 |   |   |   |   |❖  |🔒 |   |    |
|  +---+---+---+---+---+---+---+---+    |
|  |   |   |◎  |   |   |🔒 |   |   |    |  <-- Papan Memori 8x8 (1:1)
|  +---+---+---+---+---+---+---+---+    |      Swipe = Swap | Tap = Compress
|  |   |   |   |   |   |   |   |   |    |
|  ...           (8 Baris)           ...
|  |   |   |   |   |   |   |   |   |    |
|  +---+---+---+---+---+---+---+---+    |
|                                       |
+---------------------------------------+
| CPU CYCLES:  [ ■ ]  [ ■ ]  [ □ ]      |  <-- Resource Indicator (32px)
+---------------------------------------+
| [ FORCE STOP (2) ]  [ UNDO ] [ COMMIT ]|  <-- Thumb Action Dock (64px)
+---------------------------------------+

```

### 5.1 Skema Interaksi Sentuh Tanpa Ambiguitas

* **Geser Sel (*Swipe* 4 Arah):** Menarik satu sel ke sel tetangga (atas, bawah, kiri, kanan) sejauh $\ge 18\text{px}$ langsung menukar posisi keduanya (`-1 CPU Cycle`). Jika salah satu sel berstatus `IS_FROZEN`, sel bergetar horizontal singkat (`CSS keyframe shake` $150\text{ms}$) tanpa mengurangi poin CPU.

* **Ketuk Kelompok Siap (*Tap on `CLUSTER_READY`*):** Mengetuk salah satu sel dalam kelompok $\ge 3$ *App Tab* yang menyala langsung memicu aksi **Compress** (`+1 CPU Cycle` dan reduksi beban RAM).

* **Mode Target *Force Stop*:** Mengetuk tombol `[ FORCE STOP (2) ]` mengaktifkan mode bidik (tombol menyala terbalik), lalu mengetuk proses mana pun di papan langsung menghapusnya (`-2 CPU Cycles`). Mengetuk tombol yang sama lagi membatalkan mode bidik.

### 5.2 Tipografi Sistem Zero-Load

* Menggunakan kombinasi *sans-serif* sistem untuk keterbacaan label dan *monospace* sistem untuk angka telemetri (`font-family: system-ui, -apple-system, sans-serif` dan `ui-monospace, SFMono-Regular, Menlo, monospace` pada angka), memastikan waktu muat font $0\text{ms}$ dan ukuran *bundle* tetap hemat.