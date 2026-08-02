const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { home, catalog, showBook } = require('../controllers/bookController');
const { saveSubscription, deleteSubscription } = require('../models/subscriptionModel');

const pushLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

router.get('/', home);
router.get('/livros', catalog);
router.get('/livro/:slug', showBook);
router.get('/livros/:slug', showBook);

router.post('/api/push/subscribe', pushLimiter, async (req, res) => {
  try {
    const saved = await saveSubscription(req.body);
    if (!saved) {
      return res.status(400).json({ ok: false, error: 'Inscrição inválida.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Erro ao salvar inscrição.' });
  }
});

router.post('/api/push/unsubscribe', pushLimiter, async (req, res) => {
  try {
    const endpoint = req.body && req.body.endpoint;
    if (typeof endpoint === 'string') {
      await deleteSubscription(endpoint);
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Erro ao remover inscrição.' });
  }
});

module.exports = router;
