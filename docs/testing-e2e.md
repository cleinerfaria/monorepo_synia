# Workflow de testes E2E (Playwright + Supabase online dev)

Este fluxo usa um banco Supabase online de desenvolvimento, aplica migrations pendentes, cria/atualiza usuario de teste no Auth + `app_user` e roda Playwright.

## Pre-requisitos

- Supabase CLI instalado (`supabase --version`)
- Dependencias do projeto instaladas (`npm install`)
- Playwright instalado no ambiente:

```bash
npm run test:e2e:install
```

- Variaveis de ambiente configuradas (nao versionar secrets):
  - `SUPABASE_DEV_URL` (ex: `https://<project-ref>.supabase.co`)
  - `SUPABASE_DEV_ANON_KEY`
  - `SUPABASE_DEV_SERVICE_ROLE_KEY`
  - `SUPABASE_DEV_DB_URL` (Postgres connection string para `supabase db push`)

Opcional:

- `E2E_COMPANY_ID` (forca tenant alvo)
- `E2E_SKIP_MIGRATIONS=true` (nao roda `db push`)

## Comandos

Preparar somente ambiente remoto (migrations + seed de usuario):

```bash
npm run test:e2e:prepare
```

Rodar fluxo completo:

```bash
npm run test:e2e
```

Rodar com browser visivel:

```bash
npm run test:e2e:headed
```

## O que o workflow faz

1. Valida configuracao de ambiente remoto (`SUPABASE_DEV_*`)
2. Aplica migrations no banco remoto via `supabase db push --db-url ... --include-all --yes`
3. Cria/atualiza usuario de teste no Supabase Auth (admin API)
4. Cria/atualiza registro em `app_user` com perfil admin
5. Inicia app Vite em `http://127.0.0.1:4173`
6. Executa `playwright test`

## Variaveis opcionais

Voce pode sobrescrever os defaults antes de executar:

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `E2E_USER_NAME`
- `PLAYWRIGHT_BASE_URL` (default: `http://127.0.0.1:4173`)

O script tambem gera `e2e/.env.runtime` para inspecao local (arquivo ignorado no git).
