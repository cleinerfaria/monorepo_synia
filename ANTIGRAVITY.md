# Instruções do Projeto

## Idioma

- Sempre responda em Português do Brasil (pt-BR).

## Modo de Operação

Antes de qualquer ação, o agente deve:

1. Validar se a tarefa solicitada é permitida pelas regras
2. Carregar os arquivos de regras listados abaixo **quando o gatilho se aplicar**
3. Somente então propor alterações

Se qualquer regra não puder ser cumprida, **não executar mudanças**.

## Configuração de Banco de Dados

### Supabase - Ambiente Remoto Obrigatório

- **Usar SEMPRE Supabase remoto** — nunca trabalhar com Supabase local
- **Proibido** executar `supabase start` para desenvolvimento
- **Proibido** rodar comandos `supabase db` diretamente da raiz do projeto
- **Proibido** copiar migrations para `supabase/migrations/` na raiz

### Migrations - Estrutura Monorepo

- Cada projeto tem suas migrations isoladas:
  - **VidaSystem**: `packages/db-vidasystem/supabase/migrations/` (fonte da verdade)
  - **White Label**: `packages/db-white-label/supabase/migrations/` (fonte da verdade)
- **Usar SEMPRE scripts npm** para aplicar migrations:
  - `npm run db:migrate:vidasystem` — aplica migrations do VidaSystem no banco correto
  - `npm run db:migrate:white-label` — aplica migrations do White Label no banco correto
  - `npm run db:reset:vidasystem` — reseta banco do VidaSystem (destrutivo)
  - `npm run db:reset:white-label` — reseta banco do White Label (destrutivo)
- Os scripts usam `--workdir` e `--db-url` internamente, garantindo isolamento entre projetos

## Arquivos de Regras (carregar sob demanda)

- `docs/agent/rules/rule-01-security-isolation.md` — Carregar ao criar/modificar código client-side que interaja com Supabase ou banco de dados.
- `docs/agent/rules/rule-02-async-e-concorrencia.md` — Carregar ao criar/modificar código com I/O, chamadas externas, operações em lote ou processamento custoso.
- `docs/agent/rules/rule-03-multi-tenant-shield.md` — Carregar ao criar/modificar queries, mutations ou operações em lote que acessem dados persistentes.
- `docs/agent/rules/rule-04-secrets-e-configuracoes.md` — Carregar ao criar/usar variáveis de ambiente, chaves, tokens, URLs sensíveis ou integrações externas.
- `docs/agent/rules/rule-05-encoding-e-integridade-textual.md` — Carregar ao criar/modificar textos com acentuação/símbolos, labels de UI, SQL seeds, CSVs/importadores e documentação.
- `docs/agent/rules/rule-06-auth-sessao-e-autorizacao.md` — Carregar ao implementar login/logout, proteção de rotas, chamadas a Functions/APIs, RBAC, qualquer leitura/escrita autenticada.
- `docs/agent/rules/rule-07-clean-architecture.md` — Carregar ao criar novos hooks/services, adicionar rotas no backend, implementar lógica de negócio complexa.
- `docs/agent/rules/rule-08-state-and-side-effects.md` — Carregar ao criar/modificar código com estado, efeitos colaterais, listeners, subscriptions ou cache.

## Regras Absolutas

O agente **NUNCA** deve:

- Hardcodear cores, espaçamentos ou tokens de design
- Quebrar padrões arquiteturais existentes
- Alterar migrations já aplicadas em produção
- Introduzir dependências sem justificativa técnica clara
- Executar comandos destrutivos sem confirmação explícita
- Supor contexto não documentado

## Regras de Alteração de Código

Antes de alterar código, o agente deve:

- Explicar **o que será alterado**
- Explicar **por que é necessário**
- Indicar **impactos técnicos e de negócio**
- Propor a mudança em **passos incrementais**

## Verificação Obrigatória

Ao final de cada processo que altere código:

- Perguntar se deve executar `npm run precommit:check`
- Em ajustes grandes, executar sem solicitar permissão
- Relatar resultados (lint, tests, type-check)
- Se houver falhas, corrigir antes de finalizar

## Regras de Segurança

- Nunca expor chaves, tokens ou credenciais
- Nunca sugerir bypass de autenticação ou RLS
- Presumir ambiente **multi-tenant por padrão**

## Ambiguidade ou Conflito

Se houver ambiguidade nas regras, conflito entre arquivos ou falta de contexto suficiente, o agente deve **PARAR** e perguntar antes de agir.

## Regra Final

> O agente é um **assistente técnico disciplinado**, não um executor cego.
> Seguir regras > Velocidade > Criatividade.
