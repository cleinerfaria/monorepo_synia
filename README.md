# Monorepo Synia

Monorepo com apps, pacotes compartilhados e pacotes de banco por produto.

## Visão geral

Este repositório usa `npm workspaces` e está organizado em dois grupos principais:

- `apps/*`: aplicações executáveis (frontends)
- `packages/*`: bibliotecas compartilhadas, configurações e pacotes de banco

## Projetos contidos no monorepo

### Apps (`apps/`)

- `apps/vidasystem` (`vidasystem`): aplicação principal VidaSystem
- `apps/whitelabel` (`whitelabel`): aplicação White Label

### Packages (`packages/`)

- `packages/ui` (`@synia/ui`): componentes de UI compartilhados entre apps
- `packages/config` (`@synia/config`): configurações compartilhadas (ESLint, Prettier, TSConfig, Tailwind)
- `packages/db-vidasystem` (`@synia/db-vidasystem`): scripts e suporte de banco do VidaSystem
- `packages/db-whitelabel` (`@synia/db-whitelabel`): scripts e suporte de banco do White Label

## Onde ficam os componentes

### Componentes compartilhados (reutilizáveis entre apps)

- `packages/ui/src/components`

Use este local para componentes de UI genéricos e reutilizáveis.

### Componentes específicos de cada app

- `apps/vidasystem/src/components`
- `apps/whitelabel/src/components`

Esses diretórios concentram componentes acoplados ao contexto de cada produto.

### Componentes por feature/módulo (co-localizados)

Exemplo existente:

- `apps/vidasystem/src/pages/prescriptions/components`

Esse padrão é útil quando os componentes pertencem a uma tela/feature específica e não devem ser compartilhados globalmente.

## Estrutura resumida

```txt
.
|- apps/
|  |- vidasystem/
|  |  `- src/
|  |     |- components/
|  |     `- pages/.../components/
|  `- whitelabel/
|     `- src/
|        `- components/
|- packages/
|  |- ui/
|  |  `- src/components/
|  |- config/
|  |- db-vidasystem/
|  `- db-whitelabel/
|- docs/
|- scripts/
|- supabase/
|- tests/
`- e2e/
```

## Comandos principais

### Setup

- Instalar dependências: `npm install`

### Desenvolvimento

- Selecionar projeto para rodar: `npm run dev`
- Subir VidaSystem: `npm run dev:vidasystem`
- Subir White Label: `npm run dev:whitelabel`

### Qualidade e build (monorepo)

- Build de todos os workspaces: `npm run build`
- Lint de todos os workspaces: `npm run lint`
- Testes (seletor por projeto): `npm run test`

### Banco (atalhos por app)

- VidaSystem (reset): `npm run db:reset:vidasystem`
- White Label (reset): `npm run db:reset:whitelabel`

## Dica rápida de organização

- Se o componente será usado em mais de um app, coloque em `packages/ui`
- Se o componente é de um único app, coloque em `apps/<app>/src/components`
- Se o componente é de uma feature específica, co-localize em `src/pages/<feature>/components`
