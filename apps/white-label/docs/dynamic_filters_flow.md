# Fluxo Completo: Filtros Dinâmicos com Dados da View

## Arquitetura

```
Página (page_id)
  ├── company_database_id → Banco de Dados
  └── Filtros (page_filter)
       ├── options_view → Nome da View
       ├── meta_data.valueField → Campo para value
       └── meta_data.labelField → Campo para label
```

## Fluxo de Execução

### 1. Componente DynamicFilters

Quando inicializado com `pageId`, o componente:

```tsx
<DynamicFilters
  filters={pageFilters}
  values={filterValues}
  onChange={handleFilterChange}
  pageId={pageId} // ← Passa o ID da página
  isLoading={isLoading}
/>
```

### 2. Busca de Dados (useEffect)

```
pageId
  ↓
usePage(pageId) → Retorna: { id, company_id, company_database_id, ... }
  ↓
dbId = pageData?.company_database_id
  ↓
Para cada filtro com options_view:
  └─ getViewOptions(viewName, valueField, labelField, pageId)
```

### 3. Função getViewOptions

```
getViewOptions(viewName, valueField, labelField, pageId)
  ↓
1. Busca company_database_id da página
  ↓
2. Valida viewName (whitelist)
  ↓
3. Construi query SELECT:
   SELECT DISTINCT
     ${valueField} as value,
     ${labelField} as label
   FROM ${viewName}
   WHERE ${valueField} IS NOT NULL
   ORDER BY ${labelField}
  ↓
4. Chama edge function company-database com:
   - action: 'query'
   - database_id: companyDatabaseId
   - query: SQL query
  ↓
5. Retorna: Array<{ value: string, label: string }>
```

### 4. Renderização

```
selectOptions[filter.name] = [
  { value: "ID_CLIENTE_001", label: "Cliente A" },
  { value: "ID_CLIENTE_002", label: "Cliente B" },
  ...
]
```

## Exemplo Prático

### Setup da Página

```typescript
// Criar página associada a um banco
const page = await supabase
  .from('page')
  .insert({
    company_id: 'abc123',
    company_database_id: 'db-id-456', // ← Banco a usar
    name: 'Dashboard Vendas',
  })
  .select()
  .single();
```

### Setup dos Filtros

```typescript
// Filtro 1: Cliente (busca de view)
await supabase.from('page_filter').insert({
  company_id: 'abc123',
  page_id: page.id,
  name: 'cliente',
  label: 'Cliente',
  type: 'select',
  options_view: 'vw_clientes_ativos', // ← View para popular
  meta_data: {
    valueField: 'cod_cliente', // ← Campo para value
    labelField: 'nome_cliente', // ← Campo para label
  },
  order_index: 0,
  active: true,
});

// Filtro 2: Produto (outra view)
await supabase.from('page_filter').insert({
  company_id: 'abc123',
  page_id: page.id,
  name: 'produto',
  label: 'Produto',
  type: 'multiselect',
  options_view: 'vw_produtos',
  meta_data: {
    valueField: 'id_produto',
    labelField: 'nome_produto',
  },
  order_index: 1,
  active: true,
});
```

### Componente da Página

```tsx
import { useEffect, useState } from 'react';
import DynamicFilters from '@/components/DynamicFilters';
import usePageFilters from '@/hooks/usePageFilters';

export function DashboardVendas({ pageId }: { pageId: string }) {
  const { pageFilters, isLoading } = usePageFilters(pageId);
  const [filterValues, setFilterValues] = useState({});

  // O DynamicFilters agora:
  // 1. Busca a página (pageId)
  // 2. Pega company_database_id da página
  // 3. Para cada filtro com options_view:
  //    - Consulta a view no banco correto
  //    - Usa valueField/labelField de meta_data
  //    - Mostra as opções no Select/MultiSelect

  return (
    <div>
      <h1>Dashboard de Vendas</h1>

      <DynamicFilters
        filters={pageFilters}
        values={filterValues}
        onChange={(name, value) => setFilterValues((prev) => ({ ...prev, [name]: value }))}
        pageId={pageId} // ← Passa pageId para buscar dados corretos
        isLoading={isLoading}
      />

      {/* Usar filterValues.cliente e filterValues.produto */}
    </div>
  );
}
```

## Comportamento Esperado

### No Console (Logs)

```
📊 Carregando opções para filtro: cliente
🔍 View: vw_clientes_ativos
💾 Database ID: db-id-456
✅ Opções carregadas: 15
  [
    { value: 'CLI001', label: 'Cliente A' },
    { value: 'CLI002', label: 'Cliente B' },
    ...
  ]

📊 Carregando opções para filtro: produto
🔍 View: vw_produtos
💾 Database ID: db-id-456
✅ Opções carregadas: 42
  [
    { value: 'PROD001', label: 'Notebook' },
    { value: 'PROD002', label: 'Monitor' },
    ...
  ]
```

### Na Interface

```
┌─────────────────────────────────────┐
│ Dashboard de Vendas                 │
├─────────────────────────────────────┤
│  Cliente: [Carregando opções...]    │
│  Produto: [Carregando opções...]    │
│                                     │
│  (após carregar)                    │
│                                     │
│  Cliente: [ Cliente A ▼ ]           │
│  Produto: [ ☑ Notebook             │
│             ☑ Monitor              │
│             ☐ Teclado ]            │
│                                     │
│  [Aplicar Filtros] [Limpar]         │
└─────────────────────────────────────┘
```

## Campos Suportados

### meta_data

```typescript
{
  valueField?: string      // Campo para value (padrão: 'id')
  labelField?: string      // Campo para label (padrão: 'name')
  options?: Array<{        // Para type=radio (predefinidas)
    value: string
    label: string
  }>
}
```

## Tratamento de Erros

### Scenarios

1. **View não existe**

   ```
   ❌ Erro ao carregar opções para cliente:
   ERROR: relation "vw_clientes_ativos" does not exist
   → Mostra: [] (lista vazia)
   ```

2. **View não está no whitelist**

   ```
   ❌ [PageFilters] View não permitida: vw_hack_dados
   → Mostra: [] (lista vazia)
   ```

3. **Sem banco de dados associado à página**

   ```
   ⚠️ [PageFilters] Nenhum banco ativo encontrado
   → Mostra: [] (lista vazia)
   ```

4. **Usuário não autenticado**
   ```
   Erro: 'Usuário não autenticado'
   → Não carrega opções
   ```

## Performance

### Cache (React Query)

- Opções são cacheadas por 30 segundos
- Query key: `['filter-options', 'dynamic', viewName, valueField, labelField, databaseId, company?.id]`

### Otimizações

- Carrega opções apenas quando filter tem `options_view`
- Lazy loading: espera até renderizar para buscar
- Independente por filtro: um erro não afeta os outros

## Whitelist de Views Permitidas

```typescript
ALLOWED_VIEWS = [
  'vw_clientes',
  'vw_clientes_ativos',
  'vw_fornecedores',
  'vw_produtos',
  'vw_categorias',
  'vw_departamentos',
  'vw_filiais',
  'vw_usuarios',
  'vw_status',
  'vw_tags',
  'vw_custom_filter_options',
];
```

**Para adicionar nova view**:

1. Editar `usePageFilters.ts` - função `getViewOptions()`
2. Editar `useFilterOptions.ts` - função `useDynamicFilterOptions()`
3. Adicionar nome ao array `ALLOWED_VIEWS`

## Próximos Passos

- [ ] Adicionar busca/filtro nas opções (para muitos dados)
- [ ] Implementar paginação nas opções
- [ ] Adicionar cache local no localStorage
- [ ] Suportar opções computadas (agregações)
- [ ] Adicionar validação de dependência entre filtros
