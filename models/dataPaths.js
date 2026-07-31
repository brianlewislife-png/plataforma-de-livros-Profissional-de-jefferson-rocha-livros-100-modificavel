const fs = require('fs');
const path = require('path');

const defaultDataDir = path.join(__dirname, '..', 'data');
const dataDir = path.resolve(process.env.DATA_DIR || defaultDataDir);

const SEED_FILES = ['books.json', 'settings.json', 'admin.json'];

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
  for (const file of SEED_FILES) {
    const target = path.join(dataDir, file);
    if (!fs.existsSync(target)) {
      const source = path.join(defaultDataDir, file);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
      }
    }
  }
  return dataDir;
}

module.exports = { dataDir, defaultDataDir, ensureDataDir };
