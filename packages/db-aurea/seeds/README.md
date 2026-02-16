# Aurea Development Seeds

## 📁 Estrutura

```
seeds/
├── seed.sql              ← Pessoas/Pacientes/Medicações
├── app-users.sql        ← App Users + System User (vinculação)
└── README.md
```

## 🔄 Como Funciona

### 1️⃣ Migrations (Estrutura)
```bash
npm run db:reset:aurea
```
- Schema tables
- Unit of Measure
- Administration Routes
- Cria company (00.000.000/0001-00)

### 2️⃣ Seed SQL (Automático - Profissionais/Pacientes/Medicações)
Supabase executa automaticamente `supabase/seed.sql`:
- 3 Profissionais
- 3 Pacientes
- 10 Medicações

### 3️⃣ Auth + App Users + System User
```bash
npm run db:seed:dev:aurea
```

**Fluxo:**
1. **lib.cjs** → Cria auth users via API Supabase
   - admin@aurea.local (system admin)
   - e2e.admin@aurea.local
   - e2e.manager@aurea.local
   - e2e.user@aurea.local

2. **seeds/app-users.sql** → Vincula ao banco (executado via psql)
   - Insere system_user (1x)
   - Insere app_user (4x)

## ✅ Responsabilidades

| Etapa | Arquivo | Tipo | Como |
|-------|---------|------|------|
| Schema | migration | SQL | Auto (db reset) |
| Profissionais/Pacientes/Medicações | supabase/seed.sql | SQL | Auto (Supabase) |
| Auth Users | scripts/lib.cjs | Node.js/API | Manual (db:seed:dev) |
| App Users + System User | seeds/app-users.sql | SQL | Via psql (db:seed:dev) |

## 📊 Dados Inseridos

### System User (1)
- `admin@aurea.local` (is_superadmin=true)

### App Users (3)
- `e2e.admin@aurea.local` (role: admin)
- `e2e.manager@aurea.local` (role: manager)
- `e2e.user@aurea.local` (role: viewer)

### Profissionais (3)
- Dra. Ana Silva (Médico)
- Enf. Carlos Santos (Enfermeiro)
- Fisio. Maria Oliveira (Fisioterapeuta)

### Pacientes (3)
- João da Silva
- Maria dos Santos
- Pedro Costa

### Medicações (10)
- Dipirona, Amoxicilina 🚨, Omeprazol, Metformina, Lisinopril
- Fluoxetina 🚨, Soro Fisiológico, Difenidramina, Metoclopramida, Losartana

## 🧪 Fluxo Rápido

```bash
npm run setup -- aurea

# Internamente executa:
# 1. npm run db:reset:aurea
#    → migrations + supabase/seed.sql (profissionais/pacientes/medicações)
# 2. npm run db:seed:dev:aurea
#    → cria auth users + executa app-users.sql
```

## 🔐 Credenciais Padrão

```bash
admin@aurea.local / AureaE2E!123
e2e.admin@aurea.local / AureaE2E!123
e2e.manager@aurea.local / AureaE2E!123
e2e.user@aurea.local / AureaE2E!123
```

Customize via `.env.local`:
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
- `E2E_MANAGER_EMAIL`, `E2E_MANAGER_PASSWORD`
- `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`
- `E2E_SYSTEM_ADMIN_PASSWORD`

## 📝 Centralização em `/seeds`

✅ Todos os dados de seed estão centralizados em `seeds/`:
- `seed.sql` - Profissionais/Pacientes/Medicações
- `app-users.sql` - App Users + System User

✅ Ruby.cjs apenas cria auth users (requer API Supabase)


- E2E-MED-007 - Soro Fisiológico 0,9% (solução)
- E2E-MED-008 - Difenidramina 25mg (anti-histamínico)
- E2E-MED-009 - Metoclopramida 10mg (antiemético)
- E2E-MED-010 - Losartana 50mg (antagonista AT2)


