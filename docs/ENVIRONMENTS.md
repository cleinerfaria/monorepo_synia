# 🌍 Fluxo de Ambientes: Dev, Staging e Produção

## 📊 Estrutura Geral

```
┌──────────────────────────────────────────────────────────────┐
│                    DESENVOLVIMENTO LOCAL                      │
├──────────────────────────────────────────────────────────────┤
│ • Supabase Remoto (Banco Web Compartilhado)                  │
│ • Banco PostgreSQL Remoto                                    │
│ • Dados de Teste (compartilhados com colega)                 │
│ • Sem restrições de RLS (fácil debug)                        │
│ • 2 Devs: coordenação para resets                            │
│ Você: $ supabase link && npm run dev:vidasystem                   │
└──────────────────────────────────────────────────────────────┘
                           ⬇️
        (Commit → Push → Pull Request → Merge)
                           ⬇️
┌──────────────────────────────────────────────────────────────┐
│                    STAGING / HOMOLOGAÇÃO                      │
├──────────────────────────────────────────────────────────────┤
│ • Supabase Remoto (Railway/Vercel/Seu Host)                  │
│ • Banco PostgreSQL Remoto                                    │
│ • Dados Similares a Produção (anonymizados)                  │
│ • RLS Ativado (testa segurança)                              │
│ • CI/CD: GitHub Actions                                      │
│ Deploy: Automático na branch staging                          │
└──────────────────────────────────────────────────────────────┘
                           ⬇️
              (Testes Finais → Aprovação)
                           ⬇️
┌──────────────────────────────────────────────────────────────┐
│                        PRODUÇÃO                               │
├──────────────────────────────────────────────────────────────┤
│ • Supabase Remoto (Production Environment)                   │
│ • Banco PostgreSQL Remoto (Backup/Replicado)                 │
│ • Dados Reais dos Clientes                                   │
│ • RLS + Policies Rigorosas                                   │
│ • Monitoring e Alertas Ativos                                │
│ • CI/CD: GitHub Actions + Aprovação Manual                   │
│ Deploy: Manual na branch main                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuração por Ambiente

### Variáveis de Ambiente

Cada ambiente usa um `.env` diferente:

#### Development (Remoto Compartilhado)

```bash
# .env.local (não commita no git)
APP_ENV=dev

# Supabase (Frontend + Backend Scripts)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=<remote-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<remote-service-key>

# Banco de Dados (Scripts)
DB_URL=postgresql://postgres:<pwd>@db.seu-projeto.supabase.co:5432/postgres

# E2E Tests
E2E_ADMIN_EMAIL=e2e.admin@vidasystem.local
E2E_ADMIN_PASSWORD=Vida123
E2E_MANAGER_EMAIL=e2e.manager@vidasystem.local
E2E_MANAGER_PASSWORD=Vida123
E2E_USER_EMAIL=e2e.user@vidasystem.local
E2E_USER_PASSWORD=Vida123
```

**Características:**

- Banco compartilhado entre 2 devs (coordenação necessária)
- Variáveis genéricas, sem duplicação
- Reset via: `supabase db reset --linked`
- RLS desativado (desenvolvimento rápido)

#### Staging

```bash
# .env.staging (ou variáveis do GitHub Actions)
APP_ENV=staging
VITE_SUPABASE_URL=https://staging-proj.supabase.co
VITE_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-key>
VIDASYSTEM_DB_URL=postgresql://postgres:<pwd>@db.staging-proj.supabase.co:5432/postgres
```

#### Production

```bash
# .env.production (ou variáveis do GitHub Actions)
APP_ENV=production
VITE_SUPABASE_URL=https://prod-proj.supabase.co
VITE_SUPABASE_ANON_KEY=<prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<prod-service-key>
VIDASYSTEM_DB_URL=postgresql://postgres:<pwd>@db.prod-proj.supabase.co:5432/postgres
```

---

## 💾 Banco de Dados por Ambiente

### Development (Remoto Compartilhado)

```sql
-- Estado: Compartilhado entre 2 devs
-- Ao fazer setup com supabase link:

-- 1. Schema já existe (migrado remotamente)
CREATE TABLE company (id UUID, ...);
CREATE TABLE app_user (id UUID, ...);
CREATE TABLE client (id UUID, ...);
-- ... etc

-- 2. Dados de teste são inseridos via seed
INSERT INTO company VALUES (...);
INSERT INTO app_user VALUES (...);
-- ... dados com IDs de teste

-- 3. RLS é DESATIVADO (desenvolvimento rápido)
-- RLS disabled = qualquer um pode acessar tudo
-- (Segurança ativada apenas para QA/Produção)
```

**Fluxo Típico:**

```bash
# Dia 1: Setup (primeira vez)
npx supabase link --project-ref SEU_PROJECT_ID
supabase db reset --linked
npm run dev:vidasystem

# Dias 2-5: Desenvolvimento
npm run dev:vidasystem              # Muda arquivos
# (Banco continua remoto, compartilhado)

# Dia 5: Precisa resetar
# ⚠️ AVISE SEU COLEGA PRIMEIRO!
supabase db reset --linked     # Apaga tudo (remoto)
npm run db:seed:dev:vidasystem      # Repovoaa
npm run dev:vidasystem              # Continua

# Dia 6: Faz commit
git add apps/vidasystem/src/
git commit -m "feat: add xyz"
```

**⚠️ Regras Importantes:**

- Banco é **compartilhado** — sempre avise antes de resetar
- Mudanças afetam seu colega **imediatamente**
- Coordene para evitar conflitos de dados
- Use `supabase db reset --linked` com cuidado

### Staging (QA/Homologação)

```
Propósito: Reproduzir produção com dados seguros

Acesso:
- Desenvolvedores: SIM (debugar issues)
- QA: SIM (testar features)
- Clientes: NÃO (dados de teste apenas)

Data:
- Atualizado: Diariamente (restaurado do backup de prod com anonimização)
- ou: Dados específicos de teste

Segurança:
- RLS: ATIVADO (como produção)
- Policies: IGUAIS a produção
- Backups: Sim, diariamente

Deploy:
- Trigger: Merge em branch staging
- Automático via CI/CD
- Rollback: Manual se necessário
```

### Production

```
Propósito: Dados reais, máxima segurança

Acesso:
- Desenvolvedores: SIM (emergências apenas, auditado)
- QA: NÃO
- Clientes: SIM (através da app)

Data:
- Dados reais de clientes
- NUNCA reset (exceto backup disaster recovery)

Segurança:
- RLS: ATIVADO
- Policies: RIGOROSAS
- Backups: Horário + Automático
- Monitoring: 24/7
- Logs: Auditoria completa

Deploy:
- Trigger: Merge manual em main + aprovação
- Manual (sem auto-deploy)
- Rollback: Possível mas requer planejamento
- Notificações: Slack/Email ao time
```

---

## 🔄 Fluxo de Desenvolvimento Típico

### Semana 1: Feature Nova

```bash
# 1. Criar feature branch
git checkout -b feat/new-dashboard
git branch --set-upstream-to=origin/feat/new-dashboard

# 2. Setup local (primeira vez)
npx supabase link --project-ref SEU_PROJECT_ID
npm run dev:vidasystem

# 3. Desenvolver durante dias
npm run dev:vidasystem
# ... edita código, testa localmente
# (Banco continua remoto, pode usar dados existentes)

# 4. Antes de fazer commit: resetar DB ao estado limpo
# ⚠️ COORDENE COM SEU COLEGA PRIMEIRO!
supabase db reset --linked
npm run db:seed:dev:vidasystem
npm run precommit:check

# 5. Fazer commit
git add apps/vidasystem/
git commit -m "feat(dashboard): add xyz component"

# 6. Push
git push origin feat/new-dashboard

# 7. Abrir PR
# GitHub CLI:
gh pr create --title "Add new dashboard" --body "Descrição..."
```

**✅ Checklist:**

- Avisei meu colega antes de resetar? ✓
- Precommit check passou? ✓
- Banco está em estado inicial? ✓

### Semana 2: Revisão e QA

```
# Código:
PR criado → Reviewers analisam → Aprovam → Merge em staging

# Deploy Automático para Staging:
GitHub Actions:
  1. Checkout código
  2. npm install
  3. npm run build
  4. npm run test
  5. Deploy em staging (Railway/Vercel)

# QA testa em staging:
- Login com credenciais de teste
- Testa fluxo completo
- Reporta bugs (se houver)

# Se OK:
PR manda para main → Deploy em Produção (manual)
```

### Semana 3: Em Produção

```
Monitoramento:
- Logs de erro
- Performance
- Usuarios ativos

Se problema:
- Hotfix em main
- Deploy imediato
- Ou rollback à versão anterior
```

---

## 📈 Migrations (Mudanças no Schema)

### Scenario 1: Migration Simples (Add Column)

```bash
# 1. Local
# Cria arquivo em packages/db-vidasystem/migrations/
mkdir -p packages/db-vidasystem/migrations
cat > packages/db-vidasystem/migrations/20260215_add_email_to_users.sql << EOF
ALTER TABLE app_user ADD COLUMN secondary_email VARCHAR(255);
EOF

# 2. Test locally
npm run db:migrate:vidasystem

# 3. Commit
git add packages/db-vidasystem/migrations/
git commit -m "chore(db): add secondary_email to app_user"

# 4. PR + Deploy automático em staging
# Migration é aplicada automaticamente

# 5. Production
# Manual review + approval + deploy
```

### Scenario 2: Migration Complexa (Data Transformation)

```bash
# 1. Local - Cria migration multi-parte
# migration_1: Schema changes
# migration_2: Data transformation
# migration_3: Cleanup

# 2. Test locally
npm run db:migrate:vidasystem
npm run db:seed:dev:vidasystem
npm run test:e2e

# 3. Staging
# Roda migrations
# QA testa dados migrando corretamente

# 4. Production
# DBA revisa
# Executa fora de pico
# Rollback plan pronto
```

---

## ⚠️ Boas Práticas

### DO ✅

- ✅ Sempre fazer `db:reset` antes de commit
- ✅ Testar migrations em local antes de PR
- ✅ Incluir plano de rollback para migrations complexas
- ✅ Monitorar staging após deploy
- ✅ Usar feature flags para mudanças grandes
- ✅ Fazer backup antes de change em produção
- ✅ Usar CI/CD para consistência

### DON'T ❌

- ❌ Commitar `.env.local` ou `.env.production`
- ❌ Fazer operações em produção via scripts manuais
- ❌ Ignorar failures em CI/CD
- ❌ Rebase/force push em main ou staging
- ❌ Modificar dados de teste manualmente em staging
- ❌ Deploy direto em produção sem testar em staging
- ❌ Deixar migrations pending (sempre aplica antes de deploy)

---

## 🚨 Troubleshooting por Ambiente

### Dev (Local) Quebrado

```bash
# Resetar tudo
npm run db:reset:vidasystem
npm run db:seed:dev:vidasystem

# Se Docker está com problema
docker compose -f ~/.local/share/supabase/docker-compose.yml down -v
npm run setup:dev:vidasystem
```

### Staging Quebrado (Após Deploy)

```
1. Check logs:
   - Railway dashboard
   - GitHub Actions logs

2. Rollback:
   - Revert commit em staging branch
   - Redeploy automático

3. Fixar:
   - Debug issue
   - Re-merge quando fixado
```

### Production Problema (CRÍTICO)

```
1. Assess impacto:
   - Clientes afetados?
   - Dados corrompidos?

2. Opções:
   - Hotfix + deploy rápido
   - Rollback versão anterior
   - Restore backup (último recurso)

3. Comunicar:
   - Slack/Email ao time
   - Status page (se público)

4. Post-mortem:
   - Entender o que falhou
   - Plano para evitar futuro
```

---

## 📋 Checklist: Pronto para Production?

- [ ] Código foi revisado em PR
- [ ] Testes passaram em CI/CD
- [ ] Testado em staging por QA
- [ ] Migrations foram testadas e são reversiveis
- [ ] Documentação atualizada
- [ ] Plano de rollback documentado
- [ ] Aprovação de PM/Tech Lead
- [ ] Deploy agendado em horário seguro
- [ ] Tim disponível por 1h após deploy
- [ ] Monitoramento ativado

---

**Dúvidas?** Verifique `docs/DEV_ENVIRONMENT.md` para detalhes de desenvolvimento local.
