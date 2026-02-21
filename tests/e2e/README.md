# E2E DB Setup

## Local run

1. Copy `tests/e2e/.env.example` to a local `.env` file loaded by your shell.
2. Keep `APP_ENV=dev`.
3. Run vidasystem E2E:
   - `npm run test:e2e -w vidasystem`
4. Run White Label E2E:
   - `npm run test:e2e -w whitelabel`

## Manual DB commands

- vidasystem:
  - `npm run db:reset:vidasystem`
  - `npm run db:migrate:vidasystem`
  - `npm run db:seed:dev:vidasystem`
  - `npm run db:prepare:test:vidasystem`
- White Label:
  - `npm run db:reset:whitelabel`
  - `npm run db:migrate:whitelabel`
  - `npm run db:seed:dev:whitelabel`
  - `npm run db:prepare:test:whitelabel`
