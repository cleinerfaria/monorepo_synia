# 🔧 Configuração de Environments no GitHub

## ⚠️ AÇÃO URGENTE NECESSÁRIA

Para que as migrations sejam aplicadas corretamente nos bancos de homologação e produção, você precisa configurar os **Environments** no GitHub.

## 🎯 Configuração dos Environments

### 1. Acesse as configurações do repositório:

```
https://github.com/SEU_USERNAME/monorepo_synia/settings/environments
```

### 2. Crie 3 environments:

#### 🟢 **development**

- **Nome**: `development`
- **Proteção**: Nenhuma
- **Secrets**:
  ```
  SUPABASE_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (token pessoal)
  VIDASYSTEM_SUPABASE_PROJECT_REF=abcd1234567890 (projeto dev)
  VIDASYSTEM_SUPABASE_DB_PASSWORD=sua_senha_dev
  WL_SUPABASE_PROJECT_REF=xyz9876543210 (projeto dev)
  WL_SUPABASE_DB_PASSWORD=sua_senha_dev
  ```

#### 🟡 **homolog**

- **Nome**: `homolog`
- **Proteção**: Opcional (pode exigir review)
- **Secrets**:
  ```
  SUPABASE_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (mesmo token)
  VIDASYSTEM_SUPABASE_PROJECT_REF=homolog1234567890 (projeto staging)
  VIDASYSTEM_SUPABASE_DB_PASSWORD=senha_staging_VidaSystem
  WL_SUPABASE_PROJECT_REF=homolog9876543210 (projeto staging)
  WL_SUPABASE_DB_PASSWORD=senha_staging_wl
  ```

#### 🔴 **production**

- **Nome**: `production`
- **Proteção**: ⚠️ **OBRIGATÓRIO** - Exigir review de admin
- **Secrets**:
  ```
  SUPABASE_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (mesmo token)
  VIDASYSTEM_SUPABASE_PROJECT_REF=prod1234567890 (projeto produção)
  VIDASYSTEM_SUPABASE_DB_PASSWORD=senha_producao_VidaSystem
  WL_SUPABASE_PROJECT_REF=prod9876543210 (projeto produção)
  WL_SUPABASE_DB_PASSWORD=senha_producao_wl
  ```

## 🔑 Como obter os valores dos secrets:

### **SUPABASE_ACCESS_TOKEN**

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em "Generate new token"
3. Nome: "GitHub Actions"
4. Copie o token gerado

### **PROJECT_REF**

1. Acesse cada projeto no Supabase Dashboard
2. Vá em Settings → General
3. Copie o "Reference ID" (formato: abcdefghijklmnop)

### **DB_PASSWORD**

1. No Supabase Dashboard → Settings → Database
2. Use a senha definida na criação do projeto
3. Ou redefina uma nova em "Reset database password"

## 🔄 Novo Fluxo de Deploy

### **Branch develop → Staging (Automático)**

```bash
git push origin develop
# → Roda cd-staging.yml
# → Deploy automático no environment 'homolog'
```

### **Branch main → Production (Automático c/ proteção)**

```bash
git push origin main
# → Roda cd.yml
# → Deploy no environment 'production' (requer aprovação se configurado)
```

### **Deploy Manual (Qualquer ambiente)**

```bash
# No GitHub: Actions → Deploy to Production → Run workflow
# Escolher: development, homolog, ou production
```

## 🚨 Verificação Imediata

Para testar se funcionou:

1. **Configure os environments primeiro**
2. **Execute um deploy manual**:
   - GitHub → Actions → "Deploy to Production"
   - Run workflow → Choose "homolog"
   - Acompanhe os logs
3. **Verifique no banco de homologação** se as migrations foram aplicadas

## 📋 Checklist de Configuração

- [ ] Environment `development` criado com secrets
- [ ] Environment `homolog` criado com secrets
- [ ] Environment `production` criado com secrets e proteção
- [ ] Todos os PROJECT_REF apontam para projetos corretos
- [ ] Todas as senhas de DB estão corretas
- [ ] SUPABASE_ACCESS_TOKEN tem permissões nos projetos
- [ ] Teste manual executado com sucesso

## 🔧 Troubleshooting

### **Erro: "Missing VIDASYSTEM_SUPABASE_PROJECT_REF"**

- Verifique se o environment está configurado no GitHub
- Confirme se o secret foi adicionado com o nome exato

### **Erro: "Authentication failed"**

- Verifique se SUPABASE_ACCESS_TOKEN é válido
- Confirme se o token tem acesso ao projeto especificado

### **Erro: "Password authentication failed"**

- Verifique se a senha do banco está correta
- Tente resetar a senha no Supabase Dashboard

### **Migration falha silenciosamente**

- Verifique se há migrations pendentes: `supabase migration list`
- Confira se o projeto correto está sendo usado nos logs do GitHub Actions

---

**📧 Em caso de dúvidas, abra uma issue com logs completos do GitHub Actions.**
