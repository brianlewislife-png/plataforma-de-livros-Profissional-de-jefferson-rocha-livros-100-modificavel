const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { getAllBooks, getBookById, createBook, updateBook, deleteBook, duplicateBook } = require('../models/bookModel');
const { getSettings, updateSettings } = require('../models/settingsModel');
const { verifyPassword, getAdmin } = require('../models/adminModel');

const ADMIN_PATH = process.env.ADMIN_PATH || '/gestao-interna';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@jeffersonrocha.com';

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminLoggedIn) {
    return next();
  }
  return res.redirect(`${ADMIN_PATH}/login`);
}

function isTruthy(value) {
  return value === 'on' || value === true || value === '1';
}

function bookTypeIsFree(data) {
  if (data.bookType !== undefined) {
    return data.bookType === 'free';
  }
  return isTruthy(data.isFree);
}

function sanitizeWhatsapp(value) {
  return String(value || '').replace(/\D/g, '');
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

function mergeLinks(data) {
  const primary = String(data.downloadLink || '').trim();
  const extra = parseLinks(data.downloadLinksExtra);
  const links = [];
  if (primary) {
    links.push(primary);
  }
  links.push(...extra);
  return links;
}

function bookFromForm(data) {
  return {
    id: data.id ? Number(data.id) : null,
    title: data.title || '',
    subtitle: data.subtitle || '',
    description: data.description || '',
    author: data.author || '',
    category: data.category || '',
    ageRange: data.ageRange || 'L',
    language: data.language || 'Português',
    pages: data.pages,
    year: data.year,
    publisher: data.publisher || '',
    rating: data.rating,
    status: data.status || 'Publicado',
    isFree: bookTypeIsFree(data),
    price: data.price,
    promoPrice: data.promoPrice,
    discount: data.discount,
    isPromotion: isTruthy(data.isPromotion),
    featured: isTruthy(data.featured),
    whatsappNumber: sanitizeWhatsapp(data.whatsappNumber),
    coverUrl: data.coverUrl || '',
    downloadLinks: mergeLinks(data)
  };
}

function renderFormWithError(res, book, mode, message) {
  return res.status(400).render('admin/form', {
    book,
    mode,
    active: mode === 'edit' ? 'livros' : 'novo',
    error: message
  });
}

function validateBook(data) {
  const isFree = bookTypeIsFree(data);
  if (isFree && mergeLinks(data).length === 0) {
    return 'Livros gratuitos precisam de pelo menos um link de download (MediaFire ou Mega).';
  }
  if (!isFree && !sanitizeWhatsapp(data.whatsappNumber)) {
    return 'Livros pagos precisam de um número de WhatsApp para receber pedidos de compra.';
  }
  return null;
}

/* ---------- Segurança do login: limite de tentativas + bloqueio ---------- */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).render('admin/login', { error: 'Muitas tentativas de login. Aguarde alguns minutos.' })
});

const loginFailures = new Map();
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

function isLocked(ip) {
  const rec = loginFailures.get(ip);
  if (!rec) {
    return false;
  }
  if (Date.now() >= rec.until) {
    loginFailures.delete(ip);
    return false;
  }
  return rec.count >= MAX_FAILURES;
}

function recordFailure(ip) {
  const rec = loginFailures.get(ip) || { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= MAX_FAILURES) {
    rec.until = Date.now() + LOCK_MINUTES * 60 * 1000;
  }
  loginFailures.set(ip, rec);
}

router.get('/login', (req, res) => res.render('admin/login', { error: null }));
router.post('/login', loginLimiter, (req, res) => {
  const ip = req.ip || 'unknown';
  if (isLocked(ip)) {
    return res.status(429).render('admin/login', { error: 'Conta temporariamente bloqueada por tentativas repetidas. Tente novamente mais tarde.' });
  }
  const { email, password } = req.body;
  const admin = getAdmin();
  const adminEmail = process.env.ADMIN_EMAIL || (admin && admin.email) || ADMIN_EMAIL;
  const valid = email === adminEmail && verifyPassword(password, admin && admin.passwordHash);
  if (valid) {
    loginFailures.delete(ip);
    return req.session.regenerate((err) => {
      req.session.adminLoggedIn = true;
      req.session.adminEmail = email;
      return res.redirect(`${ADMIN_PATH}/dashboard`);
    });
  }
  recordFailure(ip);
  return res.status(401).render('admin/login', { error: 'Credenciais inválidas.' });
});

router.get('/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.get('/dashboard', requireAdmin, (req, res) => {
  const books = getAllBooks();
  res.render('admin/dashboard', {
    active: 'dashboard',
    adminEmail: req.session.adminEmail,
    stats: {
      total: books.length,
      free: books.filter((book) => book.isFree).length,
      paid: books.filter((book) => !book.isFree).length,
      promotions: books.filter((book) => book.isPromotion).length
    }
  });
});

router.get('/livros', requireAdmin, (req, res) => {
  res.render('admin/books', { books: getAllBooks(), active: 'livros' });
});

router.get('/livros/novo', requireAdmin, (req, res) => {
  res.render('admin/form', { book: null, mode: 'create', active: 'novo', error: null });
});

router.post('/livros', requireAdmin, (req, res) => {
  const body = { ...req.body, isFree: bookTypeIsFree(req.body), downloadLinks: mergeLinks(req.body) };
  const error = validateBook(body);
  if (error) {
    return renderFormWithError(res, bookFromForm(body), 'create', error);
  }
  createBook(body);
  res.redirect(`${ADMIN_PATH}/livros`);
});

router.get('/livros/:id/editar', requireAdmin, (req, res) => {
  const book = getBookById(req.params.id);
  if (!book) {
    return res.status(404).send('Livro não encontrado');
  }
  return res.render('admin/form', { book, mode: 'edit', active: 'livros', error: null });
});

router.post('/livros/:id/editar', requireAdmin, (req, res) => {
  const body = { ...req.body, isFree: bookTypeIsFree(req.body), downloadLinks: mergeLinks(req.body) };
  const error = validateBook(body);
  if (error) {
    return renderFormWithError(res, bookFromForm({ ...body, id: req.params.id }), 'edit', error);
  }
  updateBook(req.params.id, body);
  res.redirect(`${ADMIN_PATH}/livros`);
});

router.post('/livros/:id/excluir', requireAdmin, (req, res) => {
  deleteBook(req.params.id);
  res.redirect(`${ADMIN_PATH}/livros`);
});

router.post('/livros/:id/duplicar', requireAdmin, (req, res) => {
  duplicateBook(req.params.id);
  res.redirect(`${ADMIN_PATH}/livros`);
});

router.get('/configuracoes', requireAdmin, (req, res) => {
  res.render('admin/settings', {
    settings: getSettings(),
    active: 'configuracoes',
    saved: req.query.saved === '1'
  });
});

router.post('/configuracoes', requireAdmin, (req, res) => {
  updateSettings(req.body);
  res.redirect(`${ADMIN_PATH}/configuracoes?saved=1`);
});

module.exports = { router, ADMIN_PATH };
