# Instalação e Uso do Supabase CLI no Windows

## Problema

A instalação global do Supabase CLI via `npm install -g supabase` não é mais suportada e resulta em erro. O método recomendado mudou e pode causar confusão para quem já utilizava o comando anteriormente.

## Solução Recomendada

### 1. Instale o Supabase CLI via Scoop

Se você utiliza Windows, o método mais prático e suportado é usando o gerenciador de pacotes Scoop:

```bash
scoop install supabase
```

powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -useb get.scoop.sh | iex"

Após a instalação, o comando `supabase` estará disponível globalmente no terminal.

### 2. Alternativas

- **Executar via npx:**
  - Você pode rodar `npx supabase <comando>` e, quando solicitado, responder "y" para instalar temporariamente.
- **Instalador manual:**
  - Baixe o executável em https://github.com/supabase/cli/releases/latest, renomeie para `supabase.exe` e coloque em uma pasta do seu PATH.

## Observações

- Não utilize mais `npm install -g supabase`.
- O método via Scoop é o mais simples e evita prompts do npx.
- Após instalar, utilize normalmente:
  ```bash
  supabase db push
  supabase start
  supabase db reset --linked
  ```

---

Se precisar de mais detalhes, consulte a documentação oficial: https://supabase.com/docs/guides/cli

╭──────────────────────────────────────╮
│ 🔧 Development Tools │
├─────────┬────────────────────────────┤
│ Studio │ http://127.0.0.1:54323 │
│ Mailpit │ http://127.0.0.1:54324 │
│ MCP │ http://127.0.0.1:54321/mcp │
╰─────────┴────────────────────────────╯

╭──────────────────────────────────────────────────────╮
│ 🌐 APIs │
├────────────────┬─────────────────────────────────────┤
│ Project URL │ http://127.0.0.1:54321 │
│ REST │ http://127.0.0.1:54321/rest/v1 │
│ GraphQL │ http://127.0.0.1:54321/graphql/v1 │
│ Edge Functions │ http://127.0.0.1:54321/functions/v1 │
╰────────────────┴─────────────────────────────────────╯

╭───────────────────────────────────────────────────────────────╮
│ ⛁ Database │
├─────┬─────────────────────────────────────────────────────────┤
│ URL │ postgresql://postgres:postgres@127.0.0.1:54322/postgres │
╰─────┴─────────────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────────────────╮
│ 🔑 Authentication Keys │
├─────────────┬────────────────────────────────────────────────┤
│ Publishable │ sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH │
│ Secret │ sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx │
╰─────────────┴────────────────────────────────────────────────╯

╭───────────────────────────────────────────────────────────────────────────────╮
│ 📦 Storage (S3) │
├────────────┬──────────────────────────────────────────────────────────────────┤
│ URL │ http://127.0.0.1:54321/storage/v1/s3 │
│ Access Key │ 625729a08b95bf1b7ff351a663f3a23c │
│ Secret Key │ 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907 │
│ Region │ local │
╰────────────┴──────────────────────────────────────────────────────────────────╯

Instalar o Supabase CLI localmente traz várias melhorias para o seu projeto:

1. Ambiente de desenvolvimento local completo:
Você pode rodar supabase start para subir banco de dados, autenticação, storage e edge functions localmente, simulando o ambiente de produção.

2. Testes e desenvolvimento offline:
Permite testar integrações, regras de segurança (RLS), funções e migrações sem depender da nuvem, acelerando o ciclo de desenvolvimento.

3. Gerenciamento de migrações facilitado:
Comandos como supabase db push, db reset, db diff e db migrate funcionam localmente, permitindo versionar e aplicar mudanças no banco de forma segura antes de enviar para produção.

4. Execução e debug de edge functions:
Você pode rodar, debugar e testar edge functions localmente antes de publicar.

5. Automação e integração contínua:
Facilita scripts de CI/CD, já que o CLI pode ser usado em pipelines para rodar testes, aplicar migrações e validar o projeto.

6. Mais controle e agilidade:
Evita prompts do npx, reduz dependências temporárias e garante que sempre terá a versão do CLI disponível.

Resumindo: você ganha mais velocidade, segurança e autonomia no desenvolvimento, com um ambiente local que replica o Supabase da nuvem.
