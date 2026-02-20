# Seeds - VidaSystem Dev Data

## 📋 Resumo

Este projeto inclui três formas equivalentes de popular dados de desenvolvimento:

1. **SQL direto** - Manual (arquivo `dev-seed-data.sql` ou `seed.sql`)
2. **Supabase CLI** - Automático com migrations
3. **Script Node.js** - Via API REST (usado internamente para usuários)

---

## 🚀 Opção 1: Usar SQL Direto (Recomendado para Dev)

### Via Supabase Dashboard (Mais Fácil)

1. Abra [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **SQL Editor**
3. Copie o conteúdo de `packages/db-vidasystem/seeds/dev-seed-data.sql`
4. Cole e clique em **Run**

### Via Supabase CLI

```bash
# Executar seed SQL diretamente
supabase db execute -f packages/db-vidasystem/seeds/dev-seed-data.sql --db-url $DB_URL
```

### Via psql (Acesso direto)

```bash
psql -h <host> -U postgres -d postgres -f packages/db-vidasystem/seeds/dev-seed-data.sql
```

---

## ⚙️ Opção 2: Usar Migrations (Automático)

O arquivo `packages/db-vidasystem/supabase/seed.sql` é executado automaticamente durante:

```bash
# Reset completo + seed
supabase db push --include-all

# Ou fácil com npm
npm run db:migrate:vidasystem
```

---

## 🔧 Opção 3: Script Node.js (CI/CD)

O script `packages/db-vidasystem/scripts/lib.cjs` faz seed via API Supabase:

```bash
# Chama o seed via script Node.js
npm run db:seed:dev:vidasystem
```

**Vantagens**:

- Função em `seedVidaSystemDev()`
- Usa API REST (funciona até remotamente)
- Perfeito para CI/CD e ambiente de produção
- Validación de ambiente (APP_ENV=dev)

---

## 📊 Dados Inseridos

### ✅ Profissionais (3)

| Código      | Nome                  | Role           | Conselho       |
| ----------- | --------------------- | -------------- | -------------- |
| E2E-PRO-001 | Dra. Ana Silva        | Médico         | CRM 123456     |
| E2E-PRO-002 | Enf. Carlos Santos    | Enfermeiro     | COREN 654321   |
| E2E-PRO-003 | Fisio. Maria Oliveira | Fisioterapeuta | CREFITO 987654 |

### ✅ Pacientes (3)

| Código      | Nome             | Gênero | Nascimento | CPF            |
| ----------- | ---------------- | ------ | ---------- | -------------- |
| E2E-PAT-001 | João da Silva    | M      | 1960-05-15 | 123.456.789-00 |
| E2E-PAT-002 | Maria dos Santos | F      | 1965-08-22 | 234.567.890-11 |
| E2E-PAT-003 | Pedro Costa      | M      | 1955-12-10 | 345.678.901-22 |

### ✅ Medicações (10)

1. Dipirona 500mg - Analgésico e antitérmico
2. Amoxicilina 500mg - Antibiótico betalactâmico ⚠️
3. Omeprazol 20mg - Inibidor de bomba de prótons
4. Metformina 850mg - Antidiabético oral
5. Lisinopril 10mg - Inibidor ECA para hipertensão
6. Fluoxetina 20mg - ISRS antidepressivo 🔒
7. Soro Fisiológico 0,9% - Solução para limpeza
8. Difenidramina 25mg - Anti-histamínico
9. Metoclopramida 10mg - Antiemético e procinético
10. Losartana 50mg - Antagonista de receptor de angiotensina II

> ⚠️ = Antibiótico | 🔒 = Psicotrópico

### 📝 Gerenciados por Migrations (NÃO inclusos em seeds para evitar redundância)

- **Unit of Measure** (8) - Gerenciado por `unit_of_measure.sql`
- **Administration Routes** (20) - Gerenciado por `seed_administration_routes.sql`

---

## ✅ Validação

Após inserir os dados, verifique:

```sql
-- Verificar profissionais
SELECT COUNT(*) FROM professional
WHERE company_id = (SELECT id FROM company WHERE document = '11.111.111/0001-11');

-- Verificar pacientes
SELECT COUNT(*) FROM patient
WHERE company_id = (SELECT id FROM company WHERE document = '11.111.111/0001-11');

-- Verificar medicações
SELECT COUNT(*) FROM product
WHERE company_id = (SELECT id FROM company WHERE document = '11.111.111/0001-11')
AND item_type = 'medication';
```

**Resultado esperado**: 3 + 3 + 10 = 16 registros

---

## 🔄 Fluxo Completo Recomendado

```bash
# 1. Reset + Migrate + Seed (automático)
npm run db:reset:vidasystem

# 2. (Já executa o seed da migration automaticamente)
npm run db:migrate:vidasystem

# 3. Se precisar fazer seed novamente sem reset
npm run db:seed:dev:vidasystem

# 4. Iniciar dev
npm run dev:vidasystem
```

---

## 🚨 Troubleshooting

### Erro: "Empresa E2E não encontrada"

A empresa precisa ser criada primeiro. Execute:

```bash
npm run db:reset:vidasystem  # Cria automaticamente via script Node.js
```

### Erro: "Conflito de dados"

Use `ON CONFLICT ... DO NOTHING` para reutilizar dados existentes:

```sql
INSERT INTO professional (company_id, code, name, ...)
VALUES (...)
ON CONFLICT (company_id, code) DO NOTHING;
```

### Seeds não funcionam em produção?

✅ Seguro! O seed SQL inclui check `IF v_company_id IS NULL` e usa `ON CONFLICT DO NOTHING`, então é idempotente.

---

## 📝 Notas

- Todos os dados usam `company_id` da empresa E2E
- Data de criação é automática (`NOW()`)
- `active = TRUE` por padrão
- Código é único por empresa (`UNIQUE(company_id, code)`)
- SEEDs são idempotentes (rodo quantas vezes quiser)
- **Sem redundância**: Unit of Measure e Administration Routes não são duplicados em seeds
