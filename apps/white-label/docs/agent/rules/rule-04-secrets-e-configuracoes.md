# rule-04-secrets-e-configuracoes.md

Gestão de Segredos e Configurações Sensíveis - Projeto Aurea

## GATILHO

Criação/modificação de variáveis de ambiente, chaves, tokens, URLs sensíveis.

## REGRAS CRÍTICAS

- **Nunca hardcode**: Nenhuma chave/token no código
- **Nunca versionar**: `.env`, `.env.example` não vão para git
- **Frontend**: Apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (públicos)
- **Backend (Functions)**: `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — NUNCA no frontend
- **Princípio menor privilégio**: Anon key controlada por RLS (multi-tenant)

## PADRÕES VÁLIDOS

✅ Frontend (src/lib/supabase.ts)

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

✅ Backend (supabase/functions/manage-user/index.ts)

```typescript
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);
```

## PADRÕES INVÁLIDOS - NUNCA FAZER

❌ Service role no frontend
❌ Hardcoding: `const apiKey = "sk_live_..."`
❌ Comitar `.env` com valores reais
❌ Expor segredos na URL/cliente

## VARIÁVEIS DO PROJETO

**Frontend (.env.example)**

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

**Supabase Functions (via Dashboard)**

```
SUPABASE_SERVICE_ROLE_KEY=... (APENAS em Functions)
```

**Git**

- ❌ Não comitar: `.env*`, chaves, tokens
- ✅ Comitar: `.env.example` sem valores

## DESENVOLVIMENTO

1. Copiar `.env.example` → `.env.example`
2. Preencher credenciais dev
3. Testar com RLS ativo
4. Dev ≠ Staging ≠ Production (segredos isolados)
5. Se vazar: revogar imediatamente + gerar novo + atualizar

## CHECKLIST

- ✓ Nenhum segredo hardcodeado
- ✓ Frontend: apenas `VITE_*` públicos
- ✓ Backend (Functions): usa `Deno.env.get()`
- ✓ RLS policies ativas
- ✓ Service role isolada por ambiente
- ✓ Code review validou ausência de segredos

**Crítico**: Segredo exposto = incidente de segurança healthcare (LGPD)
