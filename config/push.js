const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@jeffersonrocha.com';
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAx4GkqlqoNNkjFsK54E6ZwMrj1H4uHVdREE5TPQNEuc_Kkx42KmHwjHAUFSf0PphPMDOD555wqGIBHW3FzfCOw';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'o6ym1oAAjv-HHiRUOciFIKqEIONZiKp7OjZZqtR6Suw';

module.exports = { SUBJECT, PUBLIC_KEY, PRIVATE_KEY };
