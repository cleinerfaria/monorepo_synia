# Instruções do Projeto

## Idioma
- Sempre responda em Português do Brasil (pt-BR).

## Modo de Operação

Antes de qualquer ação, o agente deve:

1. Validar se a tarefa solicitada é permitida pelas regras
2. Carregar os arquivos de regras listados abaixo **quando o gatilho se aplicar**
3. Somente então propor alterações

Se qualquer regra não puder ser cumprida, **não executar mudanças**.

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
