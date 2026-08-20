<img width="717" height="1600" alt="image" src="https://github.com/user-attachments/assets/9eb2f5ac-e4be-4a9f-89be-35319310a756" />


<img width="717" height="1600" alt="image" src="https://github.com/user-attachments/assets/d2cf0beb-d45d-4e5e-ba72-33cb028db031" />


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
