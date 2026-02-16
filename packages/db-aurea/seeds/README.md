# Aurea Development Seeds

## 📁 Estrutura

```
seeds/
├── data_seed.sql        ← REFERÊNCIA (uso: documentação)
├── app-users.sql       ← App Users + System User (vinculação manual)
└── README.md

supabase/
└── seed.sql            ← EXECUTADO AUTOMATICAMENTE (profissionais, pacientes, medicações, app users)
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

### 2️⃣ Supabase Seed SQL (Automático)

Supabase executa automaticamente `supabase/seed.sql`:

- 3 Profissionais
- 3 Pacientes
- 10 Medicações
- 1 System User (se auth user existir)
- 3 App Users (se auth users existirem)

### 3️⃣ Auth Users (Manual)

```bash
npm run db:seed:dev:aurea
```

**Fluxo:**

1. **scripts/lib.cjs** → Cria auth users via API Supabase
   - superadmin@aurea.com (system admin)
   - admin@aurea.com
   - manager@aurea.com
   - user@aurea.com

2. **supabase/seed.sql** → Detecta auth users e cria app_user + system_user
   - Insere system_user (1x) se API criou superadmin
   - Insere app_user (3x) se API criou usuários

## ✅ Responsabilidades

| Etapa                              | Arquivo           | Tipo        | Gatilho                    |
| ---------------------------------- | ----------------- | ----------- | -------------------------- |
| Schema                             | migration         | SQL         | Auto (db reset)            |
| Profissionais/Pacientes/Medicações | supabase/seed.sql | SQL         | Auto (db reset → Supabase) |
| System User + App Users            | supabase/seed.sql | SQL         | Auto (db reset → Supabase) |
| Auth Users                         | scripts/lib.cjs   | Node.js/API | Manual (db:seed:dev)       |

## 📊 Dados Inseridos

### System User (1)

- `superadmin@aurea.com` (is_superadmin=true)

### App Users (3)

- `admin@aurea.com` (role: admin)
- `manager@aurea.com` (role: manager)
- `user@aurea.com` (role: viewer)

### Profissionais (3)

- Dra. Ana Silva (Médico - CRM)
- Enf. Carlos Santos (Enfermeiro - COREN)
- Fisio. Maria Oliveira (Fisioterapeuta - CREFITO)

### Pacientes (3)

- João da Silva
- Maria dos Santos
- Pedro Costa

### Medicações (10)

- Dipirona 500mg, Amoxicilina 500mg 🚨, Omeprazol 20mg, Metformina 850mg, Lisinopril 10mg
- Fluoxetina 20mg 🚨, Soro Fisiológico 0,9%, Difenidramina 25mg, Metoclopramida 10mg, Losartana 50mg

## 🧪 Setup Completo

```bash
npm run setup -- aurea

# Internamente executa:
# 1. npm run db:reset:aurea
#    → migrations + supabase/seed.sql (tudo automático)
# 2. npm run db:seed:dev:aurea
#    → cria auth users via API
#    → supabase/seed.sql detecta e cria system_user + app_users
```

## 📝 Notas Importantes

### `data_seed.sql` é apenas REFERÊNCIA

- Não é executado automaticamente
- Documenta a estrutura esperada
- Use para entender o fluxo

### `app-users.sql` é BACKUP

- Pode ser executado manualmente com `psql` se necessário
- Normalmente desnecessário (tudo já está em `supabase/seed.sql`)
- Mantido para compatibilidade

### Ambiente Supabase

- ✅ Usar **sempre Supabase remoto**
- ❌ Nunca usar `supabase start` (local)
- Scripts npm gerenciam tudo automaticamente
