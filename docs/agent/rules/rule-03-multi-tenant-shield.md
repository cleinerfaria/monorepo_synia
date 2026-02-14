# rule-03-multi-tenant-isolamento.md

Isolamento de Tenant

## GATILHO

Toda query, mutation, função ou operação em lote que acessa dados persistentes.

## REGRAS CRÍTICAS

- **Filtro obrigatório**: Toda query/update DEVE filtrar por `company_id`
- **Tenant na sessão**: `company_id` vem de `useAuthStore()`, JWT ou contexto autenticado
- **Nunca do payload**: `body.company_id`, parâmetros URL ou input do usuário são ignorados
- **Batch sempre isolado**: Operações em lote DEVEM incluir filtro de tenant
- **RLS como barreira 2**: Filtro em código + RLS policy (defesa dupla)

## PADRÕES

❌ ERRADO: Query global / Tenant do payload

```ts
await supabase.from('orders').select('*')

await supabase.from('orders').select('*').eq('company_id', body.company_id)
```

✅ CORRETO: Tenant da sessão / Filtrado explicitamente

```ts
const { company } = useAuthStore()

await supabase.from('orders').select('*').eq('company_id', company.id)
```

## RLS (DEFESA EM PROFUNDIDADE)

- RLS **obrigatória** em tabelas expostas ao client
- Código filtra primeiro, RLS valida por último
- Exemplo RLS policy:

```sql
CREATE POLICY "Acesso por tenant"
  ON orders
  FOR SELECT
  USING (company_id = auth.user_id()::uuid);
```

## CHECKLIST

- ✓ Toda query filtra `eq('company_id', companyId)`
- ✓ Tenant vem de `useAuthStore()` ou JWT
- ✓ Operações em batch sempre isoladas
- ✓ RLS policy ativo (defesa dupla)
- ✓ Nenhuma query global acidental

> Um tenant vendo dados de outro = falha crítica. Sempre filtrar.
