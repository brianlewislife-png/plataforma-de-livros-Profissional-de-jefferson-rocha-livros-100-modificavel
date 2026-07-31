const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { dataDir } = require('./dataPaths');

const settingsFile = path.join(dataDir, 'settings.json');

const defaults = {
  siteTitle: 'Jefferson Rocha Livros',
  tagline: 'Coleção premium',
  heroTitle: 'Descubra histórias que transformam a sua rotina.',
  heroText: 'Uma experiência elegante de leitura com lançamentos, promoções e títulos especiais em um só lugar.',
  whatsapp: '5511999999999',
  instagram: 'https://instagram.com/brian_lewis_2',
  footerText: '© 2026 Jefferson Rocha Livros. Todos os direitos reservados.',
  creditText: 'Desenvolvido por Brian Lewis',
  categories: [
    'Ação e Aventura',
    'Arte',
    'Autoajuda',
    'Biografia',
    'Ciência',
    'Clássicos',
    'Contos',
    'Crime',
    'Direito',
    'Economia',
    'Educação',
    'Espiritualidade',
    'Fantasia',
    'Ficção Científica',
    'Ficção Histórica',
    'Filosofia',
    'Finanças',
    'Gastronomia',
    'História',
    'Humor',
    'Infantil',
    'Informática e Tecnologia',
    'Jovem Adulto',
    'Literatura Brasileira',
    'Literatura Estrangeira',
    'Marketing',
    'Matemática',
    'Medicina',
    'Mistério',
    'Música',
    'Negócios',
    'Poesia',
    'Política',
    'Psicologia',
    'Religião',
    'Romance',
    'Saúde e Bem-estar',
    'Suspense',
    'Terror',
    'Thriller',
    'Turismo',
    'Viagem'
  ]
};

function sanitize(value) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();
}

function readSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    return { ...defaults, ...data };
  } catch (err) {
    return { ...defaults };
  }
}

function writeSettings(settings) {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
}

function parseLines(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getSettings() {
  return readSettings();
}

function updateSettings(data) {
  const current = readSettings();
  const next = {
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
  const rawCategories = data.categories !== undefined ? parseLines(data.categories) : current.categories;
  next.categories = rawCategories.length ? rawCategories : current.categories;
  writeSettings(next);
  return next;
}

module.exports = { getSettings, updateSettings };
