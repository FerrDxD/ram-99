# Product Requirements Document (PRD): RAM-99: Task Manager Survival

| Atribut | Detail | 
| ----- | ----- | 
| **Nama Proyek** | RAM-99: Task Manager Survival | 
| **Versi Dokumen** | 1.0 (MVP) | 
| **Genre** | Systemic Grid Strategy Puzzle / Turn-Based Survival | 
| **Target Platform** | Mobile Web Browser (Chrome / Android WebView) | 
| **Target Spesifikasi** | Perangkat Entry-Level (RAM 2 GB / Storage 32 GB) | 
| **Status** | Draft Awal | 

## 1. Ringkasan Eksekutif & Visi Produk

### 1.1 Konsep Utama

**RAM-99: Task Manager Survival** adalah game teka-teki strategi berbasis giliran (*turn-based grid puzzle*) yang menjadikan keterbatasan memori ponsel itu sendiri sebagai tema dan mekanik inti permainan. Pemain berperan sebagai *System Kernel* yang bertugas menjaga kestabilan perangkat di atas papan memori berukuran $8 \times 8$ (64 sektor). Setiap giliran, berbagai proses aplikasi muncul, membelah diri, membekukan blok tetangga, atau menyedot sumber daya. Pemain harus menata, menggabungkan (*compress*), dan menghentikan paksa (*force stop*) rantai proses tersebut sebelum indikator beban memori menyentuh batas kritis **`99%`** (*Kernel Panic*).

### 1.2 Proposisi Nilai Unik (Unique Value Proposition)

Alih-alih menyembunyikan keterbatasan spesifikasi ponsel, game ini merayakannya melalui antarmuka bergaya *Task Manager / System Monitor* retro yang tajam. Karena seluruh simulasi berjalan di atas manipulasi array integer $8 \times 8$ tanpa mesin fisika maupun *render loop* berat, aplikasi ini memiliki ukuran di bawah $180\text{ KB}$, berjalan mulus di `60 FPS` saat transisi, serta tidak memicu pemanasan berlebih (*thermal throttling*) pada prosesor *entry-level*.

## 2. Target Pengguna & Batasan Perangkat (Hardware Budget)

Game ini ditujukan bagi pengguna smartphone kelas *entry-level* (RAM 2 GB / Storage 32 GB) yang menyukai game teka-teki taktis seperti *2048*, *Threes!*, atau *Into the Breach*, serta menginginkan permainan singkat yang langsung terbuka tanpa waktu tunggu.

### Anggaran Teknis (Hard Technical Budgets)

* **Ukuran Total Bundle:** Maksimal `180 KB` (terkompresi, `0 KB` aset gambar/audio eksternal).

* **Konsumsi Memori (Runtime RAM):** Maksimal `25 MB` di dalam tab browser.

* **Cold Load Time:** `<= 0.8 detik` pada simulasi jaringan 3G lambat.

* **Efisiensi Siklus CPU:** $0\%$ beban rendering aktif saat menunggu pemain berpikir (*idle turn state*).

## 3. Mitigasi Risiko Desain (Hasil Evaluasi Panel)

Berdasarkan tinjauan kelayakan teknis untuk perangkat berspesifikasi 2/32, produk ini menerapkan dua mitigasi wajib:

1. **Ketahanan Mutlak Terhadap Tab-Reload (Auto-Save Per-Turn):**

   * *Masalah:* Pada ponsel RAM 2 GB, berpindah aplikasi ke WhatsApp atau layar beranda sering membuat sistem operasi mematikan tab browser di latar belakang.

   * *Solusi Produk:* Karena permainan berbasis giliran, seluruh kondisi papan $8 \times 8$, jumlah siklus CPU, dan skor langsung disimpan secara sinkron ke `localStorage` (`< 1.5 KB`) setiap kali pemain menyelesaikan satu langkah. Jika tab dimuat ulang oleh OS, permainan langsung melanjutkan tepat pada giliran terakhir.

2. **Kejelasan Informasi Tanpa Audio (Mute-First Telegraphing):**

   * *Masalah:* Pengguna sering bermain di tempat umum dalam kondisi ponsel senyap (*mute*) pada layar kecil ($360\text{ px}$).

   * *Solusi Produk:* Seluruh ancaman giliran berikutnya (seperti arah pembelahan *Memory Leak* atau radius efek *Freeze Bloatware*) ditampilkan secara eksplisit di atas ubin menggunakan panah arah dan ikon geometris kontras tinggi.

## 4. Mekanik Inti Permainan (Core Gameplay Mechanics)

### 4.1 Papan Memori $8 \times 8$ & Meteran Beban RAM

* Papan permainan terdiri dari $64$ blok sektor memori.

* Setiap proses yang aktif di papan menyumbang persentase beban RAM berdasarkan tingkat bobotnya (`+2%` hingga `+8%` per blok).

* Apabila pada akhir giliran total beban RAM mencapai atau melebihi **`99%`**, sistem mengalami *Out-Of-Memory Crash* dan sesi berakhir.

### 4.2 Ekosistem Proses Aplikasi (Grid Entities)

1. **App Tab (Biru):** Proses aplikasi standar (`+2%` RAM). Jika $3$ atau lebih *App Tab* dengan tingkat yang sama terhubung secara ortogonal, pemain dapat mengetuknya untuk melakukan **Compress / Merge**—menggabungkannya menjadi satu blok *Zipped Archive* yang membebaskan $2$ slot papan dan menurunkan beban RAM sebesar `4%`.

2. **Memory Leak (Oranye):** Proses bocor (`+3%` RAM) yang memiliki penghitung mundur `2` giliran. Jika tidak segera diisolasi atau dihentikan, ia akan membelah diri (*replicate*) ke $1$ sel kosong di sebelahnya.

3. **Freeze Bloatware (Cyan):** Proses berat (`+4%` RAM) yang membekukan (*lock*) hingga $4$ sel ortogonal di sekitarnya. Blok yang membeku tidak dapat digeser atau digabungkan sampai *Bloatware* tersebut dihentikan.

4. **Background Tracker (Ungu):** Proses pelacak (`+2%` RAM) yang berpindah $1$ langkah ke sel kosong setiap giliran. Jika terdapat $\ge 3$ *Tracker* aktif bersamaan di papan, kapasitas *CPU Cycles* pemain berkurang $1$ pada giliran tersebut.

### 4.3 Aksi Taktis Pemain (*CPU Cycles*)

Pada setiap giliran (*Uptime Turn*), pemain dibekali **`3 CPU Cycles`** (*Action Points*) untuk mengelola papan sebelum proses baru masuk:

* **Defrag / Swap (`1 Cycle`):** Menukar posisi dua blok yang bersebelahan secara ortogonal untuk menyusun kombinasi *Compress* atau menjauhkan proses berbahaya dari ruang kosong.

* **Compress (`0 Cycle` — Aksi Bonus):** Mengetuk kelompok $\ge 3$ proses sejenis yang sudah sejajar untuk langsung memadatkannya dan memulihkan `+1 CPU Cycle` (maksimal sekali per giliran).

* **Force Stop (`2 Cycles`):** Menghapus paksa satu proses apa pun secara instan dari papan sebelum membelah diri atau membekukan tetangganya.

* **Purge Line (`3 Cycles`):** Membersihkan seluruh proses tingkat dasar (*Tier 1*) dalam satu baris horizontal atau satu kolom vertikal penuh.

### 4.4 Progresi *Uptime* & *Kernel Patches*

* Setiap berhasil bertahan selama **`10 Giliran`** (*1 Uptime Milestone*), sistem memicu jeda optimasi dan menawarkan $1$ dari $3$ peningkatan pasif (*Kernel Patches*) untuk sesi tersebut:

  * **ZRAM Compression:** Kombinasi $3$ blok menurunkan beban RAM tambahan sebesar `3%`.

  * **Watchdog Timer:** Menambah batas hitung mundur pembelahan *Memory Leak* dari `2` menjadi `3` giliran.

  * **Overclock Boost:** Menambah kapasitas maksimum *CPU Cycles* menjadi `4` setiap 3 giliran sekali.

* Tersedia mode **Daily Seed** (berbasis tanggal harian) dan **Endless Mode** dengan skor tertinggi diukur dari total *Uptime Turns* yang dicapai.

## 5. Kebutuhan Fungsional (Prioritas MoSCoW)

### Must Have (P0 - Wajib untuk MVP)

* **Mesin Grid $8 \times 8$ Deterministik:** Logika papan berbasis PRNG *seeded*, sistem *Swap*, *Compress*, *Force Stop*, dan resolusi giliran musuh.

* **Telegraphing Giliran Berikutnya:** Indikator visual pada papan yang menunjukkan di sel mana proses baru akan muncul (*Incoming Spawn*) dan arah pembelahan *Memory Leak*.

* **4 Tipe Proses Utama:** Implementasi penuh *App Tab*, *Memory Leak*, *Freeze Bloatware*, dan *Background Tracker*.

* **Synchronous Auto-Save:** Penyimpanan otomatis ke `localStorage` setiap kali pemain melakukan aksi atau mengakhiri giliran.

* **Mode Mute & Audio Prosedural:** Efek suara klik mekanis, bunyi peringatan beban memori, dan suara kompresi via Web Audio API (`0 KB` file audio) dengan tombol *Mute* instan.

### Should Have (P1 - Peningkatan Pengalaman)

* **Sistem *Kernel Patches*:** Layar pemilihan *upgrade* sederhana setiap kelipatan 10 giliran.

* **Undo 1 Langkah Terakhir (*System Restore Point*):** Memungkinkan pemain membatalkan kesalahan geser (*Swap*) sebanyak 1 kali per giliran sebelum menekan tombol *End Turn*.

* **Haptic Feedback:** Getaran ringan (`navigator.vibrate`) saat melakukan *Compress* berantai atau saat beban RAM melewati ambang bahaya `85%`.

### Could Have (P2 - Opsional)

* **Preset Tema System Monitor:** Pilihan tampilan warna (*Modern Dark Task Manager*, *Classic Win98 Grey*, *Terminal Htop Green*).

* **Salin Ringkasan Skor (*Share Uptime Card*):** Menyalin teks ringkasan skor berbasis karakter ASCII/Unicode ke *clipboard* untuk dibagikan ke grup chat.

### Won't Have (Out of Scope)

* Aset gambar/ikon eksternal (`.png`, `.svg` eksternal) maupun berkas suara (`.mp3`, `.wav`).

* Simulasi fisika benda jatuh atau animasi partikel kompleks.

* Sistem *login* akun atau penyimpanan *cloud* berbasis server.

## 6. Antarmuka Pengguna & Kontrol (UX/UI)

* **Orientasi Layar:** Mode **Portrait** (`100dvh`), dirancang agar seluruh interaksi dapat dilakukan dengan satu ibu jari tanpa perlu menggeser halaman.

* **Struktur Tata Letak Vertikal:**

  1. **Header Monitor (`56px`):** Menampilkan bar beban memori tersegmen (`RAM: 62% / 99%`), penghitung giliran (`UPTIME: 12T`), tombol `Mute`, dan tombol `Restart`.

  2. **Antrean Proses Masuk (`40px`):** Menampilkan 2–3 ikon proses berikutnya yang akan masuk ke papan saat giliran berakhir (*Next Queue*).

  3. **Papan Grid $8 \times 8$ (`Aspect Ratio 1:1`):** Area permainan utama di tengah layar. Mendukung kontrol *Swipe* pada sel untuk menukar posisi (*Swap*) dan *Tap* untuk memilih/memicu *Compress*.

  4. **Control Dock Bawah (`72px`):** Menampilkan indikator **`3 CPU Cycles`**, tombol aksi **`[FORCE STOP (2)]`**, tombol **`[UNDO]`**, dan tombol utama **`[END TURN >>]`**.

## 7. Metrik Keberhasilan (KPIs)

| Kategori | Metrik | Target Keberhasilan | 
| ----- | ----- | ----- | 
| **Performa Teknis** | Ukuran Total Bundle | `< 180 KB` | 
| **Performa Teknis** | Konsumsi RAM Puncak | `< 25 MB` | 
| **Kecepatan** | Time-to-Interactive (TTI) | `< 0.8 detik` | 
| **Stabilitas** | Kehilangan Progres Akibat Tab-Reload | `0%` (Tersimpan sinkron setiap langkah) | 
| **Engagement** | Rasio Pemain Mencapai Uptime 10 Giliran | `> 65%` | 
| **Retensi** | Rata-rata Durasi Sesi | `4 - 8 menit` per sesi | 