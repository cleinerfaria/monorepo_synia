# 🚀 Guia de Configuração do Ambiente de Desenvolvimento

## Visão Geral

Este documento descreve como configurar e trabalhar com o ambiente de desenvolvimento local, incluindo o Supabase, banco de dados e as aplicações.

## 📋 Pré-requisitos

- **Node.js** v22 ou superior
- **npm** v10 ou superior
- **Supabase CLI** (instalado como devDependency, use via `npx`)
  - Verifique com: `npx supabase --version`
  - ✅ Usa banco web remoto (sem Docker necessário)
  - Configurado para 2 devs compartilhando o mesmo banco

## 🎯 Setup Inicial (Primeira Vez)

### 1️⃣ Instale Dependências

```bash
npm install
```

### 2️⃣ Configure a Conexão com Banco Remoto

```bash
# Link seu projeto Supabase remoto (banco web configurado)
npx supabase link --project-ref SEU_PROJECT_ID

# Encontre SEU_PROJECT_ID em:
# https://app.supabase.com/projects (URL do projeto)
# Exemplo: "xyzabcdefghijklmn"
```

**O que isto faz:**

1. ✅ Conecta seu CLI ao banco web remoto
2. ✅ Permite aplicar migrations
3. ✅ Habilita reset e seed via CLI

### 3️⃣ Sincronize com o Banco Remoto (Primeira Vez)

```bash
# Ressincrona migrations e dados iniciais
supabase db reset --linked

# Ou, se preferir apenas aplicar migrations sem reset:
npm run db:migrate:vidasystem
```

### 4️⃣ Configure o `.env.local`

Copie o arquivo de exemplo para cada app:

```bash
# VidaSystem
cp apps/vidasystem/.env.local.example apps/vidasystem/.env.local

# White Label
cp apps/whitelabel/.env.local.example apps/whitelabel/.env.local
```

**Importante:** Não comite `.env.local` no git (já está em `.gitignore`).

O arquivo `.env.local.example` já contém as URLs/chaves do banco remoto.

### 5️⃣ Inicie o Desenvolvimento

```bash
# Para VidaSystem
npm run dev:vidasystem

# Ou para White Label
npm run dev:wl
```

**✅ Seu banco está remoto, compartilhado com seu colega!**

---

## 📅 Fluxo de Desenvolvimento Diário

### Ao Iniciar um Novo Dia de Trabalho

```bash
# 1. Puxar últimas mudanças do git
git pull origin main

# 2. Desenvolver normalmente
npm run dev:vidasystem
```

**⚠️ Importante:**

- O banco está **remoto e compartilhado** com seu colega
- **Não execute `db:reset`** sem avisar primeiro! Isso apaga dados de ambos
- **Evite seed manual** durante desenvolvimento — use dados existentes ou coordene com seu colega

### Quando Fez Mudanças no Schema do Banco

Se você modificou arquivos SQL em `packages/db-vidasystem/migrations`:

```bash
# 1. Aplica novas migrations (não reseta)
npm run db:migrate:vidasystem

# 2. Teste localmente
npm run dev:vidasystem

# 3. Antes de fazer commit, volte ao estado inicial
# ⚠️ Coordene com seu colega!
supabase db reset --linked
npm run db:seed:dev:vidasystem
```

**Nota:** `supabase db reset --linked` **afeta o banco remoto compartilhado**.
Avise seu colega antes!

### Quando Quer Resetar Tudo (Antes de Fazer Commit)

```bash
# ⚠️ IMPORTANTE: Avise seu colega primeiro!

# Volta ao estado inicial
supabase db reset --linked
npm run db:seed:dev:vidasystem
```

### Para Parar o Desenvolvimento

```bash
# Parar a app
# (Ctrl+C no terminal)

# Parar Supabase (opcional - deixa rodando é mais rápido)
npx supabase stop
```

---

## 🔐 Credenciais de Teste (E2E)

Durante o setup, essas credenciais são criadas automaticamente no banco:

### Admin

- Email: `e2e.admin@vidasystem.local` (customizável via `E2E_ADMIN_EMAIL`)
- Senha: `Vida123` (customizável via `E2E_ADMIN_PASSWORD`)
- Função: Admin (acesso total)

### Manager

- Email: `e2e.manager@vidasystem.local` (customizável via `E2E_MANAGER_EMAIL`)
- Senha: `Vida123` (customizável via `E2E_MANAGER_PASSWORD`)
- Função: Manager (acesso parcial)

### Viewer/User

- Email: `e2e.user@vidasystem.local` (customizável via `E2E_USER_EMAIL`)
- Senha: `Vida123` (customizável via `E2E_USER_PASSWORD`)
- Função: Viewer (acesso somente leitura)

**Nota:** Customize via variáveis de ambiente no `.env.local` se precisar de valores diferentes.

---

## 🌐 URLs e Serviços

| Serviço            | URL                                 |
| ------------------ | ----------------------------------- |
| App VidaSystem     | `http://localhost:5173`             |
| Supabase Dashboard | `https://app.supabase.com/projects` |
| Banco (Remoto)     | Definido em `.env.local`            |

**Acesso ao Dashboard:**
Abra [https://app.supabase.com/projects](https://app.supabase.com/projects) para visualizar/editar dados do banco remoto, rodar queries, etc.

**Seu Projeto:**
Procure o projeto linkado com `supabase link --project-ref`

---

## 📦 Comandos Disponíveis

### Setup e Banco Remoto

```bash
# Link ao banco remoto (primeira vez)
npx supabase link --project-ref SEU_PROJECT_ID

# Sincronizar com banco remoto
supabase db reset --linked    # Reset completo (⚠️ avise colega)
supabase status              # Verificar conexão
```

### Variáveis de Ambiente Necessárias

Seu `.env.local` deve ter (depois de copiar `.env.local.example`):

```bash
# Supabase (usado por frontend e scripts)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Banco (scripts de migrations)
DB_URL=postgresql://postgres:pwd@db.seu-projeto.supabase.co:5432/postgres

# E2E Tests (opcionais — temos defaults)
E2E_ADMIN_EMAIL=e2e.admin@vidasystem.local
E2E_ADMIN_PASSWORD=Vida123
```

### Banco de Dados

```bash
# Migrations (aplica novas mudanças no schema)
npm run db:migrate:vidasystem
npm run db:migrate:whitelabel

# Reset (apaga tudo e recria - ⚠️ DESTRUTIVO)
npm run db:reset:vidasystem
npm run db:reset:whitelabel

# Seed (popula com dados de exemplo)
npm run db:seed:dev:vidasystem
npm run db:seed:dev:whitelabel

# Preparar banco para testes
npm run db:prepare:test:vidasystem
npm run db:prepare:test:whitelabel
```

### Desenvolvimento e Testes

```bash
# Dev mode
npm run dev:vidasystem           # VidaSystem
npm run dev:wl              # White Label
npm run dev                 # Menu interativo

# Testes
npm run test:project        # Menu interativo
npm run test:e2e            # E2E tests
npm run test:e2e:ui         # E2E tests com interface

# Lint, type check, build
npm run lint:project
npm run typecheck:project
npm run build:project
npm run precommit:check     # Menu interativo
```

---

## 🐛 Troubleshooting

### ❌ "Database link not found"

**Problema**:

```
Error: Database link not found for project
```

**Solução**:

```bash
# Fazer o link com seu projeto Supabase
npx supabase link --project-ref SEU_PROJECT_ID

# Encontre SEU_PROJECT_ID em:
# https://app.supabase.com/projects
# (aquela sequência alfanumérica na URL)
```

---

### ❌ "Não consigo conectar ao banco remoto"

**Problema**:

```
Error: Failed to connect to database
```

**Possíveis Soluções**:

1. **Verificar Internet:**

   ```bash
   # Você precisa de conexão com internet
   # O banco está remoto!
   ping google.com
   ```

2. **Verificar Credenciais:**

   ```bash
   npx supabase status

   # Verifique se .env.local tem VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
   cat apps/vidasystem/.env.local
   ```

3. **Re-fazer o Link:**
   ```bash
   npx supabase link --project-ref SEU_PROJECT_ID
   supabase db reset --linked
   ```

---

### ⚠️ "Colega ressetou o banco e meus dados sumiram"

**Esperado?** Sim! Como o banco é compartilhado:

**Solução**:

```bash
# Ressincronize com o banco remoto
supabase db reset --linked

# Depois, combine com seu colega para coordenar futuro resets
```

**Prevenção**: **Sempre avise seu colega antes de fazer reset!**

---

### ❌ "Erro ao fazer migrations"

**Problema**:

```
Error: Migration failed
```

**Solução**:

```bash
# Verificar status da conexão
npx supabase status

# Se erro de SQL, revisar arquivo de migration
# Depois tentar de novo
npm run db:migrate:vidasystem
```

---

### ❌ "Sem acesso à Internet — preciso trabalhar offline"

**Problema**: Banco é remoto, sem acesso offline

**Alternativa (não recomendada)**:

```bash
# Se realmente precisar trabalhar offline, considere:
# 1. Setup Supabase local com Docker (veja DOCKER_SETUP.md)
# 2. Coordene com seu colega para período offline
```

**Recomendação**: Mantenha conexão de internet para desenvolvimento normal.

---

## 🏗️ Fluxo de Commits e PRs

Antes de fazer commit de mudanças no banco:

```bash
# 1. Criar a migration
# (Editar arquivos em packages/db-vidasystem/migrations)

# 2. Testar no banco remoto
npm run db:migrate:vidasystem
npm run dev:vidasystem

# 3. ⚠️ ANTES DE FAZER COMMIT:
# Avise seu colega que vai resetar o banco!
supabase db reset --linked
npm run db:seed:dev:vidasystem

# 4. Rodar testes
npm run precommit:check

# 5. Fazer commit
git add packages/db-vidasystem/
git commit -m "chore(db): add new column to users table"

# 6. Push e abrir PR
git push origin feat/seu-branch
gh pr create --title "Descrição..."
```

**Checklist:**

- ✅ Avisei meu colega antes de resetar
- ✅ Migration foi testada
- ✅ `npm run precommit:check` passou
- ✅ Banco foi resetado ao estado inicial

---

## 🚀 CI/CD e Produção

### Staging/Homologação

Usa variáveis de ambiente apontando para Supabase remoto:

```bash
# Deploy usa .env.staging
# Credenciais definidas no GitHub Actions ou Railway
```

### Produção

Usa variáveis de ambiente apontando para Supabase em produção:

```bash
# Deploy usa .env.production
# Credenciais altamente restritas
```

---

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI](https://github.com/supabase/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vite Documentation](https://vitejs.dev/)

---

## ✅ Checklist para Novo Desenvolvedor

- [ ] Clonou o repositório
- [ ] Instalou dependências: `npm install`
- [ ] Fez link com banco remoto: `npx supabase link --project-ref SEU_PROJECT_ID`
- [ ] Sincronizou banco: `supabase db reset --linked`
- [ ] Copiou `.env.local`: `cp apps/vidasystem/.env.local.example apps/vidasystem/.env.local`
- [ ] Verificou credenciais: `npx supabase status`
- [ ] Iniciou dev: `npm run dev:vidasystem`
- [ ] Conseguiu acessar a app em `http://localhost:5173`
- [ ] Conseguiu fazer login com `e2e.admin@vidasystem.local` / `Vida123`
- [ ] Verificou Dashboard Supabase: https://app.supabase.com/projects
- [ ] Coordenou com colega sobre resets futuros

---

**Dúvidas?** Verifique a seção de Troubleshooting ou abra uma issue no repositório.
