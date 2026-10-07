// Middleware untuk Session & RBAC (Role-Based Access Control)

// 1. Pastikan pengguna sudah terautentikasi (login)
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ error: 'Sesi telah berakhir, silakan login kembali.' });
    }
    req.session.flash = { error: 'Silakan login terlebih dahulu untuk mengakses halaman tersebut.' };
    return res.redirect('/auth/login');
  }
  next();
}

// 2. Pembatasan Hak Akses berdasarkan Role Pengguna
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.session.flash = { error: 'Silakan login terlebih dahulu.' };
      return res.redirect('/auth/login');
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki wewenang untuk fitur ini.' });
      }
      return res.status(403).render('errors/403', {
        title: '403 Forbidden - Akses Ditolak',
        message: `Role Anda (${userRole}) tidak memiliki izin untuk mengakses sumber daya ini.`,
        user: req.session.user,
        currentPath: req.originalUrl,
      });
    }

    next();
  };
}

// 3. Expose Data Pengguna & Pesan Flash ke semua View template EJS
function setLocals(req, res, next) {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.flash = (req.session && req.session.flash) ? req.session.flash : null;
  if (req.session) {
    req.session.flash = null; // Clear flash setelah dibaca
  }
  res.locals.currentPath = req.path;
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  setLocals,
};
