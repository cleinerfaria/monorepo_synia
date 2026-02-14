# Testing Guide

## Testes Unitários

```bash
npm run test:run          # Rodar todos os testes
npm run test:coverage     # Gerar relatório de cobertura
npm run test              # Modo watch (desenvolvimento)
npm run test:ui           # Interface visual
```

## Testes E2E (Playwright)

### Setup

1. Configure as variáveis de ambiente do Supabase de desenvolvimento:

```bash
# Windows PowerShell
$env:VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="sua-anon-key"
$env:TEST_USER_EMAIL="test@example.com"
$env:TEST_USER_PASSWORD="sua-senha-de-teste"

# Linux/Mac
export VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
export VITE_SUPABASE_ANON_KEY="sua-anon-key"
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="sua-senha-de-teste"
```

2. (Opcional) Criar usuário de teste:

```bash
export SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
npm run test:db:create-user
```

### Executar Testes

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Com UI interativo
npm run test:e2e:ui

# Teste específico
npm run test:e2e -- e2e/login.spec.ts

# Com debug visual
npm run test:e2e -- --debug --headed
```

## Variáveis de Ambiente

### Para Testes E2E

| Variável                 | Descrição                 |
| ------------------------ | ------------------------- |
| `VITE_SUPABASE_URL`      | URL do projeto Supabase   |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima (pública)   |
| `TEST_USER_EMAIL`        | Email do usuário de teste |
| `TEST_USER_PASSWORD`     | Senha do usuário de teste |

### Para Criar Usuário de Teste

| Variável                    | Descrição                |
| --------------------------- | ------------------------ |
| `SUPABASE_URL`              | URL do projeto Supabase  |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin) |

## CI/CD Pipeline

O GitHub Actions executa **2 jobs**:

### 1. Quality (~2min)

- Linting (ESLint)
- Type checking (TypeScript)
- Unit tests (Vitest)
- Build check

### 2. E2E Tests (~10min)

- Usa Supabase de desenvolvimento (remoto)
- Cria usuário de teste se necessário
- Executa testes Playwright
- Upload de relatório como artifact

### Secrets Necessários no GitHub

Configure no repositório: **Settings → Secrets and variables → Actions**

Crie um **Environment** chamado `development` com os secrets:

| Secret                          | Descrição                               |
| ------------------------------- | --------------------------------------- |
| `SUPABASE_URL_DEV`              | URL do Supabase de desenvolvimento      |
| `SUPABASE_ANON_KEY_DEV`         | Anon key do Supabase de desenvolvimento |
| `SUPABASE_SERVICE_ROLE_KEY_DEV` | Service role key (para criar usuário)   |
| `TEST_USER_EMAIL`               | Email do usuário de teste               |
| `TEST_USER_PASSWORD`            | Senha do usuário de teste               |

## Estrutura de Testes E2E

```
e2e/
├── login.spec.ts           # Autenticação (login/logout)
├── login-title.spec.ts     # Verificações básicas de UI
├── dashboard.spec.ts       # Dashboard principal
├── navigation.spec.ts      # Navegação entre páginas
└── whatsapp-instance-create.spec.ts  # Módulo WhatsApp
```

## Debugging

### Ver execução visual

```bash
npm run test:e2e -- --headed
```

### Pausar em falhas

```bash
npm run test:e2e -- --debug
```

### Ver relatório HTML

```bash
npx playwright show-report
```

### Screenshots de falhas

Salvas automaticamente em `test-results/` quando testes falham.

## Troubleshooting

### Playwright não encontra browser

```bash
npx playwright install --with-deps chromium
```

### Testes E2E falhando

1. Verifique variáveis de ambiente: `echo $VITE_SUPABASE_URL`
2. Verifique se usuário de teste existe
3. Veja screenshots em `test-results/`
4. Abra relatório: `npx playwright show-report`

### Usuário de teste não funciona

Crie manualmente no Supabase Dashboard ou execute:

```bash
npm run test:db:create-user
```
