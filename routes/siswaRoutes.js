const express = require('express');
const router = express.Router();
const siswaController = require('../controllers/siswaController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');

// Proteksi rute siswa dengan RBAC 'SISWA'
router.use(requireAuth);
router.use(requireRole(['SISWA']));

// Dashboard Siswa & Status Izin UKS Digital
router.get('/dashboard', siswaController.getDashboard);

// Melihat Riwayat Rekam Medis Kunjungan UKS Pribadi
router.get('/riwayat', siswaController.getMedicalRecords);

// Mengisi Informasi Riwayat Alergi & Penyakit Bawaan
router.get('/profil-kesehatan', siswaController.getHealthProfile);
router.post('/profil-kesehatan', siswaController.updateHealthProfile);

// Ketersediaan Obat-Obatan & Layanan P3K UKS
router.get('/katalog-obat', siswaController.getMedicinesCatalog);

// Pratinjau Surat Izin Istirahat / Rujukan Digital Siswa
router.get('/surat/:id', siswaController.getSuratIzinSiswa);

module.exports = router;
