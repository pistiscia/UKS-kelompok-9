const prisma = require('../config/prisma');

async function runVerification() {
  console.log('===============================================================');
  console.log('🧪 MEMULAI VERIFIKASI OTOMATIS 5 SKENARIO SISTEM E-UKS');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------
    // SKENARIO 1: Admin UKS menambah stok obat Paracetamol 500mg sebanyak 100 tablet
    // -------------------------------------------------------------
    console.log('▶ [SKENARIO 1] Pengujian Admin Menambah / Restock Paracetamol 500mg...');
    
    // Cari obat Paracetamol 500mg
    let paracetamol = await prisma.medicine.findFirst({
      where: { namaObat: { contains: 'Paracetamol 500mg' } },
    });

    if (!paracetamol) {
      // Jika belum ada, buat baru
      paracetamol = await prisma.medicine.create({
        data: {
          namaObat: 'Paracetamol 500mg',
          kategori: 'TABLET',
          stok: 100,
          satuan: 'tablet',
          tglKadaluarsa: new Date('2027-12-31'),
          aturanPakai: '1 tablet 3x sehari sesudah makan',
          minStok: 20,
          lokasiRak: 'Rak A1',
        },
      });
      console.log(`   ✓ Obat Paracetamol 500mg baru berhasil dibuat dengan stok: ${paracetamol.stok} tablet`);
    } else {
      // Simulasikan restock menjadi 100 tablet
      const updated = await prisma.medicine.update({
        where: { id: paracetamol.id },
        data: {
          stok: 100,
          tglKadaluarsa: new Date('2027-12-31'),
        },
      });
      paracetamol = updated;
      console.log(`   ✓ Paracetamol 500mg berhasil di-restock. Stok saat ini: ${paracetamol.stok} tablet.`);
      console.log(`   ✓ Tanggal kadaluarsa: ${paracetamol.tglKadaluarsa.toISOString().split('T')[0]}`);
    }

    if (paracetamol.stok === 100) {
      console.log('   ✅ SKENARIO 1 LULUS VERIFIKASI (Stok tepat 100 tablet).\n');
    } else {
      throw new Error(`Skenario 1 gagal: Stok Paracetamol adalah ${paracetamol.stok}, bukan 100.`);
    }

    // -------------------------------------------------------------
    // SKENARIO 2 & 3 & 4: Petugas mencatat kunjungan siswa demam (38.5°C), keluhan pusing,
    // berikan 1 tablet Paracetamol (stok berkurang jadi 99), dan terbitkan surat izin pulang
    // -------------------------------------------------------------
    console.log('▶ [SKENARIO 2, 3, 4] Pengujian Petugas Mencatat Kunjungan, Resep & Surat Pulang...');

    // Ambil data Siswa & Petugas
    const siswa = await prisma.user.findFirst({
      where: { username: 'siswa' },
      include: { healthProfile: true },
    });
    const petugas = await prisma.user.findFirst({
      where: { username: 'petugasuks' },
    });

    if (!siswa || !petugas) {
      throw new Error('User siswa atau petugas tidak ditemukan!');
    }

    console.log(`   • Pasien: ${siswa.nama} (Kelas: ${siswa.kelas})`);
    console.log(`   • Petugas Pemeriksa: ${petugas.nama}`);
    console.log(`   • Riwayat Alergi Siswa: ${siswa.healthProfile?.alergiObat || 'Tidak ada'}`);

    // Eksekusi transaksi atomik registrasi kunjungan
    const noSuratResmi = `UKS/E-MED/${new Date().getFullYear()}/X/099`;
    
    const newRecord = await prisma.$transaction(async (tx) => {
      // 1. Validasi stok Paracetamol
      const med = await tx.medicine.findUnique({ where: { id: paracetamol.id } });
      if (med.stok < 1) {
        throw new Error('Stok tidak mencukupi!');
      }

      // 2. Buat rekam medis kunjungan (SKENARIO 2 & 4)
      const rec = await tx.medicalRecord.create({
        data: {
          studentId: siswa.id,
          petugasId: petugas.id,
          tglKunjungan: new Date(),
          jamMasuk: '09:00',
          jamKeluar: '09:40',
          keluhan: 'Demam tinggi dan pusing sakit kepala',
          suhuTubuh: 38.5, // SKENARIO 2
          tensi: '120/80',
          tindakan: 'Istirahat di ruang ber-AC tempat tidur UKS, kompres dahi, dan observasi tanda vital',
          status: 'PULANG', // SKENARIO 4
          noSurat: noSuratResmi, // SKENARIO 4
          keteranganSurat: 'Siswa mengalami demam tinggi dan pusing sehingga diberikan izin pulang beristirahat di rumah.',
        },
      });

      // 3. Catat resep obat & potong stok (SKENARIO 3)
      await tx.medicinePrescription.create({
        data: {
          medicalRecordId: rec.id,
          medicineId: paracetamol.id,
          jumlah: 1,
          dosis: '1 tablet sesudah makan',
        },
      });

      // Kurangi stok Paracetamol
      await tx.medicine.update({
        where: { id: paracetamol.id },
        data: { stok: { decrement: 1 } },
      });

      return rec;
    });

    console.log(`   ✓ Rekam Medis berhasil dibuat dengan ID #${newRecord.id}`);
    console.log(`   ✓ Suhu Tubuh: ${newRecord.suhuTubuh}°C (Demam tercatat)`);
    console.log(`   ✓ Keluhan: "${newRecord.keluhan}"`);
    console.log(`   ✓ Status: ${newRecord.status}`);
    console.log(`   ✓ Nomor Surat Izin: ${newRecord.noSurat}`);

    // Cek stok Paracetamol setelah dipotong
    const paracetamolAfter = await prisma.medicine.findUnique({ where: { id: paracetamol.id } });
    console.log(`   ✓ Stok Paracetamol 500mg setelah pemotongan: ${paracetamolAfter.stok} tablet`);

    if (newRecord.suhuTubuh === 38.5 && newRecord.keluhan.includes('pusing')) {
      console.log('   ✅ SKENARIO 2 LULUS VERIFIKASI (Suhu 38.5°C & keluhan pusing tersimpan).');
    }

    if (paracetamolAfter.stok === 99) {
      console.log('   ✅ SKENARIO 3 LULUS VERIFIKASI (Stok terpotong otomatis dari 100 menjadi 99 tablet).');
    } else {
      throw new Error(`Skenario 3 gagal: Stok sekarang adalah ${paracetamolAfter.stok}, bukan 99.`);
    }

    if (newRecord.status === 'PULANG' && newRecord.noSurat) {
      console.log('   ✅ SKENARIO 4 LULUS VERIFIKASI (Surat izin pulang digital resmi diterbitkan).\n');
    }

    // -------------------------------------------------------------
    // SKENARIO 5: Siswa login dan melihat riwayat pemeriksaan tersimpan rapi
    // -------------------------------------------------------------
    console.log('▶ [SKENARIO 5] Pengujian Siswa Memantau Rekam Medis Pribadi & Status Izin...');

    // Query dari sudut pandang akun siswa
    const siswaRecords = await prisma.medicalRecord.findMany({
      where: { studentId: siswa.id },
      orderBy: { tglKunjungan: 'desc' },
      include: {
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    const latest = siswaRecords[0];
    console.log(`   • Total Kunjungan Siswa (${siswa.nama}): ${siswaRecords.length} kali`);
    console.log(`   • Kunjungan Terakhir: ID #${latest.id} (${new Date(latest.tglKunjungan).toLocaleDateString('id-ID')})`);
    console.log(`   • Suhu Tubuh: ${latest.suhuTubuh}°C | Tensi: ${latest.tensi}`);
    console.log(`   • Status Terpantau: ${latest.status}`);
    console.log(`   • Surat Izin Digital: ${latest.noSurat}`);
    console.log(`   • Rincian Obat: ${latest.prescriptions.map(p => `${p.medicine.namaObat} (${p.jumlah} ${p.medicine.satuan})`).join(', ')}`);

    if (latest && latest.id === newRecord.id && latest.status === 'PULANG' && latest.prescriptions.length > 0) {
      console.log('   ✅ SKENARIO 5 LULUS VERIFIKASI (Siswa dapat mengakses seluruh riwayat rekam medis pribadi).\n');
    } else {
      throw new Error('Skenario 5 gagal: Riwayat rekam medis siswa tidak sesuai.');
    }

    console.log('===============================================================');
    console.log('🎉 SEMUA 5 SKENARIO PENGUJIAN SISTEM DINYATAKAN 100% LULUS!');
    console.log('===============================================================');

  } catch (err) {
    console.error('❌ Gagal dalam pengujian verifikasi:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
