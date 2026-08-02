const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { dataDir } = require('./dataPaths');
const { getPool, readJsonFile } = require('./db');
const { DEFAULTS } = require('./settingsDefaults');

const settingsFile = path.join(dataDir, 'settings.json');

function sanitize(value) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();
}

function readSettingsFile() {
  const data = readJsonFile(settingsFile);
  return { ...DEFAULTS, ...(data || {}) };
}

function writeSettingsFile(settings) {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
}

function parseLines(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildNext(current, data) {
  return {
    ...current,
    siteTitle: sanitize(data.siteTitle || current.siteTitle),
    tagline: sanitize(data.tagline || current.tagline),
    heroTitle: sanitize(data.heroTitle || current.heroTitle),
    heroText: sanitize(data.heroText || current.heroText),
    whatsapp: sanitize(data.whatsapp || current.whatsapp).replace(/\D/g, ''),
    instagram: sanitize(data.instagram || current.instagram),
    footerText: sanitize(data.footerText || current.footerText),
    creditText: sanitize(data.creditText || current.creditText)
  };
}

async function getSettings() {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query('SELECT data FROM settings WHERE id = 1');
    if (rows.length) {
      return { ...DEFAULTS, ...(rows[0].data || {}) };
    }
    return { ...DEFAULTS };
  }
  return readSettingsFile();
}

async function updateSettings(data) {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query('SELECT data FROM settings WHERE id = 1');
    const current = rows.length ? { ...DEFAULTS, ...(rows[0].data || {}) } : { ...DEFAULTS };
    const next = buildNext(current, data);
    const rawCategories = data.categories !== undefined ? parseLines(data.categories) : current.categories;
    next.categories = rawCategories.length ? rawCategories : current.categories;
    await pool.query(
      'INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
      [JSON.stringify(next)]
    );
    return next;
  }
  const current = readSettingsFile();
  const next = buildNext(current, data);
  const rawCategories = data.categories !== undefined ? parseLines(data.categories) : current.categories;
  next.categories = rawCategories.length ? rawCategories : current.categories;
  writeSettingsFile(next);
  return next;
}

module.exports = { getSettings, updateSettings };
