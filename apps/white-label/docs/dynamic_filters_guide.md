# Filtros Dinâmicos com Views - Guia de Implementação

## Resumo das Mudanças

Implementamos um sistema completo de filtros dinâmicos que permite criar páginas com filtros que consultam dados de views específicas em bancos de dados externos.

## Estrutura do Banco de Dados

### Nova Migration

**Arquivo**: `20260204000000_associate_page_to_database.sql`

Adiciona a coluna `company_database_id` na tabela `page`:

```sql
ALTER TABLE public.page
ADD COLUMN IF NOT EXISTS company_database_id UUID REFERENCES public.company_databases(id) ON DELETE SET NULL;
```

**Objetivo**: Associar cada página a um banco de dados específico para consultar as views.

## Estrutura de Tabelas

### Tabela: `page`

```
- id: UUID (Primary Key)
- company_id: UUID (FK → company)
- company_database_id: UUID (FK → company_databases) [NOVO]
- name: TEXT
- meta_data: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Tabela: `page_filter`

```
- id: UUID (Primary Key)
- company_id: UUID (FK → company)
- page_id: UUID (FK → page)
- type: enum (select, multiselect, input, textarea, date, daterange, number, checkbox, radio)
- subtype: enum (text, email, phone, url, password, search, company, user, status, category, tag, period, custom)
- name: TEXT (identificador único por página)
- label: TEXT (rótulo exibido na UI)
- placeholder: TEXT
- options_view: TEXT [IMPORTANTE] - Nome da view para popular selects/multiselects
- order_index: INT - Controla ordem de exibição (menor = primeiro)
- active: BOOLEAN - Habilitar/desabilitar filtro
- meta_data: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## Frontend - Hooks

### 1. `usePageFilters(pageId?: string)`

Hook principal para gerenciar filtros de página.

**Funcionalidades**:

- Buscar todos os filtros de uma página
- Criar, atualizar e deletar filtros
- Buscar opções de views dinâmicas

**Exemplo de uso**:

```typescript
import usePageFilters from '@/hooks/usePageFilters';

export function MyComponent() {
  const { pageFilters, usePage, getViewOptions } = usePageFilters();

  // Buscar página com seus dados
  const { data: page } = usePage(pageId);

  // pageFilters já contém os filtros ordenados por order_index

  // Buscar opções de uma view
  const options = await getViewOptions('vw_clientes', 'id', 'name', pageId);
}
```

**Métodos disponíveis**:

- `createPageFilter(data)` - Cria novo filtro
- `updatePageFilter({ id, updates })` - Atualiza filtro
- `deletePageFilter(id)` - Deleta filtro
- `getViewOptions(viewName, valueField?, labelField?, pageId?)` - Busca opções dinâmicas
- `usePage(id)` - Query hook para buscar página com dados associados
- `usePageFilter(id)` - Query hook para filtro específico

### 2. `useDynamicFilterOptions(viewName, valueField?, labelField?, databaseId?)`

Hook genérico para buscar opções de qualquer view dinamicamente.

**Exemplo de uso**:

```typescript
import { useDynamicFilterOptions } from '@/hooks/useFilterOptions'

export function MyComponent() {
  const { data: options, isLoading } = useDynamicFilterOptions(
    'vw_clientes_ativos',
    'cod_cliente',    // Campo para value
    'nome_cliente'    // Campo para label
  )

  return (
    <Select
      options={options}
      isLoading={isLoading}
    />
  )
}
```

## Frontend - Componente

### `DynamicFilters`

Componente reutilizável para renderizar filtros dinâmicos.

**Props**:

```typescript
interface DynamicFiltersProps {
  filters: PageFilter[]; // Array de filtros
  values: Record<string, any>; // Valores atuais dos filtros
  onChange: (filterName, value) => void; // Callback ao alterar
  isLoading?: boolean; // Loading state
}
```

**Exemplo de uso**:

```tsx
import DynamicFilters from '@/components/DynamicFilters';
import usePageFilters from '@/hooks/usePageFilters';

export function PageContent({ pageId }: { pageId: string }) {
  const { pageFilters, isLoading } = usePageFilters(pageId);
  const [filterValues, setFilterValues] = useState({});

  return (
    <DynamicFilters
      filters={pageFilters}
      values={filterValues}
      onChange={(name, value) => setFilterValues((prev) => ({ ...prev, [name]: value }))}
      isLoading={isLoading}
    />
  );
}
```

## Fluxo Completo

### 1. Criar uma Página

```typescript
const pageData: PageInsert = {
  company_id: '...',
  company_database_id: '...', // ID do banco externo
  name: 'Relatório de Vendas',
  meta_data: {},
};

await createPage(pageData);
```

### 2. Criar Filtros para a Página

```typescript
const filterData: PageFilterInsert = {
  company_id: '...',
  page_id: '...', // ID da página criada
  type: 'select',
  name: 'cliente',
  label: 'Cliente',
  placeholder: 'Selecione um cliente',
  options_view: 'vw_clientes_ativos', // View para buscar opções
  order_index: 0,
  active: true,
};

await createPageFilter(filterData);
```

### 3. Renderizar Filtros Dinâmicos

```tsx
<DynamicFilters filters={pageFilters} values={filterValues} onChange={handleFilterChange} />
```

### 4. Consultar Opções

```typescript
// As opções são carregadas automaticamente pelo DynamicFilters
// baseado no campo options_view de cada filtro
```

## Views Permitidas (Whitelist)

Apenas as views na lista abaixo são permitidas por questões de segurança:

```
- vw_clientes
- vw_clientes_ativos
- vw_fornecedores
- vw_produtos
- vw_categorias
- vw_departamentos
- vw_filiais
- vw_usuarios
- vw_status
- vw_tags
- vw_custom_filter_options
```

**Como adicionar nova view**:

1. Editar `useFilterOptions.ts` - função `useDynamicFilterOptions()`
2. Editar `usePageFilters.ts` - função `getViewOptions()`
3. Adicionar nome da view ao array `ALLOWED_VIEWS`

## Segurança

### Backend

- Whitelist de views permitidas
- Validação de banco de dados
- RLS policies para controlar acesso por empresa

### Frontend

- Apenas usuários autenticados podem acessar
- Acesso restrito ao company_id do usuário
- Validação de permissions (admin/manager) para CRUD

## Tipos TypeScript

### Novos tipos no `src/types/database.ts`:

```typescript
// Tipos de filtro
export type PageFilterType =
  | 'select'
  | 'multiselect'
  | 'input'
  | 'textarea'
  | 'date'
  | 'daterange'
  | 'number'
  | 'checkbox'
  | 'radio';

export type PageFilterSubtype =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  | 'search'
  | 'company'
  | 'user'
  | 'status'
  | 'category'
  | 'tag'
  | 'period'
  | 'custom';

// Interfaces
export interface Page {
  id: string;
  company_id: string;
  company_database_id?: string; // [NOVO]
  name: string;
  meta_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PageFilter {
  id: string;
  company_id: string;
  page_id: string;
  type: PageFilterType;
  subtype?: PageFilterSubtype;
  name: string;
  label?: string;
  placeholder?: string;
  options_view?: string; // Nome da view
  order_index: number; // Ordem de exibição
  active: boolean; // Ativo/inativo
  meta_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

## Exemplo Completo

### Backend - Criar a página e seus filtros

```typescript
// 1. Criar página associada a um banco de dados
const page = await supabase
  .from('page')
  .insert({
    company_id: 'abc123',
    company_database_id: 'db-id-456', // Banco externo
    name: 'Dashboard Vendas',
    meta_data: { description: 'Dashboard de vendas por cliente' },
  })
  .select()
  .single();

// 2. Criar filtros
const clientFilter = await supabase
  .from('page_filter')
  .insert({
    company_id: 'abc123',
    page_id: page.id,
    name: 'cliente',
    label: 'Cliente',
    type: 'select',
    options_view: 'vw_clientes_ativos',
    order_index: 0,
    active: true,
  })
  .select()
  .single();

const produtoFilter = await supabase
  .from('page_filter')
  .insert({
    company_id: 'abc123',
    page_id: page.id,
    name: 'produto',
    label: 'Produto',
    type: 'select',
    options_view: 'vw_produtos',
    order_index: 1,
    active: true,
  })
  .select()
  .single();
```

### Frontend - Renderizar os filtros

```tsx
import { useEffect, useState } from 'react';
import DynamicFilters from '@/components/DynamicFilters';
import usePageFilters from '@/hooks/usePageFilters';

export function Dashboard({ pageId }: { pageId: string }) {
  const { pageFilters, isLoading } = usePageFilters(pageId);
  const [filters, setFilters] = useState({});

  const handleFilterChange = (filterName: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <h1>Dashboard de Vendas</h1>

      <DynamicFilters
        filters={pageFilters}
        values={filters}
        onChange={handleFilterChange}
        isLoading={isLoading}
      />

      {/* Usar filters.cliente e filters.produto para buscar dados */}
    </div>
  );
}
```

## Próximos Passos (Opcional)

1. **Caching**: Implementar cache inteligente para views que não mudam frequentemente
2. **Validação**: Adicionar validação customizada no backend
3. **Computadas**: Adicionar suporte para filtros com regras computadas
4. **Templates**: Criar templates pré-configurados de páginas comuns

## Referências

- Migration: [20260203000000_page_and_page_filter_tables.sql](../supabase/migrations/20260203000000_page_and_page_filter_tables.sql)
- Migration: [20260204000000_associate_page_to_database.sql](../supabase/migrations/20260204000000_associate_page_to_database.sql)
- Hooks: [src/hooks/usePageFilters.ts](../frontend/src/hooks/usePageFilters.ts)
- Hooks: [src/hooks/useFilterOptions.ts](../frontend/src/hooks/useFilterOptions.ts)
- Componente: [src/components/DynamicFilters.tsx](../frontend/src/components/DynamicFilters.tsx)
