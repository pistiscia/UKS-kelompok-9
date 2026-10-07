const prisma = require('../config/prisma');

// 1. Dashboard Siswa (Status Izin Istirahat Digital & Ringkasan Pribadi)
exports.getDashboard = async (req, res) => {
  try {
    const studentId = req.session.user.id;

    // Ambil data siswa lengkap dengan profil kesehatan
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        healthProfile: true,
      },
    });

    // Ambil seluruh riwayat kunjungan siswa
    const records = await prisma.medicalRecord.findMany({
      where: { studentId },
      orderBy: { tglKunjungan: 'desc' },
      include: {
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    // Kunjungan terakhir / aktif
    const latestRecord = records.length > 0 ? records[0] : null;

    // Kunjungan yang sedang aktif dirawat hari ini
    const isCurrentlyTreated = latestRecord && latestRecord.status === 'DIRAWAT';

    res.render('siswa/dashboard', {
      title: 'Dashboard Siswa - E-UKS Rekam Medis',
      student,
      latestRecord,
      isCurrentlyTreated,
      totalVisits: records.length,
      recentRecords: records.slice(0, 3),
    });
  } catch (error) {
    console.error('Error dashboard siswa:', error);
    req.session.flash = { error: 'Gagal memuat dashboard siswa.' };
    res.redirect('/');
  }
};

// 2. Melihat Riwayat Rekam Medis Kunjungan UKS Pribadi
exports.getMedicalRecords = async (req, res) => {
  try {
    const studentId = req.session.user.id;

    const records = await prisma.medicalRecord.findMany({
      where: { studentId },
      orderBy: { tglKunjungan: 'desc' },
      include: {
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    res.render('siswa/riwayat', {
      title: 'Riwayat Rekam Medis Kunjungan UKS - Siswa',
      records,
    });
  } catch (error) {
    console.error('Error riwayat siswa:', error);
    req.session.flash = { error: 'Gagal memuat riwayat rekam medis.' };
    res.redirect('/siswa/dashboard');
  }
};

// 3. Mengisi & Memperbarui Informasi Riwayat Alergi & Penyakit Bawaan
exports.getHealthProfile = async (req, res) => {
  try {
    const studentId = req.session.user.id;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { healthProfile: true },
    });

    res.render('siswa/profil-kesehatan', {
      title: 'Profil Kesehatan & Riwayat Alergi Siswa',
      student,
      profile: student.healthProfile || {},
    });
  } catch (error) {
    console.error('Error profil kesehatan:', error);
    req.session.flash = { error: 'Gagal memuat profil kesehatan.' };
    res.redirect('/siswa/dashboard');
  }
};

// Update Profil Kesehatan Siswa
exports.updateHealthProfile = async (req, res) => {
  try {
    const studentId = req.session.user.id;
    const { riwayatPenyakit, alergiObat, alergiMakanan, kontakDarurat, catatanKhusus, golonganDarah, teleponOrtu } = req.body;

    // Update data User dasar (golongan darah, telp ortu)
    await prisma.user.update({
      where: { id: studentId },
      data: {
        golonganDarah: golonganDarah ? golonganDarah.trim() : undefined,
        teleponOrtu: teleponOrtu ? teleponOrtu.trim() : undefined,
      },
    });

    // Update sesi
    if (golonganDarah) req.session.user.golonganDarah = golonganDarah.trim();
    if (teleponOrtu) req.session.user.teleponOrtu = teleponOrtu.trim();

    // Upsert profil kesehatan
    await prisma.healthProfile.upsert({
      where: { studentId },
      update: {
        riwayatPenyakit: riwayatPenyakit ? riwayatPenyakit.trim() : '',
        alergiObat: alergiObat ? alergiObat.trim() : '',
        alergiMakanan: alergiMakanan ? alergiMakanan.trim() : '',
        kontakDarurat: kontakDarurat ? kontakDarurat.trim() : '',
        catatanKhusus: catatanKhusus ? catatanKhusus.trim() : '',
      },
      create: {
        studentId,
        riwayatPenyakit: riwayatPenyakit ? riwayatPenyakit.trim() : '',
        alergiObat: alergiObat ? alergiObat.trim() : '',
        alergiMakanan: alergiMakanan ? alergiMakanan.trim() : '',
        kontakDarurat: kontakDarurat ? kontakDarurat.trim() : '',
        catatanKhusus: catatanKhusus ? catatanKhusus.trim() : '',
      },
    });

    req.session.flash = { success: 'Profil riwayat alergi dan penyakit bawaan berhasil disimpan!' };
    res.redirect('/siswa/profil-kesehatan');
  } catch (error) {
    console.error('Error update profil kesehatan:', error);
    req.session.flash = { error: 'Gagal memperbarui profil kesehatan.' };
    res.redirect('/siswa/profil-kesehatan');
  }
};

// 4. Katalog Ketersediaan Obat & Pertolongan Pertama P3K
exports.getMedicinesCatalog = async (req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: { namaObat: 'asc' },
    });

    res.render('siswa/katalog-obat', {
      title: 'Layanan & Ketersediaan Obat P3K UKS',
      medicines,
    });
  } catch (error) {
    console.error('Error katalog obat:', error);
    req.session.flash = { error: 'Gagal memuat katalog obat.' };
    res.redirect('/siswa/dashboard');
  }
};

// 5. Pratinjau Surat Izin / Rujukan Siswa Pribadi
exports.getSuratIzinSiswa = async (req, res) => {
  try {
    const studentId = req.session.user.id;
    const recordId = parseInt(req.params.id, 10);

    const record = await prisma.medicalRecord.findFirst({
      where: {
        id: recordId,
        studentId, // Pastikan milik siswa yang bersangkutan
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
    });

    if (!record || !record.noSurat) {
      req.session.flash = { error: 'Surat izin atau rujukan tidak ditemukan untuk rekam medis ini.' };
      return res.redirect('/siswa/riwayat');
    }

    const pembina = await prisma.user.findFirst({
      where: { role: 'ADMIN_UKS' },
    });

    res.render('petugas/surat-izin', {
      title: `Surat Izin UKS Digital - ${record.noSurat}`,
      record,
      pembina: pembina || { nama: 'Dra. Hj. Ratna Juwita, M.Pd' },
    });
  } catch (error) {
    console.error('Error surat izin siswa:', error);
    req.session.flash = { error: 'Gagal memuat surat izin.' };
    res.redirect('/siswa/riwayat');
  }
};
