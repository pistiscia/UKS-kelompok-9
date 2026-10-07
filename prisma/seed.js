const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Menjalankan Seeding Database E-UKS...');

  // 1. Bersihkan data lama (urutan penting karena FK)
  await prisma.medicinePrescription.deleteMany({});
  await prisma.medicalRecord.deleteMany({});
  await prisma.healthProfile.deleteMany({});
  await prisma.medicine.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 2. Buat Akun Demo 3 Role
  const admin = await prisma.user.create({
    data: {
      username: 'adminuks',
      password: defaultPassword,
      nama: 'Ibu Dra. Hj. Ratna Juwita, M.Pd',
      role: 'ADMIN_UKS',
      teleponOrtu: '081198765432',
      golonganDarah: 'O',
      kelas: 'Pembina UKS',
      jenisKelamin: 'P',
    },
  });

  const petugas = await prisma.user.create({
    data: {
      username: 'petugasuks',
      password: defaultPassword,
      nama: 'Ns. Hendra Kurniawan, S.Kep',
      role: 'PETUGAS_UKS',
      teleponOrtu: '081287654321',
      golonganDarah: 'B',
      kelas: 'Koordinator Medis PMR',
      jenisKelamin: 'L',
    },
  });

  const siswa = await prisma.user.create({
    data: {
      username: 'siswa',
      password: defaultPassword,
      nama: 'Ahmad Rizky Pratama',
      role: 'SISWA',
      nisn: '0068492011',
      kelas: 'XII RPL 1',
      jenisKelamin: 'L',
      teleponOrtu: '081234567890',
      golonganDarah: 'A',
    },
  });

  // Siswa Tambahan untuk Realisme Data
  const siswa2 = await prisma.user.create({
    data: {
      username: 'budi',
      password: defaultPassword,
      nama: 'Budi Santoso',
      role: 'SISWA',
      nisn: '0069988776',
      kelas: 'XII TKJ 2',
      jenisKelamin: 'L',
      teleponOrtu: '081399887766',
      golonganDarah: 'O',
    },
  });

  const siswa3 = await prisma.user.create({
    data: {
      username: 'dewi',
      password: defaultPassword,
      nama: 'Dewi Lestari',
      role: 'SISWA',
      nisn: '0081122334',
      kelas: 'X RPL 2',
      jenisKelamin: 'P',
      teleponOrtu: '081511223344',
      golonganDarah: 'AB',
    },
  });

  const siswa4 = await prisma.user.create({
    data: {
      username: 'farhan',
      password: defaultPassword,
      nama: 'Farhan Ramadhan',
      role: 'SISWA',
      nisn: '0075566778',
      kelas: 'XI IPS 1',
      jenisKelamin: 'L',
      teleponOrtu: '081755667788',
      golonganDarah: 'B',
    },
  });

  console.log('✅ Pengguna (Admin, Petugas, Siswa) berhasil dibuat.');

  // 3. Health Profiles Siswa
  await prisma.healthProfile.create({
    data: {
      studentId: siswa.id,
      riwayatPenyakit: 'Asma Ringan, Riwayat Sinusitis',
      alergiObat: 'Penisilin, Amoxicillin',
      alergiMakanan: 'Seafood (Udang & Kepiting)',
      kontakDarurat: 'Bpk. Bambang Pratama (Ayah) - 081234567890',
      catatanKhusus: 'Hindari aktivitas berat saat cuaca dingin / berdebu tinggi.',
    },
  });

  await prisma.healthProfile.create({
    data: {
      studentId: siswa2.id,
      riwayatPenyakit: 'Gastritis / Maag Akut kronis',
      alergiObat: 'Aspirin',
      alergiMakanan: 'Makanan Sangat Pedas & Asam',
      kontakDarurat: 'Ibu Maryam (Ibu) - 081399887766',
      catatanKhusus: 'Harus makan tepat waktu, sediakan biskuit di tas.',
    },
  });

  await prisma.healthProfile.create({
    data: {
      studentId: siswa3.id,
      riwayatPenyakit: 'Migrain sesekali',
      alergiObat: 'Tidak ada alergi obat',
      alergiMakanan: 'Tidak ada alergi makanan',
      kontakDarurat: 'Bpk. Joko Lestari - 081511223344',
      catatanKhusus: 'Peka terhadap paparan sinar matahari terik.',
    },
  });

  await prisma.healthProfile.create({
    data: {
      studentId: siswa4.id,
      riwayatPenyakit: 'Riwayat Demam Berdarah (DB) th 2024',
      alergiObat: 'Paracetamol dosis tinggi (ruam kulit)',
      alergiMakanan: 'Kacang Tanah',
      kontakDarurat: 'Ibu Rahayu - 081755667788',
      catatanKhusus: 'Gunakan kompres hangat jika demam.',
    },
  });

  console.log('✅ Profil Kesehatan Siswa berhasil dibuat.');

  // 4. Master Data Obat & Alat P3K
  // Catatan: Variasikan stok dan tanggal kadaluarsa untuk mendemonstrasikan ambang batas dan kadaluarsa
  const medParacetamol = await prisma.medicine.create({
    data: {
      namaObat: 'Paracetamol 500mg',
      kategori: 'TABLET',
      stok: 100,
      satuan: 'tablet',
      tglKadaluarsa: new Date('2027-12-31'),
      aturanPakai: '1 tablet 3x sehari sesudah makan saat demam atau sakit kepala',
      minStok: 20,
      lokasiRak: 'Rak A1 - Analgesik & Antipiretik',
    },
  });

  const medAntasida = await prisma.medicine.create({
    data: {
      namaObat: 'Antasida Doen Tablet',
      kategori: 'TABLET',
      stok: 45,
      satuan: 'tablet',
      tglKadaluarsa: new Date('2027-08-15'),
      aturanPakai: '1-2 tablet dikunyah 1 jam sebelum makan saat lambung perih',
      minStok: 15,
      lokasiRak: 'Rak A2 - Gastro/Lambung',
    },
  });

  const medAmoxicillin = await prisma.medicine.create({
    data: {
      namaObat: 'Amoxicillin 500mg',
      kategori: 'TABLET',
      stok: 8, // Di bawah minStok (Kritis!)
      satuan: 'strip',
      tglKadaluarsa: new Date('2026-11-20'), // Mendekati kadaluarsa
      aturanPakai: 'Hanya diberikan berdasarkan resep/rujukan faskes resmi',
      minStok: 10,
      lokasiRak: 'Rak B1 - Antibiotik Pengawasan',
    },
  });

  const medSirupBatuk = await prisma.medicine.create({
    data: {
      namaObat: 'Paracetamol Sirup 120mg/5ml',
      kategori: 'SIRUP',
      stok: 4, // Di bawah minStok
      satuan: 'botol',
      tglKadaluarsa: new Date('2026-10-15'), // Kadaluarsa sangat dekat / waspada
      aturanPakai: '10-15 ml diminum 3x sehari setelah makan',
      minStok: 5,
      lokasiRak: 'Rak A3 - Sirup & Cairan',
    },
  });

  const medBetadine = await prisma.medicine.create({
    data: {
      namaObat: 'Povidone Iodine / Betadine 30ml',
      kategori: 'SIRUP',
      stok: 15,
      satuan: 'botol',
      tglKadaluarsa: new Date('2028-06-01'),
      aturanPakai: 'Teteskan / oleskan pada luka lecet terbuka sebagai antiseptik',
      minStok: 5,
      lokasiRak: 'Kotak P3K 1 - Tindakan Bedah Ringan',
    },
  });

  const medMinyakKayuPutih = await prisma.medicine.create({
    data: {
      namaObat: 'Minyak Kayu Putih Cap Lang 60ml',
      kategori: 'SIRUP',
      stok: 7, // Mendekati minStok
      satuan: 'botol',
      tglKadaluarsa: new Date('2027-05-10'),
      aturanPakai: 'Oleskan secukupnya pada perut, dada, leher saat kembung/mual',
      minStok: 10,
      lokasiRak: 'Rak C1 - Minyak Gosok',
    },
  });

  const medBioplacenton = await prisma.medicine.create({
    data: {
      namaObat: 'Bioplacenton Jelly Salep',
      kategori: 'SALEP',
      stok: 12,
      satuan: 'tube',
      tglKadaluarsa: new Date('2027-10-25'),
      aturanPakai: 'Oleskan tipis pada luka bakar/lecet 2-3 kali sehari',
      minStok: 5,
      lokasiRak: 'Rak B2 - Salep Kulit',
    },
  });

  const medKasa = await prisma.medicine.create({
    data: {
      namaObat: 'Kain Kasa Steril 16x16',
      kategori: 'ALAT',
      stok: 60,
      satuan: 'pcs',
      tglKadaluarsa: new Date('2029-01-01'),
      aturanPakai: 'Penutup luka steril untuk mencegah infeksi dan menghentikan darah',
      minStok: 20,
      lokasiRak: 'Lemari P3K - Bed 1',
    },
  });

  const medHansaplast = await prisma.medicine.create({
    data: {
      namaObat: 'Plester Rol Kain Elastis',
      kategori: 'ALAT',
      stok: 25,
      satuan: 'roll',
      tglKadaluarsa: new Date('2028-12-31'),
      aturanPakai: 'Fiksasi perban luka pada persendian atau anggota tubuh',
      minStok: 10,
      lokasiRak: 'Lemari P3K - Bed 2',
    },
  });

  const medOralit = await prisma.medicine.create({
    data: {
      namaObat: 'Oralit Garam Rehidrasi Sachet',
      kategori: 'TABLET',
      stok: 40,
      satuan: 'sachet',
      tglKadaluarsa: new Date('2027-11-15'),
      aturanPakai: 'Larutkan 1 sachet ke dalam 200 ml air putih hangat',
      minStok: 15,
      lokasiRak: 'Rak A2 - Gastro/Lambung',
    },
  });

  console.log('✅ Master Obat-Obatan & Alat P3K berhasil dibuat.');

  // 5. Data Transaksi Rekam Medis Kunjungan & Resep
  // Kunjungan 1: Siswa Ahmad Rizky Pratama (Riwayat sebelumnya)
  const record1 = await prisma.medicalRecord.create({
    data: {
      studentId: siswa.id,
      petugasId: petugas.id,
      tglKunjungan: new Date('2026-10-05T08:30:00Z'),
      jamMasuk: '08:30',
      jamKeluar: '09:45',
      keluhan: 'Pusing dan hidung tersumbat saat mengikuti pelajaran matematika',
      suhuTubuh: 37.2,
      tensi: '115/75',
      tindakan: 'Istirahat di ruang ber-AC santai, dioleskan minyak kayu putih di leher',
      status: 'KEMBALI_KELAS',
      noSurat: null,
      keteranganSurat: null,
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record1.id,
      medicineId: medMinyakKayuPutih.id,
      jumlah: 1,
      dosis: 'Oleskan secukupnya pada dada dan leher',
    },
  });

  // Kunjungan 2: Budi Santoso (Maag kambuh)
  const record2 = await prisma.medicalRecord.create({
    data: {
      studentId: siswa2.id,
      petugasId: petugas.id,
      tglKunjungan: new Date('2026-10-06T09:15:00Z'),
      jamMasuk: '09:15',
      jamKeluar: '10:30',
      keluhan: 'Nyeri ulu hati melilit, mual dan muntah air karena belum sarapan',
      suhuTubuh: 36.6,
      tensi: '110/70',
      tindakan: 'Diberikan teh manis hangat, istirahat berbaring posisi semi-fowler, minum 1 tablet Antasida',
      status: 'KEMBALI_KELAS',
      noSurat: null,
      keteranganSurat: null,
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record2.id,
      medicineId: medAntasida.id,
      jumlah: 1,
      dosis: '1 tablet dikunyah segera',
    },
  });

  // Kunjungan 3: Farhan Ramadhan (Demam tinggi -> Rujukan Puskesmas & Pulang)
  const record3 = await prisma.medicalRecord.create({
    data: {
      studentId: siswa4.id,
      petugasId: petugas.id,
      tglKunjungan: new Date('2026-10-07T07:45:00Z'),
      jamMasuk: '07:45',
      jamKeluar: '08:50',
      keluhan: 'Demam menggigil sejak malam, lemas ekstrem, suhu tubuh 39.2°C, mual',
      suhuTubuh: 39.2,
      tensi: '100/65',
      tindakan: 'Kompres air hangat di dahi dan lipatan ketiak, hidrasi air mineral, terbitkan surat rujukan Faskes dan penjemputan oleh orang tua',
      status: 'DIRUJUK',
      noSurat: 'UKS/SMK/2026/X/001',
      faskesRujukan: 'Puskesmas Kebon Jeruk',
      keteranganSurat: 'Suhu tubuh mencapai 39.2°C dengan indikasi febris tinggi, disarankan pemeriksaan hematologi darah perifer lengkap di Puskesmas.',
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record3.id,
      medicineId: medOralit.id,
      jumlah: 1,
      dosis: '1 sachet dilarutkan dalam 200ml air hangat untuk cegah dehidrasi',
    },
  });

  // Kunjungan 4: Dewi Lestari (Luka Lecet Olahraga)
  const record4 = await prisma.medicalRecord.create({
    data: {
      studentId: siswa3.id,
      petugasId: petugas.id,
      tglKunjungan: new Date('2026-10-07T10:00:00Z'),
      jamMasuk: '10:00',
      jamKeluar: '10:40',
      keluhan: 'Lutut kanan dan siku lecet berdarah karena terpeleset saat bermain voli',
      suhuTubuh: 36.5,
      tensi: '120/80',
      tindakan: 'Luka dicuci cairan steril, diberikan antiseptik Betadine dan ditutup kasa steril + plester',
      status: 'KEMBALI_KELAS',
      noSurat: null,
      keteranganSurat: null,
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record4.id,
      medicineId: medBetadine.id,
      jumlah: 1,
      dosis: 'Dioleskan pada area luka luar',
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record4.id,
      medicineId: medKasa.id,
      jumlah: 1,
      dosis: 'Balut steril penutup luka',
    },
  });

  console.log('✅ Data transaksi Rekam Medis & Resep Obat awal berhasil dibuat.');
  console.log('🎉 Seeding Database Selesai dengan Sukses!');
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
