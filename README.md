# SmartCart Software Display

Simulador da tela embarcada do carrinho inteligente SmartCart.

## Stack

- React + Vite
- Tailwind CSS
- Lucide React
- React QR Code

## Rodar localmente

Frontend:

```bash
Copy-Item .env.example .env
npm install
npm run dev
```

O Vite sobe em `http://localhost:5173` por padrao.
Use `VITE_API_URL` para apontar para o backend.

Backend:

```bash
cd backend
Copy-Item .env.example .env
php -S localhost:3001 -t public public/index.php
```

A API sobe em `http://localhost:3001` e usa MySQL.

## Deploy no Railway

Use dois services no Railway:

- Frontend: root `/`, config `/railway.json`.
- Backend: root `/backend`, config `/backend/railway.json`, conectado a um MySQL do Railway.

No service frontend, configure `VITE_API_URL` com a URL publica do backend.
