# rule-02-async-e-concorrencia.md

## GATILHO

I/O, APIs, operações em lote ou processamento custoso.

## DIRETRIZES

- **Async First**: DB, APIs, storage → sempre async
- **Sem bloqueios**: Proibido `sleep()` síncrono, loops pesados
- **Sem await em loop**: Use `Promise.all()` com batch size 50
- **Timeout 30–60s**: Toda operação remota
- **Background jobs**: Importações, s, processamento >2s estimado
- **React Query**: `useQuery()` e `useMutation()` lidam com retry/timeout automaticamente

## PADRÕES

❌ **ERRADO**: Loop sequencial

```ts
for (const id of ids) {
  await supabase.from('items').update({ status: 'done' }).eq('id', id)
}
```

✅ **CORRETO**: Batch com Promise.all

```ts
const BATCH_SIZE = 50
for (let i = 0; i < ids.length; i += BATCH_SIZE) {
  const batch = ids.slice(i, i + BATCH_SIZE)
  await Promise.all(
    batch.map((id) => supabase.from('items').update({ status: 'done' }).eq('id', id))
  )
}
```

❌ **ERRADO**: Paralelo sem limite

```ts
await Promise.all(hugeArray.map((item) => supabase.from('table').insert(item)))
```

✅ **CORRETO**: Chamadas independentes

```ts
const [user, orders, invoices] = await Promise.all([fetchUser(), fetchOrders(), fetchInvoices()])
```

## MULTI-TENANT

⚠️ Batch operations DEVEM incluir `company_id`:

```ts
await supabase
  .from('items')
  .update({ status: 'done' })
  .eq('company_id', companyId) // ← OBRIGATÓRIO
  .in('id', ids)
```

- ✓ Sem I/O síncrono
- ✓ Operações independentes em paralelo
- ✓ Máx. 50 requests simultâneos
- ✓ Timeout definido (30–60s)
- ✓ Importações em background
- ✓ Filtro `company_id` em operações em lote
- ✓ RPC preferido a múltiplas queries

> **Async** = não bloquear | **Batch** = não sobrecarregars queries

Async = não bloquear.
Batch = não sobrecarregar.
