# E2E DB Setup

## Local run

1. Copy `tests/e2e/.env.example` to a local `.env` file loaded by your shell.
2. Keep `APP_ENV=dev`.
3. Run Aurea E2E:
   - `npm run test:e2e -w aurea`
4. Run White Label E2E:
   - `npm run test:e2e -w white_label`

## Manual DB commands

- Aurea:
  - `npm run db:reset:aurea`
  - `npm run db:migrate:aurea`
  - `npm run db:seed:dev:aurea`
  - `npm run db:prepare:test:aurea`
- White Label:
  - `npm run db:reset:white-label`
  - `npm run db:migrate:white-label`
  - `npm run db:seed:dev:white-label`
  - `npm run db:prepare:test:white-label`
