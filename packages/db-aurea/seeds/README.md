# Aurea Development Seeds

## Estrutura (SEM REDUNDÂNCIA)

- **dev-seed-data.sql** - Espelho de supabase/seed.sql (referência local)
  - 3 Profissionais (Médico, Enfermeiro, Fisioterapeuta)
  - 3 Pacientes (com dados demográficos)
  - 10 Medicações (com tipos: antibiotic, psychotropic)

- **supabase/seed.sql** - FONTE OFICIAL (executada automaticamente)
  - Mesmo conteúdo de dev-seed-data.sql
  - Executada durante `db:reset` e `db:push`

### ✅ Separação de Responsabilidades

**Migrations gerenciam:**
- Unit of Measure (8 unidades) - `20260122240000_unit_of_measure.sql`
- Administration Routes (20 rotas) - `seed_administration_routes.sql`

**Seeds (supabase/seed.sql) gerenciam:**
- Profissionais, Pacientes, Medicações

> ❌ **Nenhuma redund

## Como Usar

### Automático (Recomendado - Durante Reset)

O arquivo `supabase/seed.sql` é executado automaticamente:

```bash
npm run db:reset:aurea
```

Isso:
1. Reseta banco de dados
2. Executa todas as migrations
3. Executa supabase/seed.sql (profissionais, pacientes, medicações)
4. Retorna banco limpo com dados de teste

### Criar Auth Users

Após reset, crie os usuários de teste:

```bash
npm run db:seed:dev:aurea
```

Isso cria 3 auth users:
- `admin@e2e.local` (admin role)
- `manager@e2e.local` (manager role)
- `user@e2e.local` (viewer role)

## Dados Inseridos (Total: 16 registros)

### Profissionais (3)
- **E2E-PRO-001** - Dra. Ana Silva (CRM 123456)
- **E2E-PRO-002** - Enf. Carlos Santos (COREN 654321)
- **E2E-PRO-003** - Fisio. Maria Oliveira (CREFITO 987654)

### Pacientes (3)
- **E2E-PAT-001** - João da Silva (M, 1960-05-15)
- **E2E-PAT-002** - Maria dos Santos (F, 1965-08-22)
- **E2E-PAT-003** - Pedro Costa (M, 1955-12-10)

### Medicações (10)
- E2E-MED-001 - Dipirona 500mg (analgésico)
- E2E-MED-002 - Amoxicilina 500mg (🚨 antibiotic)
- E2E-MED-003 - Omeprazol 20mg (protetor gástrico)
- E2E-MED-004 - Metformina 850mg (antidiabético)
- E2E-MED-005 - Lisinopril 10mg (anti-hipertensivo)
- E2E-MED-006 - Fluoxetina 20mg (🚨 psychotropic)
- E2E-MED-007 - Soro Fisiológico 0,9% (solução)
- E2E-MED-008 - Difenidramina 25mg (anti-histamínico)
- E2E-MED-009 - Metoclopramida 10mg (antiemético)
- E2E-MED-010 - Losartana 50mg (antagonista AT2)


