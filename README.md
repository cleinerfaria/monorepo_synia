# Monorepo Synia

Monorepo com apps e pacotes compartilhados.

## Estrutura

- `apps/aurea` (`aurea-care`)
- `apps/white-label` (`gestao`)
- `packages/ui` (`@synia/ui`)
- `packages/config` (`@synia/config`)

## Comandos

- Instalar dependencias: `npm install`
- Subir Aurea: `npm run dev:aurea`
- Subir White-label: `npm run dev:white-label`
- Build de todos os apps: `npm run build`
- Lint de todos os apps: `npm run lint`
- Testes (vitest run) de todos os apps: `npm run test`
