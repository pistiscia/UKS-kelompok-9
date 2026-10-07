const express = require('express');
const router = express.Router();
const petugasController = require('../controllers/petugasController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');

// Proteksi rute petugas dengan RBAC 'PETUGAS_UKS' (dan ADMIN_UKS jika diperlukan supervisi)
router.use(requireAuth);
router.use(requireRole(['PETUGAS_UKS', 'ADMIN_UKS']));

// Dashboard Pelayanan UKS
router.get('/dashboard', petugasController.getDashboard);

// Registrasi Kunjungan Siswa Masuk Ruang UKS & Catat Pemeriksaan/Obat
router.get('/kunjungan/baru', petugasController.getCreateVisit);
router.post('/kunjungan/baru', petugasController.postCreateVisit);

// Detail & Update Status Kunjungan (misal: Selesai istirahat / Kembali ke kelas)
router.get('/kunjungan/:id', petugasController.getVisitDetail);
router.post('/kunjungan/:id/status', petugasController.updateVisitStatus);

// Terbitkan / Cetak Surat Izin Istirahat / Rujukan Pulang
router.get('/kunjungan/:id/surat', petugasController.getSuratIzin);

// Cetak Laporan Rekapitulasi Kunjungan UKS Bulanan
router.get('/laporan-bulanan', petugasController.getLaporanBulanan);

module.exports = router;
