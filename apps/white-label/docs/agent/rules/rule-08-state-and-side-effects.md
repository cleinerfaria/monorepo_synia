# rule-08-state-and-side-effects.md

Controle de Estado e Efeitos Colaterais

## Gatilho

Criar ou modificar código com estado, efeitos colaterais (fetch, logs, listeners), subscriptions ou cache.

## Regras Críticas

- **Estado deve ter fonte única de verdade**: Múltiplas fontes para o mesmo dado são proibidas (ex: estado em dois hooks diferentes)
- **Separação entre estado e efeitos**: `useState` / store updates separados de `useEffect` / operações externas
- **Efeitos devem ser idempotentes**: Executar o mesmo efeito 2x não pode gerar duplicatas ou estado inconsistente
- **Nunca mutar estado diretamente**: Toda alteração cria nova referência (imutabilidade obrigatória)
- **Cleanup obrigatório**: Listeners, subscriptions, timers devem ser limpos ao desmontar
- **Dependências explícitas**: `useEffect` deve sempre ter array de dependências correto; nunca deixar vazio sem motivo

## Padrões

❌ **ERRADO: Estado mutado, efeito sem cleanup**

```typescript
// ❌ Mutação direta
function useUsers() {
  const [users, setUsers] = useState([]);
  users.push(newUser); // ❌ Mutação direta!

  // ❌ Listener sem cleanup
  useEffect(() => {
    const subscription = supabase
      .on('users', (event) => {
        users.push(event.new); // ❌ Duplica subscriptions ao renderizar
      })
      .subscribe();
    // sem return → cleanup
  }, []); // ❌ Dependência vazia arriscada
}
```

✅ **CORRETO: Estado imutável, efeito com cleanup**

```typescript
// ✅ Imutabilidade + cleanup
function useUsers() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Fonte única: carrega uma vez
    const loadUsers = async () => {
      const { data } = await supabase.from('users').select();
      setUsers(data); // Nova referência, não mutação
    };
    loadUsers();

    // Listener com ID único para evitar duplicatas
    const subscription = supabase
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (event) => {
        setUsers((prev) => [...prev, event.new]); // Novo array
      })
      .subscribe();

    // ✅ Cleanup obrigatório
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Roda uma vez, cleanup ao desmontar

  return users;
}
```

## Estrutura de Efeitos

| O que fazer                   | Onde                    | Exemplo                           |
| ----------------------------- | ----------------------- | --------------------------------- |
| **Inicializar estado**        | Hook ou componente      | `useState()`                      |
| **Fetch / API call**          | `useEffect`             | `supabase.from().select()`        |
| **Listeners / Subscriptions** | `useEffect` com cleanup | `supabase.on().subscribe()`       |
| **Logs / Analytics**          | `useEffect` isolado     | `console.log()`, logging service  |
| **Limpeza**                   | `return () => { ... }`  | `unsubscribe()`, `clearTimeout()` |

## Checklist

- ✓ Nenhuma mutação direta de estado (sempre `setX()` ou novo objeto/array)
- ✓ Efeitos colaterais isolados em `useEffect`
- ✓ Listeners/subscriptions com cleanup (`return () => { ... }`)
- ✓ Fonte única da verdade definida (não carregar o mesmo dado em 2+ hooks)
- ✓ Array de dependências sempre preenchido e preciso
- ✓ Estado previsível e rastreável (sem "magic" internals)

## Regra Final

> **Estado inconsistente é bug silencioso. Todo efeito precisa ser controlado e limpo.**
