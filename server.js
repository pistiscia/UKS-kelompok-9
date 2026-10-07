const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');
const { setLocals } = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'e-uks-session-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 jam
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

// Expose locals (user, flash messages, path)
app.use(setLocals);

// Routes
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const petugasRoutes = require('./routes/petugasRoutes');
const siswaRoutes = require('./routes/siswaRoutes');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/petugas', petugasRoutes);
app.use('/siswa', siswaRoutes);

// Error 404 Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: '404 - Halaman Tidak Ditemukan',
    currentPath: req.originalUrl,
  });
});

// Error 500 Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).render('errors/404', {
    title: '500 - Terjadi Kesalahan Server',
    message: err.message || 'Terjadi kesalahan internal pada server.',
    currentPath: req.originalUrl,
  });
});

// Jalankan Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏥 E-UKS - Sistem Informasi UKS & Rekam Medis Siswa`);
    console.log(`🚀 Server aktif di: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
