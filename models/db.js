const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { dataDir } = require('./dataPaths');
const { DEFAULTS } = require('./settingsDefaults');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

function rowToBook(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || '',
    description: row.description || '',
    author: row.author || '',
    category: row.category || '',
    ageRange: row.age_range || 'L',
    language: row.language || 'Português',
    pages: row.pages,
    year: row.year,
    publisher: row.publisher || '',
    rating: Number(row.rating || 0),
    views: Number(row.views || 0),
    status: row.status || 'Publicado',
    isFree: !!row.is_free,
    price: Number(row.price || 0),
    promoPrice: Number(row.promo_price || 0),
    discount: Number(row.discount || 0),
    isPromotion: !!row.is_promotion,
    featured: !!row.featured,
    whatsappNumber: row.whatsapp_number || '',
    coverUrl: row.cover_url || '',
    downloadLinks: Array.isArray(row.download_links) ? row.download_links : []
  };
}

function bookToParams(book) {
  return [
    book.slug,
    book.title,
    book.subtitle || '',
    book.description || '',
    book.author || '',
    book.category || 'Geral',
    book.ageRange || 'L',
    book.language || 'Português',
    Number(book.pages || 0),
    book.year ? Number(book.year) : null,
    book.publisher || '',
    Number(book.rating || 0),
    Number(book.views || 0),
    book.status || 'Publicado',
    !!book.isFree,
    Number(book.price || 0),
    Number(book.promoPrice || 0),
    Number(book.discount || 0),
    !!book.isPromotion,
    !!book.featured,
    book.whatsappNumber || '',
    book.coverUrl || '',
    JSON.stringify(book.downloadLinks || [])
  ];
}

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return null;
  }
}

async function initDb() {
  const db = getPool();
  if (!db) {
    return false;
  }
  const client = await db.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT DEFAULT '',
        description TEXT DEFAULT '',
        author TEXT DEFAULT '',
        category TEXT DEFAULT '',
        age_range TEXT DEFAULT 'L',
        language TEXT DEFAULT 'Português',
        pages INTEGER DEFAULT 0,
        year INTEGER,
        publisher TEXT DEFAULT '',
        rating NUMERIC DEFAULT 0,
        views INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Publicado',
        is_free BOOLEAN DEFAULT FALSE,
        price NUMERIC DEFAULT 0,
        promo_price NUMERIC DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        is_promotion BOOLEAN DEFAULT FALSE,
        featured BOOLEAN DEFAULT FALSE,
        whatsapp_number TEXT DEFAULT '',
        cover_url TEXT DEFAULT '',
        download_links JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL
      )
    `);

    const bookCount = await client.query('SELECT COUNT(*)::int AS total FROM books');
    if (bookCount.rows[0].total === 0) {
      const seed = readJsonFile(path.join(dataDir, 'books.json'));
      if (Array.isArray(seed)) {
        const insertSql = `INSERT INTO books (slug, title, subtitle, description, author, category, age_range, language, pages, year,
            publisher, rating, views, status, is_free, price, promo_price, discount, is_promotion, featured,
            whatsapp_number, cover_url, download_links)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
           ON CONFLICT (slug) DO NOTHING`;
        for (const book of seed) {
          await client.query(insertSql, bookToParams(book));
        }
      }
    }

    const settingsCount = await client.query('SELECT COUNT(*)::int AS total FROM settings');
    if (settingsCount.rows[0].total === 0) {
      const fileSettings = readJsonFile(path.join(dataDir, 'settings.json'));
      const merged = { ...DEFAULTS, ...(fileSettings || {}) };
      await client.query('INSERT INTO settings (id, data) VALUES (1, $1)', [JSON.stringify(merged)]);
    }
  } finally {
    client.release();
  }
  return true;
}

module.exports = { getPool, initDb, rowToBook, bookToParams, readJsonFile };
