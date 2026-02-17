# AGENTS.md

## 📌 Propósito

Este arquivo define **as regras obrigatórias** que o agente deve seguir ao analisar, sugerir ou modificar código neste repositório.

> ⚠️ O agente **NÃO pode violar** estas regras. Em caso de conflito, deve **parar**, explicar o risco e solicitar orientação.

---

## 🧠 Modo de Operação do Agente

Antes de qualquer ação, o agente deve:

1. **Ler integralmente este arquivo**
2. **Ler os arquivos de regras listados abaixo caso necessário**
3. Validar se a tarefa solicitada **é permitida** pelas regras
4. Somente então propor alterações

Se qualquer regra não puder ser cumprida, **não executar mudanças**.

---

## 📂 Arquivos de Regras Oficiais

O agente deve SEMPRE carregar e respeitar os arquivos abaixo, considerando seus gatilhos:

- `docs/agent/rules/rule-01-security-isolation.md`
  SÓ LEIA ESSE ARQUIVO SE: For criar ou modificar arquivos em /app, /components, ou qualquer codigo client-side que interaja com Supabase ou banco de dados.

- `docs/agent/rules/rule-02-async-e-concorrencia.md`
  SÓ LEIA ESSE ARQUIVO SE: For criar ou modificar código que execute I/O, chamadas externas, operações em lote ou processamento custoso.

- `docs/agent/rules/rule-03-multi-tenant-shield.md`
  SÓ LEIA ESSE ARQUIVO SE: For criar ou modificar queries, mutations ou operações em lote que acessem dados persistentes.

- `docs/agent/rules/rule-04-secrets-e-configuracoes.md`
  SÓ LEIA ESSE ARQUIVO SE: For criar ou usar variáveis de ambiente, chaves, tokens, URLs sensíveis ou integrações externas.

- `docs/agent/rules/rule-05-encoding-e-integridade-textual.md`
  SÓ LEIA ESSE ARQUIVO SE: For criar ou modificar textos com acentuação/símbolos, labels de UI, SQL seeds, CSVs/importadores e documentação.

- `docs/agent/rules/rule-06-auth-sessao-e-autorizacao.md`
  SÓ LEIA ESSE ARQUIVO SE: For implementar login/logout, proteção de rotas, chamadas a Functions/APIs, RBAC, qualquer leitura/escrita autenticada.

- `docs/agent/rules/rule-07-clean-architecture.md`
  SÓ LEIA ESSE ARQUIVO SE: For criar novos hooks/services, adicionar rotas no backend, implementar lógica de negócio complexa.

- `docs/agent/rules/rule-08-state-and-side-effects.md`
  SÓ LEIA ESSE ARQUIVO SE: For criar ou modificar código com estado, efeitos colaterais, listeners, subscriptions ou cache.

## 🚫 Regras Absolutas (Hard Rules)

O agente **NUNCA** deve:

- Hardcodear cores, espaçamentos ou tokens de design
- Quebrar padrões arquiteturais existentes
- Alterar migrations já aplicadas em produção
- Introduzir dependências sem justificativa técnica clara
- Executar comandos destrutivos sem confirmação explícita
- Supor contexto não documentado

---

## ✅ Regras de Alteração de Código

Antes de alterar código, o agente deve:

- Nunca altere a acentuação para mojibake, mantenha sempre o padrão UTF-8
- Explicar **o que será alterado**
- Explicar **por que é necessário**
- Indicar **impactos técnicos e de negócio**
- Propor a mudança em **passos incrementais**

---

## 🧪 Regras de Segurança

- Nunca expor chaves, tokens ou credenciais
- Nunca sugerir bypass de autenticação ou RLS
- Presumir ambiente **multi-tenant por padrão**

---

## 🧩 Ambiguidade ou Conflito

Se houver:

- Ambiguidade nas regras
- Conflito entre arquivos
- Falta de contexto suficiente

O agente deve **PARAR** e perguntar antes de agir.

---

## 🧭 Regra Final

> O agente é um **assistente técnico disciplinado**, não um executor cego.

Seguir regras > Velocidade > Criatividade.
