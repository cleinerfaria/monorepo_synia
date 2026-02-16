# 🚀 Fluxo de Deploy Corrigido

## ❌ **Problema Identificado e Resolvido**

**O que estava acontecendo:**
- Push na `main` → Aplicava migrations só no ambiente **development**
- Homologação e produção **nunca** recebiam as migrations
- Workflow reportava sucesso, mas bancos não eram atualizados

**Causa raiz:**
```yaml
# Linha problemática no cd.yml (CORRIGIDA)
environment:
  name: ${{ github.event.inputs.target_environment || 'development' }}
#     ↑ Sempre 'development' em push automático!
```

---

## ✅ **Fluxo Atual (Corrigido)**

### 🔄 **Desenvolvimento Local**
```bash
# Criar feature branch
git checkout -b feat/nova-funcionalidade

# Desenvolver + migrations
# packages/db-aurea/supabase/migrations/20260215_nova_funcionalidade.sql

# Testar migrations localmente
npm run db:migrate:aurea
npm run test:migrations  # ← NOVO script de teste

# Commit + push
git add . && git commit -m "feat: nova funcionalidade"
git push origin feat/nova-funcionalidade
```

### 🟡 **Deploy para Staging (Homologação)**
```bash
# 1. Merge na branch develop
git checkout develop
git merge feat/nova-funcionalidade
git push origin develop

# 2. GitHub Actions executa automaticamente:
# → cd-staging.yml
# → Environment: 'homolog' 
# → Aplica migrations nos bancos de staging
```

**📍 Banco alvo**: Projetos Supabase configurados no environment `homolog`

### 🔴 **Deploy para Produção**
```bash
# 1. Merge na main (após aprovação)
git checkout main  
git merge develop
git push origin main

# 2. GitHub Actions executa automaticamente:
# → cd.yml (Deploy to Production)
# → Environment: 'production'
# → Pode exigir aprovação manual (se configurado)
# → Aplica migrations nos bancos de produção
```

**📍 Banco alvo**: Projetos Supabase configurados no environment `production`

### 🎛️ **Deploy Manual (Qualquer ambiente)**
```
GitHub → Actions → "Deploy to Production" → Run workflow
Escolher: development | homolog | production
```

---

## 🔧 **Configuração Necessária (URGENTE)**

### **1. Configurar Environments no GitHub**
```
Repositório → Settings → Environments → New environment
```

Criar 3 environments:
- `development` (sem proteção)
- `homolog` (opcional: exigir review)  
- `production` (**obrigatório**: exigir review de admin)

### **2. Configurar Secrets por Environment**

Cada environment precisa ter:
```
SUPABASE_ACCESS_TOKEN=seu_token_pessoal
AUREA_SUPABASE_PROJECT_REF=projeto_referencia_aurea
AUREA_SUPABASE_DB_PASSWORD=senha_do_banco_aurea
WL_SUPABASE_PROJECT_REF=projeto_referencia_wl
WL_SUPABASE_DB_PASSWORD=senha_do_banco_wl
```

**⚠️ Valores diferentes para cada ambiente!**
- `development`: projetos de desenvolvimento
- `homolog`: projetos de staging  
- `production`: projetos de produção

**📖 Detalhes completos**: [docs/GITHUB_ENVIRONMENTS_SETUP.md](docs/GITHUB_ENVIRONMENTS_SETUP.md)

---

## 📊 **Monitoramento de Migrations**

### **Novos Logs Detalhados**
Cada deploy agora mostra:
```
🎯 Deploying to environment: production
Branch: main
Event: push
🔗 Linking Aurea project: prod1234567890
✅ Aurea project linked successfully
🚀 Applying Aurea migrations...
✅ Aurea migrations applied successfully
🔍 Verifying Aurea migrations status...
[Lista de migrations aplicadas]
```

### **Verificação Manual**
```bash
# Testar antes do deploy
npm run test:migrations

# Verificar status após deploy (no ambiente)
supabase migration list --workdir packages/db-aurea
```

---

## 🚨 **Checklist Pré-Deploy**

Antes de fazer push para `develop` ou `main`:

- [ ] Migrations testadas localmente: `npm run db:migrate:aurea`
- [ ] Teste automático passou: `npm run test:migrations`  
- [ ] Precommit check passou: `npm run precommit:check`
- [ ] Environments configurados no GitHub
- [ ] Secrets definidos corretamente para o ambiente alvo

---

## 🔄 **Rollback de Migrations**

### **Se migration quebrou em staging:**
```bash
# 1. Reverter commit
git revert COMMIT_HASH
git push origin develop

# 2. Deploy automático aplicará o rollback
```

### **Se migration quebrou em produção:**
```bash
# 1. URGENTE: Interromper deploy se ainda rodando
# 2. Criar hotfix com rollback
git checkout -b hotfix/rollback-migration
# Criar migration de rollback
git commit -m "hotfix: rollback problematic migration"
git push origin hotfix/rollback-migration

# 3. Merge direto na main (bypass review se necessário)
git checkout main
git merge hotfix/rollback-migration  
git push origin main

# 4. Deploy automático aplicará rollback em produção
```

---

## 📈 **Próximos Passos**

1. **⚠️ URGENTE**: Configurar environments no GitHub
2. **🧪 Testar**: Deploy manual para homologação  
3. **🔄 Implementar**: Branch `develop` para staging automático
4. **🛡️ Configurar**: Proteção obrigatória no environment `production`
5. **📊 Monitorar**: Primeiro deploy em produção com os novos workflows

**🎯 Status**: Fluxo corrigido, aguarda configuração de environments.