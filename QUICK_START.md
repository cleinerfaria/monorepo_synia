# QUICK_START — Monorepo Synia

> Guia de referência rápida para desenvolvedores e agentes de IA.
> Para regras de agente IA, veja também `CLAUDE.md`, `AGENTS.md`, `ANTIGRAVITY.md` e `docs/agent/rules/`.

---

## Visão Geral

Este é um **npm workspaces monorepo** com dois produtos React/TypeScript rodando sobre Supabase.

```
monorepo_synia/
├── apps/
│   ├── vidasystem/        → App de gestão de home care (VidaSystem)
│   └── whitelabel/        → Plataforma SaaS white label (dashboard + WhatsApp)
├── packages/
│   ├── db-vidasystem/     → Migrations e scripts do banco VidaSystem
│   ├── db-whitelabel/     → Migrations e scripts do banco White Label
│   ├── ui/                → Biblioteca de componentes compartilhada (@synia/ui)
│   └── config/            → Configs compartilhadas (ESLint, Prettier, Tailwind, TS)
├── scripts/               → Scripts de automação (dev, migrate, release)
├── docs/                  → Documentação técnica detalhada
├── .github/workflows/     → CI/CD (GitHub Actions)
├── CLAUDE.md              → Regras para agentes de IA
└── QUICK_START.md         → Este arquivo
```

---

## Stack

| Camada         | Tecnologia                                   |
| -------------- | -------------------------------------------- |
| Frontend       | React 18, TypeScript 5.3, Vite 7             |
| Estilos        | TailwindCSS 3.4, CSS Variables               |
| Estado         | Zustand, TanStack React Query v5             |
| Formulários    | React Hook Form                              |
| Roteamento     | React Router v6                              |
| Gráficos       | Recharts (VidaSystem), ECharts (White Label) |
| Banco de dados | Supabase (PostgreSQL + RLS + Auth)           |
| Testes         | Vitest (unit), Playwright (E2E), MSW (mocks) |
| Linting        | ESLint 10, Prettier                          |
| CI/CD          | GitHub Actions                               |
| Deploy         | Docker + Railway                             |

---

## Pré-requisitos

- **Node.js 22** (mínimo 18) — `node --version`
- **npm 10+** — `npm --version`
- **Git** com acesso ao repositório
- **Supabase CLI** — instalado via `npx supabase` (sem necessidade de instalar globalmente)
- Acesso aos projetos Supabase remotos (URLs + chaves nos `.env`)

> **Windows**: use Git Bash ou WSL2. Todos os comandos assumem sintaxe Unix (forward slashes, etc.)

---

## Setup Inicial (Primeira Vez)

### Passo 1 — Clonar e instalar dependências

```bash
git clone https://github.com/cleinerfaria/monorepo_synia.git
cd monorepo_synia
npm install
```

O `npm install` na raiz instala dependências de **todos** os workspaces automaticamente.

### Passo 2 — Instalar git hooks

```bash
npm run hooks:install
```

Configura pre-commit checks: format, lint, encoding, build.

### Passo 3 — Configurar variáveis de ambiente

Copie os arquivos de exemplo e preencha com as credenciais do projeto:

```bash
cp apps/vidasystem/.env.example  apps/vidasystem/.env.local
cp apps/whitelabel/.env.example  apps/whitelabel/.env.local
```

Variáveis obrigatórias em cada `.env.local`:

```env
# URL e chave anônima do projeto Supabase (pública, usada no frontend)
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<jwt-anon-key>

# Service role key (usada só em scripts de migração/seed, NUNCA no frontend)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Token de acesso ao Supabase CLI (para migrations remotas)
SUPABASE_ACCESS_TOKEN=<personal-access-token>

# URL direta do banco PostgreSQL (para migrations via CLI)
DB_URL=postgresql://postgres:<senha>@<host>:5432/postgres
```

PARA COLOCAR O PROJETO EM PRODUÇÃO SÓ SERÁ NECESSÁRIOS AS VARIÁVEIS `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
AS DEMAIS VARIÁVEIS JÁ ESTÃO DENTRO DO GITHUB ACTIONS PARA O FLUXO DE CI/CD

> As URLs e project refs dos dois projetos Supabase são **diferentes** — não misture.

### Passo 4 — Aplicar migrations (schema do banco)

```bash
npm run db:migrate:vidasystem
npm run db:migrate:whitelabel
```

Isso aplica todas as migrations pendentes no banco remoto correspondente.

### Passo 5 — Popular banco com dados de desenvolvimento (opcional)

```bash
npm run db:seed:dev:vidasystem
npm run db:seed:dev:whitelabel
```

### Passo 6 — Iniciar o servidor de desenvolvimento

```bash
# VidaSystem (porta 3000 ou próxima disponível)
npm run dev:vidasystem

# White Label (porta 3000 ou próxima disponível)
npm run dev:whitelabel
```

# Menu interativo para escolher qual app iniciar

npm run dev

```

Acesse: `http://localhost:3000`

---

## Regras Absolutas sobre Banco de Dados

> **Estas regras são obrigatórias. Ignorá-las pode causar corrupção ou perda de dados.**

1. **Os scripts foram projetados para rodar no Supabase remoto** — NUNCA execute `supabase db` localmente ou aponte para um banco local
2. **NUNCA execute `supabase db`** diretamente da raiz do projeto
3. **NUNCA copie migrations** para `supabase/migrations/` na raiz
4. **SEMPRE use os scripts npm** para migrations:
   - `npm run db:migrate:vidasystem` → aplica no banco VidaSystem
   - `npm run db:migrate:whitelabel` → aplica no banco White Label
5. Migrations ficam **isoladas** em `packages/db-vidasystem/` e `packages/db-whitelabel/`
6. **NUNCA altere** migrations que já foram aplicadas em produção

---

## Scripts Disponíveis

### Desenvolvimento

| Comando                                 | O que faz                               |
|-----------------------------------------|-----------------------------------------|
| `npm run dev`                           | Menu interativo para escolher app       |
| `npm run dev:vidasystem`                | Inicia VidaSystem em modo dev           |
| `npm run dev:whitelabel`                | Inicia White Label em modo dev          |

### Build

| Comando                                 | O que faz                               |
|-----------------------------------------|-----------------------------------------|
| `npm run build`                         | Build de todos os apps                  |
| `npm run build -w vidasystem`           | Build só do VidaSystem                  |
| `npm run build -w whitelabel`           | Build só do White Label                 |

### Banco de Dados

| Comando                                 | O que faz                                  |
|-----------------------------------------|-----------------------------------------   |
| `npm run db:migrate:vidasystem`         | Aplica migrations VidaSystem (remoto)      |
| `npm run db:migrate:whitelabel`         | Aplica migrations White Label (remoto)     |
| `npm run db:seed:dev:vidasystem`        | Popula banco VidaSystem com dados de dev   |
| `npm run db:seed:dev:whitelabel`        | Popula banco White Label com dados de dev  |
| `npm run db:reset:vidasystem`           | **DESTRUTIVO** — reseta banco VidaSystem   |
| `npm run db:reset:whitelabel`           | **DESTRUTIVO** — reseta banco White Label  |

### Qualidade de Código

| Comando                                 | O que faz                               |
|-----------------------------------------|-----------------------------------------|
| `npm run lint`                          | ESLint em todos os apps                 |
| `npm run lint:fix -w vidasystem`        | ESLint com autocorreção                 |
| `npm run format`                        | Prettier em todos os arquivos           |
| `npm run typecheck -w vidasystem`       | Type checking TypeScript                |
| `npm run precommit:check`               | Valida tudo antes de commit             |

### Testes

| Comando                                 | O que faz                              |
|-----------------------------------------|----------------------------------------|
| `npm run test -w vidasystem`            | Testes unitários (Vitest, watch)       |
| `npm run test:run -w vidasystem`        | Testes unitários (CI, sem watch)       |
| `npm run test:coverage -w vidasystem`   | Testes com relatório de cobertura      |
| `npm run test:e2e -w vidasystem`        | Testes E2E (Playwright)                |
| `npm run test:e2e:ui -w vidasystem`     | E2E com UI interativo do Playwright    |

### Utilitários

| Comando                                 | O que faz                              |
|-----------------------------------------|----------------------------------------|
| `npm run hooks:install`                 | Instala git hooks (pre-commit)         |
| `npm run release`                       | Menu interativo para release           |

---

## Estrutura Interna dos Apps

Ambos os apps seguem a mesma estrutura:

```

apps/<nome>/src/
├── components/ → Componentes React reutilizáveis
├── pages/ → Páginas/rotas
├── hooks/ → Custom hooks (lógica de negócio)
├── stores/ → Zustand stores (estado global)
├── contexts/ → React contexts
├── services/ → Integrações externas e API calls
├── types/ → Definições TypeScript
├── layouts/ → Layouts de página (sidebar, navbar, etc.)
├── lib/ → Utilitários e helpers
├── design-system/ → Tokens de design, temas, constantes
├── constants/ → Constantes da aplicação
├── index.css → Estilos globais + variáveis CSS + Tailwind
└── App.tsx → Componente raiz + configuração de rotas

```

---

## Sistema de Design

- **Cor primária**: `#1aa2ff` (azul brilhante)
- **Variável CSS**: `--color-primary-default: 26 162 255`
- **Classes Tailwind**: prefixos `azure-*` e `gold-*` (mesma paleta azul)
- **Regra**: Nunca hardcode cores — sempre use tokens/variáveis CSS

Arquivos de referência:
- `apps/aurea/src/index.css` — variáveis CSS
- `packages/config/tailwind.preset.cjs` — preset compartilhado
- `apps/vidasystem/src/design-system/theme/constants.ts` — constantes

---

## Banco de Dados: Onde ficam as Migrations

```

packages/
├── db-vidasystem/
│ └── supabase/
│ └── migrations/ ← FONTE DA VERDADE para VidaSystem
│ ├── 20260101...sql
│ ├── 20260115...sql
│ └── ...
└── db-whitelabel/
└── supabase/
└── migrations/ ← FONTE DA VERDADE para White Label
├── 20260101...sql
└── ...

````

Para **criar uma nova migration**:

1. Crie um arquivo SQL com timestamp no prefixo: `YYYYMMDDHHMMSS_descricao.sql`
2. Coloque na pasta correta (`db-vidasystem/` ou `db-whitelabel/`)
3. Aplique via `npm run db:migrate:<projeto>`
4. **NUNCA** edite migrations já aplicadas em produção

---

## Autenticação e Multi-tenancy

- Autenticação gerenciada pelo **Supabase Auth** (JWT)
- Todas as tabelas têm **Row Level Security (RLS)** habilitada
- O sistema é **multi-tenant**: cada empresa tem acesso apenas aos seus próprios dados
- **Nunca desabilite RLS** em nenhuma tabela
- Toda query deve respeitar o contexto do usuário autenticado

### Sistema de Acesso (White Label)

| Condição                                      | Resultado                                        |
|-----------------------------------------------|------------------------------------------------  |
| `system_user.is_superadmin = true`            | Acesso total ao `/admin`                         |
| `system_user.is_superadmin = false`           | Acesso somente leitura ao `/admin`               |
| Nenhum `system_user` cadastrado (bootstrap)   | Qualquer autenticado acessa `/admin`             |
| Autenticado sem empresa e sem `system_user`   | Redirecionado para `/sem-acesso`                 |

---

## CI/CD e Deploy

### GitHub Actions

| Workflow             | Trigger                   | O que faz                                  |
|----------------------|---------------------------|------------------------------------------- |
| `ci.yml`             | PR ou push em main        | Lint, testes, build                        |
| `cd.yml`             | Push em main (ou manual)  | Deploy para dev/homolog/prod + migrations  |
| `cd-staging.yml`     | Manual                    | Deploy para staging                        |

### Build Docker

```bash
# Construir imagem para White Label
docker build --build-arg APP_NAME=whitelabel -t synia-whitelabel .

# Construir imagem para VidaSystem
docker build --build-arg APP_NAME=vidasystem -t synia-vidasystem .
````

O `Dockerfile` é multi-stage e multi-app. O servidor de produção é `server.cjs` (Node.js, porta 3000).

---

## Padrões de Commit

Este projeto usa **Conventional Commits** em Português do Brasil:

```
<tipo>(<escopo>): <descrição>

Tipos: feat | fix | refactor | perf | docs | style | test | chore | ci
Escopo: (opcional) nome do app ou módulo — ex: vidasystem, whitelabel, db
```

Exemplos:

```
feat(whitelabel): adicionar filtro de data no dashboard de vendas
fix(vidasystem): corrigir cálculo de juros compostos no simulador
refactor(db): otimizar query de movimentações com índice composto
docs: atualizar QUICK_START com instruções de Docker
```

---

## Instruções para Agentes de IA

Ao atuar neste repositório, o agente **deve**:

1. Ler `CLAUDE.md`, `AGENTS.md`, `ANTIGRAVITY.md` para entender as regras gerais
2. Carregar os arquivos em `docs/agent/rules/` conforme o gatilho:
   - `rule-01-security-isolation.md` → ao modificar código client-side com Supabase
   - `rule-02-async-e-concorrencia.md` → ao trabalhar com I/O, batches, chamadas externas
   - `rule-03-multi-tenant-shield.md` → ao escrever queries ou mutations
   - `rule-04-secrets-e-configuracoes.md` → ao usar variáveis de ambiente ou tokens
   - `rule-05-encoding-e-integridade-textual.md` → ao trabalhar com textos, CSV, SQL seeds
   - `rule-06-auth-sessao-e-autorizacao.md` → ao implementar auth, rotas protegidas, RBAC
   - `rule-07-clean-architecture.md` → ao criar hooks, services, lógica complexa
   - `rule-08-state-and-side-effects.md` → ao trabalhar com estado, cache, subscriptions
3. **Nunca** executar `supabase start` ou comandos destrutivos sem confirmação
4. **Sempre** explicar o que será alterado antes de agir
5. **Parar e perguntar** se houver ambiguidade ou conflito de regras

---

## Documentação Adicional

| Arquivo                             | Conteúdo                                     |
| ----------------------------------- | -------------------------------------------- |
| `docs/DEV_ENVIRONMENT.md`           | Setup detalhado do ambiente local            |
| `docs/ENVIRONMENTS.md`              | Fluxo entre ambientes (dev / staging / prod) |
| `docs/DOCKER_SETUP.md`              | Configuração Docker Desktop no Windows       |
| `docs/DEPLOY_FLOW_FIXED.md`         | Fluxo completo de deploy                     |
| `docs/GITHUB_ENVIRONMENTS_SETUP.md` | Secrets e environments no GitHub             |
| `docs/SEEDS_GUIDE.md`               | Como criar e usar seeds de banco             |
| `CLAUDE.md`                         | Regras operacionais para agentes IA          |
| `AGENTS.md`                         | Informações sobre agentes no projeto         |
| `ANTIGRAVITY.md`                    | Regras adicionais para agentes IA            |

---

## Troubleshooting Rápido

### `npm install` falha

```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro de autenticação Supabase (401/403)

- Verifique se o `.env.local` está preenchido corretamente
- Confirme que `VITE_SUPABASE_URL` aponta para o projeto correto
- Verifique se o `VITE_SUPABASE_ANON_KEY` não expirou

### Migration falha

- Confirme que `SUPABASE_ACCESS_TOKEN` está válido
- Confirme que `DB_URL` aponta para o banco correto
- Verifique se você está usando o script correto (`vidasystem` vs `whitelabel`)

### App demora muito para carregar em produção

- Verifique latência Railway ↔ Supabase (regiões podem ser diferentes)
- Consulte `docs/database-optimization-report-2026-02-15.md` para contexto
- Verifique connection pool no painel Supabase (Resource Limits)

### Pre-commit hook falha

```bash
# Rodar as validações manualmente para ver o erro
npm run precommit:check
npm run lint:fix -w vidasystem
npm run format
```
