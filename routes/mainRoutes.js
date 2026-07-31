const express = require('express');
const router = express.Router();
const { home, catalog, showBook } = require('../controllers/bookController');

router.get('/', home);
router.get('/livros', catalog);
router.get('/livro/:slug', showBook);
router.get('/livros/:slug', showBook);

module.exports = router;
