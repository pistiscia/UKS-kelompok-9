const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// Halaman Login
exports.getLogin = (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'ADMIN_UKS') return res.redirect('/admin/dashboard');
    if (req.session.user.role === 'PETUGAS_UKS') return res.redirect('/petugas/dashboard');
    if (req.session.user.role === 'SISWA') return res.redirect('/siswa/dashboard');
  }
  res.render('auth/login', {
    title: 'Login - Sistem Informasi UKS & Rekam Medis (E-UKS)',
    layout: false,
  });
};

// Proses Login
exports.postLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      req.session.flash = { error: 'Username dan kata sandi wajib diisi!' };
      return res.redirect('/auth/login');
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { healthProfile: true },
    });

    if (!user) {
      req.session.flash = { error: 'Username tidak ditemukan dalam sistem UKS.' };
      return res.redirect('/auth/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.session.flash = { error: 'Kata sandi yang Anda masukkan salah!' };
      return res.redirect('/auth/login');
    }

    // Set data sesi
    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      nisn: user.nisn,
      kelas: user.kelas,
      teleponOrtu: user.teleponOrtu,
      golonganDarah: user.golonganDarah,
      jenisKelamin: user.jenisKelamin,
    };

    req.session.flash = { success: `Selamat datang, ${user.nama}!` };

    // Redirect sesuai role
    if (user.role === 'ADMIN_UKS') {
      return res.redirect('/admin/dashboard');
    } else if (user.role === 'PETUGAS_UKS') {
      return res.redirect('/petugas/dashboard');
    } else if (user.role === 'SISWA') {
      return res.redirect('/siswa/dashboard');
    } else {
      return res.redirect('/');
    }
  } catch (error) {
    console.error('Error saat login:', error);
    req.session.flash = { error: 'Terjadi kesalahan sistem saat memproses login.' };
    res.redirect('/auth/login');
  }
};

// Switch Login Cepat untuk Demo Pengujian
exports.quickLogin = async (req, res) => {
  try {
    const roleParam = (req.query.role || '').toUpperCase();
    let targetUsername = 'adminuks';

    if (roleParam === 'PETUGAS' || roleParam === 'PETUGAS_UKS') {
      targetUsername = 'petugasuks';
    } else if (roleParam === 'SISWA') {
      targetUsername = 'siswa';
    } else if (roleParam === 'ADMIN' || roleParam === 'ADMIN_UKS') {
      targetUsername = 'adminuks';
    }

    const user = await prisma.user.findUnique({
      where: { username: targetUsername },
    });

    if (!user) {
      req.session.flash = { error: 'Akun demo tidak ditemukan. Silakan jalankan seed database.' };
      return res.redirect('/auth/login');
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      nisn: user.nisn,
      kelas: user.kelas,
      teleponOrtu: user.teleponOrtu,
      golonganDarah: user.golonganDarah,
      jenisKelamin: user.jenisKelamin,
    };

    req.session.flash = { success: `Masuk cepat sebagai demo: ${user.nama} (${user.role})` };

    if (user.role === 'ADMIN_UKS') return res.redirect('/admin/dashboard');
    if (user.role === 'PETUGAS_UKS') return res.redirect('/petugas/dashboard');
    if (user.role === 'SISWA') return res.redirect('/siswa/dashboard');
    return res.redirect('/');
  } catch (error) {
    console.error('Error quick login:', error);
    req.session.flash = { error: 'Gagal melakukan login cepat.' };
    res.redirect('/auth/login');
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Error destroying session:', err);
    res.redirect('/auth/login');
  });
};
