# White Label Development Seeds

## Ì≥Å Estrutura Centralizada

```
seeds/
‚îú‚îÄ‚îÄ app-users.sql        ‚Üê App Users + System User (vincula√ß√£o)
‚îî‚îÄ‚îÄ README.md
```

## Ì¥Ñ Como Funciona

### 1Ô∏è‚É£ Migrations (Estrutura)
```bash
npm run db:reset:white-label
```
Executa:
- Schema tables
- Access Profiles (admin, manager, user)
- Cria company com document = `22.222.222/0001-22`

### 2Ô∏è‚É£ Auth Users + App Users + System User
```bash
npm run db:seed:dev:white-label
```

**Fluxo:**
1. **lib.cjs** ‚Üí Cria auth users via API Supabase
   - e2e.admin@white-label.local
   - e2e.manager@white-label.local
   - e2e.user@white-label.local

2. **seeds/app-users.sql** ‚Üí Vincula ao banco (executado via psql)
   - Insere system_user (1x - o admin)
   - Insere app_user (3x)

## Ì≥ä Dados Inseridos

### System User (1)
- `e2e.admin@white-label.local` (is_superadmin=true)

### App Users (3)
- `e2e.admin@white-label.local` (access_profile: admin)
- `e2e.manager@white-label.local` (access_profile: manager)
- `e2e.user@white-label.local` (access_profile: user)

## Ì¥ê Credenciais Padr√£o

```
e2e.admin@white-label.local / AureaE2E!123
e2e.manager@white-label.local / AureaE2E!123
e2e.user@white-label.local / AureaE2E!123
```

Customize via `.env.local`:
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
- `E2E_MANAGER_EMAIL`, `E2E_MANAGER_PASSWORD`
- `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`

## Ì∑™ Fluxo R√°pido

```bash
npm run setup -- white-label

# Internamente executa:
# 1. npm run db:reset:white-label
#    ‚Üí migrations + access_profiles
# 2. npm run db:seed:dev:white-label
#    ‚Üí cria auth users + executa app-users.sql
```

## Ì≥ù Responsabilidades

| Etapa | Arquivo | Tipo | Como |
|-------|---------|------|------|
| Schema | migration | SQL | Auto (db reset) |
| Auth Users | scripts/lib.cjs | Node.js/API | Manual (db:seed:dev) |
| App Users + System User | seeds/app-users.sql | SQL | Via psql (db:seed:dev) |

## ‚úÖ Centraliza√ß√£o em `/seeds`

‚úÖ Todo o seed SQL est√° centralizado em `seeds/app-users.sql`
‚úÖ lib.cjs apenas cria auth users (requer API Supabase)
