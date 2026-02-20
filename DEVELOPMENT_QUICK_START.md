# ⚡ Quick Start: Desenvolvimento Local

> **Tl;dr** - Copie e execute os comandos abaixo
>
> ✅ **Pré-requisitos**:
>
> - Node.js v22+ e npm v10+
> - **Supabase CLI** (v2.0+) — Necessário para conectar ao banco remoto

### Instalar Supabase CLI

```bash
# Opção 1: Via Scoop (Windows)
scoop install supabase

# Opção 2: Via Chocolatey
choco install supabase
```

**Verificar instalação:**

```bash
supabase --version
```

## 🔐 Autenticação Supabase (uma vez)

```bash
# 1. Fazer login no Supabase (abre navegador)
supabase login

# 2. Configurar link com banco remoto
# Copie o project-ref do dashboard: https://app.supabase.com/projects
supabase link --project-ref SEU_PROJECT_ID
```

## 🎬 Primeira Vez (2 minutos)

```bash
# 1. Instalar dependências
npm install

# 2. Resetar banco de dados remoto para estado inicial
npm run db:reset:vidasystem

# 3. Copiar config
cp apps/vidasystem/.env.example apps/vidasystem/.env.local

# 4. Pronto! Desenvolver
npm run dev:vidasystem
```

**URLs:**

- App: `http://localhost:5173`
- Banco Web: Apontado em `.env.local`
- Login: `e2e.admin@vidasystem.local` / `AureaE2E!123`

---

## 📅 Dias Seguintes

```bash
# Apenas isso
npm run dev:vidasystem
```

Banco continua remoto. Se você ou seu colega precisar resetar:

```bash
# ⚠️ Avise seus colegas primeiro!
npm run db:reset:vidasystem
npm run dev:vidasystem
```

---

## 🔧 Comandos Úteis

### VidaSystem

| Comando                          | O que faz                                             |
| -------------------------------- | ----------------------------------------------------- |
| `npm run dev:vidasystem`         | Inicia desenvolvimento                                |
| `npm run db:migrate:vidasystem`  | Aplica migrations no banco remoto (safe)              |
| `npm run db:reset:vidasystem`    | Apaga tudo, recria ⚠️ destrutivo, avise seus colegas! |
| `npm run db:seed:dev:vidasystem` | Popula dados de teste                                 |

### White Label

| Comando                           | O que faz                                             |
| --------------------------------- | ----------------------------------------------------- |
| `npm run dev:wl`                  | Inicia desenvolvimento                                |
| `npm run db:migrate:white-label`  | Aplica migrations no banco remoto (safe)              |
| `npm run db:reset:white-label`    | Apaga tudo, recria ⚠️ destrutivo, avise seus colegas! |
| `npm run db:seed:dev:white-label` | Popula dados de teste                                 |

### Geral

| Comando                   | O que faz                   |
| ------------------------- | --------------------------- |
| `supabase projects list`  | Lista projetos configurados |
| `npm run precommit:check` | Testa antes de commit       |

> ⚠️ **Nunca rode comandos `supabase db` diretamente da raiz do projeto.**
> Use sempre os scripts npm acima — eles garantem que cada migration
> vai para o banco correto (VidaSystem ou White Label).

---

## 🐛 Problemas Comuns

### "Erro: Database link not found"

```bash
# Você precisa configurar a conexão com o banco remoto
supabase link --project-ref SEU_PROJECT_ID

# Copie o project-ref do Supabase dashboard
# https://app.supabase.com/projects
```

### "Erro: Sem acesso à internet"

```bash
# Como o banco está remoto, você precisa de conectividade
# Verifique sua conexão de rede
```

### "Colega resetou o banco e meus dados sumiram"

```bash
# Isso é esperado com banco compartilhado
# Ressincronize:
npm run db:reset:vidasystem

# Combine com seu colega antes de fazer reset!
```

### "Erro ao fazer migrations"

```bash
# Verificar se migrations estão válidas
npm run db:migrate:vidasystem

# Se falhar, checar logs:
supabase status
```

---

## 📚 Documentação Completa

- **Dev Environment**: `docs/DEV_ENVIRONMENT.md`
- **Ambientes**: `docs/ENVIRONMENTS.md`

---

## 🚀 Pronto?

```bash
npm run setup:dev:vidasystem && npm run dev:vidasystem
```

---

**Travado?** Verifique `docs/DEV_ENVIRONMENT.md` seção "Troubleshooting"
