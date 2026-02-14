# rule-01-security-isolation.md

Isolamento de Segurança Supabase

## Regras Inegociáveis

- **Nunca SERVICE_ROLE no Frontend**: `SUPABASE_SERVICE_ROLE_KEY` é proibido em qualquer arquivo dentro de `/src`
- **Frontend sempre ANON_KEY**: Use `VITE_SUPABASE_ANON_KEY` para criar o cliente (ver `src/lib/supabase.ts`)
- **Client-side só com RLS (policy explícita)**: Operações no frontend só são permitidas se houver policy RLS correspondente (por role `anon`/`authenticated`) na tabela.  
  Sem policy → erro **403 (comportamento esperado)**. O agente nunca deve tentar contornar RLS.
- **Operações Admin/Privilegiadas**: Devem ser feitas via **Supabase Functions** (`supabase/functions/*`) usando `SERVICE_ROLE_KEY`
- **SERVICE_ROLE só em Functions**: `SERVICE_ROLE_KEY` só pode existir em variáveis/segredos do ambiente das Functions, nunca em `.env.example` e nunca em código do frontend
- **Validação obrigatória em Functions**: Toda Function deve validar o JWT recebido (`Authorization: Bearer`) antes de executar qualquer lógica privilegiada

## Pattern Correto

```typescript
// Frontend: operação permitida por RLS
const { error } = await supabase.from('product_presentation').update({ name }).eq('id', id)

// Backend (Function): operação privilegiada
// supabase/functions/admin-op/index.ts
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
await supabaseAdmin.from('users').delete().eq('id', userId)

// Frontend chama a Function (com autenticação)
const {
  data: { session },
} = await supabase.auth.getSession()
await fetch('https://...supabase.co/functions/v1/admin-op', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userId: id }),
})
```

## Fluxo de Segurança

1. **Frontend autenticado** (token JWT armazenado)
2. **Tenta operação protegida** → RLS valida policy existente
3. **Precisa privilégio** → chama Function + envia token
4. **Function valida token** + executa com `SERVICE_ROLE_KEY`

## Checklist

- ✓ `VITE_SUPABASE_ANON_KEY` em `.env.example`
- ✓ `SERVICE_ROLE_KEY` nunca em `.env.example`
- ✓ RLS policies em todas as tabelas
- ✓ Operações admin via Functions com autenticação
