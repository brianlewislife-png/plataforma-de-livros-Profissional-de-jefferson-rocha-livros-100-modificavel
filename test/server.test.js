const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

const { createServer } = require('node:http');

test('rota inicial responde com sucesso', async () => {
  const server = createServer(app);
  const response = await new Promise((resolve, reject) => {
    server.listen(0, () => {
      const { port } = server.address();
      const req = require('node:http').request({ port, path: '/' }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.end();
    });
  });
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /Jefferson Rocha Livros/i);
});

test('rota de catálogo com busca retorna resultados', async () => {
  const server = createServer(app);
  const response = await new Promise((resolve, reject) => {
    server.listen(0, () => {
      const { port } = server.address();
      const req = require('node:http').request({ port, path: '/livros?search=senhor' }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.end();
    });
  });
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /O Senhor dos Anéis/i);
});
