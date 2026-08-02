const webpush = require('web-push');
const { SUBJECT, PUBLIC_KEY, PRIVATE_KEY } = require('../config/push');
const { getAllSubscriptions, deleteSubscription } = require('../models/subscriptionModel');

webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

const ICON_URL = '/icons/icon-192.png';

function buildPayload({ title, body, url }) {
  return JSON.stringify({
    title,
    body,
    url,
    icon: ICON_URL,
    badge: ICON_URL
  });
}

async function notifyNewBook(book) {
  const title = 'Novo livro disponível!';
  const body = `${book.title}${book.author ? ' — ' + book.author : ''} já está no catálogo.`;
  const url = `/livro/${book.slug}`;
  const payload = buildPayload({ title, body, url });
  await notifyAll(payload);
}

async function notifyAll(payload) {
  let subs;
  try {
    subs = await getAllSubscriptions();
  } catch (err) {
    return;
  }
  if (!subs.length) {
    return;
  }
  const results = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub, payload))
  );
  results.forEach((result, index) => {
    const sub = subs[index];
    const status = result.status === 'rejected' && result.reason && result.reason.statusCode;
    if (status === 404 || status === 410) {
      deleteSubscription(sub.endpoint).catch(() => {});
    }
  });
}

module.exports = { notifyNewBook, notifyAll };
