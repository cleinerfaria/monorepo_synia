# CI/CD - Staging & Production

**Data de Implementação:** 23 de Fevereiro de 2026
**Modelo:** Staging Automático

---

## 📋 Visão Geral

```
Feature Branch → PR para main
                    ↓
         ✓ Quality Gate (Lint, Tests, Build)
                    ↓
         ✓ Auto Deploy Staging (QA testa)
                    ↓
         ✓ Merge PR → Push to main
                    ↓
         ✓ Auto Deploy Production
```

---

## 🔄 Workflows

| Workflow           | Arquivo          | Trigger             | O que faz          |
| ------------------ | ---------------- | ------------------- | ------------------ |
| **CI**             | `ci.yml`         | Push/PR para main   | Lint, Tests, Build |
| **Staging Deploy** | `cd-staging.yml` | PR aberto para main | Deploy em staging  |
| **Prod Deploy**    | `cd.yml`         | Push para main      | Deploy em produção |

---

## 🏷️ Nomenclatura de Branches

### Padrão: `feature/project/name`

```
feature/vidasystem/password-reset
feature/whitelabel/dynamic-filters
feature/all/ui-components-refactor
```

### Partes da Branch:

| Parte | Valores | Exemplo |
|-------|---------|---------|
| **Prefixo** | `feature/` | `feature/` |
| **Projeto** | `vidasystem`, `whitelabel`, `all` | `vidasystem` |
| **Nome** | Descrição em kebab-case | `password-reset` |

### Quando Usar Cada Projeto:

**vidasystem** - Apenas VidaSystem é afetado
```bash
git checkout -b feature/vidasystem/auth-improvements
git checkout -b feature/vidasystem/dashboard-redesign
git checkout -b feature/vidasystem/report-export
```

**whitelabel** - Apenas White Label é afetado
```bash
git checkout -b feature/whitelabel/multi-company-switching
git checkout -b feature/whitelabel/custom-branding
git checkout -b feature/whitelabel/sales-filters
```

**all** - Ambos os projetos são afetados
```bash
git checkout -b feature/all/ui-components-library
git checkout -b feature/all/auth-system-upgrade
git checkout -b feature/all/supabase-migration
```

### Exemplos Completos:

```bash
# Feature para VidaSystem
git checkout -b feature/vidasystem/reset-password
git checkout -b feature/vidasystem/two-factor-auth

# Feature para White Label
git checkout -b feature/whitelabel/dynamic-filters-v2
git checkout -b feature/whitelabel/custom-colors

# Feature para ambos
git checkout -b feature/all/eslint-upgrade
git checkout -b feature/all/testing-framework-update
```

### ✅ Boas Práticas

```bash
✅ feature/vidasystem/reset-password     # Bom: específico e claro
✅ feature/whitelabel/custom-colors      # Bom: descreve bem
✅ feature/all/dependency-upgrade        # Bom: aplica a ambos

❌ feature/fix-bug                        # Ruim: não sabe qual projeto
❌ feature/new_feature                    # Ruim: muito genérico
❌ feature/PASSWORD_RESET                # Ruim: use kebab-case (hífens)
❌ feature-vidasystem/reset-pwd          # Ruim: use slash, não hífen
```

---

## 🚀 Fluxo Rápido (Copy-Paste)

### 1️⃣ Iniciar Feature

```bash
git checkout main && git pull origin main

# Para VidaSystem
git checkout -b feature/vidasystem/sua-feature-aqui

# Para White Label
git checkout -b feature/whitelabel/sua-feature-aqui

# Para ambos
git checkout -b feature/all/sua-feature-aqui
```

**Exemplos:**
```bash
git checkout -b feature/vidasystem/password-reset
git checkout -b feature/whitelabel/dynamic-filters
git checkout -b feature/all/testing-upgrade
```

### 2️⃣ Criar Migration (se necessário)

```bash
# VidaSystem
cat > packages/db-vidasystem/supabase/migrations/$(date +%Y%m%d%H%M%S)_seu_nome_aqui.sql << 'EOF'
-- Seu SQL aqui
EOF

# White Label (se precisar)
cat > packages/db-whitelabel/supabase/migrations/$(date +%Y%m%d%H%M%S)_seu_nome_aqui.sql << 'EOF'
-- Seu SQL aqui
EOF
```

### 3️⃣ Testar Migration Remota

```bash
npm run db:migrate:vidasystem
npm run db:migrate:whitelabel
```

### 4️⃣ Fazer Commit e Push

```bash
git add .
git commit -m "feat: sua descrição aqui"
git push origin feature/sua-feature-aqui
```

### 5️⃣ Abrir PR para main

```bash
# GitHub → Create pull request
# Certifique-se que é PARA main
# Escreva boa descrição
```

### 6️⃣ Aguardar Staging Deploy

```bash
# Monitorar
gh run list --workflow=cd-staging.yml --limit 5

# Ou: GitHub → Actions → Deploy to Staging
```

### 7️⃣ QA Testa

```
https://staging.synia.com
Testar feature + Aprovar ou Pedir Ajustes
```

### 8️⃣ Merge para Main

```bash
# GitHub UI (recomendado)
```

### 9️⃣ Aguardar Production Deploy

```bash
gh run list --workflow=cd.yml --limit 5
# Feature está LIVE em app.synia.com ✨
```

---

## 👥 Papéis & Responsabilidades

### Desenvolvedores

1. Criar feature branch
2. Desenvolver + testar localmente (migrations remotas)
3. Push + Abrir PR para `main`
4. Aguardar CI passar + Staging Deploy

### QA (Quality Assurance (Garantia de Qualidade))

1. Receber notificação de novo deploy em staging
2. Testar feature em `staging.synia.com`
3. Aprovar (merge) ou Pedir ajustes (novo commit)

### Production

- Automático ao fazer merge PR para `main`
- Migrations aplicadas
- Feature LIVE

---

## 🔐 Secrets Necessários

### Repository Level (SUPABASE_ACCESS_TOKEN)

```
Token de acesso para Supabase CLI
```

### Environment: staging

```
STAGING_VIDASYSTEM_SUPABASE_PROJECT_REF
STAGING_VIDASYSTEM_SUPABASE_DB_PASSWORD
STAGING_WL_SUPABASE_PROJECT_REF
STAGING_WL_SUPABASE_DB_PASSWORD
```

### Environment: production

```
VIDASYSTEM_SUPABASE_PROJECT_REF
VIDASYSTEM_SUPABASE_DB_PASSWORD
WL_SUPABASE_PROJECT_REF
WL_SUPABASE_DB_PASSWORD
```

## 📊 Tempo de Cada Etapa

```
CI (Lint + Tests + Build)           ~ 4-5 minutos
Staging Deploy (Migrations)         ~ 2-3 minutos
QA Testing                          ~ 5-30 minutos
Production Deploy (Migrations)      ~ 2-3 minutos
────────────────────────────────────────────────
Total (com QA)                      ~ 15-45 minutos
Total (sem QA/automático)           ~ 8-10 minutos
```

---

## 📊 Verificar Status

```bash
# Ver últimos runs de CI
gh run list --workflow=ci.yml --limit 5

# Ver últimos runs de Staging
gh run list --workflow=cd-staging.yml --limit 5

# Ver últimos runs de Production
gh run list --workflow=cd.yml --limit 5

# Ver detalhes de um run específico
gh run view <RUN_ID>

# Ver logs completos
gh run view <RUN_ID> --log
```

---

## 🔍 Exemplos Práticos

### Exemplo 1: Feature de Reset de Senha

**Passo 1: Criar Feature Branch**

```bash
git checkout main && git pull origin main
git checkout -b feature/vidasystem/password-reset
```

**Passo 2: Criar Migration**

```sql
-- packages/db-vidasystem/supabase/migrations/20260223120000_add_password_reset_token.sql
ALTER TABLE auth.users
ADD COLUMN password_reset_token TEXT UNIQUE,
ADD COLUMN password_reset_expires_at TIMESTAMP;
```

**Passo 3: Testar Localmente**

```bash
npm run db:migrate:vidasystem
# ✅ Migration applied: 20260223120000_add_password_reset_token
```

**Passo 4: Implementar a Feature**

```typescript
// apps/vidasystem/src/api/reset-password.ts
export async function POST(req: Request) {
  const { email } = await req.json();
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 3600000);
  // ... rest of implementation
  return Response.json({ success: true });
}
```

**Passo 5: Commit + Push**

```bash
git add .
git commit -m "feat(auth): adicionar endpoint de reset de senha"
git push origin feature/vidasystem/password-reset
```

**Passo 6: Abrir PR para main**

- GitHub → Create pull request
- Certifique-se que é PARA `main`

**Passo 7: Aguardar CI (4-5 min)**

```
✓ Checkout
✓ Lint (eslint)
✓ Tests (npm run test)
✓ Build (npm run build)
Status: ✅ All checks passed
```

**Passo 8: Staging Deploy Automático (2-3 min)**

```
✓ Quality Gate passou
✓ Validate secrets
✓ Link VidaSystem project
✓ Apply VidaSystem migrations
✓ Link White Label project
✓ Apply White Label migrations
✓ Verify migrations
Status: ✅ Staging deployment verified successfully!
```

**Passo 9: QA Testa (5-30 min)**

- Acessa: `https://staging.synia.com`
- Testa reset de senha
- Aprova no PR

**Passo 10: Merge para main**

```bash
# GitHub UI ou CLI
git checkout main && git pull origin main
git merge feature/password-reset
git push origin main
```

**Passo 11: Production Deploy Automático (2-3 min)**

```
✓ Quality Gate passa novamente
✓ Validate secrets (production)
✓ Link VidaSystem project (production)
✓ Apply VidaSystem migrations
✓ Link White Label project (production)
✓ Apply White Label migrations
✓ Verify migrations
Status: ✅ Production deployment completed successfully!
```

**Resultado:** Feature está LIVE em `app.synia.com` ✨

---

### Exemplo 2: 3 PRs em Paralelo

```
13:00  Feature A → PR #40 → CI ✅ → Staging Deploy ✅
14:30  Feature B → PR #41 → CI ✅ → Staging Deploy ✅
15:00  Feature C → PR #42 → CI ✅ → Staging Deploy ✅

16:00  QA testa Feature A → Aprova → Merge to main
       Production Deploy A ✅

17:00  QA testa Feature B → Aprova → Merge to main
       Production Deploy B ✅

18:00  QA testa Feature C → Pede ajustes → Dev faz commit
       Staging Deploy C auto-atualizado ✅
```

---

### Exemplo 3: Hotfix Crítico

```bash
# Criar hotfix branch (se afeta ambos projetos)
git checkout main && git pull origin main
git checkout -b feature/all/critical-bug-fix

# Fix + Commit
git add .
git commit -m "fix: corrigir bug crítico"
git push origin feature/all/critical-bug-fix

# PR + CI passa + Staging Deploy
# QA testa rapidamente
# Merge para main
# Production Deploy automático

# Total: ~15 minutos com validação completa!
```

**Ou se é apenas em um projeto:**
```bash
git checkout -b feature/vidasystem/critical-bug-fix
# ou
git checkout -b feature/whitelabel/critical-bug-fix
```

---

## 🔴 Problemas Comuns

### CI Falhou ❌

```bash
# 1. Ver o erro
gh run view <RUN_ID> --log

# 2. Principais causas:
# - ESLint error → npm run lint
# - Test failed → npm run test
# - Build error → npm run build

# 3. Fix e push novamente
git add .
git commit -m "fix: corrigir erro do CI"
git push origin feature/sua-feature
# CI re-dispara automaticamente
```

### Staging Deploy Não Disparou ⚠️

```bash
# Verificar:
✓ PR é para main? Sim?
✓ CI passou? Sim?
✓ Secrets configuradas?
  Settings → Environments → staging
  Deve ter: STAGING_VIDASYSTEM_*
  Deve ter: STAGING_WL_*

# Se tudo ok, force com commit vazio:
git commit --allow-empty -m "chore: trigger staging deploy"
git push origin feature/sua-feature
```

### Production Deploy Não Disparou ⚠️

```bash
# Verificar:
✓ PR foi merged para main? Sim?
✓ Push foi feito para main? Sim?
✓ Secrets configuradas?
  Settings → Environments → production
  Deve ter: VIDASYSTEM_SUPABASE_*
  Deve ter: WL_SUPABASE_*

# Para triggerar manualmente (raro):
git commit --allow-empty -m "chore: trigger production deploy"
git push origin main
```

### Erro: "Missing STAGING_VIDASYSTEM_SUPABASE_PROJECT_REF"

```bash
# Secret não foi configurado ou está vazio

# Ir para GitHub:
Settings → Environments → staging → Secrets
Adicione: STAGING_VIDASYSTEM_SUPABASE_PROJECT_REF = abc123xyz
```

### Erro: "Authentication failed"

```bash
# Projeto ref ou senha estão incorretos

# Verificar:
1. Copiar novamente Project Ref correto do Supabase
2. Copiar novamente senha do banco correta
3. Atualizar no GitHub
```

---

## ⚠️ Pontos Importantes

### Migrations em Desenvolvimento

```bash
# ✅ USE isso:
npm run db:migrate:vidasystem
npm run db:migrate:whitelabel

# ❌ NÃO use isso:
supabase start               # Não use local
supabase db push             # Não use da raiz
```

### Deploy Automático

```
Staging: Sempre que um PR é aberto/atualizado para main
Production: Apenas quando PR é merged para main
```

### Ambiente homolog foi removido

```
✓ Uso apenas: staging (PR validation)
✓ Uso apenas: production (após merge)
✓ Atualize scripts/docs antigos se referirem a homolog
```

### Secrets Estão Separados

```
Repository Level: SUPABASE_ACCESS_TOKEN (ambos usam)
Environment staging: STAGING_VIDASYSTEM_*, STAGING_WL_*
Environment production: VIDASYSTEM_*, WL_*
```

---

## 📍 Links Úteis

| Descrição           | Link                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| GitHub Actions      | `https://github.com/seu-org/monorepo-synia/actions`                          |
| CI Workflow         | `https://github.com/seu-org/monorepo-synia/actions/workflows/ci.yml`         |
| Staging Deploy      | `https://github.com/seu-org/monorepo-synia/actions/workflows/cd-staging.yml` |
| Production Deploy   | `https://github.com/seu-org/monorepo-synia/actions/workflows/cd.yml`         |
| Staging App         | `https://staging.synia.com`                                                  |
| Production App      | `https://app.synia.com`                                                      |
| Repository Settings | `https://github.com/seu-org/monorepo-synia/settings`                         |
| Environments Setup  | `https://github.com/seu-org/monorepo-synia/settings/environments`            |

---

## 💡 Pro Tips

### 1. Monitorar PRs em Tempo Real

```bash
watch -n 5 'gh run list --workflow=cd-staging.yml --limit 3'
```

### 2. Auto-refresh da Página de Staging

Mantenha `https://staging.synia.com` aberta com auto-refresh:

```javascript
// DevTools → Console:
setInterval(() => location.reload(), 30000); // reload a cada 30s
```

### 3. Verificar Migrations Aplicadas

```bash
gh run view <STAGING_RUN_ID> --log | grep "migrations status" -A 10
```

### 4. Rollback Rápido (Emergência)

```bash
# Se algo quebrou em staging:
git revert <commit-hash>
git push origin feature/seu-feature
# Staging redeploy automático
```

---

## ✅ Checklist Antes de Merge

- [ ] CI passou em todos os checks
- [ ] Staging Deploy completou com sucesso
- [ ] QA testou em staging.synia.com
- [ ] Sem conflitos com main
- [ ] Migrations são idempotentes (podem rodar 2x sem erro)
- [ ] Secrets estão configuradas (se aplicável)
- [ ] Commit message é descritiva
- [ ] Código está revisado

✨ **Se tudo ok → Merge! Production virá automaticamente.**

---

## 📚 Referências

- [GitHub Environments Setup](./GITHUB_ENVIRONMENTS_SETUP.md)
- [Development Workflow](./development-workflow.md)
