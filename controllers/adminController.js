
const prisma = require('../config/prisma');

// 1. Dashboard Admin & Analitik Tren Keluhan
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);

    // Hitung total obat
    const totalMedicines = await prisma.medicine.count();

    // Ambil semua obat untuk filtering ambang batas & kadaluarsa
    const allMedicines = await prisma.medicine.findMany();

    const lowStockMedicines = allMedicines.filter(m => m.stok <= m.minStok);
    const expiringMedicines = allMedicines.filter(m => new Date(m.tglKadaluarsa) <= sixtyDaysLater);
    const expiredMedicines = allMedicines.filter(m => new Date(m.tglKadaluarsa) < now);

    // Total kunjungan
    const totalVisits = await prisma.medicalRecord.count();

    // Kunjungan bulan ini
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyVisits = await prisma.medicalRecord.count({
      where: {
        tglKunjungan: {
          gte: startOfMonth,
        },
      },
    });

    // Kunjungan terbaru (5 terakhir)
    const recentVisits = await prisma.medicalRecord.findMany({
      take: 5,
      orderBy: { tglKunjungan: 'desc' },
      include: {
        student: true,
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    // Analitik Tren Keluhan: Ambil rekam medis untuk agregasi grafik
    const allRecords = await prisma.medicalRecord.findMany({
      select: {
        keluhan: true,
        status: true,
        tglKunjungan: true,
      },
      orderBy: { tglKunjungan: 'asc' },
    });

    // Agregasi Tren Keluhan Kategori (Demam, Pusing, Maag/Lambung, Luka/Cedera, Asma/Sesak, Lainnya)
    const complaintCounts = {
      'Demam / Meriang': 0,
      'Pusing / Sakit Kepala': 0,
      'Maag / Nyeri Perut': 0,
      'Luka / Cedera Fisik': 0,
      'Asma / Sesak Nafas': 0,
      'Flu / Batuk': 0,
      'Keluhan Lainnya': 0,
    };

    allRecords.forEach(rec => {
      const k = (rec.keluhan || '').toLowerCase();
      if (k.includes('demam') || k.includes('panas') || k.includes('meriang')) {
        complaintCounts['Demam / Meriang']++;
      } else if (k.includes('pusing') || k.includes('kepala') || k.includes('migrain')) {
        complaintCounts['Pusing / Sakit Kepala']++;
      } else if (k.includes('maag') || k.includes('lambung') || k.includes('perut') || k.includes('mual')) {
        complaintCounts['Maag / Nyeri Perut']++;
      } else if (k.includes('luka') || k.includes('cedera') || k.includes('jatuh') || k.includes('darah')) {
        complaintCounts['Luka / Cedera Fisik']++;
      } else if (k.includes('asma') || k.includes('sesak')) {
        complaintCounts['Asma / Sesak Nafas']++;
      } else if (k.includes('flu') || k.includes('batuk') || k.includes('pilek')) {
        complaintCounts['Flu / Batuk']++;
      } else {
        complaintCounts['Keluhan Lainnya']++;
      }
    });

    // Agregasi Status Penanganan
    const statusCounts = {
      DIRAWAT: 0,
      KEMBALI_KELAS: 0,
      PULANG: 0,
      DIRUJUK: 0,
    };
    allRecords.forEach(rec => {
      if (statusCounts[rec.status] !== undefined) {
        statusCounts[rec.status]++;
      }
    });

    // Agregasi 7 Hari Terakhir
    const last7DaysLabels = [];
    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      last7DaysLabels.push(dayName);

      const count = allRecords.filter(r => {
        const rDate = new Date(r.tglKunjungan).toISOString().split('T')[0];
        return rDate === dateStr;
      }).length;
      last7DaysData.push(count);
    }

    res.render('admin/dashboard', {
      title: 'Dashboard Admin UKS - Analitik & Monitoring',
      totalMedicines,
      lowStockCount: lowStockMedicines.length,
      expiringCount: expiringMedicines.length,
      expiredCount: expiredMedicines.length,
      totalVisits,
      monthlyVisits,
      recentVisits,
      criticalMedicines: [...new Set([...lowStockMedicines, ...expiringMedicines])].slice(0, 5),
      chartData: {
        complaintLabels: Object.keys(complaintCounts),
        complaintValues: Object.values(complaintCounts),
        statusLabels: ['Kembali ke Kelas', 'Sedang Dirawat', 'Izin Pulang', 'Dirujuk Puskesmas/RS'],
        statusValues: [
          statusCounts.KEMBALI_KELAS,
          statusCounts.DIRAWAT,
          statusCounts.PULANG,
          statusCounts.DIRUJUK,
        ],
        trendLabels: last7DaysLabels,
        trendValues: last7DaysData,
      },
    });
  } catch (error) {
    console.error('Error saat memuat dashboard admin:', error);
    req.session.flash = { error: 'Gagal memuat data dashboard analitik.' };
    res.redirect('/');
  }
};

// 2. Master Data Obat & Alat P3K (CRUD)
exports.getMedicines = async (req, res) => {
  try {
    const { search, kategori, statusFilter } = req.query;

    const where = {};
    if (kategori && kategori !== 'SEMUA') {
      where.kategori = kategori;
    }
    if (search) {
      where.OR = [
        { namaObat: { contains: search } },
        { aturanPakai: { contains: search } },
        { lokasiRak: { contains: search } },
      ];
    }

    let medicines = await prisma.medicine.findMany({
      where,
      orderBy: { namaObat: 'asc' },
    });

    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    // Filter tambahan jika ada statusFilter
    if (statusFilter === 'LOW_STOCK') {
      medicines = medicines.filter(m => m.stok <= m.minStok);
    } else if (statusFilter === 'EXPIRED') {
      medicines = medicines.filter(m => new Date(m.tglKadaluarsa) < now);
    } else if (statusFilter === 'EXPIRING_SOON') {
      medicines = medicines.filter(m => new Date(m.tglKadaluarsa) >= now && new Date(m.tglKadaluarsa) <= thirtyDaysLater);
    }

    res.render('admin/medicines', {
      title: 'Master Inventaris Obat & P3K - E-UKS',
      medicines,
      search: search || '',
      kategori: kategori || 'SEMUA',
      statusFilter: statusFilter || 'SEMUA',
      now,
      thirtyDaysLater,
    });
  } catch (error) {
    console.error('Error memuat data obat:', error);
    req.session.flash = { error: 'Gagal memuat inventaris obat.' };
    res.redirect('/admin/dashboard');
  }
};

// Tambah Obat Baru
exports.createMedicine = async (req, res) => {
  try {
    const { namaObat, kategori, stok, satuan, tglKadaluarsa, aturanPakai, minStok, lokasiRak } = req.body;

    if (!namaObat || !kategori || !satuan || !tglKadaluarsa) {
      req.session.flash = { error: 'Nama obat, kategori, satuan, dan tanggal kadaluarsa wajib diisi!' };
      return res.redirect('/admin/medicines');
    }

    await prisma.medicine.create({
      data: {
        namaObat: namaObat.trim(),
        kategori,
        stok: parseInt(stok, 10) || 0,
        satuan: satuan.trim(),
        tglKadaluarsa: new Date(tglKadaluarsa),
        aturanPakai: aturanPakai ? aturanPakai.trim() : 'Sesuai indikasi',
        minStok: parseInt(minStok, 10) || 10,
        lokasiRak: lokasiRak ? lokasiRak.trim() : 'Rak UKS',
      },
    });

    req.session.flash = { success: `Obat "${namaObat}" berhasil ditambahkan ke inventaris UKS!` };
    res.redirect('/admin/medicines');
  } catch (error) {
    console.error('Error create medicine:', error);
    req.session.flash = { error: 'Gagal menambahkan obat baru.' };
    res.redirect('/admin/medicines');
  }
};

// Update Obat
exports.updateMedicine = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { namaObat, kategori, stok, satuan, tglKadaluarsa, aturanPakai, minStok, lokasiRak } = req.body;

    await prisma.medicine.update({
      where: { id },
      data: {
        namaObat: namaObat.trim(),
        kategori,
        stok: parseInt(stok, 10),
        satuan: satuan.trim(),
        tglKadaluarsa: new Date(tglKadaluarsa),
        aturanPakai: aturanPakai ? aturanPakai.trim() : '',
        minStok: parseInt(minStok, 10) || 10,
        lokasiRak: lokasiRak ? lokasiRak.trim() : '',
      },
    });

    req.session.flash = { success: `Data obat "${namaObat}" berhasil diperbarui!` };
    res.redirect('/admin/medicines');
  } catch (error) {
    console.error('Error update medicine:', error);
    req.session.flash = { error: 'Gagal memperbarui data obat.' };
    res.redirect('/admin/medicines');
  }
};

// Tambah Stok Cepat (Restock)
exports.restockMedicine = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { tambahStok, tglKadaluarsaBaru } = req.body;

    const tambahan = parseInt(tambahStok, 10);
    if (isNaN(tambahan) || tambahan <= 0) {
      req.session.flash = { error: 'Jumlah penambahan stok harus lebih besar dari 0!' };
      return res.redirect('/admin/medicines');
    }

    const currentMedicine = await prisma.medicine.findUnique({ where: { id } });
    if (!currentMedicine) {
      req.session.flash = { error: 'Data obat tidak ditemukan.' };
      return res.redirect('/admin/medicines');
    }

    const updateData = {
      stok: currentMedicine.stok + tambahan,
    };

    if (tglKadaluarsaBaru) {
      updateData.tglKadaluarsa = new Date(tglKadaluarsaBaru);
    }

    await prisma.medicine.update({
      where: { id },
      data: updateData,
    });

    req.session.flash = {
      success: `Berhasil menambah ${tambahan} ${currentMedicine.satuan} stok untuk ${currentMedicine.namaObat}! Total stok sekarang: ${currentMedicine.stok + tambahan} ${currentMedicine.satuan}.`,
    };
    res.redirect('/admin/medicines');
  } catch (error) {
    console.error('Error restock medicine:', error);
    req.session.flash = { error: 'Gagal menambah stok obat.' };
    res.redirect('/admin/medicines');
  }
};

// Hapus Obat
exports.deleteMedicine = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Cek apakah obat sudah pernah diresepkan
    const prescriptionCount = await prisma.medicinePrescription.count({
      where: { medicineId: id },
    });

    if (prescriptionCount > 0) {
      req.session.flash = {
        error: 'Obat ini tidak dapat dihapus karena telah tercatat dalam riwayat rekam medis siswa. Anda dapat mengosongkan stoknya sebagai gantinya.',
      };
      return res.redirect('/admin/medicines');
    }

    const med = await prisma.medicine.delete({
      where: { id },
    });

    req.session.flash = { success: `Obat "${med.namaObat}" berhasil dihapus dari inventaris.` };
    res.redirect('/admin/medicines');
  } catch (error) {
    console.error('Error delete medicine:', error);
    req.session.flash = { error: 'Gagal menghapus obat.' };
    res.redirect('/admin/medicines');
  }
};

// 3. Halaman Khusus Monitoring Kadaluarsa & Ambang Batas Stok
exports.getMonitoring = async (req, res) => {
  try {
    const now = new Date();
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);

    const allMedicines = await prisma.medicine.findMany({
      orderBy: { tglKadaluarsa: 'asc' },
    });

    const expiredList = allMedicines.filter(m => new Date(m.tglKadaluarsa) < now);
    const nearExpiryList = allMedicines.filter(m => new Date(m.tglKadaluarsa) >= now && new Date(m.tglKadaluarsa) <= sixtyDaysLater);
    const lowStockList = allMedicines.filter(m => m.stok <= m.minStok);
    const outOfStockList = allMedicines.filter(m => m.stok === 0);

    res.render('admin/monitoring', {
      title: 'Monitoring Kadaluarsa & Ambang Batas Stok P3K',
      expiredList,
      nearExpiryList,
      lowStockList,
      outOfStockList,
      allMedicines,
      now,
    });
  } catch (error) {
    console.error('Error monitoring obat:', error);
    req.session.flash = { error: 'Gagal memuat monitoring obat.' };
    res.redirect('/admin/dashboard');
  }
};

// 4. Data Siswa & Profil Rekam Medis (Overview untuk Admin)
exports.getStudents = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'SISWA' },
      include: {
        healthProfile: true,
        studentRecords: {
          orderBy: { tglKunjungan: 'desc' },
          take: 1,
        },
      },
      orderBy: { nama: 'asc' },
    });

    res.render('admin/students', {
      title: 'Data Siswa & Profil Kesehatan - E-UKS',
      students,
    });
  } catch (error) {
    console.error('Error memuat data siswa:', error);
    req.session.flash = { error: 'Gagal memuat data siswa.' };
    res.redirect('/admin/dashboard');
  }
};
