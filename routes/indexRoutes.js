const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'ADMIN_UKS') return res.redirect('/admin/dashboard');
    if (req.session.user.role === 'PETUGAS_UKS') return res.redirect('/petugas/dashboard');
    if (req.session.user.role === 'SISWA') return res.redirect('/siswa/dashboard');
  }
  res.redirect('/auth/login');
});

module.exports = router;
