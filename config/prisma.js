const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

let dbUrl = process.env.DATABASE_URL;

// Khusus lingkungan serverless Vercel (sistem file read-only kecuali /tmp)
if (process.env.VERCEL) {
  const tmpDbPath = path.join('/tmp', 'dev.db');
  const starterDbPath = path.join(__dirname, '..', 'prisma', 'starter.db');

  if (!fs.existsSync(tmpDbPath)) {
    try {
      if (fs.existsSync(starterDbPath)) {
        fs.copyFileSync(starterDbPath, tmpDbPath);
        console.log('✅ Berhasil menyalin starter.db ke /tmp/dev.db untuk Vercel');
      } else {
        console.warn('⚠️ starter.db tidak ditemukan di:', starterDbPath);
      }
    } catch (err) {
      console.error('❌ Gagal menyalin starter.db ke /tmp:', err);
    }
  }

  dbUrl = `file:${tmpDbPath}`;
  process.env.DATABASE_URL = dbUrl;
}

const prisma = new PrismaClient({
  datasources: dbUrl
    ? {
        db: {
          url: dbUrl,
        },
      }
    : undefined,
  log: ['error', 'warn'],
});

module.exports = prisma;
