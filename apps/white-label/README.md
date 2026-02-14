# Gestão - Sistema de gestão de emrpesas

Sistema completo de gestão para empresas de Home Care, com controle de pacientes, profissionais, prescrições, estoque e importação de NFe.

## 🚀 Tecnologias

### Backend

- **Supabase** - PostgreSQL + Auth + Storage + RLS
- **Row Level Security (RLS)** - Isolamento multi-tenant

### Frontend

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **TanStack Query** - Gerenciamento de estado do servidor
- **Zustand** - Estado global
- **React Hook Form** - Formulários
- **HeadlessUI** - Componentes acessíveis
- **Heroicons** - Ícones

## 📦 Estrutura do Projeto

```
Gestão/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql     # Tabelas do banco
│       ├── 002_rls_policies.sql       # Políticas de segurança
│       └── 003_storage_buckets.sql    # Buckets de storage
│
├── frontend/
│   ├── src/
│   │   ├── components/ui/             # Componentes reutilizáveis
│   │   ├── contexts/                  # Contextos React (Theme)
│   │   ├── hooks/                     # Hooks customizados
│   │   ├── layouts/                   # Layouts (Dashboard)
│   │   ├── lib/                       # Configs (Supabase client)
│   │   ├── pages/                     # Páginas da aplicação
│   │   ├── stores/                    # Estados globais (Auth)
│   │   ├── types/                     # Tipos TypeScript
│   │   ├── App.tsx                    # Rotas
│   │   └── main.tsx                   # Entry point
│   │
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── README.md
```

## 🛠️ Setup

### 1. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute os scripts SQL na seguinte ordem:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_storage_buckets.sql`

3. Copie as credenciais do projeto

### 2. Configurar Frontend

1. Entre na pasta do frontend:

   ```bash
   cd frontend
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie o arquivo `.env` com as credenciais do Supabase:

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   ```

4. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

5. Acesse: [http://localhost:3000](http://localhost:3000)

### 3. Criar Primeiro Usuário

1. No Supabase Dashboard, vá em **Authentication > Users**
2. Crie um novo usuário com email e senha
3. Copie o `id` do usuário criado
4. Execute no SQL Editor:
   ```sql
   INSERT INTO app_user (auth_uid, email, full_name, role, company_id)
   VALUES (
     'ID_DO_USUARIO_AUTH',
     'seu@email.com',
     'Seu Nome',
     'admin',
     (SELECT id FROM company LIMIT 1)
   );
   ```

## 📋 Módulos

### Cadastros

- **Pacientes** - Cadastro completo com vínculo a cliente
- **Clientes** - Pessoas físicas ou jurídicas
- **Profissionais** - Médicos, enfermeiros, etc.
- **Catálogo** - Medicamentos, materiais e dietas
- **Equipamentos** - Controle de equipamentos e atribuição a pacientes

### Prescrições

- Criar prescrições com múltiplos itens
- Vincular medicamentos, materiais, dietas e equipamentos
- Upload de anexos (PDF/imagens)
- Controle de status (rascunho, ativa, suspensa, finalizada)

### Estoque

- **Saldo** - Visualização de estoque atual por local
- **Movimentações** - Histórico de entradas e saídas
- **Locais** - Gerenciamento de locais de estoque
- **Alertas** - Itens abaixo do estoque mínimo

### NFe

- Importação manual ou via XML
- Mapeamento de produtos para catálogo
- Entrada automática no estoque

### Configurações

- Dados da empresa
- Logo personalizado
- Cor primária do sistema
- Modo claro/escuro
- Gerenciamento de usuários

## 🎨 Design

- **Tipografia**: Inter (texto) + Playfair Display/DM Serif Display (títulos)
- **Cor principal**: Gold (#D4AF37) - configurável
- **Temas**: Claro, Escuro e Sistema (automático)
- **Design**: Premium B2B, clean e moderno

## 🔐 Segurança

- **Multi-tenant**: Cada empresa só acessa seus dados via RLS
- **Roles**: admin, operator, viewer
- **Auth**: Email/senha via Supabase Auth
- **Storage**: Buckets protegidos por políticas

## 📱 Responsivo

Interface totalmente responsiva para desktop, tablet e mobile.

## 🔄 Próximos Passos

- [ ] Relatórios de consumo
- [ ] Dashboard avançado com gráficos
- [ ] Notificações (email/push)
- [ ] Integração com APIs de NFe
- [ ] App mobile (React Native)
- [ ] Multi-idioma

---

Desenvolvido com ❤️ para **Vida em Casa Home Care**

## 🚀 CI/CD e Migrations

O deploy segue o fluxo: **qualidade -> migration -> deploy**.

- `CI` (pull request / push): formatação, lint, typecheck, testes e build
- `Release` (push em `main`/`master`): aplica migrations em `staging` e faz deploy de staging
- `Release` manual (`workflow_dispatch` com `run_production=true`): aplica migrations em `production` e só então faz deploy de produção

### Secrets necessários no GitHub

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF_STAGING`
- `SUPABASE_DB_PASSWORD_STAGING`
- `STAGING_DEPLOY_HOOK_URL`
- `SUPABASE_PROJECT_REF_PRODUCTION`
- `SUPABASE_DB_PASSWORD_PRODUCTION`
- `PRODUCTION_DEPLOY_HOOK_URL`

### Observações

- Configure os environments `staging` e `production` no GitHub para controlar aprovações.
- Se a migration falhar, o deploy é interrompido automaticamente.
- Todas as mudanças de banco devem entrar em `supabase/migrations`.
