# AGENTS.md

## Do

- use React 18 com TypeScript
- use Tailwind CSS para styling
- use design tokens via `themeConstants.ts` para cores e espaçamento
- use TanStack Query para estado do servidor
- use Zustand para estado global
- use React Hook Form para formulários
- use Lucide React para ícones
- use ECharts para gráficos
- use Badge.tsx para status e tags
- componentes funcionais com hooks
- componentes pequenos e reutilizáveis

## Don't

- não hard code cores - use design tokens
- não use divs se existe um componente pronto
- não adicione dependências pesadas sem aprovação
- não crie classe components - use functional components
- não faça fetch direto em componentes

## Zustand (global state)

- Use para: UI global (sidebar, theme, filtros globais persistentes), sessão local do app
- Não use para: cache de servidor (isso é TanStack Query)
- Evite duplicar estado: se vem do servidor, não espelhar em Zustand

## UI components (preferir)

- `components/ui/Button`
- `components/ui/Card`
- `components/ui/Modal` (ou Dialog)
- `components/ui/Table`
- `components/ui/Input`, `Select`, `Textarea`
- `components/ui/Skeleton`

## Commands

```bash
# verificação de tipos (arquivo específico)
npm run typecheck

# formatação com prettier
npm run format

# linting
npm run lint
npm run lint:fix

# builds
npm run dev          # desenvolvimento
npm run build        # produção
```

## Safety and permissions

**Permitido sem prompt:**

- ler arquivos, listar arquivos
- typecheck em arquivo único
- prettier, eslint em arquivo único
- mudanças em componentes existentes

**Pedir antes:**

- instalar packages
- git push
- deletar arquivos
- executar build completo
- alterar configurações globais

## Project structure

```
src/
├── components/
│   ├── ui/              # Componentes reutilizáveis
│   │   ├── Badge.tsx   # Status e tags
│   ├── auth/            # Autenticação
│   ├── sales/           # Vendas
│   └── ...
├── contexts/            # React Contexts (Theme, Navigation)
├── hooks/               # Hooks customizados
├── lib/
│   ├── supabase.ts     # Client Supabase
│   ├── logging.ts      # Logging
│   └── themeConstants.ts # Design tokens
├── pages/               # Páginas e rotas
├── services/            # Serviços de API
│   └── uazapi/         # WhatsApp Integration
├── stores/              # Estado global (Zustand)
├── types/               # TypeScript types
└── utils/               # Funções utilitárias
```

### Arquivos principais

- [App.tsx](src/App.tsx) - rotas da aplicação
- [DashboardLayout.tsx](src/layouts/DashboardLayout.tsx) - layout base
- [themeConstants.ts](src/lib/themeConstants.ts) - design tokens
- [Badge.tsx](src/components/ui/Badge.tsx) - componente de status

## Good and bad examples

### ✅ Bom

```tsx
// Componente funcional reutilizável
export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{user.name}</h3>
      <StatusBadge status={user.status} />
      <button onClick={onEdit}>Editar</button>
    </div>
  )
}

// Usa TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const { data } = await supabase.from('users').select('*')
    return data
  }
})

// ECharts em novo código
<EChartsReact option={option} />
```

### ❌ Ruim

````tsx
// Classe component - evitar
class UserCard extends Component { ... }

// Hard code de cores
<div style={{ backgroundColor: '#FF0000' }}>

// Fetch direto no componente
useEffect(() => {
  fetch('/api/users').then(r => r.json())
})



## API docs

### Supabase

```tsx
import { supabase } from '@/lib/supabase'

// Query simples
const { data } = await supabase.from('users').select('*')

// Com filtros
const { data } = await supabase.from('sales').select('*').eq('company_id', companyId)

// Com RLS automático (multi-tenant)
// Cada query é filtrada por auth.uid()
````

### Hooks disponíveis

```tsx
// Empresa
useCompanies();
useCompanyDatabases();
useCompanyPlanSettings();

// Usuários
useAppUsers();
useSystemUsers();
useAccessProfiles();

// Dados
useSalesData();
useSalesFilters();
useMetaData();

// WhatsApp
useWhatsappInstances();
useWhatsappMessages();
useWhatsappContacts();
useWhatsappPermissions();
```

### Components

```tsx
// Badges
import { Badge, StatusBadge } from '@/components/ui/Badge'
<Badge variant="success">Ativo</Badge>
<StatusBadge status="active" />

// Ícones
import { ChevronDown, Settings, AlertCircle } from 'lucide-react'
<Settings size={20} />


## PR checklist

- [ ] tipos verificados: `npm run typecheck`
- [ ] formatação ok: `npm run format`
- [ ] linting ok: `npm run lint`
- [ ] componentes pequenos e reutilizáveis
- [ ] sem hard code de cores
- [ ] diff pequeno com mensagem clara

## When stuck

- verifique [themeConstants.ts](src/lib/themeConstants.ts) para design tokens
- copie componentes similares em `components/` como base
- consulte hooks em `hooks/` para padrões de data fetching
- abra uma draft PR com suas dúvidas e propostas
```
