# Sistema de Configurações Globais

## Visão Geral

O sistema agora suporta configurações globais (system-wide) através da tabela `system_settings`. Isso permite gerenciar branding, logos e favicon do sistema sem estar vinculado a uma empresa específica.

## Tabela: `system_settings`

Campos:

- `id` (UUID, PK)
- `name` (TEXT, UNIQUE) - Identificador das configurações (padrão: "Synia")
- `basic_color` (TEXT, nullable) - Cor primária em hex (padrão inicial: #1aa2ff)
- `logo_login_light` (TEXT, nullable) - URL da logo de login tema claro
- `logo_login_dark` (TEXT, nullable) - URL da logo de login tema escuro
- `login_frase` (TEXT, nullable) - Frase exibida abaixo da logo no login
- `favicon` (TEXT, nullable) - URL do favicon do sistema
- `created_at`, `updated_at` (TIMESTAMPTZ)

## Bucket de Storage: `system_assets`

Bucket público para armazenar assets do sistema.

Localização dos arquivos:

```
system_assets/
├── login/
│   ├── logo_login_light.png
│   └── logo_login_dark.png
└── favicon.svg
```

## Como usar

### 1. Deploy das migrations

```bash
# Aplica as migrations ao banco
supabase db push
```

Isso criará:

- Tabela `system_settings`
- Bucket `system_assets`
- RLS policies para acesso restrito a super admins

### 2. Upload dos arquivos

```bash
# Faz upload dos assets do público para o bucket
# E atualiza automaticamente a tabela system_settings com as URLs
node scripts/upload-system-assets.cjs
```

Requer as variáveis de ambiente:

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Importante**: O script agora atualiza automaticamente a tabela `system_settings` com as URLs dos arquivos após o upload. Se houver erro na atualização, as URLs serão exibidas no console para atualização manual.

### 3. Atualizar configurações

```typescript
import { supabase } from '@/lib/supabase';

// Atualizar configurações (seed inicial: name='Synia')
await supabase
  .from('system_settings')
  .update({
    basic_color: '#1aa2ff',
    login_frase: 'Bem-vindo ao novo sistema',
    logo_login_light:
      'https://project-id.supabase.co/storage/v1/object/public/system_assets/login/logo_login_light.png',
    logo_login_dark:
      'https://project-id.supabase.co/storage/v1/object/public/system_assets/login/logo_login_dark.png',
    favicon: 'https://project-id.supabase.co/storage/v1/object/public/system_assets/favicon.svg',
  })
  .eq('name', 'Synia');
```

### 4. Usar as configurações no código

#### Hook: `useSystemSettings`

```typescript
import { useSystemSettings } from '@/hooks/useSystemSettings'

function MyComponent() {
  // Padrão: busca por 'Synia'
  const { data: systemSettings, isLoading } = useSystemSettings()

  // Ou especificar outro nome:
  // const { data: systemSettings } = useSystemSettings('Synia')

  if (isLoading) return <Loading />

  return (
    <div>
      <img src={systemSettings?.logo_login_light} alt="Logo" />
      <p>{systemSettings?.login_frase}</p>
    </div>
  )
}
```

#### Função: `loadSystemFavicon`

Carregada automaticamente no App.tsx durante a inicialização:

```typescript
import { loadSystemFavicon } from '@/utils/systemAssets';

// Chamado automaticamente em App.tsx
await loadSystemFavicon();
```

Isso atualiza:

- `<link rel="icon">` - favicon do sistema
- `<meta name="theme-color">` - cor do tema (basic_color)

## Componentes que usam as configurações

### LoginPage

Formatos de fallback para logos de login:

- Se `logo_login_light` não estiver configurada → usa `/logo_login_light.png` (public)
- Se `logo_login_dark` não estiver configurada → usa `/logo_login_dark.png` (public)

```typescript
export default function LoginPage() {
  const { data: systemSettings } = useSystemSettings('default');

  // Renderiza logo_login_light ou /logo_login_light.png
  // Renderiza logo_login_dark ou /logo_login_dark.png
  // Exibe systemSettings?.login_frase ou texto padrão
}
```

## RLS Policies

- **SELECT**: Apenas super admins
- **INSERT/UPDATE/DELETE**: Apenas super admins
- **Bucket**: Público para leitura, super admins para escrita

## Variáveis de ambiente necessárias

Para o script de upload funcionar:

```env
# .env.local ou .env

# Cris pública da app
VITE_SUPABASE_URL=https://project-id.supabase.co

# Service Role Key (nunca expor no cliente!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...
```

## Fluxo de atualização de branding

1. Fazer upload das novas logos para o bucket `system_assets`
2. Atualizar a tabela `system_settings` com as novas URLs
3. O sistema carrega automaticamente as novas configurações
4. LoginPage e favicon são atualizados em tempo real

## Fallbacks e comportamento

- Se as configurações não existem, o sistema usa valores padrão
- Se as URLs de assets estão vazias, usa os arquivos do `/public`
- O favicon é carregado na inicialização da app
- As logos da página de login são carregadas pelo hook `useSystemSettings`
