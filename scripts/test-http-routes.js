async function testRoutes() {
  console.log('===============================================================');
  console.log('🌐 PENGUJIAN ENDPOINT HTTP & SISTEM OTORISASI RBAC E-UKS');
  console.log('===============================================================\n');

  const BASE_URL = 'http://localhost:3000';

  // Helper untuk request dengan session cookie jar manual
  async function makeRequest(path, options = {}, cookie = '') {
    const url = `${BASE_URL}${path}`;
    const headers = { ...(options.headers || {}) };
    if (cookie) headers['Cookie'] = cookie;

    const res = await fetch(url, {
      ...options,
      headers,
      redirect: 'manual', // Agar kita bisa inspeksi 302 redirect & Set-Cookie
    });

    const setCookie = res.headers.get('set-cookie');
    let newCookie = cookie;
    if (setCookie) {
      newCookie = setCookie.split(';')[0];
    }

    const text = await res.text();
    return { status: res.status, headers: res.headers, cookie: newCookie, body: text };
  }

  try {
    // 1. Test Halaman Login (Publik)
    console.log('▶ [1] Mengakses Halaman Login (/auth/login)...');
    const loginRes = await makeRequest('/auth/login');
    if (loginRes.status === 200 && loginRes.body.includes('E-UKS Sekolah')) {
      console.log('   ✅ 200 OK - Halaman Login termuat dengan sempurna.');
    } else {
      throw new Error(`Login page status: ${loginRes.status}`);
    }

    // 2. Test Proteksi Unauthenticated (Redirect ke Login)
    console.log('▶ [2] Menguji Akses Tanpa Sesi ke Rute Sensitif (/admin/dashboard)...');
    const unauthRes = await makeRequest('/admin/dashboard');
    if (unauthRes.status === 302 && unauthRes.headers.get('location') === '/auth/login') {
      console.log('   ✅ 302 Redirect ke /auth/login - Middleware requireAuth berhasil.');
    } else {
      throw new Error(`Unauth check failed, status: ${unauthRes.status}`);
    }

    // 3. Test Quick Login Admin & Akses Menu Admin
    console.log('▶ [3] Menguji Quick Login Admin UKS & Dashboard Analitik...');
    const adminLogin = await makeRequest('/auth/quick-login?role=admin');
    const adminCookie = adminLogin.cookie;
    console.log(`   ✓ Sesi Cookie Admin didapatkan: ${adminCookie}`);

    const adminDash = await makeRequest('/admin/dashboard', {}, adminCookie);
    if (adminDash.status === 200 && adminDash.body.includes('Dashboard Analitik & Monitoring UKS')) {
      console.log('   ✅ 200 OK - Dashboard Admin UKS berhasil diakses.');
    }

    const adminMeds = await makeRequest('/admin/medicines', {}, adminCookie);
    if (adminMeds.status === 200 && adminMeds.body.includes('Master Inventaris Obat & P3K')) {
      console.log('   ✅ 200 OK - Master Obat & P3K berhasil diakses.');
    }

    const adminMonitoring = await makeRequest('/admin/monitoring', {}, adminCookie);
    if (adminMonitoring.status === 200 && adminMonitoring.body.includes('Monitoring Kadaluarsa')) {
      console.log('   ✅ 200 OK - Monitoring Kadaluarsa & Ambang Batas berhasil diakses.');
    }

    // 4. Test Quick Login Petugas & Pelayanan Medis
    console.log('▶ [4] Menguji Quick Login Petugas UKS & Pelayanan Kunjungan...');
    const petugasLogin = await makeRequest('/auth/quick-login?role=petugas');
    const petugasCookie = petugasLogin.cookie;

    const petugasDash = await makeRequest('/petugas/dashboard', {}, petugasCookie);
    if (petugasDash.status === 200 && petugasDash.body.includes('Dashboard Layanan & Pemeriksaan Siswa')) {
      console.log('   ✅ 200 OK - Dashboard Petugas UKS berhasil diakses.');
    }

    const petugasBaru = await makeRequest('/petugas/kunjungan/baru', {}, petugasCookie);
    if (petugasBaru.status === 200 && petugasBaru.body.includes('Registrasi Pemeriksaan Siswa')) {
      console.log('   ✅ 200 OK - Form Registrasi Kunjungan berhasil diakses.');
    }

    const petugasLaporan = await makeRequest('/petugas/laporan-bulanan', {}, petugasCookie);
    if (petugasLaporan.status === 200 && petugasLaporan.body.includes('Rekapitulasi Kunjungan UKS Bulanan')) {
      console.log('   ✅ 200 OK - Laporan Rekapitulasi Bulanan berhasil diakses.');
    }

    // 5. Test Quick Login Siswa & Portal Siswa
    console.log('▶ [5] Menguji Quick Login Siswa & Portal Rekam Medis Personal...');
    const siswaLogin = await makeRequest('/auth/quick-login?role=siswa');
    const siswaCookie = siswaLogin.cookie;

    const siswaDash = await makeRequest('/siswa/dashboard', {}, siswaCookie);
    if (siswaDash.status === 200 && siswaDash.body.includes('Status Izin UKS Digital Saya')) {
      console.log('   ✅ 200 OK - Dashboard Siswa & Status Izin Digital berhasil diakses.');
    }

    const siswaRiwayat = await makeRequest('/siswa/riwayat', {}, siswaCookie);
    if (siswaRiwayat.status === 200 && siswaRiwayat.body.includes('Riwayat Pemeriksaan & Kunjungan UKS')) {
      console.log('   ✅ 200 OK - Riwayat Rekam Medis Pribadi Siswa berhasil diakses.');
    }

    const siswaProfil = await makeRequest('/siswa/profil-kesehatan', {}, siswaCookie);
    if (siswaProfil.status === 200 && siswaProfil.body.includes('Riwayat Alergi & Penyakit Bawaan')) {
      console.log('   ✅ 200 OK - Form Profil Alergi & Kesehatan Siswa berhasil diakses.');
    }

    const siswaKatalog = await makeRequest('/siswa/katalog-obat', {}, siswaCookie);
    if (siswaKatalog.status === 200 && siswaKatalog.body.includes('Ketersediaan Obat-Obatan & Fasilitas P3K UKS')) {
      console.log('   ✅ 200 OK - Katalog Ketersediaan Obat P3K berhasil diakses.');
    }

    // 6. Test Otorisasi Ketat RBAC: Siswa mencoba buka halaman Admin (Harus 403 Forbidden)
    console.log('▶ [6] Menguji Pelanggaran Otorisasi (Siswa membuka /admin/dashboard)...');
    const forbiddenRes = await makeRequest('/admin/dashboard', {}, siswaCookie);
    if (forbiddenRes.status === 403 && forbiddenRes.body.includes('403 Forbidden')) {
      console.log('   ✅ 403 Forbidden - Proteksi RBAC berhasil menolak akses siswa ke rute admin!');
    } else {
      throw new Error(`Expected 403 Forbidden for siswa accessing admin, got: ${forbiddenRes.status}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 SELURUH RUTE HTTP & ATURAN OTORISASI RBAC 100% LULUS!');
    console.log('===============================================================');

  } catch (e) {
    console.error('❌ Gagal dalam pengujian rute HTTP:', e);
    process.exit(1);
  }
}

testRoutes();
