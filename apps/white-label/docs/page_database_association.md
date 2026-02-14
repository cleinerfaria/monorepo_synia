# Ajuste: Associação de Banco de Dados ao Criar Página

## Mudanças Realizadas

### 1. Componente `PageModal.tsx`

**Arquivo**: `src/components/PageModal.tsx`

Adicionado:

- Import do hook `useCompanyDatabases`
- Import do hook `useAuthStore`
- Import do componente `Select`
- Campo `company_database_id` no estado `formData`
- Hook `useCompanyDatabases` para buscar bancos da empresa
- Campo Select para escolher o banco de dados ao criar/editar página

**Mudanças de lógica**:

- Ao criar página, agora envia `company_database_id` (opcional)
- Ao editar página, permite alterar o banco associado
- Mostra lista de bancos disponíveis com indicação de "Padrão"

### 2. Tipo TypeScript `PageInsert`

**Arquivo**: `src/types/database.ts`

A interface `Page` já incluía `company_database_id?` como campo opcional, então `PageInsert` automaticamente o herda.

```typescript
export interface Page {
  id: string;
  company_id: string;
  company_database_id?: string; // ← Já estava presente
  name: string;
  meta_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

## Fluxo de Uso

### Criar Nova Página com Banco de Dados

1. Usuário clica em "Nova Página"
2. Modal abre com campos:
   - Nome da Página (obrigatório)
   - Banco de Dados (opcional, dropdown)
3. Usuário seleciona um banco de dados da lista
4. Ao submeter, a página é criada com `company_database_id` preenchido

### Editar Página

1. Usuário clica em editar página existente
2. Modal abre pré-preenchido com dados atuais
3. Usuário pode alterar banco de dados associado
4. Ao submeter, página é atualizada com novo `company_database_id`

## Comportamento do Select de Bancos

- **Primeira opção**: "Nenhum (opcional)" com value vazio
- **Demais opções**: Lista todos os bancos da empresa
- **Indicador**: Bancos padrão são marcados com "(Padrão)"
- **Desabilitado**: Durante carregamento (isLoading)

## Integração com Filtros Dinâmicos

Quando filtros são criados para uma página, eles usarão o `company_database_id` da página para:

- Consultar as views especificadas em `options_view`
- Trazer dados do banco correto via função cloud `company-database`

## Database Migration

A migration já existe:

- **Arquivo**: `20260204000000_associate_page_to_database.sql`
- **Campo adicionado**: `company_database_id` na tabela `page`
- **Constraint**: Foreign key para `company_databases(id)` com ON DELETE SET NULL

## Segurança

- RLS policies já garantem que apenas usuários da empresa podem acessar
- O campo é opcional, mantendo compatibilidade com páginas sem banco específico
- Validação no backend via RLS garante que company_database pertence à mesma empresa
