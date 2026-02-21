# Funcionalidade de Alternância Entre Empresas - Implementação

## Resumo das Mudanças

Implementada a funcionalidade que permite usuários comuns (App Users) com acesso a múltiplas empresas alternar facilmente entre elas através de um seletor no header da aplicação.

## Alterações Implementadas

### 1. Hook: `useUserCompanies.ts`

**Arquivo**: `src/hooks/useUserCompanies.ts`

Novo hook que busca todas as empresas em que um usuário está cadastrado.

**Funcionalidades**:

- Busca todos os `app_user` registros do usuário autenticado
- Retorna lista de empresas com as empresas vinculadas
- Filtra apenas usuários ativos
- Cache de 5 minutos para otimização

**Uso**:

```typescript
const { data: userCompanies = [] } = useUserCompanies();
```

### 2. DashboardLayout: Seletor de Empresas no Header

**Arquivo**: `src/layouts/DashboardLayout.tsx`

**Alterações**:

- ✅ Importado hook `useUserCompanies`
- ✅ Adicionado state `isCompanyDropdownOpen`
- ✅ Adicionada função `handleSwitchCompany(newCompanyId)`
- ✅ Substituído indicador simples por seletor interativo

**Novo Componente**: Company Selector

**Características**:

- **Visual adaptativo**: Muda cor baseado no tipo de usuário
  - Admin MT / Superadmin: Azul
  - Usuário com múltiplas empresas: Cinza
  - Usuário com uma empresa: Cinza claro
- **Dropdown com**:
  - Lista de todas as empresas do usuário
  - Indicador visual (ponto azul) da empresa atual
  - Cores personalizadas por empresa
  - Nome e razão social
  - Para Admin MT: botão "Voltar à Administração"

- **Interatividade**:
  - Clique para expandir/colapsar
  - Clique em empresa para trocar
  - Clique fora para fechar
  - Teclado: Escape para fechar (futuro)

### 3. Documentação: Atualizado USER_TYPES_AND_ACCESS_CONTROL.md

**Alterações**:

- ✅ Seção 1.2 atualizada: Modelo Multi-Tenant agora documenta múltiplas empresas
- ✅ Nova seção 2.8: Funcionalidade de Alternância Entre Empresas
  - Como funciona
  - Comportamento por tipo de usuário
  - Exemplos de fluxo
  - Diferentes perfis por empresa
  - Restrições

## Como Usar

### Para Usuários Comuns

1. Se tem acesso a múltiplas empresas, verá um seletor no header com a empresa atual
2. Clica no seletor para abrir a lista de empresas
3. Seleciona a empresa desejada
4. Sistema carrega automaticamente a nova empresa
5. Permissões e dados mudam conforme o perfil naquela empresa

### Para Admin Multi-Tenant

1. Vê o seletor com a empresa atual em azul
2. Pode clicar para alternar entre empresas atribuídas
3. Tem botão adicional "Voltar à Administração" no dropdown
4. Pode acessar painel admin via botão

### Para Superadmin

1. Vê o seletor com a empresa atual em azul
2. Tem acesso a TODAS as empresas
3. Pode alternar entre qualquer empresa
4. Tem botão "Voltar à Administração" no dropdown

## Estrutura de Dados

### App User com Múltiplas Empresas

```
auth_user_id: 550e8400-e29b-41d4-a716-446655440001
    ↓
    ├── app_user: (Empresa A)
    │   ├── id: uuid-1
    │   ├── company_id: empresa-a-id
    │   ├── access_profile_id: manager-profile
    │   └── name: João Silva
    │
    ├── app_user: (Empresa B)
    │   ├── id: uuid-2
    │   ├── company_id: empresa-b-id
    │   ├── access_profile_id: viewer-profile
    │   └── name: João Silva
    │
    └── app_user: (Empresa C)
        ├── id: uuid-3
        ├── company_id: empresa-c-id
        ├── access_profile_id: clinician-profile
        └── name: João Silva
```

## Fluxo Técnico

```
1. Usuário faz login
   ↓
2. Sistema carrega:
   - session.user.id
   - app_user da empresa padrão
   - company da empresa padrão
   ↓
3. DashboardLayout carrega:
   - useUserCompanies() → busca TODOS os app_user
   - filtra empresas ativas
   ↓
4. Header renderiza seletor:
   - Se 1 empresa: sem dropdown
   - Se 2+ empresas: com dropdown
   - Mostra todas as empresas
   ↓
5. Usuário clica em empresa diferente:
   - handleSwitchCompany(newCompanyId) é chamada
   - enterCompany(newCompanyId) carrega nova empresa
   - Componentes rerendem com novo context
   - Dados e permissões mudam automaticamente
```

## Testes Recomendados

### Teste 1: Usuário com Uma Empresa

- [ ] Login com usuário que tem 1 empresa
- [ ] Verifica que seletor NÃO tem dropdown (apenas nome)
- [ ] Sem botão de alternância

### Teste 2: Usuário com Duas Empresas

- [ ] Login com usuário que tem 2+ empresas
- [ ] Verifica que seletor tem dropdown com ícone
- [ ] Clica no seletor
- [ ] Vê lista com ambas as empresas
- [ ] Empresa atual tem ponto azul
- [ ] Clica em outra empresa
- [ ] Sistema carrega dados da nova empresa
- [ ] Url permanece `/` mas dados mudam
- [ ] Perfil do usuário pode ser diferente

### Teste 3: Dados Isolados

- [ ] Usuário em Empresa A vê dados de A apenas
- [ ] Troca para Empresa B
- [ ] Vê dados de B apenas
- [ ] Volta para Empresa A
- [ ] Vê dados de A novamente

### Teste 4: Permissões Diferentes

- [ ] Usuário Manager na Empresa A
- [ ] Usuário Viewer na Empresa B
- [ ] Quando em A: consegue editar dados
- [ ] Quando em B: consegue apenas visualizar
- [ ] Permissões mudam ao alternar

### Teste 5: Admin Multi-Tenant

- [ ] Vê seletor em azul (admin MT color)
- [ ] Pode alternar entre empresas atribuídas
- [ ] NÃO pode acessar empresas não atribuídas
- [ ] Tem botão "Voltar à Administração"
- [ ] Clica em voltar → vai para `/admin`

### Teste 6: Superadmin

- [ ] Vê todas as empresas no seletor
- [ ] Pode alternar entre QUALQUER empresa
- [ ] Tem acesso completo em cada uma
- [ ] Tem botão "Voltar à Administração"

### Teste 7: Responsividade

- [ ] Seletor aparece no mobile
- [ ] Dropdown abre e fecha corretamente
- [ ] Nomes truncam se muito longos
- [ ] Cores funcionam em tema claro e escuro

### Teste 8: Segurança

- [ ] RLS impede acesso a empresas não atribuídas
- [ ] Query do hook filtra apenas empresas ativas
- [ ] Mudança de empresa valida permissões
- [ ] Log de auditoria registra troca de empresa (futuro)

## Próximas Melhorias

1. **Atalhos de Teclado**
   - `Escape` para fechar dropdown
   - Números para trocar entre empresas (1, 2, 3...)

2. **Auditoria**
   - Log de quando usuário troca de empresa
   - Rastreamento de qual empresa estava usando

3. **Persistência de Preferência**
   - Lembrar última empresa usada
   - Ao fazer login, carrega última empresa acessada

4. **Busca de Empresas**
   - Se usuário tem 10+ empresas, adicionar campo de busca
   - Filtrar por nome conforme digita

5. **Indicador de Notificações**
   - Mostrar badge de notificações por empresa
   - "Empresa B: 3 novas mensagens"

6. **Geolocalização**
   - Para usuarios em múltiplas filiais
   - Sugerir empresa mais próxima

## Configuração Necessária

Nenhuma configuração adicional é necessária. A funcionalidade funciona automaticamente se:

- ✅ Usuário está autenticado
- ✅ Usuário tem registros em múltiplas empresas (app_user)
- ✅ Hook `useAuthStore` carrega empresa padrão
- ✅ Hook `enterCompany` funciona corretamente

## Notas Importantes

1. **Persistência**: A troca de empresa é armazenada apenas em memória (state). Se usuário recarregar a página, volta para a empresa padrão (de acordo com app_user ou login).

2. **Permissões**: As permissões são carregadas dinamicamente baseado no `access_profile_id` da nova empresa.

3. **Cache**: O hook `useUserCompanies` tem cache de 5 minutos. Se uma nova empresa for adicionada, pode levar até 5 minutos para aparecer no seletor.

4. **Admin MT Restrição**: Admin Multi-Tenant só vê empresas atribuídas (query backend valida).

---

**Versão**: 1.0  
**Data**: Fevereiro 2026  
**Status**: Implementado ✅
