const { getFeaturedBooks, getLatestBooks, getPromotions, getBookBySlug, searchBooks } = require('../models/bookModel');
const { getSettings } = require('../models/settingsModel');

function home(req, res) {
  res.render('home', {
    settings: getSettings(),
    books: getFeaturedBooks(),
    latestBooks: getLatestBooks(),
    promotions: getPromotions()
  });
}

function catalog(req, res) {
  const settings = getSettings();
  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();
  let books = searchBooks(search);
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

function showBook(req, res) {
  const book = getBookBySlug(req.params.slug);
  if (!book) {
    return res.status(404).render('404');
  }
  res.render('book', {
    settings: getSettings(),
    book
  });
}

module.exports = { home, catalog, showBook };
