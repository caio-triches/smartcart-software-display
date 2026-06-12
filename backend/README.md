# SmartCart Display Backend

API REST em PHP puro, seguindo a estrutura em camadas do projeto SmartCart original.

## Estrutura

```text
public/index.php
src/core
src/routes
src/controller
src/service
src/repository
database
```

## Rodar localmente

```bash
cd backend
Copy-Item .env.example .env
php -S localhost:3001 -t public public/index.php
```

Por padrao, a API usa MySQL puro. Configure o `.env` com as variaveis `DB_*` ou, no Railway, conecte um servico MySQL e use as variaveis `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER` e `MYSQLPASSWORD`.

O backend cria as tabelas e popula os produtos automaticamente na primeira request, usando `database/schema.sql`.

## Deploy no Railway

Crie dois services a partir deste mesmo repositorio:

1. Frontend
   - Root directory: `/`
   - Config file: `/railway.json`
   - Variaveis: nenhuma obrigatoria por enquanto

2. Backend
   - Root directory: `/backend`
   - Config file: `/backend/railway.json`
   - Adicione um plugin MySQL no Railway
   - Variaveis: use as variaveis `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD` do servico MySQL, ou mapeie para `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - `FRONTEND_URL`: URL publica do service frontend

## Rotas principais

- `GET /` health check
- `GET /product` lista produtos
- `GET /product/{id}` busca produto
- `GET /cart/{deviceId}` abre ou retorna sessao ativa do carrinho
- `GET /sessions` lista sessoes ativas e passadas
- `GET /sessions/{id}` mostra uma sessao com seus itens
- `POST /cart/{deviceId}/item` adiciona produto
- `POST /cart/{deviceId}/scan` simula leitura de sensor/balanca
- `DELETE /cart/{deviceId}/item/{itemId}` remove item
- `DELETE /cart/{deviceId}` limpa carrinho
- `POST /cart/{deviceId}/checkout` finaliza a compra
- `GET /order` lista pedidos finalizados
- `GET /order/{id}` mostra um pedido com seus itens
