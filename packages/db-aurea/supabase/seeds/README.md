# Aurea Development Seeds

## 📁 Estrutura

```
supabase/seeds/
├── seed-01-professions.sql   ← Profissões
├── seed-02-professionals.sql ← Profissionais
├── seed-03-patients.sql      ← Pacientes
├── seed-04-products.sql      ← Produtos/Medicações
├── seed.sql                  ← LEGADO (não utilizado no fluxo atual)
├── app-users.sql       ← OPCIONAL/MANUAL (backup de vínculo app_user/system_user)
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

### 2️⃣ Supabase Seed SQL (Automático no comando de reset)

O script de reset executa `supabase db push --include-seed --yes` via `DB_URL` apos criar os auth users:
- `supabase/seeds/seed-01-professions.sql`
- `supabase/seeds/seed-02-professionals.sql`
- `supabase/seeds/seed-03-patients.sql`
- `supabase/seeds/seed-04-products.sql`

- 3 Profissionais
- 3 Pacientes
- 10 Medicações
- App users/system user podem ser vinculados depois pelo fluxo Node de dev

### 3️⃣ Auth Users + Vinculação App User (Automático no reset)

```bash
npm run db:reset:aurea
```

**Fluxo:**

1. **scripts/lib.cjs (seedAureaDev)** → Cria auth users via API Supabase
   - superadmin@aurea.com (system admin)
   - admin@aurea.com
   - manager@aurea.com
   - user@aurea.com

2. **scripts/lib.cjs (seedAureaDev)** → Cria/atualiza `system_user` e `app_user` via REST
   - Insere/upsert de system_user
   - Insere/upsert de app_user

## ✅ Responsabilidades

| Etapa                              | Arquivo           | Tipo        | Gatilho                    |
| ---------------------------------- | ----------------- | ----------- | -------------------------- |
| Schema                             | migration         | SQL         | Auto (db reset)            |
| Profissionais/Pacientes/Medicações | supabase/seeds/seed-01..04.sql | SQL         | Auto (db:reset script -> db push --include-seed) |
| Auth Users                         | scripts/lib.cjs   | Node.js/API | Auto (chamado pelo db:reset) |
| System User + App Users            | scripts/lib.cjs   | Node.js/API | Auto (chamado pelo db:reset) |

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
#    → reset sem seed
#    → cria auth users + cria/atualiza system_user e app_user
#    → executa supabase/seeds/seed-01..04.sql
```

## 📝 Notas Importantes

### `data_seed.sql` é apenas REFERÊNCIA

- Não é executado automaticamente
- Documenta a estrutura esperada
- Use para entender o fluxo

### `app-users.sql` é opcional (manual/backup)

- Não é executado automaticamente no reset
- Pode ser executado manualmente com `psql` em cenários de manutenção

### Ambiente Supabase

- ✅ Usar **sempre Supabase remoto**
- ❌ Nunca usar `supabase start` (local)
- Scripts npm gerenciam tudo automaticamente
