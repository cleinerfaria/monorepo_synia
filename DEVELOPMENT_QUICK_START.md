# ⚡ Quick Start: Desenvolvimento Local

> **Tl;dr** - Copie e execute os comandos abaixo
>
> ✅ **Pré-requisito**: Node.js v22+ e npm v10+

## 🎬 Primeira Vez (5 minutos)

```bash
# 1. Instalar dependências
npm install

# 2. Resetar banco de dados remoto para estado inicial
supabase db reset --linked

# 3. Copiar config
cp apps/aurea/.env.example apps/aurea/.env.local

# 4. Pronto! Desenvolver
npm run dev:aurea
```

**URLs:**

- App: `http://localhost:5173`
- Banco Web: Apontado em `.env.local`
- Login: `e2e.admin@aurea.local` / `AureaE2E!123`

---

## 📅 Dias Seguintes

```bash
# Apenas isso
npm run dev:aurea
```

Banco continua remoto. Se você ou seu colega precisar resetar:

```bash
# ⚠️ Avise seus colegas primeiro!
supabase db reset --linked
npm run dev:aurea
```

---

## 🔧 Comandos Úteis

| Comando                      | O que faz                                             |
| ---------------------------- | ----------------------------------------------------- |
| `npm run dev:aurea`          | Inicia desenvolvimento                                |
| `npm run dev:wl`             | White Label                                           |
| `supabase db reset --linked` | Apaga tudo, recria ⚠️ destrutivo, avise seus colegas! |
| `npm run db:migrate:aurea`   | Aplica migrations (safe)                              |
| `npm run db:seed:dev:aurea`  | Popula dados de teste                                 |
| `supabase projects list`     | Lista projetos configurados                           |
| `npm run precommit:check`    | Testa antes de commit                                 |

---

## 🐛 Problemas Comuns

### "Erro: Database link not found"

```bash
# Você precisa configurar a connexão com o banco web
supabase link --project-ref SEU_PROJECT_ID

# Copie o project-ref do Supabase dashboard
# https://app.supabase.com/projects
```

### "Erro: Sem acesso à internet"

```bash
# Como o banco está remoto, você precisa de conectividade
# Verifique sua conexão de rede

# Se offline, não consegue usar o banco remoto
# Considere usar Supabase local (com Docker) como alternativa
```

### "Colega ressetou o banco e meus dados sumiram"

```bash
# Isso é esperado com banco compartilhado
# Ressincronize:
supabase db reset --linked

# Combine com seu colega próximo antes de fazer reset!
```

### "Erro ao fazer migrations"

```bash
# Verificar se migrations estão válidas
npm run db:migrate:aurea

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
npm run setup:dev:aurea && npm run dev:aurea
```

---

**Travado?** Verifique `docs/DEV_ENVIRONMENT.md` seção "Troubleshooting"
