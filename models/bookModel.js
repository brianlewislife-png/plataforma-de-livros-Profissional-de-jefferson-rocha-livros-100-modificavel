const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { dataDir } = require('./dataPaths');
const { getPool, rowToBook, bookToParams, readJsonFile } = require('./db');

const booksFile = path.join(dataDir, 'books.json');

function sanitizeValue(value) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();
}

function parseLinks(value) {
  if (Array.isArray(value)) {
    return value.map((link) => link.trim()).filter(Boolean);
  }
  return String(value || '')
    .split('\n')
    .map((link) => link.trim())
    .filter(Boolean);
}

function toBoolean(value) {
  return value === 'on' || value === 'true' || value === true || value === '1';
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && String(value) !== '' ? n : Number(fallback || 0);
}

function generateSlug(title, id) {
  const base = String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `livro-${id}`;
}

function readBooks() {
  return readJsonFile(booksFile) || [];
}

function writeBooks(books) {
  const tmp = `${booksFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(books, null, 2));
  fs.renameSync(tmp, booksFile);
}

function nextId(books) {
  return books.length ? Math.max(...books.map((book) => book.id)) + 1 : 1;
}

async function getAllBooks() {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM books ORDER BY id ASC');
    return rows.map(rowToBook);
  }
  return readBooks();
}

async function getFeaturedBooks() {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query(
      'SELECT * FROM books WHERE featured = TRUE ORDER BY id ASC LIMIT 4'
    );
    if (rows.length) {
      return rows.map(rowToBook);
    }
    const { rows: fallback } = await pool.query('SELECT * FROM books ORDER BY id ASC LIMIT 4');
    return fallback.map(rowToBook);
  }
  const all = await getAllBooks();
  const featured = all.filter((book) => book.featured).slice(0, 4);
  return featured.length ? featured : all.slice(0, 4);
}

async function getLatestBooks() {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM books ORDER BY id DESC LIMIT 4');
    return rows.map(rowToBook);
  }
  const all = await getAllBooks();
  return [...all].sort((a, b) => b.id - a.id).slice(0, 4);
}

async function getPromotions() {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query(
      'SELECT * FROM books WHERE is_promotion = TRUE ORDER BY id ASC LIMIT 3'
    );
    return rows.map(rowToBook);
  }
  return (await getAllBooks()).filter((book) => book.isPromotion).slice(0, 3);
}

async function getBookBySlug(slug) {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM books WHERE slug = $1', [String(slug || '')]);
    return rows.length ? rowToBook(rows[0]) : null;
  }
  return (await getAllBooks()).find((book) => book.slug === slug) || null;
}

async function getBookById(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) {
    return null;
  }
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM books WHERE id = $1', [num]);
    return rows.length ? rowToBook(rows[0]) : null;
  }
  return (await getAllBooks()).find((book) => book.id === num) || null;
}

async function searchBooks(query) {
  const term = String(query || '').trim().toLowerCase();
  const pool = getPool();
  if (pool) {
    if (!term) {
      const { rows } = await pool.query('SELECT * FROM books ORDER BY id ASC');
      return rows.map(rowToBook);
    }
    const like = `%${term}%`;
    const { rows } = await pool.query(
      `SELECT * FROM books
       WHERE title ILIKE $1 OR author ILIKE $1 OR category ILIKE $1 OR subtitle ILIKE $1 OR description ILIKE $1
       ORDER BY id ASC`,
      [like]
    );
    return rows.map(rowToBook);
  }
  const books = readBooks();
  if (!term) {
    return books;
  }
  return books.filter((book) => {
    return [book.title, book.author, book.category, book.subtitle, book.description]
      .join(' ')
      .toLowerCase()
      .includes(term);
  });
}

async function createBook(data) {
  const title = sanitizeValue(data.title);
  const book = {
    slug: sanitizeValue(data.slug) || generateSlug(title, Date.now() % 100000),
    title,
    subtitle: sanitizeValue(data.subtitle),
    description: sanitizeValue(data.description),
    author: sanitizeValue(data.author),
    category: sanitizeValue(data.category || 'Geral'),
    ageRange: sanitizeValue(data.ageRange || 'L'),
    language: sanitizeValue(data.language || 'Português'),
    pages: toNumber(data.pages, 0),
    year: toNumber(data.year, 2024),
    publisher: sanitizeValue(data.publisher),
    rating: toNumber(data.rating, 0),
    views: toNumber(data.views, 0),
    status: sanitizeValue(data.status || 'Publicado'),
    isFree: toBoolean(data.isFree),
    price: toNumber(data.price, 0),
    promoPrice: toNumber(data.promoPrice, 0),
    discount: toNumber(data.discount, 0),
    isPromotion: toBoolean(data.isPromotion),
    featured: toBoolean(data.featured),
    whatsappNumber: String(data.whatsappNumber || '').replace(/\D/g, ''),
    coverUrl: sanitizeValue(data.coverUrl),
    downloadLinks: parseLinks(data.downloadLinks)
  };
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO books (slug, title, subtitle, description, author, category, age_range, language, pages, year,
        publisher, rating, views, status, is_free, price, promo_price, discount, is_promotion, featured,
        whatsapp_number, cover_url, download_links)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      bookToParams(book)
    );
    return rowToBook(rows[0]);
  }
  const books = readBooks();
  const next = { ...book, id: nextId(books) };
  books.push(next);
  writeBooks(books);
  return next;
}

async function updateBook(id, data) {
  const num = Number(id);
  if (!Number.isFinite(num)) {
    return null;
  }
  const pool = getPool();
  if (pool) {
    const existing = await pool.query('SELECT * FROM books WHERE id = $1', [num]);
    if (!existing.rows.length) {
      return null;
    }
    const current = rowToBook(existing.rows[0]);
    const title = sanitizeValue(data.title) || current.title;
    const book = {
      slug: sanitizeValue(data.slug) || generateSlug(title, num),
      title,
      subtitle: sanitizeValue(data.subtitle),
      description: sanitizeValue(data.description),
      author: sanitizeValue(data.author),
      category: sanitizeValue(data.category || current.category),
      ageRange: sanitizeValue(data.ageRange || current.ageRange),
      language: sanitizeValue(data.language || current.language),
      pages: toNumber(data.pages, current.pages),
      year: toNumber(data.year, current.year),
      publisher: sanitizeValue(data.publisher),
      rating: toNumber(data.rating, current.rating),
      views: toNumber(data.views, current.views),
      status: sanitizeValue(data.status || current.status),
      isFree: toBoolean(data.isFree),
      price: toNumber(data.price, current.price),
      promoPrice: toNumber(data.promoPrice, current.promoPrice),
      discount: toNumber(data.discount, current.discount),
      isPromotion: toBoolean(data.isPromotion),
      featured: toBoolean(data.featured),
      whatsappNumber: String(data.whatsappNumber || '').replace(/\D/g, ''),
      coverUrl: sanitizeValue(data.coverUrl),
      downloadLinks: parseLinks(data.downloadLinks)
    };
    const { rows } = await pool.query(
      `UPDATE books SET slug=$2, title=$3, subtitle=$4, description=$5, author=$6, category=$7, age_range=$8,
        language=$9, pages=$10, year=$11, publisher=$12, rating=$13, views=$14, status=$15, is_free=$16,
        price=$17, promo_price=$18, discount=$19, is_promotion=$20, featured=$21, whatsapp_number=$22,
        cover_url=$23, download_links=$24
       WHERE id=$1 RETURNING *`,
      [num, ...bookToParams(book)]
    );
    return rowToBook(rows[0]);
  }
  const books = readBooks();
  const index = books.findIndex((book) => book.id === num);
  if (index === -1) {
    return null;
  }
  const current = books[index];
  const title = sanitizeValue(data.title) || current.title;
  books[index] = {
    ...current,
    slug: sanitizeValue(data.slug) || generateSlug(title, num),
    title,
    subtitle: sanitizeValue(data.subtitle),
    description: sanitizeValue(data.description),
    author: sanitizeValue(data.author),
    category: sanitizeValue(data.category || current.category),
    ageRange: sanitizeValue(data.ageRange || current.ageRange),
    language: sanitizeValue(data.language || current.language),
    pages: toNumber(data.pages, current.pages),
    year: toNumber(data.year, current.year),
    publisher: sanitizeValue(data.publisher),
    rating: toNumber(data.rating, current.rating),
    views: toNumber(data.views, current.views),
    status: sanitizeValue(data.status || current.status),
    isFree: toBoolean(data.isFree),
    price: toNumber(data.price, current.price),
    promoPrice: toNumber(data.promoPrice, current.promoPrice),
    discount: toNumber(data.discount, current.discount),
    isPromotion: toBoolean(data.isPromotion),
    featured: toBoolean(data.featured),
    whatsappNumber: String(data.whatsappNumber || '').replace(/\D/g, ''),
    coverUrl: sanitizeValue(data.coverUrl),
    downloadLinks: parseLinks(data.downloadLinks)
  };
  writeBooks(books);
  return books[index];
}

async function deleteBook(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) {
    return readBooks();
  }
  const pool = getPool();
  if (pool) {
    await pool.query('DELETE FROM books WHERE id = $1', [num]);
    const { rows } = await pool.query('SELECT * FROM books ORDER BY id ASC');
    return rows.map(rowToBook);
  }
  const books = readBooks().filter((book) => book.id !== num);
  writeBooks(books);
  return books;
}

async function duplicateBook(id) {
  const source = await getBookById(id);
  if (!source) {
    return null;
  }
  const copy = { ...source, title: `${source.title} (cópia)`, slug: `${source.slug}-copia` };
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO books (slug, title, subtitle, description, author, category, age_range, language, pages, year,
        publisher, rating, views, status, is_free, price, promo_price, discount, is_promotion, featured,
        whatsapp_number, cover_url, download_links)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      bookToParams(copy)
    );
    return rowToBook(rows[0]);
  }
  const books = readBooks();
  const next = { ...copy, id: nextId(books) };
  books.push(next);
  writeBooks(books);
  return next;
}

module.exports = {
  getAllBooks,
  getFeaturedBooks,
  getLatestBooks,
  getPromotions,
  getBookBySlug,
  getBookById,
  searchBooks,
  createBook,
  updateBook,
  deleteBook,
  duplicateBook
};
