const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const sanitizeHtml = require('sanitize-html');

const mainRoutes = require('./routes/mainRoutes');
const { router: adminRoutes, ADMIN_PATH } = require('./routes/adminRoutes');
const { getSettings } = require('./models/settingsModel');
const { ensureAdmin } = require('./models/adminModel');
const { ensureDataDir } = require('./models/dataPaths');
const { initDb } = require('./models/db');

ensureDataDir();
ensureAdmin();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (isProd) {
  app.set('trust proxy', 1);
}
app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https:'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'https:']
      }
    }
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
const DEFAULT_SECRET = 'jefferson-rocha-livros-secret';
const sessionSecret = process.env.SESSION_SECRET || DEFAULT_SECRET;
if (isProd && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEFAULT_SECRET)) {
  throw new Error('Defina a variável SESSION_SECRET com um valor forte em produção.');
}
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use(csrf({ cookie: { httpOnly: true, sameSite: 'lax', secure: isProd } }));

app.use(async (req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.siteTitle = 'Jefferson Rocha Livros';
  res.locals.adminPath = ADMIN_PATH;
  res.locals.settings = await getSettings();
  res.locals.sanitize = (value) => sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} });
  next();
});

app.use(ADMIN_PATH, (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'no-cache');
  }
  next();
});

app.use(mainRoutes);
app.use(ADMIN_PATH, adminRoutes);

app.use((req, res) => {
  res.status(404).render('404');
});

async function start() {
  try {
    await initDb();
  } catch (err) {
    console.error('Falha ao conectar ao banco de dados:', err && err.message ? err.message : err);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
