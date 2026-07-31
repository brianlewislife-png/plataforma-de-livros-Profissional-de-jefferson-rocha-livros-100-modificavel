const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { dataDir } = require('./dataPaths');

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
  const data = fs.readFileSync(booksFile, 'utf8');
  return JSON.parse(data);
}

function writeBooks(books) {
  const tmp = `${booksFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(books, null, 2));
  fs.renameSync(tmp, booksFile);
}

function getAllBooks() {
  return readBooks();
}

function getFeaturedBooks() {
  const featured = getAllBooks().filter((book) => book.featured).slice(0, 4);
  return featured.length ? featured : getAllBooks().slice(0, 4);
}

function getLatestBooks() {
  return [...getAllBooks()].sort((a, b) => b.id - a.id).slice(0, 4);
}

function getPromotions() {
  return getAllBooks().filter((book) => book.isPromotion).slice(0, 3);
}

function getBookBySlug(slug) {
  return getAllBooks().find((book) => book.slug === slug) || null;
}

function getBookById(id) {
  return getAllBooks().find((book) => book.id === Number(id)) || null;
}

function searchBooks(query) {
  const term = String(query || '').trim().toLowerCase();
  const books = getAllBooks();
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

function createBook(data) {
  const books = getAllBooks();
  const nextId = books.length ? Math.max(...books.map((book) => book.id)) + 1 : 1;
  const title = sanitizeValue(data.title);
  const book = {
    id: nextId,
    slug: sanitizeValue(data.slug) || generateSlug(title, nextId),
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
  books.push(book);
  writeBooks(books);
  return book;
}

function updateBook(id, data) {
  const books = getAllBooks();
  const index = books.findIndex((book) => book.id === Number(id));
  if (index === -1) {
    return null;
  }
  const current = books[index];
  const title = sanitizeValue(data.title) || current.title;
  books[index] = {
    ...current,
    id: Number(id),
    slug: sanitizeValue(data.slug) || generateSlug(title, id),
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

function deleteBook(id) {
  const books = getAllBooks().filter((book) => book.id !== Number(id));
  writeBooks(books);
  return books;
}

function duplicateBook(id) {
  const source = getBookById(id);
  if (!source) {
    return null;
  }
  const { ...copy } = source;
  const books = getAllBooks();
  const nextId = books.length ? Math.max(...books.map((book) => book.id)) + 1 : 1;
  copy.id = nextId;
  copy.title = `${source.title} (cópia)`;
  copy.slug = `${source.slug}-copia`;
  books.push(copy);
  writeBooks(books);
  return copy;
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
