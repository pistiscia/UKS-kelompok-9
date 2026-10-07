const prisma = require('../config/prisma');

// 1. Dashboard Petugas UKS
exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Kunjungan hari ini
    const todayVisits = await prisma.medicalRecord.count({
      where: {
        tglKunjungan: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Siswa saat ini sedang dirawat di UKS (status = DIRAWAT)
    const activeTreatments = await prisma.medicalRecord.findMany({
      where: {
        status: 'DIRAWAT',
      },
      include: {
        student: {
          include: { healthProfile: true },
        },
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
      orderBy: { tglKunjungan: 'desc' },
    });

    // Surat izin/rujukan diterbitkan hari ini
    const suratCount = await prisma.medicalRecord.count({
      where: {
        tglKunjungan: {
          gte: startOfDay,
          lte: endOfDay,
        },
        noSurat: { not: null },
      },
    });

    // Riwayat kunjungan terbaru
    const recentRecords = await prisma.medicalRecord.findMany({
      take: 10,
      orderBy: { tglKunjungan: 'desc' },
      include: {
        student: {
          include: { healthProfile: true },
        },
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    res.render('petugas/dashboard', {
      title: 'Dashboard Petugas UKS - Layanan Kesehatan',
      todayVisits,
      activeTreatmentCount: activeTreatments.length,
      suratCount,
      activeTreatments,
      recentRecords,
    });
  } catch (error) {
    console.error('Error dashboard petugas:', error);
    req.session.flash = { error: 'Gagal memuat dashboard petugas.' };
    res.redirect('/');
  }
};

// 2. Tampilkan Form Registrasi Kunjungan Siswa
exports.getCreateVisit = async (req, res) => {
  try {
    // Ambil semua siswa beserta data profil alergi
    const students = await prisma.user.findMany({
      where: { role: 'SISWA' },
      include: { healthProfile: true },
      orderBy: { nama: 'asc' },
    });

    // Ambil obat-obatan yang stoknya tersedia > 0
    const availableMedicines = await prisma.medicine.findMany({
      where: { stok: { gt: 0 } },
      orderBy: { namaObat: 'asc' },
    });

    // Format jam saat ini untuk default value jamMasuk (HH:MM)
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentClock = `${hours}:${minutes}`;

    res.render('petugas/create-visit', {
      title: 'Registrasi Kunjungan UKS Baru',
      students,
      availableMedicines,
      currentClock,
    });
  } catch (error) {
    console.error('Error get create visit:', error);
    req.session.flash = { error: 'Gagal memuat form kunjungan.' };
    res.redirect('/petugas/dashboard');
  }
};

// 3. Simpan Kunjungan Siswa, Pemeriksaan & Pemberian Obat (Stok Otomatis Terpotong)
exports.postCreateVisit = async (req, res) => {
  try {
    const {
      studentId,
      jamMasuk,
      jamKeluar,
      suhuTubuh,
      tensi,
      keluhan,
      tindakan,
      status,
      faskesRujukan,
      keteranganSurat,
      buatSurat,
      // Array data obat jika diberikan
      medicineIds,
      jumlahs,
      dosiss,
    } = req.body;

    if (!studentId || !jamMasuk || !suhuTubuh || !keluhan || !tindakan || !status) {
      req.session.flash = { error: 'Harap lengkapi semua field pemeriksaan wajib!' };
      return res.redirect('/petugas/kunjungan/baru');
    }

    const sId = parseInt(studentId, 10);
    const pId = req.session.user.id;
    const tempFloat = parseFloat(suhuTubuh);

    // Generate No Surat jika status PULANG / DIRUJUK atau checkbox buatSurat dicentang
    let nomorSuratGenerated = null;
    if (status === 'PULANG' || status === 'DIRUJUK' || buatSurat === 'on') {
      const year = new Date().getFullYear();
      const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()];
      const countTotalSurat = await prisma.medicalRecord.count({
        where: { noSurat: { not: null } },
      });
      const seq = String(countTotalSurat + 1).padStart(3, '0');
      nomorSuratGenerated = `UKS/E-MED/${year}/${monthRoman}/${seq}`;
    }

    // Normalisasi array obat jika ada
    let prescribedItems = [];
    if (medicineIds) {
      const mIds = Array.isArray(medicineIds) ? medicineIds : [medicineIds];
      const jm = Array.isArray(jumlahs) ? jumlahs : [jumlahs];
      const ds = Array.isArray(dosiss) ? dosiss : [dosiss];

      for (let i = 0; i < mIds.length; i++) {
        const medId = parseInt(mIds[i], 10);
        const qty = parseInt(jm[i], 10);
        const dose = ds[i] ? ds[i].trim() : 'Sesuai indikasi';

        if (!isNaN(medId) && medId > 0 && !isNaN(qty) && qty > 0) {
          prescribedItems.push({ medicineId: medId, jumlah: qty, dosis: dose });
        }
      }
    }

    // Eksekusi transaksi database secara atomik:
    // 1. Validasi stok semua obat mencukupi
    // 2. Buat MedicalRecord
    // 3. Potong stok setiap obat & buat MedicinePrescription
    const recordResult = await prisma.$transaction(async (tx) => {
      // Validasi ketersediaan stok
      for (const item of prescribedItems) {
        const med = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        if (!med) {
          throw new Error(`Obat dengan ID #${item.medicineId} tidak ditemukan.`);
        }
        if (med.stok < item.jumlah) {
          throw new Error(
            `Stok obat "${med.namaObat}" tidak mencukupi! Tersedia: ${med.stok} ${med.satuan}, diminta: ${item.jumlah} ${med.satuan}.`
          );
        }
      }

      // Buat data rekam medis kunjungan
      const newRecord = await tx.medicalRecord.create({
        data: {
          studentId: sId,
          petugasId: pId,
          tglKunjungan: new Date(),
          jamMasuk: jamMasuk.trim(),
          jamKeluar: jamKeluar ? jamKeluar.trim() : (status !== 'DIRAWAT' ? jamMasuk.trim() : null),
          keluhan: keluhan.trim(),
          suhuTubuh: tempFloat,
          tensi: tensi ? tensi.trim() : '-',
          tindakan: tindakan.trim(),
          status,
          noSurat: nomorSuratGenerated,
          faskesRujukan: faskesRujukan ? faskesRujukan.trim() : null,
          keteranganSurat: keteranganSurat ? keteranganSurat.trim() : null,
        },
      });

      // Potong stok dan catat resep
      for (const item of prescribedItems) {
        // Buat resep
        await tx.medicinePrescription.create({
          data: {
            medicalRecordId: newRecord.id,
            medicineId: item.medicineId,
            jumlah: item.jumlah,
            dosis: item.dosis,
          },
        });

        // Potong stok obat secara otomatis
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: {
            stok: {
              decrement: item.jumlah,
            },
          },
        });
      }

      return newRecord;
    });

    const studentUser = await prisma.user.findUnique({ where: { id: sId } });
    req.session.flash = {
      success: `Kunjungan siswa ${studentUser ? studentUser.nama : ''} berhasil dicatat! Stok obat berhasil terpotong otomatis.`,
    };

    // Jika surat diterbitkan, arahkan ke pratinjau surat izin
    if (recordResult.noSurat) {
      return res.redirect(`/petugas/kunjungan/${recordResult.id}/surat`);
    }

    res.redirect('/petugas/dashboard');
  } catch (error) {
    console.error('Error saat mencatat kunjungan:', error);
    req.session.flash = { error: error.message || 'Gagal menyimpan data kunjungan siswa.' };
    res.redirect('/petugas/kunjungan/baru');
  }
};

// 4. Detail Kunjungan & Update Status (misal: Selesai Dirawat -> Kembali ke Kelas / Pulang)
exports.getVisitDetail = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        student: {
          include: { healthProfile: true },
        },
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    if (!record) {
      req.session.flash = { error: 'Data kunjungan rekam medis tidak ditemukan.' };
      return res.redirect('/petugas/dashboard');
    }

    res.render('petugas/detail-visit', {
      title: `Detail Rekam Medis #${record.id} - ${record.student.nama}`,
      record,
    });
  } catch (error) {
    console.error('Error detail kunjungan:', error);
    req.session.flash = { error: 'Gagal memuat detail kunjungan.' };
    res.redirect('/petugas/dashboard');
  }
};

// Update Status Kunjungan (e.g. Siswa selesai istirahat)
exports.updateVisitStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, jamKeluar, tindakanLanjutan, terbitkanSurat, keteranganSurat, faskesRujukan } = req.body;

    const existingRecord = await prisma.medicalRecord.findUnique({ where: { id } });
    if (!existingRecord) {
      req.session.flash = { error: 'Data rekam medis tidak ditemukan.' };
      return res.redirect('/petugas/dashboard');
    }

    let noSurat = existingRecord.noSurat;
    if ((status === 'PULANG' || status === 'DIRUJUK' || terbitkanSurat === 'on') && !noSurat) {
      const year = new Date().getFullYear();
      const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()];
      const countTotalSurat = await prisma.medicalRecord.count({
        where: { noSurat: { not: null } },
      });
      const seq = String(countTotalSurat + 1).padStart(3, '0');
      noSurat = `UKS/E-MED/${year}/${monthRoman}/${seq}`;
    }

    let updatedTindakan = existingRecord.tindakan;
    if (tindakanLanjutan && tindakanLanjutan.trim()) {
      updatedTindakan += ` | Catatan tambahan: ${tindakanLanjutan.trim()}`;
    }

    await prisma.medicalRecord.update({
      where: { id },
      data: {
        status,
        jamKeluar: jamKeluar || existingRecord.jamKeluar || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        tindakan: updatedTindakan,
        noSurat,
        keteranganSurat: keteranganSurat || existingRecord.keteranganSurat,
        faskesRujukan: faskesRujukan || existingRecord.faskesRujukan,
      },
    });

    req.session.flash = { success: 'Status kunjungan siswa berhasil diperbarui!' };

    if (noSurat && (status === 'PULANG' || status === 'DIRUJUK')) {
      return res.redirect(`/petugas/kunjungan/${id}/surat`);
    }

    res.redirect(`/petugas/kunjungan/${id}`);
  } catch (error) {
    console.error('Error update status kunjungan:', error);
    req.session.flash = { error: 'Gagal memperbarui status kunjungan.' };
    res.redirect('/petugas/dashboard');
  }
};

// 5. Cetak / Tampilkan Surat Izin Istirahat / Rujukan Pulang / Puskesmas Resmi
exports.getSuratIzin = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        student: {
          include: { healthProfile: true },
        },
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    if (!record) {
      req.session.flash = { error: 'Surat izin tidak ditemukan.' };
      return res.redirect('/petugas/dashboard');
    }

    // Ambil data Pembina UKS untuk tanda tangan
    const pembina = await prisma.user.findFirst({
      where: { role: 'ADMIN_UKS' },
    });

    res.render('petugas/surat-izin', {
      title: `Surat Resmi UKS - ${record.noSurat || 'Surat Keterangan Sakit'}`,
      record,
      pembina: pembina || { nama: 'Dra. Hj. Ratna Juwita, M.Pd' },
    });
  } catch (error) {
    console.error('Error get surat izin:', error);
    req.session.flash = { error: 'Gagal memuat surat izin.' };
    res.redirect('/petugas/dashboard');
  }
};

// 6. Cetak Laporan Rekapitulasi Kunjungan UKS Bulanan
exports.getLaporanBulanan = async (req, res) => {
  try {
    const now = new Date();
    const selectedBulan = parseInt(req.query.bulan, 10) || (now.getMonth() + 1);
    const selectedTahun = parseInt(req.query.tahun, 10) || now.getFullYear();

    const startDate = new Date(selectedTahun, selectedBulan - 1, 1);
    const endDate = new Date(selectedTahun, selectedBulan, 0, 23, 59, 59);

    const records = await prisma.medicalRecord.findMany({
      where: {
        tglKunjungan: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: true,
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
      orderBy: { tglKunjungan: 'asc' },
    });

    // Statistik Rekapitulasi
    const stats = {
      total: records.length,
      kembaliKelas: records.filter(r => r.status === 'KEMBALI_KELAS').length,
      dirawat: records.filter(r => r.status === 'DIRAWAT').length,
      pulang: records.filter(r => r.status === 'PULANG').length,
      dirujuk: records.filter(r => r.status === 'DIRUJUK').length,
      demam: records.filter(r => (r.keluhan || '').toLowerCase().includes('demam')).length,
      pusing: records.filter(r => (r.keluhan || '').toLowerCase().includes('pusing')).length,
      maag: records.filter(r => (r.keluhan || '').toLowerCase().includes('maag') || (r.keluhan || '').toLowerCase().includes('mual')).length,
      luka: records.filter(r => (r.keluhan || '').toLowerCase().includes('luka') || (r.keluhan || '').toLowerCase().includes('cedera')).length,
    };

    // Ambil pembina untuk tanda tangan laporan
    const pembina = await prisma.user.findFirst({
      where: { role: 'ADMIN_UKS' },
    });

    const namaBulanList = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    res.render('petugas/laporan-bulanan', {
      title: `Laporan Rekapitulasi Kunjungan UKS - ${namaBulanList[selectedBulan - 1]} ${selectedTahun}`,
      records,
      stats,
      selectedBulan,
      selectedTahun,
      namaBulan: namaBulanList[selectedBulan - 1],
      pembina: pembina || { nama: 'Dra. Hj. Ratna Juwita, M.Pd' },
    });
  } catch (error) {
    console.error('Error laporan bulanan:', error);
    req.session.flash = { error: 'Gagal memuat rekapitulasi laporan bulanan.' };
    res.redirect('/petugas/dashboard');
  }
};
