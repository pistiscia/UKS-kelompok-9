# 🏥 E-UKS: Sistem Informasi UKS & Rekam Medis Siswa

Aplikasi web modern untuk manajemen ruang **Usaha Kesehatan Sekolah (UKS)** berbasis **Node.js, Express.js (MVC), SQLite dengan Prisma ORM, dan EJS + Tailwind CSS**. Dirancang khusus untuk menyelesaikan masalah pencatatan manual di sekolah, memonitor stok obat P3K, mencatat tanda vital dan keluhan sakit siswa, serta menerbitkan surat izin pulang / rujukan puskesmas digital.

---

## 👥 3 Level Pengguna & Hak Akses (RBAC)

1. **Admin UKS (Pembina UKS / Manajemen Sekolah)**:
   - Dashboard Analitik Tren Keluhan Kesehatan Sekolah (Visualisasi grafik Chart.js).
   - CRUD Master Data Obat-Obatan & Perlengkapan Alat P3K.
   - Monitoring Kadaluarsa & Ambang Batas Minimal Stok Obat.
   - Restock Cepat Stok Obat dengan pembaruan tanggal kadaluarsa.
   - Manajemen Data Siswa & Profil Rekam Medis Alergi.

2. **Petugas UKS (Tenaga Medis / Tim PMR)**:
   - Dashboard Pelayanan Medis & Pemantauan Ranjang (Bed) Aktif di UKS.
   - Registrasi Kunjungan Siswa Masuk UKS dengan deteksi otomatis riwayat alergi obat/makanan.
   - Pencatatan Tanda Vital: Suhu Tubuh (deteksi demam otomatis), Tensi Darah, Keluhan, dan Tindakan.
   - Pemberian Obat-Obatan: Sistem memotong stok obat secara atomik dari inventaris (Prisma Transaction).
   - Penerbitan & Cetak Surat Keterangan Sakit / Izin Pulang / Rujukan Faskes Puskesmas resmi.
   - Cetak Laporan Rekapitulasi Kunjungan UKS Bulanan dengan tanda tangan Kepala Sekolah & Pembina.

3. **Siswa (Pasien)**:
   - Dashboard Status Izin Istirahat UKS Digital (Sedang Dirawat / Kembali Kelas / Izin Pulang).
   - Melihat Riwayat Rekam Medis Pemeriksaan Pribadi.
   - Mengisi & Memperbarui Informasi Riwayat Alergi Obat, Makanan, dan Penyakit Bawaan.
   - Mengecek Ketersediaan Obat-Obatan Bebas & Layanan Pertolongan Pertama di UKS.
   - Mengunduh / Mencetak Surat Izin Istirahat Digital Pribadi.

---

## 🔑 Akun Demo (Default)

| Role | Username | Password | Deskripsi |
|---|---|---|---|
| **Admin UKS** | `adminuks` | `password123` | Pembina UKS / Dra. Hj. Ratna Juwita, M.Pd |
| **Petugas UKS** | `petugasuks` | `password123` | Tenaga Medis / Ns. Hendra Kurniawan, S.Kep |
| **Siswa** | `siswa` | `password123` | Siswa / Ahmad Rizky Pratama (XII RPL 1) |

> 💡 **Fitur Quick Switch Demo:** Di halaman login (`/auth/login`) dan di sidebar navigasi, tersedia tombol 1-klik untuk beralih peran tanpa perlu mengetik ulang kredensial.

---

## 🛠️ Tech Stack & Arsitektur

- **Runtime & Web Framework:** Node.js v24+, Express.js v5
- **Arsitektur:** Model-View-Controller (MVC)
  - `controllers/`: `authController.js`, `adminController.js`, `petugasController.js`, `siswaController.js`
  - `models/`: Dikelola oleh Prisma ORM (`prisma/schema.prisma`)
  - `routes/`: `authRoutes.js`, `adminRoutes.js`, `petugasRoutes.js`, `siswaRoutes.js`, `indexRoutes.js`
  - `views/`: EJS Modular dengan Tailwind CSS, FontAwesome 6, dan Chart.js
  - `middlewares/`: `authMiddleware.js` (Session auth, role-checker dengan 403 Forbidden handler)
- **Database & ORM:** SQLite (`dev.db`) dengan Prisma ORM v5.22.0
- **Keamanan & Sesi:** `express-session`, `bcryptjs` untuk enkripsi password, CSRF-safe cookie lax

---

## 📂 Struktur Direktori Proyek

```
d:/UKS IT/
├── config/
│   └── prisma.js               # Prisma Client instance singleton
├── controllers/
│   ├── adminController.js      # Controller Admin UKS (Dashboard, Obat, Monitoring)
│   ├── authController.js       # Controller Autentikasi & Quick Demo Switch
│   ├── petugasController.js    # Controller Petugas (Kunjungan, Resep, Surat, Laporan)
│   └── siswaController.js      # Controller Siswa (Dashboard, Riwayat, Profil Alergi)
├── middlewares/
│   └── authMiddleware.js       # RBAC & Sesi Auth Middleware (403 Forbidden handler)
├── prisma/
│   ├── schema.prisma           # Skema Prisma 5 Model Relasional
│   ├── seed.js                 # Seeding data pengguna, master obat, & rekam medis
│   └── dev.db                  # Database SQLite
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── indexRoutes.js
│   ├── petugasRoutes.js
│   └── siswaRoutes.js
├── scripts/
│   ├── test-http-routes.js     # Script uji verifikasi seluruh endpoint & RBAC
│   └── verify-scenarios.js     # Script verifikasi 5 skenario wajib UKK
├── views/
│   ├── admin/                  # View Dashboard, Master Obat, Monitoring, Siswa
│   ├── auth/                   # View Halaman Login
│   ├── errors/                 # View 403 Forbidden & 404 Not Found
│   ├── partials/               # View Header, Footer, Sidebar, Navbar, Alerts
│   ├── petugas/                # View Kunjungan Baru, Detail, Surat Izin, Laporan Bulanan
│   └── siswa/                  # View Portal Siswa, Riwayat, Profil Kesehatan, Katalog
├── .env                        # Konfigurasi Database & Session
├── package.json                # Dependensi & NPM scripts
├── README.md                   # Dokumentasi Aplikasi
├── server.js                   # Entry point aplikasi Express
└── TEST_CASES.md               # Dokumentasi 5 Skenario Pengujian Wajib UKK
```

---

## 🚀 Cara Menjalankan Aplikasi

1. **Jalankan Aplikasi:**
   ```bash
   npm start
   ```
   *(Atau `npm run dev` untuk nodemon)*

2. **Buka di Browser:**
   Akses `http://localhost:3000` pada peramban web Anda.

3. **Menjalankan Seeding Ulang (Jika diperlukan):**
   ```bash
   npm run seed
   ```

4. **Menjalankan Pengujian Otomatis 5 Skenario:**
   ```bash
   npm run test:scenarios
   ```

5. **Menjalankan Pengujian Endpoint HTTP & Otorisasi RBAC:**
   ```bash
   node scripts/test-http-routes.js
   ```

---

## 📑 5 Skenario Pengujian Sistem Wajib
Detail pelaksanaan pengujian dan hasil verifikasi lengkap tercantum pada dokumen [TEST_CASES.md](file:///d:/UKS%20IT/TEST_CASES.md).
# UKS-kelompok-9
