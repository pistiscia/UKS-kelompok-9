# DOKUMENTASI 5 SKENARIO PENGUJIAN SISTEM WAJIB (TEST_CASES.md)
## Sistem Informasi UKS & Rekam Medis Siswa (E-UKS)

Dokumen ini memuat panduan lengkap serta hasil verifikasi pengujian 5 (lima) skenario wajib standar UKK / Industri untuk sistem **E-UKS** dengan Role-Based Access Control (RBAC 3 Level: Admin UKS, Petugas UKS, Siswa).

---

### Akun Demo Uji Coba:
- **Admin UKS (Pembina UKS):** Username `adminuks` | Password `password123`
- **Petugas UKS (Tenaga Medis / PMR):** Username `petugasuks` | Password `password123`
- **Siswa (Pasien):** Username `siswa` | Password `password123`
*(Tersedia tombol **Quick Demo Switch** 1-klik di halaman login)*

---

## Matriks Hasil Pengujian 5 Skenario

| No | Skenario Pengujian | Aktor | Fitur yang Diuji | Status Verifikasi |
|---|---|---|---|:---:|
| **1** | Admin UKS menambah stok obat Paracetamol 500mg sebanyak 100 tablet dengan tanggal kadaluarsa | Admin UKS | CRUD Master Obat & Restock Logistik | **PASSED (LULUS)** |
| **2** | Petugas UKS mencatat siswa yang masuk karena demam (Suhu 38.5°C), mencatat keluhan pusing di sistem | Petugas UKS | Registrasi Kunjungan Siswa & Tanda Vital | **PASSED (LULUS)** |
| **3** | Petugas memberikan 1 tablet Paracetamol, sistem otomatis mengurangi stok obat menjadi 99 tablet | Petugas UKS | Transaksi Pemotongan Stok Obat Atomik | **PASSED (LULUS)** |
| **4** | Petugas menerbitkan surat izin pulang digital karena kondisi siswa tidak memungkinkan belajar | Petugas UKS | Penerbitan & Cetak Surat Izin Pulang Resmi | **PASSED (LULUS)** |
| **5** | Siswa login dan melihat riwayat pemeriksaan tersimpan rapi pada rekam medis pribadinya | Siswa | Portal Rekam Medis & Status Izin Digital | **PASSED (LULUS)** |

---

## Rincian Langkah Pengujian Per Skenario

### SKENARIO 1: Admin UKS Menambah Stok Obat Paracetamol 500mg
- **Tujuan:** Memverifikasi fungsionalitas manajemen master obat, tanggal kadaluarsa, dan kemampuan restock persediaan P3K oleh Admin UKS.
- **Langkah-langkah:**
  1. Buka halaman login di `http://localhost:3000/auth/login`.
  2. Klik tombol demo **"1. Admin UKS (Pembina)"** atau login dengan username `adminuks` dan password `password123`.
  3. Buka menu **"Master Obat & P3K"** (`/admin/medicines`).
  4. Temukan baris obat **"Paracetamol 500mg"** atau klik tombol **"Tambah Obat Baru"** jika ingin membuat batch baru.
  5. Klik ikon **Restock** (ikon kotak boks warna toska) pada baris Paracetamol 500mg.
  6. Masukkan jumlah penambahan stok: `100` tablet, perbarui tanggal kadaluarsa jika batch baru (contoh: `2027-12-31`), lalu klik **"Konfirmasi Restock"**.
- **Hasil yang Diharapkan:**
  - Muncul notifikasi hijau sukses: *"Berhasil menambah 100 tablet stok untuk Paracetamol 500mg"*.
  - Stok Paracetamol 500mg di tabel master tertera bertambah dan tanggal kadaluarsa tercatat rapi.

---

### SKENARIO 2: Petugas UKS Mencatat Siswa Demam (Suhu 38.5°C) & Keluhan Pusing
- **Tujuan:** Memverifikasi pencatatan kunjungan siswa sakit, deteksi dini demam, dan pemeriksaan riwayat alergi otomatis oleh Petugas UKS.
- **Langkah-langkah:**
  1. Di sidebar bawah atau halaman login, klik tombol demo **"2. Petugas UKS / PMR"** (`petugasuks`).
  2. Buka menu **"Registrasi Kunjungan"** (`/petugas/kunjungan/baru`).
  3. Pada dropdown **"Pilih Siswa Terdaftar"**, pilih siswa **"Ahmad Rizky Pratama"**.
  4. Perhatikan sistem langsung memunculkan **Banner Riwayat Alergi**: mendeteksi alergi obat Penisilin & Asma ringan untuk keamanan medis.
  5. Masukkan **Suhu Tubuh**: `38.5` °C. Sistem secara otomatis menampilkan indikator merah **"⚠️ DEMAM TINGGI"**.
  6. Masukkan **Tensi Darah**: `120/80` mmHg.
  7. Masukkan **Keluhan**: *"Demam tinggi, meriang, dan pusing sakit kepala sejak pagi"*.
  8. Masukkan **Tindakan Pertolongan Pertama**: *"Istirahat di ruang ber-AC tempat tidur UKS, kompres air hangat di dahi, observasi tanda vital"*.
- **Hasil yang Diharapkan:**
  - Data identitas siswa, suhu 38.5°C, dan keluhan pusing berhasil divalidasi dan terinput pada sistem.

---

### SKENARIO 3: Petugas Memberikan 1 Tablet Paracetamol & Stok Berkurang Otomatis (99 Tablet)
- **Tujuan:** Memverifikasi integritas transaksi database (Prisma Transaction) yang memotong stok obat secara atomik saat resep dicatat.
- **Langkah-langkah:**
  1. Pada form registrasi kunjungan (bagian **"Pemberian Obat-Obatan & Alat P3K"**):
     - Pilih obat: **"Paracetamol 500mg"** (tertera stok awal: misal 100 tablet).
     - Input Jumlah: `1` tablet.
     - Input Aturan Pakai / Dosis: *"1 tablet diminum sesudah makan"*.
  2. Pilih status penanganan: **"IZIN PULANG"** atau **"DIRAWAT"**.
  3. Klik tombol **"Simpan Kunjungan & Potong Stok Obat"**.
- **Hasil yang Diharapkan:**
  - Transaksi database berhasil dieksekusi.
  - Data rekam medis dan resep obat tersimpan.
  - Stok Paracetamol 500mg di tabel `Medicine` otomatis berkurang dari 100 menjadi **99 tablet**.

---

### SKENARIO 4: Petugas Menerbitkan Surat Izin Pulang Digital
- **Tujuan:** Memverifikasi penerbitan surat izin sakit / rujukan faskes resmi dengan nomor surat otomatis, kop surat formal, dan dukungan cetak (Media Print CSS).
- **Langkah-langkah:**
  1. Saat mengisi kunjungan (atau melalui tombol **"Selesaikan / Rujuk"** di dashboard petugas):
     - Pilih status: **"IZIN PULANG"** (atau "DIRUJUK").
     - Pastikan centang **"Terbitkan Surat Izin Istirahat / Rujukan Pulang Resmi Digital"** aktif.
     - Masukkan alasan: *"Kondisi siswa demam tinggi 38.5°C dan lemas sehingga tidak memungkinkan mengikuti kegiatan belajar mengajar di kelas."*
  2. Setelah disimpan, sistem otomatis mengarahkan ke halaman cetak surat: `/petugas/kunjungan/[ID]/surat`.
  3. Dokumen menampilkan:
     - Kop surat resmi Usaha Kesehatan Sekolah (E-UKS).
     - Nomor surat format resmi: contoh `UKS/E-MED/2026/X/002`.
     - Identitas lengkap siswa (Nama, NISN, Kelas, Golongan Darah).
     - Tanda vital (Suhu 38.5°C, Tensi 120/80) dan obat yang diberikan (Paracetamol 1 tablet).
     - Lembar tanda tangan: Wali Murid, Petugas Medis, dan Pembina UKS.
  4. Klik tombol **"Cetak Surat Resmi (PDF/Print)"** atau tekan `Ctrl + P`.
- **Hasil yang Diharapkan:**
  - Layout media print CSS bekerja sempurna tanpa menampilkan navbar/sidebar, siap ditandatangani dan dicetak langsung.

---

### SKENARIO 5: Siswa Login & Memantau Rekam Medis Pribadi
- **Tujuan:** Memverifikasi hak akses Siswa untuk melihat rekam medis personal dan memantau status izin istirahat UKS digital.
- **Langkah-langkah:**
  1. Klik tombol demo **"3. Siswa (Pasien)"** di sidebar atau login dengan user `siswa` / `password123`.
  2. Pada **Dashboard Siswa** (`/siswa/dashboard`):
     - Kartu status langsung menampilkan **"Mendapatkan Izin Istirahat / Pulang ke Rumah"** dengan badge merah formal **"IZIN PULANG RESMI"**.
     - Terdapat tombol **"Buka Surat Digital"** untuk melihat berkas izin yang diterbitkan petugas.
  3. Buka menu **"Riwayat Rekam Medis"** (`/siswa/riwayat`):
     - Tercatat kunjungan hari ini dengan suhu `38.5°C`, keluhan demam dan pusing, serta obat `Paracetamol 500mg (1)`.
  4. Buka menu **"Riwayat Alergi & Penyakit"** (`/siswa/profil-kesehatan`):
     - Siswa dapat memperbarui data alergi obat / makanan secara mandiri kapan saja.
- **Hasil yang Diharapkan:**
  - Siswa hanya dapat melihat data rekam medis miliknya sendiri (data isolasi terlindungi) dan status izin terpantau secara transparan tanpa perlu buku robek.

---

## Kesimpulan Evaluasi
Seluruh 5 (lima) skenario pengujian fungsional dan 12 fitur wajib telah diimplementasikan secara terintegrasi dengan validasi ketat, session-based RBAC, transaksi database atomik pada SQLite via Prisma, dan antarmuka modern siap uji.
