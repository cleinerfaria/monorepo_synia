# Guia Rápido: Filtros Dinâmicos com Views

## Em 3 Passos

### 1️⃣ Criar a Página (Backend)

```typescript
const page = await supabase
  .from('page')
  .insert({
    company_id: 'company-id',
    company_database_id: 'database-id', // ← Banco para consultar views
    name: 'Meu Dashboard',
  })
  .select()
  .single();
```

### 2️⃣ Criar Filtros com Views (Backend)

```typescript
await supabase.from('page_filter').insert({
  company_id: 'company-id',
  page_id: page.id,
  type: 'select',
  name: 'cliente',
  label: 'Selecione o Cliente',
  options_view: 'vw_clientes_ativos', // ← View a consultar
  meta_data: {
    valueField: 'cod_cliente', // ← Campo para value
    labelField: 'nome_cliente', // ← Campo para label
  },
  order_index: 0,
  active: true,
});
```

### 3️⃣ Usar na Página (Frontend)

```tsx
<DynamicFilters
  pageId={pageId} // ← Passa pageId para buscar banco correto
  filters={pageFilters}
  values={filterValues}
  onChange={handleFilterChange}
/>
```

---

## Tabela Rápida

| Conceito                | O quê                       | Onde                               |
| ----------------------- | --------------------------- | ---------------------------------- |
| **Page**                | Agrupa filtros              | `table: page`                      |
| **company_database_id** | ID do banco de dados        | `column: page.company_database_id` |
| **PageFilter**          | Define um filtro individual | `table: page_filter`               |
| **options_view**        | Nome da view para consultar | `column: page_filter.options_view` |
| **meta_data**           | Configurações adicionais    | `column: page_filter.meta_data`    |
| **valueField**          | Campo para value do option  | `meta_data.valueField`             |
| **labelField**          | Campo para label do option  | `meta_data.labelField`             |

---

## Fluxo Automático

```
DynamicFilters(pageId)
  ↓
usePage(pageId) → Busca company_database_id
  ↓
Para cada filtro com options_view:
  ├─ Valida view (whitelist)
  ├─ Busca valueField e labelField de meta_data
  ├─ Executa: SELECT valueField, labelField FROM options_view
  ├─ Envia para edge function: company-database
  └─ Renderiza Select com as opções
```

---

## Exemplos de Filtros

### Select com View

```typescript
{
  type: 'select',
  name: 'cliente',
  options_view: 'vw_clientes',
  meta_data: {
    valueField: 'id',
    labelField: 'nome'
  }
}
```

### MultiSelect com View

```typescript
{
  type: 'multiselect',
  name: 'produtos',
  options_view: 'vw_produtos_ativos',
  meta_data: {
    valueField: 'sku',
    labelField: 'descricao'
  }
}
```

### Input (sem view)

```typescript
{
  type: 'input',
  name: 'busca',
  label: 'Buscar por nome'
}
```

### Date Range (sem view)

```typescript
{
  type: 'daterange',
  name: 'periodo',
  label: 'Período'
}
```

---

## Debug

### Ativar logs no console

```typescript
// Adicione em seu componente
useEffect(() => {
  console.log('Filtros carregados:', pageFilters);
  console.log('Valores atuais:', filterValues);
}, [pageFilters, filterValues]);
```

### Verificar banco associado

```typescript
const { data: page } = usePage(pageId);
console.log('Banco da página:', page?.company_database_id);
```

### Testar view no Supabase

```sql
SELECT DISTINCT
  cod_cliente as value,
  nome_cliente as label
FROM vw_clientes_ativos
WHERE cod_cliente IS NOT NULL
ORDER BY nome_cliente
LIMIT 5
```

---

## Erros Comuns

| Erro                                         | Causa                            | Solução                                          |
| -------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| "View não está na lista de views permitidas" | View não está no whitelist       | Adicione ao array `ALLOWED_VIEWS`                |
| "Opções não carregam"                        | Sem bank_database_id na página   | Adicione `company_database_id` ao criar a página |
| "Campo value/label não encontrado"           | valueField/labelField incorretos | Verifique nomes dos campos na view               |
| "Carregando opções..." (fica preso)          | Erro na execução da query        | Verifique query no console e logs                |

---

## Whitelist de Views

```
vw_clientes
vw_clientes_ativos
vw_fornecedores
vw_produtos
vw_categorias
vw_departamentos
vw_filiais
vw_usuarios
vw_status
vw_tags
vw_custom_filter_options
```

**Adicionar nova view**:

1. Editar `usePageFilters.ts` - função `getViewOptions()` (linha ~220)
2. Editar `useFilterOptions.ts` - função `useDynamicFilterOptions()` (linha ~290)
3. Adicionar ao array `ALLOWED_VIEWS`

---

## Links de Referência

- [dynamic_filters_guide.md](./dynamic_filters_guide.md) - Documentação completa
- [dynamic_filters_flow.md](./dynamic_filters_flow.md) - Arquitetura detalhada
- [dynamic_filters_example.tsx](./dynamic_filters_example.tsx) - Exemplo prático
- [page_database_association.md](./page_database_association.md) - Setup da página com banco

---

## Checklist de Implementação

- [ ] Criar página com `company_database_id`
- [ ] Criar filtros com `options_view` em `meta_data`
- [ ] Adicionar view ao whitelist (se necessário)
- [ ] Passar `pageId` ao componente `DynamicFilters`
- [ ] Testar carregamento das opções
- [ ] Verificar logs no console
- [ ] Implementar lógica de aplicar filtros

---

## Performance

- **Cache**: 30 segundos por padrão
- **Lazy loading**: Carrega apenas ao renderizar
- **Independente**: Erro em uma view não afeta outras
- **Otimizado**: Queries com DISTINCT e ORDER BY

---

## Suporte

Para mais detalhes, consulte:

- Banco de dados: `page` e `page_filter` tables
- Hooks: `usePageFilters()` e `useDynamicFilterOptions()`
- Componente: `DynamicFilters.tsx`
