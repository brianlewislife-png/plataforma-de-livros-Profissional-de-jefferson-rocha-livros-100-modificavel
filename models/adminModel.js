const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { dataDir } = require('./dataPaths');

const adminFile = path.join(dataDir, 'admin.json');
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };
const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password || ''), salt, KEY_LEN, SCRYPT_OPTS).toString('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes('$')) {
    return false;
  }
  const [salt, hash] = stored.split('$');
  const candidate = crypto.scryptSync(String(password || ''), salt, KEY_LEN, SCRYPT_OPTS);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function getAdmin() {
  try {
    return JSON.parse(fs.readFileSync(adminFile, 'utf8'));
  } catch (err) {
    return null;
  }
}

function saveAdmin(data) {
  fs.writeFileSync(adminFile, JSON.stringify(data, null, 2));
}

function ensureAdmin() {
  const existing = getAdmin();
  const envEmail = process.env.ADMIN_EMAIL;
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword) {
    const admin = {
      email: envEmail || (existing && existing.email) || 'admin@jeffersonrocha.com',
      passwordHash: hashPassword(envPassword),
      createdAt: existing && existing.createdAt ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveAdmin(admin);
    return admin;
  }
  if (existing && existing.passwordHash) {
    return existing;
  }
  const admin = {
    email: envEmail || 'admin@jeffersonrocha.com',
    passwordHash: hashPassword('J3ff3rson!2026'),
    createdAt: new Date().toISOString()
  };
  saveAdmin(admin);
  return admin;
}

module.exports = { hashPassword, verifyPassword, getAdmin, saveAdmin, ensureAdmin };
