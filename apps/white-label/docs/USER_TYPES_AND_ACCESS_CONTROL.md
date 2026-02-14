# Tipos de Usuário e Controle de Acesso - Documentação Técnica

## 1. Visão Geral de Controle de Acesso

### 1.1 Conceitos Fundamentais

O sistema Gestão é uma aplicação **SaaS multi-tenant** que implementa um modelo robusto de **Controle de Acesso Baseado em Papéis (RBAC - Role-Based Access Control)** para garantir segurança, isolamento de dados e flexibilidade operacional.

#### O que é RBAC?

RBAC é um modelo de segurança que restringe o acesso dos usuários baseado em seus **papéis (roles)** atribuídos no sistema. Em vez de conceder permissões individuais a cada usuário, atribuem-se **perfis de acesso** que agrupam um conjunto de permissões relacionadas.

### 1.2 Modelo Multi-Tenant

O sistema implementa isolamento de dados por **empresa (tenant)**:

- **Cada empresa é uma instância isolada**: Os dados de uma empresa nunca são acessíveis por usuários de outras empresas
- **Usuários da empresa**: Podem estar vinculados a uma ou **múltiplas empresas**, com acesso apenas aos dados dessas empresas
- **Usuários do sistema**: Administradores globais que podem gerenciar múltiplas empresas (quando aplicável)
- **Isolamento garantido pelo banco de dados**: As políticas RLS (Row-Level Security) do PostgreSQL garantem que as queries sejam automaticamente filtradas
- **Alternância entre empresas**: Usuários com acesso a múltiplas empresas podem alternar facilmente através de um seletor no header

#### Usuários em Múltiplas Empresas

Um usuário comum (não-sistema) pode ser cadastrado em mais de uma empresa:

- **Cada entrada**: O usuário possui um registro `app_user` separado para cada empresa
- **Perfis diferentes**: Pode ter perfis/papéis diferentes em cada empresa
- **Navegação facilitada**: Seletor de empresas no header permite trocar rapidamente entre elas
- **Sem acesso ao painel admin**: O usuário comum não pode acessar o painel de administração global (`/admin`)

### 1.3 Estrutura de Papéis (Roles)

O sistema funciona em **dois níveis hierárquicos**:

#### Nível 1: Usuários do Sistema (System Users)

- Administradores que operam fora da hierarquia de empresas
- Podem ser:
  - **Superadmin**: Controle total do sistema
  - **Admin Multi-Tenant**: Gerencia múltiplas empresas atribuídas

#### Nível 2: Usuários de Empresa (App Users)

- Usuários dentro de uma empresa específica
- Possuem um **perfil de acesso (access_profile)** que define suas permissões
- Podem ser:
  - **Admin da Empresa**: Acesso total dentro da empresa
  - **Perfis Operacionais**: Acesso limitado a módulos específicos
  - **Visualizadores**: Acesso apenas de leitura

---

## 2. Tipos de Usuário (Roles)

### 2.1 Usuários do Sistema

#### 2.1.1 Superadmin (Superadministrador)

| Propriedade         | Valor                              |
| ------------------- | ---------------------------------- |
| **Tipo de Usuário** | System User                        |
| **Campo no BD**     | `system_user.is_superadmin = true` |
| **Escopo**          | Todo o sistema                     |
| **Descrição**       | Administrador supremo do sistema   |

**Objetivo Principal:**

- Gerenciamento completo da plataforma
- Criação e configuração de empresas
- Gerenciamento de administradores multi-tenant
- Configurações globais do sistema

**Perfil de Usuário Esperado:**

- Dono ou sócio-gerente da plataforma
- Analista de sistemas da empresa
- Suporte técnico avançado

**Acesso:**

- Dashboard de administração global (`/admin`)
- Painel de controle com abas: Empresas, Usuários, Perfis, Cores, Módulos, Usuários do Sistema
- Qualquer empresa (modo de acesso / entrada)
- Pode "entrar" em qualquer empresa para visualizar como admin

---

#### 2.1.2 Admin Multi-Tenant

| Propriedade         | Valor                                         |
| ------------------- | --------------------------------------------- |
| **Tipo de Usuário** | System User                                   |
| **Campo no BD**     | `system_user.is_superadmin = false`           |
| **Escopo**          | Empresas atribuídas                           |
| **Descrição**       | Administrador que gerencia múltiplas empresas |

**Objetivo Principal:**

- Gerenciamento de múltiplas empresas atribuídas
- Navegação entre empresas
- Acesso ao painel administrativo de cada empresa
- Gestão de usuários da empresa

**Perfil de Usuário Esperado:**

- Gerente de contas (Account Manager)
- Consultor de implementação (Onboarding)
- Suporte técnico nível 2
- Gestor regional de múltiplas filiais

**Acesso:**

- Dashboard de administração (`/admin`)
- Lista de empresas que pode acessar
- Botão "Entrar na empresa" para acessar como admin
- Dashboard da empresa como administrador
- Link "Administração" no menu lateral para voltar ao painel admin
- Indicador visual da empresa atual no header

---

### 2.2 Usuários de Empresa (App Users)

Os usuários de empresa são vinculados a uma **empresa específica** e possuem um **perfil de acesso** que define suas permissões.

---

#### 2.2.1 Admin da Empresa

| Propriedade         | Valor                                              |
| ------------------- | -------------------------------------------------- |
| **Tipo de Usuário** | App User                                           |
| **Campo no BD**     | `access_profile.is_admin = true`                   |
| **Escopo**          | Uma empresa                                        |
| **Descrição**       | Administrador com controle total dentro da empresa |

**Objetivo Principal:**

- Administração completa da empresa
- Gerenciamento de usuários da empresa
- Configuração de perfis de acesso
- Ativação de módulos e funcionalidades
- Configurações da empresa

**Perfil de Usuário Esperado:**

- Proprietário ou sócio da empresa
- Gestor administrativo
- Diretor de operações

**Acesso:**

- Dashboard (`/`)
- Módulo de Configurações (`/configuracoes`)
  - Gerenciamento de usuários
  - Visualização de logs
- Acesso administrativo a todos os módulos
- Possibilidade de criar e editar perfis de acesso

**Restrições:**

- Não pode acessar `admin` global (gerenciamento de empresas)
- Está confinado à sua empresa

---

#### 2.2.2 Gestor / Manager

| Propriedade         | Valor                                                       |
| ------------------- | ----------------------------------------------------------- |
| **Tipo de Usuário** | App User                                                    |
| **Campo no BD**     | `access_profile.code = 'manager'`                           |
| **Escopo**          | Uma empresa                                                 |
| **Descrição**       | Gestor operacional com permissões administrativas limitadas |

**Objetivo Principal:**

- Supervisão de operações
- Gerenciamento de equipes
- Acesso a relatórios e dashboards
- Gerenciamento de WhatsApp (instâncias, contatos, mensagens)

**Perfil de Usuário Esperado:**

- Supervisor de equipe
- Gerente de operações
- Coordenador de projetos

**Acesso:**

- Dashboard (`/`)
- Módulo WhatsApp (completo)
  - Gerenciar instâncias
  - Gerenciar contatos
  - Gerenciar mensagens
  - Gerenciar avaliações
  - Gerenciar aspectos
- Dashboards e relatórios de vendas
- Pode visualizar logs (dependendo de permissões específicas)

**Restrições:**

- Não pode acessar configurações globais da empresa
- Não pode gerenciar usuários
- Não pode gerenciar perfis de acesso

---

#### 2.2.3 Clínico / Clinician

| Propriedade         | Valor                                                      |
| ------------------- | ---------------------------------------------------------- |
| **Tipo de Usuário** | App User                                                   |
| **Campo no BD**     | `access_profile.code = 'clinician'`                        |
| **Escopo**          | Uma empresa                                                |
| **Descrição**       | Usuário com acesso a funcionalidades clínicas/operacionais |

**Objetivo Principal:**

- Acesso a funcionalidades específicas do módulo operacional
- Visualização de dados clínicos/específicos
- Execução de tarefas operacionais

**Perfil de Usuário Esperado:**

- Profissional clínico ou técnico
- Especialista em domínio específico
- Operador de processos

**Acesso:**

- Módulos configurados para o perfil
- Dashboards específicos
- Relatórios direcionados

**Restrições:**

- Acesso limitado ao que foi definido no perfil
- Não pode gerenciar usuários ou configurações

---

#### 2.2.4 Estoque / Stock

| Propriedade         | Valor                                                      |
| ------------------- | ---------------------------------------------------------- |
| **Tipo de Usuário** | App User                                                   |
| **Campo no BD**     | `access_profile.code = 'stock'`                            |
| **Escopo**          | Uma empresa                                                |
| **Descrição**       | Usuário com acesso a funcionalidades de estoque/inventário |

**Objetivo Principal:**

- Gerenciamento de inventário
- Controle de estoque
- Relatórios de movimentação

**Perfil de Usuário Esperado:**

- Operador de estoque
- Gerente de inventário
- Técnico de logística

**Acesso:**

- Módulos de estoque/inventário
- Relatórios de movimentação
- Dashboards de controle

**Restrições:**

- Acesso restrito ao módulo de estoque
- Não pode acessar módulos administrativos

---

#### 2.2.5 Finança / Finance

| Propriedade         | Valor                                            |
| ------------------- | ------------------------------------------------ |
| **Tipo de Usuário** | App User                                         |
| **Campo no BD**     | `access_profile.code = 'finance'`                |
| **Escopo**          | Uma empresa                                      |
| **Descrição**       | Usuário com acesso a funcionalidades financeiras |

**Objetivo Principal:**

- Visualização e controle de dados financeiros
- Relatórios financeiros
- Análise de faturamento

**Perfil de Usuário Esperado:**

- Analista financeiro
- Contador
- Gerente de financeiro

**Acesso:**

- Dashboards financeiros
- Relatórios de vendas e faturamento
- Análises de receita

**Restrições:**

- Acesso limitado a dados financeiros
- Não pode modificar configurações críticas

---

#### 2.2.6 Visualizador / Viewer

| Propriedade         | Valor                                |
| ------------------- | ------------------------------------ |
| **Tipo de Usuário** | App User                             |
| **Campo no BD**     | `access_profile.code = 'viewer'`     |
| **Escopo**          | Uma empresa                          |
| **Descrição**       | Usuário com acesso apenas de leitura |

**Objetivo Principal:**

- Visualização de dados e relatórios
- Acesso a dashboards
- Consulta de informações

**Perfil de Usuário Esperado:**

- Executivo que apenas consulta dados
- Stakeholder externo com acesso limitado
- Usuário de leitura apenas

**Acesso:**

- Dashboards em modo leitura
- Visualização de relatórios
- Consulta de dados

**Restrições:**

- Sem permissão para criar, editar ou deletar
- Sem acesso a configurações
- Sem acesso a funcionalidades administrativas

---

#### 2.2.7 Usuário Padrão / User

| Propriedade         | Valor                                 |
| ------------------- | ------------------------------------- |
| **Tipo de Usuário** | App User                              |
| **Campo no BD**     | `access_profile.code = 'user'`        |
| **Escopo**          | Uma empresa                           |
| **Descrição**       | Usuário padrão com permissões mínimas |

**Objetivo Principal:**

- Acesso básico ao sistema
- Execução de tarefas operacionais simples
- Visualização de dados básicos

**Perfil de Usuário Esperado:**

- Operador básico
- Funcionário com acesso limitado
- Novo usuário em avaliação

**Acesso:**

- Dashboard básico
- Funcionalidades configuradas no perfil
- Dados mínimos necessários para seu trabalho

**Restrições:**

- Acesso muito limitado
- Sem acesso a configurações
- Sem acesso a ferramentas administrativas

---

## 2.8 Funcionalidade: Alternância Entre Múltiplas Empresas

### Como Funciona

Usuários comuns (App Users) podem ser cadastrados em mais de uma empresa. Quando um usuário tem acesso a múltiplas empresas, o sistema oferece uma funcionalidade de alternância facilitada:

#### No Header da Aplicação

1. **Seletor de Empresa**: Exibe o nome da empresa atual com um ícone de empresa
2. **Dropdown**: Ao clicar, mostra todas as empresas em que o usuário tem acesso
3. **Indicador Visual**: A empresa atual é destacada com um ponto azul
4. **Cores Personalizadas**: Cada empresa é exibida com sua cor primária de branding

#### Comportamento

- **Usuários com 1 empresa**: Exibe apenas o nome da empresa (sem dropdown)
- **Usuários com 2+ empresas**: Exibe nome + ícone de dropdown
- **Admin Multi-Tenant**: Também pode usar o selector e tem botão "Voltar à Administração"
- **Superadmin**: Acesso a todas as empresas via selector

#### Exemplo de Fluxo

```
Usuário está na Empresa A (como Manager)
    ↓
Clica no seletor de empresa no header
    ↓
Vê lista: [Empresa A (atual) ●] [Empresa B] [Empresa C]
    ↓
Clica em "Empresa B"
    ↓
Sistema carrega Empresa B como context
    ↓
Usuário agora vê dados e módulos da Empresa B
```

#### Diferentes Perfis em Cada Empresa

Um mesmo usuário pode ter diferentes papéis em cada empresa:

```
João Silva:
  - Empresa A: Manager (acesso completo a WhatsApp)
  - Empresa B: Viewer (apenas visualização)
  - Empresa C: Clinician (acesso limitado)

Quando João troca de empresa, suas permissões mudam automaticamente.
```

#### Restrições

- ❌ Usuário comum **não pode** acessar o painel de administração (`/admin`)
- ❌ Não pode criar novas empresas
- ✔️ Pode alternar apenas entre empresas em que foi cadastrado
- ✔️ Sistema valida automaticamente qual empresa acessar

---

## 3. Níveis de Acesso por Papel

### 3.1 Acesso do Superadmin

#### ✔️ O que o Superadmin PODE FAZER:

**Administrativo:**

- ✔️ Criar, editar e deletar empresas
- ✔️ Gerenciar usuários do sistema (superadmin e admin multi-tenant)
- ✔️ Visualizar dados de todas as empresas
- ✔️ Acessar qualquer empresa como administrador
- ✔️ Restaurar dados de auditoria
- ✔️ Configurar cores globais do sistema
- ✔️ Gerenciar módulos disponíveis

**Operacional:**

- ✔️ Acessar todos os módulos de todas as empresas
- ✔️ Visualizar e gerenciar dados operacionais
- ✔️ Executar ações de manutenção

**Segurança:**

- ✔️ Visualizar logs de ação de todos os usuários
- ✔️ Resetar senhas de usuários
- ✔️ Desativar contas

#### ❌ O que o Superadmin NÃO PODE FAZER:

- ❌ Usar permissões de um perfil específico (sempre admin em qualquer contexto)
- ❌ Ser limitado por módulos desativados
- ❌ Ser afetado por RLS (Row-Level Security) - acesso total

---

### 3.2 Acesso do Admin Multi-Tenant

#### ✔️ O que o Admin Multi-Tenant PODE FAZER:

**Administrativo:**

- ✔️ Acessar e gerenciar empresas atribuídas
- ✔️ Navegar entre empresas via painel admin
- ✔️ Acessar dashboard de cada empresa como admin
- ✔️ Gerenciar usuários da empresa
- ✔️ Criar e editar perfis de acesso
- ✔️ Visualizar logs da empresa
- ✔️ Configurar cores da empresa
- ✔️ Acessar painel de administração (`/admin`)
- ✔️ Criar novas empresas
- ✔️ Gerenciar usuários do sistema (criar e editar outros Admin Multi-Tenant)

**Operacional:**

- ✔️ Acessar todos os módulos da empresa
- ✔️ Gerenciar funcionalidades habilitadas
- ✔️ Executar ações de administração da empresa

#### ❌ O que o Admin Multi-Tenant NÃO PODE FAZER:

- ❌ Acessar empresas não atribuídas
- ❌ Gerenciar outras empresas além das atribuídas
- ❌ Editar ou visualizar usuários Superadmin
- ❌ Editar seu próprio login/perfil para superadmin
- ❌ Ativar/desativar módulos da empresa
- ❌ Alterar as cores padrões do sistema (apenas cores da empresa atribuída)
- ❌ Visualizar ou modificar configurações globais do sistema

---

### 3.3 Acesso do Admin da Empresa

#### ✔️ O que o Admin da Empresa PODE FAZER:

**Administrativo:**

- ✔️ Gerenciar todos os usuários da empresa
- ✔️ Criar, editar e deletar perfis de acesso
- ✔️ Definir permissões para cada perfil
- ✔️ Ativar/desativar módulos
- ✔️ Acessar configurações da empresa
- ✔️ Visualizar logs de ação

**Operacional:**

- ✔️ Acessar todos os módulos habilitados
- ✔️ Executar todas as ações operacionais
- ✔️ Gerenciar dados operacionais completos

#### ❌ O que o Admin da Empresa NÃO PODE FAZER:

- ❌ Acessar o painel global de administração (`/admin`)
- ❌ Criar novas empresas
- ❌ Visualizar dados de outras empresas
- ❌ Modificar a própria senha de outro admin (cada um controla a sua)
- ❌ Gerenciar usuários do sistema

---

### 3.4 Acesso do Gestor/Manager

#### ✔️ O que o Manager PODE FAZER:

**Operacional:**

- ✔️ Acessar dashboard e relatórios de vendas
- ✔️ Gerenciar instâncias WhatsApp (criar, editar, deletar)
- ✔️ Gerenciar contatos WhatsApp
- ✔️ Gerenciar mensagens WhatsApp
- ✔️ Gerenciar avaliações WhatsApp
- ✔️ Gerenciar aspectos WhatsApp
- ✔️ Visualizar logs

**Visualização:**

- ✔️ Acessar dashboards analíticos
- ✔️ Visualizar relatórios

#### ❌ O que o Manager NÃO PODE FAZER:

- ❌ Acessar configurações (`/configuracoes`)
- ❌ Gerenciar usuários
- ❌ Criar ou editar perfis
- ❌ Modificar configurações da empresa
- ❌ Acessar módulos desabilitados
- ❌ Ativar/desativar módulos

---

### 3.5 Acesso do Clínico/Clinician

#### ✔️ O que o Clinician PODE FAZER:

- ✔️ Acessar módulos configurados para o perfil
- ✔️ Visualizar dados operacionais específicos
- ✔️ Executar tarefas do seu domínio

#### ❌ O que o Clinician NÃO PODE FAZER:

- ❌ Acessar configurações
- ❌ Gerenciar usuários
- ❌ Acessar módulos não configurados
- ❌ Executar ações administrativas
- ❌ Visualizar dados de outras áreas

---

### 3.6 Acesso do Estoque/Stock, Finança/Finance, Visualizador/Viewer

#### ✔️ O que esses PODEM FAZER:

**Stock:**

- ✔️ Acessar módulos de estoque/inventário
- ✔️ Visualizar e gerenciar inventário
- ✔️ Gerar relatórios de estoque

**Finance:**

- ✔️ Visualizar dashboards financeiros
- ✔️ Acessar relatórios de vendas e faturamento
- ✔️ Analisar receita

**Viewer:**

- ✔️ Visualizar dashboards
- ✔️ Consultar relatórios
- ✔️ Acessar dados em modo leitura

#### ❌ O que esses NÃO PODEM FAZER:

- ❌ Criar, editar ou deletar dados
- ❌ Acessar configurações
- ❌ Gerenciar usuários
- ❌ Modificar permissões
- ❌ Acessar módulos não configurados

---

## 4. Tabela Comparativa de Permissões

| Ação / Funcionalidade         | Superadmin | Admin MT | Admin Emp. | Manager | Clinician | Stock | Finance | Viewer |
| ----------------------------- | :--------: | :------: | :--------: | :-----: | :-------: | :---: | :-----: | :----: |
| **Administração**             |            |          |            |         |           |       |         |        |
| Gerenciar empresas            |     ✔️     |    ❌    |     ❌     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| Gerenciar usuários do sistema |     ✔️     |    ❌    |     ❌     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| Gerenciar usuários da empresa |     ✔️     |    ✔️    |     ✔️     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| Criar/editar perfis de acesso |     ✔️     |    ✔️    |     ✔️     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| Definir permissões de perfis  |     ✔️     |    ✔️    |     ✔️     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| Ativar/desativar módulos      |     ✔️     |    ✔️    |     ✔️     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| Acessar painel admin global   |     ✔️     |    ✔️    |     ❌     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| Acessar configurações         |     ✔️     |    ✔️    |     ✔️     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| Visualizar logs               |     ✔️     |    ✔️    |     ✔️     |   ⚠️    |    ❌     |  ❌   |   ❌    |   ❌   |
| Modificar cores da empresa    |     ✔️     |    ✔️    |     ✔️     |   ❌    |    ❌     |  ❌   |   ❌    |   ❌   |
| **Operacional - WhatsApp**    |            |          |            |         |           |       |         |        |
| Gerenciar instâncias          |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ❌    |   ❌   |
| Gerenciar contatos            |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ❌    |   ❌   |
| Gerenciar mensagens           |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ❌    |   ❌   |
| Gerenciar avaliações          |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ❌    |   ❌   |
| Gerenciar aspectos            |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ❌    |   ❌   |
| **Operacional - Dashboard**   |            |          |            |         |           |       |         |        |
| Acessar dashboard             |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ✔️     |  ✔️   |   ✔️    |   ✔️   |
| Visualizar vendas             |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ✔️    |   ✔️   |
| Visualizar produtos           |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ❌    |   ✔️   |
| Visualizar clientes           |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ❌    |   ✔️   |
| Visualizar metas              |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ❌   |   ⚠️    |   ✔️   |
| **Visualização/Edição**       |            |          |            |         |           |       |         |        |
| Criar/editar dados            |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ⚠️   |   ❌    |   ❌   |
| Deletar dados                 |     ✔️     |    ✔️    |     ✔️     |   ✔️    |    ⚠️     |  ⚠️   |   ❌    |   ❌   |
| Acesso em leitura apenas      |     ❌     |    ❌    |     ❌     |   ❌    |    ❌     |  ❌   |   ⚠️    |   ✔️   |

**Legenda:**

- ✔️ **Permitido** - O papel tem acesso total a essa ação
- ❌ **Não permitido** - O papel não tem acesso
- ⚠️ **Permitido com restrições** - O papel tem acesso limitado ou baseado em permissões específicas

---

## 5. Regras Importantes de Segurança

### 5.1 Isolamento Multi-Tenant

#### Garantias do Sistema:

1. **Isolamento de Dados em Banco de Dados:**
   - Todas as queries são filtradas automaticamente por `company_id` usando RLS
   - Um usuário nunca consegue acessar dados de outra empresa, mesmo com SQL direto
   - As políticas RLS são obrigatórias e não podem ser contornadas por código da aplicação

2. **Isolamento em Tempo de Execução:**
   - Ao fazer login, o sistema carrega automaticamente a empresa do usuário
   - Se um usuário tenta forçar uma URL de outra empresa, é redirecionado
   - O `auth.uid()` do Supabase garante que nenhum outro usuário possa usar o token de outra pessoa

3. **Nenhum Acesso Cruzado:**
   ```
   Usuário A (Empresa 1) ≠ Dados da Empresa 2
   Usuário B (Empresa 2) ≠ Dados da Empresa 1
   ```

### 5.2 Ações Restritas Apenas a Admins

As seguintes ações **NUNCA** podem ser executadas por usuários normais:

| Ação                                       | Quem Pode              | Proteção                   |
| ------------------------------------------ | ---------------------- | -------------------------- |
| Criar/deletar/editar usuários              | Admin Emp. ou acima    | RLS + Backend validation   |
| Criar/deletar/editar perfis de acesso      | Admin Emp. ou acima    | RLS + Backend validation   |
| Modificar permissões de um perfil          | Admin Emp. ou acima    | RLS + Backend validation   |
| Acessar painel de administração (`/admin`) | Superadmin ou Admin MT | Frontend + Backend routing |
| Resetar senha de outro usuário             | Admin Emp. ou acima    | Backend only               |
| Ativar/desativar módulos                   | Admin Emp. ou acima    | Backend validation         |
| Visualizar logs de auditoria               | Admin Emp. ou acima    | RLS + Backend              |
| Modificar dados críticos da empresa        | Admin Emp. ou acima    | RLS + Backend              |

### 5.3 Proteções do Backend

1. **Função `is_user_admin()`:**

   ```sql
   SELECT COALESCE(ap.is_admin, FALSE)
   FROM app_user au
   LEFT JOIN access_profile ap ON ap.id = au.access_profile_id
   WHERE au.auth_user_id = auth.uid()
   ```

   - Sempre verifica se o usuário é admin via `access_profile.is_admin`
   - Não pode ser contornada por alterações no frontend

2. **Row-Level Security (RLS):**
   - Todas as tabelas possuem políticas RLS ativas
   - `app_user` só vê usuários da mesma empresa
   - `access_profile` só vê perfis da mesma empresa
   - Logs só são visíveis para admin da empresa

3. **Validação de Permissões:**
   - Cada operação crítica valida permissões no backend
   - A aplicação não confia apenas em dados do frontend

### 5.4 O Que Nunca Pode Ser Contornado

```
❌ Usuário normal não consegue:
   - Modificar seu próprio access_profile_id (constraints no BD)
   - Elevar suas próprias permissões (sem admin fazer isso)
   - Acessar dados de outra empresa (RLS bloqueia)
   - Usar token de outro usuário (Supabase auth)
   - Visualizar senhas (nunca armazenadas em plain text)
   - Excluir seu próprio usuário (validação de admin)
   - Desativar auditorias (logs sempre gravados)
```

---

## 6. Boas Práticas de Uso dos Papéis

### 6.1 Recomendações por Tipo de Organização

#### Pequena Empresa (1-50 funcionários)

| Papel            | Quantidade | Descrição                     |
| ---------------- | ---------- | ----------------------------- |
| Admin da Empresa | 1-2        | Proprietário ou gerente geral |
| Manager          | 1-2        | Supervisores de equipe        |
| Viewer/User      | Restante   | Equipe operacional            |

**Estrutura Recomendada:**

```
1 Superadmin (provedor)
    ↓
1 Admin Multi-Tenant (account manager)
    ↓
1-2 Admin Empresa
    ↓
1-2 Manager
    ↓
N Viewer/User
```

#### Média Empresa (50-500 funcionários)

| Papel                   | Quantidade          | Descrição                             |
| ----------------------- | ------------------- | ------------------------------------- |
| Admin da Empresa        | 2-3                 | Diretor administrativo + supervisores |
| Manager                 | 3-5                 | Gestores de departamento              |
| Clinician/Stock/Finance | Conforme necessário | Especialistas de área                 |
| Viewer                  | Conforme necessário | Visualização apenas                   |

**Estrutura Recomendada:**

```
1 Superadmin
    ↓
N Admin Multi-Tenant (por região/linha)
    ↓
2-3 Admin Empresa (por departamento)
    ↓
3-5 Manager (por equipe)
    ↓
Especialistas + Viewer (conforme necessário)
```

#### Grande Empresa (500+ funcionários)

| Papel            | Quantidade | Descrição                            |
| ---------------- | ---------- | ------------------------------------ |
| Admin da Empresa | 5+         | Estrutura administrativa hierárquica |
| Manager          | 10+        | Gestores de múltiplas equipes        |
| Especialistas    | Muitos     | Clinician, Stock, Finance, etc.      |
| Viewer           | Muitos     | Stakeholders com acesso limitado     |

**Estrutura Recomendada:**

```
1 Superadmin (platform owner)
    ↓
N Admin Multi-Tenant (regional ou segmentado)
    ↓
N Admin Empresa (por divisão)
    ↓
N Manager (por departamento)
    ↓
N Especialistas (por função)
    ↓
N Viewer (consultores/stakeholders)
```

### 6.2 Exemplos de Cenários Reais

#### Cenário 1: Empresa de E-commerce

```
Superadmin: Provedor SaaS
    ↓
Admin Multi-Tenant: Account Manager da empresa
    ↓
Admin Empresa: Diretor de operações
    ├── Manager (Vendas): Coordena equipe de vendas
    ├── Manager (Logística): Coordena estoque
    └── Finance: Analisa financeiro
        ├── Stock User: Operador de estoque
        ├── Stock User: Operador de estoque
        └── Viewer: Executivo que consulta dashboards
```

#### Cenário 2: Rede de Franquias

```
Superadmin: Matriz
    ↓
Admin Multi-Tenant: Gestor de região (responsável por 5 lojas)
    ├── Admin Empresa: Franqueado da Loja 1
    │   ├── Manager: Supervisor
    │   ├── Clinician: Especialista técnico
    │   └── Viewer: Sócio que consulta
    ├── Admin Empresa: Franqueado da Loja 2
    │   ├── Manager: Supervisor
    │   └── Stock: Operador
    └── [... mais lojas]
```

#### Cenário 3: Consultoria com Múltiplos Clientes

```
Superadmin: Empresa de software
    ↓
Admin Multi-Tenant: Consultor Senior (10 clientes)
    ├── Cliente A
    │   └── Admin Empresa: Diretor
    │       ├── Manager: Coordenador
    │       └── Clinician: Técnico
    ├── Cliente B
    │   └── Admin Empresa: Gestor
    │       └── Manager: Supervisor
    └── [... mais clientes]
```

### 6.3 Checklist de Atribuição de Papéis

Ao criar um novo usuário, responda:

- [ ] Este usuário precisa gerenciar a empresa inteira? **→ Admin Empresa**
- [ ] Este usuário precisa gerenciar múltiplas empresas? **→ Admin Multi-Tenant**
- [ ] Este usuário precisa gerenciar WhatsApp ou operações críticas? **→ Manager**
- [ ] Este usuário trabalha em um departamento específico? **→ Especialista (Clinician/Stock/Finance)**
- [ ] Este usuário só precisa visualizar dados? **→ Viewer**
- [ ] Este é um novo usuário em teste? **→ User** (depois migre para o perfil correto)

### 6.4 Migração de Papéis (Mudanças de Cargo)

Quando um funcionário muda de cargo:

1. **Não delete o usuário antigo**
   - Mantém histórico de auditorias
   - Preserva relacionamentos de dados

2. **Crie um novo usuário com novo perfil**
   - Ou atualize o `access_profile_id` existente

3. **Desative o usuário antigo**
   - `app_user.active = false`

4. **Documente no sistema de auditoria**
   - Registre mudança no histórico

---

## 7. Observações Técnicas

### 7.1 Implementação do RBAC no Sistema

#### Estrutura de Banco de Dados:

```
system_user                      (usuários globais)
├── auth_user_id (referência Supabase Auth)
├── is_superadmin BOOLEAN
└── name, email

app_user                         (usuários da empresa)
├── auth_user_id
├── company_id (FK → company)
├── access_profile_id (FK → access_profile)
└── name, email, active

access_profile                   (papéis/perfis)
├── company_id (FK → company, NULL = sistema)
├── code TEXT (admin, viewer, manager, etc.)
├── name TEXT
├── is_admin BOOLEAN
├── is_system BOOLEAN
└── active BOOLEAN

access_profile_permission        (permissões por perfil)
├── profile_id (FK → access_profile)
└── permission_id (FK → module_permission)

system_module                    (módulos do sistema)
├── code TEXT (whatsapp, dashboard, settings, etc.)
├── name TEXT
└── active BOOLEAN

module_permission                (permissões por módulo)
├── module_id (FK → system_module)
├── code TEXT (view, manage, etc.)
└── name TEXT
```

#### Fluxo de Verificação de Permissão:

```
1. Usuário faz login
2. Sistema carrega session.user.id
3. Busca app_user.access_profile_id
4. Carrega access_profile.is_admin
5. Se is_admin = true → acesso total
6. Senão → busca access_profile_permission
7. Valida se tem permission para module + action
8. RLS filtra dados por company_id
```

### 7.2 Evoluções Futuras Recomendadas

#### Sugestão 1: Permissões Granulares por Recurso

**Situação atual:** As permissões são por módulo (ex: "manage WhatsApp")

**Evolução proposta:** Permissões por recurso específico (ex: "manage WhatsApp instances", "view WhatsApp messages only")

```sql
-- Novo nível de granularidade
resource_permission:
├── code TEXT (whatsapp.instances.manage, whatsapp.messages.view)
├── module_id
└── description
```

#### Sugestão 2: Permissões Baseadas em Contexto

**Situação atual:** Admin ou não admin (binário)

**Evolução proposta:** Permissões condicionais

```javascript
// Exemplo: Manager só pode editar mensagens de sua equipe
{
  "module": "whatsapp",
  "action": "manage_messages",
  "condition": "created_by_user_id = current_user_id OR team_id = current_user_team"
}
```

#### Sugestão 3: Papéis Dinâmicos/Hierárquicos

**Situação atual:** Papéis fixos definidos no sistema

**Evolução proposta:** Criar papéis customizados por empresa

```javascript
// Admin da empresa cria: "Supervisor Regional"
// Que herda permissões de "Manager" mas com restrições adicionais
```

#### Sugestão 4: Delegação de Permissões Temporárias

**Novo recurso:** Admin pode delegar uma permissão por tempo limitado

```javascript
// Manager pode gerenciar instâncias WhatsApp por 30 dias
// Depois reverte automaticamente
```

#### Sugestão 5: Auditoria Detalhada de Permissões

**Melhorias:**

- Log de quem alterou permissões de quem
- Histórico de mudanças de papel
- Alertas quando permissões críticas são alteradas

### 7.3 Checklist de Segurança para Developers

Ao implementar novas funcionalidades:

- [ ] A rota está protegida por ProtectedRoute ou AdminRoute?
- [ ] Validações de permissão estão no **backend**, não apenas frontend?
- [ ] A query filtra por `company_id` do usuário autenticado?
- [ ] RLS está habilitado para a tabela?
- [ ] Não há query com `WHERE = ${variable}` sem validação?
- [ ] A ação crítica registra um log de auditoria?
- [ ] Função SQL usa `SECURITY DEFINER` quando necessário?
- [ ] Não há exposição de dados sensíveis no erro de resposta?
- [ ] Roles e permissões são validados antes de operações críticas?

### 7.4 Testes Recomendados

**Testes de Segurança para Implementar:**

```javascript
// Teste 1: Usuário não-admin não consegue acessar /admin
// Teste 2: Usuário não-admin não consegue listar usuários de outra empresa
// Teste 3: Usuário não-admin não consegue alterar access_profile_id via API
// Teste 4: Superadmin consegue acessar qualquer empresa
// Teste 5: Admin Multi-Tenant só consegue acessar empresas atribuídas
// Teste 6: Viewer consegue acessar dashboards mas não consegue deletar dados
// Teste 7: RLS bloqueia queries diretas sem filtragem
// Teste 8: Token expirado resulta em 401 (não expõe dados)
// Teste 9: Múltiplos usuários na mesma empresa não conseguem acessar dados um do outro se configurado
// Teste 10: Alteração de role requer re-autenticação
```

---

## Referências e Tabelas de Consulta Rápida

### Tabela: Quem Pode Gerenciar Quem?

| Que é gerenciado   | Quem pode gerenciar                            |
| ------------------ | ---------------------------------------------- |
| Superadmin         | Ninguém (gerencia a si mesmo)                  |
| Admin Multi-Tenant | Superadmin apenas                              |
| Admin Empresa      | Admin Empresa (da mesma empresa) ou Superadmin |
| Manager            | Admin Empresa ou acima                         |
| Usuários comuns    | Admin Empresa ou acima                         |

### Tabela: Acesso por URL

| URL                | Superadmin | Admin MT | Admin Emp. | Manager | Outros |
| ------------------ | :--------: | :------: | :--------: | :-----: | :----: |
| `/`                |     ✔️     |    ✔️    |     ✔️     |   ✔️    |   ✔️   |
| `/admin`           |     ✔️     |    ✔️    |     ❌     |   ❌    |   ❌   |
| `/dashboard/*`     |     ✔️     |    ✔️    |     ✔️     |   ✔️    |   ✔️   |
| `/configuracoes/*` |     ✔️     |    ✔️    |     ✔️     |   ❌    |   ❌   |
| `/whatsapp/*`      |     ✔️     |    ✔️    |     ✔️     |   ✔️    |   ⚠️   |

### Tabela: Padrão de Permissão por Papel

| Aspecto           | Padrão                                                 |
| ----------------- | ------------------------------------------------------ |
| **Superadmin**    | Acesso total, sem limitações                           |
| **Admin MT**      | Acesso administrativo em múltiplas empresas atribuídas |
| **Admin Emp.**    | Acesso administrativo em uma empresa                   |
| **Manager**       | Acesso operacional completo, sem admin                 |
| **Especialistas** | Acesso limitado ao módulo específico                   |
| **Viewer**        | Acesso de leitura apenas                               |

---

**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Última Revisão:** 04/02/2026  
**Responsável:** Arquitetura de Segurança
