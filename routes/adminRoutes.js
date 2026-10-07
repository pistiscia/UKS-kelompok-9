const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');

// Proteksi seluruh rute admin dengan RBAC 'ADMIN_UKS'
router.use(requireAuth);
router.use(requireRole(['ADMIN_UKS']));

// Dashboard Analitik Tren Penyakit
router.get('/dashboard', adminController.getDashboard);

// Master Data Obat & Alat P3K (CRUD)
router.get('/medicines', adminController.getMedicines);
router.post('/medicines', adminController.createMedicine);
router.post('/medicines/:id/edit', adminController.updateMedicine);
router.post('/medicines/:id/restock', adminController.restockMedicine);
router.post('/medicines/:id/delete', adminController.deleteMedicine);

// Monitoring Kadaluarsa & Ambang Batas Stok
router.get('/monitoring', adminController.getMonitoring);

// Data Siswa & Profil Rekam Medis Sekolah
router.get('/students', adminController.getStudents);

module.exports = router;
