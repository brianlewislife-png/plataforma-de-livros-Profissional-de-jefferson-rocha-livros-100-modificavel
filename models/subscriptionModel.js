const fs = require('fs');
const path = require('path');
const { dataDir } = require('./dataPaths');
const { getPool, readJsonFile } = require('./db');

const subsFile = path.join(dataDir, 'push_subscriptions.json');

function readSubsFile() {
  const data = readJsonFile(subsFile);
  return Array.isArray(data) ? data : [];
}

function writeSubsFile(subs) {
  fs.writeFileSync(subsFile, JSON.stringify(subs, null, 2));
}

function normalize(subscription) {
  const sub = subscription && subscription.subscription ? subscription.subscription : subscription;
  if (!sub || typeof sub !== 'object' || !sub.endpoint || typeof sub.endpoint !== 'string' || !sub.keys) {
    return null;
  }
  const endpoint = sub.endpoint.trim();
  if (!/^https?:\/\//.test(endpoint) || !sub.keys.p256dh || !sub.keys.auth) {
    return null;
  }
  return { endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, createdAt: new Date().toISOString() };
}

async function saveSubscription(subscription) {
  const clean = normalize(subscription);
  if (!clean) {
    return null;
  }
  const pool = getPool();
  if (pool) {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [clean.endpoint, clean.keys.p256dh, clean.keys.auth, clean.createdAt]
    );
    return clean;
  }
  const subs = readSubsFile().filter((s) => s.endpoint !== clean.endpoint);
  subs.push(clean);
  writeSubsFile(subs);
  return clean;
}

async function deleteSubscription(endpoint) {
  const pool = getPool();
  if (pool) {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    return;
  }
  const subs = readSubsFile().filter((s) => s.endpoint !== endpoint);
  writeSubsFile(subs);
}

async function getAllSubscriptions() {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query('SELECT endpoint, p256dh, auth FROM push_subscriptions');
    return rows.map((row) => ({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }));
  }
  return readSubsFile().map((s) => ({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }));
}

module.exports = { saveSubscription, deleteSubscription, getAllSubscriptions };
