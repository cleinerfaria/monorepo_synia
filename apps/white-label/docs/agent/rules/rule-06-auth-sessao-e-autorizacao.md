# rule-06-auth-sessao-e-autorizacao.md

Autenticação, Sessão e Autorização (Supabase)

## Gatilho

Login/logout, proteção de rotas, chamadas a Functions/APIs, RBAC, qualquer leitura/escrita autenticada.

## Regras Críticas

- **Fonte de verdade: Supabase**: Sessão vem do `supabase.auth.getSession()` / `onAuthStateChange` → `useAuthStore()` apenas espelha estado
- **Nunca confiar no cliente para permissões**: UI pode esconder features, mas autorização real é no backend/RLS/Functions
- **JWT sempre no Authorization**: Chamada a Function/API deve enviar `Authorization: Bearer <access_token>`
- **Sem "tokens próprios"**: Não criar token paralelo, não inventar cookie/session manual no frontend
- **Logout limpa tudo**: `supabase.auth.signOut()` + reset de stores/cache + limpar dados sensíveis da UI
- **Session expirada não é bug**: Tratar 401/403 como fluxo normal (re-auth / refresh / redirect)

## Padrões

✅ **CORRETO: Token vem do Supabase e vai no header**

```typescript
// Obter sessão
const {
  data: { session },
} = await supabase.auth.getSession();

// Chamar Function com JWT
await fetch(`${SUPABASE_URL}/functions/v1/admin-op`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    /* dados */
  }),
});
```

❌ **ERRADO: Permissão baseada em flags do frontend**

```typescript
// ❌ Sem validação no backend
if (user.isAdmin) {
  /* operação */
}

// ❌ Aceitar company_id, role, permissions do payload do usuário
const { company_id, role } = user.user_metadata;
```

## Autorização (RBAC)

- **RLS em primeiro lugar**: Tabelas expostas ao client exigem RLS + policies por `company_id` e `role`
- **Admin via Functions**: Operações privilegiadas só em `supabase/functions/*` (ver rule-01)
- **Claims/JWT**: Qualquer verificação de role/permissão a partir de JWT/contexto confiável (nunca do payload do cliente)

## Checklist

- ✓ Rotas protegidas validam sessão antes de renderizar/acionar mutations
- ✓ Toda Function/API exige `Authorization: Bearer`
- ✓ Nenhuma permissão crítica depende do frontend
- ✓ 401/403 tratados como fluxo normal (relogin/refresh)
- ✓ Logout limpa store/cache/dados sensíveis

## Regra Final

> **Frontend mostra. Backend/RLS decide.**
