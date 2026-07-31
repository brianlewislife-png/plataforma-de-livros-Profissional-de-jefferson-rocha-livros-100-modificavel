# Jefferson Rocha Livros

Plataforma web profissional, moderna e responsiva para catálogo de livros, páginas amigáveis, painel administrativo e fluxo de compra via WhatsApp.

## Como executar

1. Instale as dependências:
   `npm install`
2. Inicie o servidor:
   `npm start`
3. Acesse:
   - Homepage: `http://localhost:3000/`
   - Livro: `http://localhost:3000/livro/o-senhor-dos-aneis`

O painel administrativo fica em uma rota oculta (definida pela variável de ambiente `ADMIN_PATH`, padrão `/gestao-interna`). Credenciais e segredos também são configuráveis por variáveis de ambiente (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`).

## Estrutura

- `views/` para páginas EJS
- `public/` para CSS, JS e imagens
- `server.js` para configuração do Express
