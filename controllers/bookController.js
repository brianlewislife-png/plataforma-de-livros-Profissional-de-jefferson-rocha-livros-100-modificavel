const { getFeaturedBooks, getLatestBooks, getPromotions, getBookBySlug, searchBooks } = require('../models/bookModel');
const { getSettings } = require('../models/settingsModel');

async function home(req, res) {
  const [settings, books, latestBooks, promotions] = await Promise.all([
    getSettings(),
    getFeaturedBooks(),
    getLatestBooks(),
    getPromotions()
  ]);
  res.render('home', {
    settings,
    books,
    latestBooks,
    promotions
  });
}

async function catalog(req, res) {
  const settings = await getSettings();
  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();
  let books = await searchBooks(search);
  if (category) {
    books = books.filter((book) => book.category === category);
  }
  res.render('catalog', {
    settings,
    books,
    search,
    category,
    categories: settings.categories
  });
}

async function showBook(req, res) {
  const book = await getBookBySlug(req.params.slug);
  if (!book) {
    return res.status(404).render('404');
  }
  res.render('book', {
    settings: await getSettings(),
    book
  });
}

module.exports = { home, catalog, showBook };
