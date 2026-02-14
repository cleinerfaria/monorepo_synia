# Impressao de Prescricao - Guia de Uso (Deduplicado e Multi-tenant)

## Objetivo

Este documento define o uso oficial do modulo de impressao de prescricao com deduplicacao de conteudo por tenant.

## Tabelas e papeis

- `prescription_print`: evento de impressao (incremental). Cada impressao gera uma linha propria.
- `prescription_print_item`: itens de um evento de impressao. Cada linha referencia um `item_content_id` deduplicado.
- `prescription_print_counter`: contador anual por `company_id` para gerar `print_number` (`seq/ano`).
- `prescription_print_payload_content`: blob imutavel deduplicado de cabecalho (patient/notes/metadata).
- `prescription_print_item_content`: blob imutavel deduplicado de item (description/route/frequency/grid).

## Garantias de anti-duplicacao

- Deduplicacao de payload por tenant: UNIQUE `(company_id, content_version, content_hash)` em `prescription_print_payload_content`.
- Deduplicacao de item por tenant: UNIQUE `(company_id, content_version, content_hash)` em `prescription_print_item_content`.
- Unicidade de item dentro do mesmo print: UNIQUE `(prescription_print_id, order_index)` em `prescription_print_item`.
- `order_index` deve ser `> 0`.

## Write Path (geracao de impressao)

1. Frontend chama `create_prescription_print_snapshot`.
2. RPC valida autenticacao, tenant (`company_id`) e permissao de impressao.
3. RPC calcula hash versionado no banco (`v1|...`) usando `jsonb_strip_nulls(...)::text`.
4. RPC tenta inserir conteudo deduplicado com `INSERT ... ON CONFLICT DO NOTHING`.
5. Se o `INSERT` nao retornar `id`, RPC busca o `id` existente por `(company_id, content_version, content_hash)`.
6. RPC cria `prescription_print` (evento) e `prescription_print_item` (itens do evento) referenciando os conteudos deduplicados.
7. RPC retorna `prescription_print_id` e `print_number`.

## Read Path (reimpressao)

1. Frontend chama `list_prescription_prints` para listar historico.
2. Frontend chama `get_prescription_print_snapshot` para obter o snapshot completo de um evento.
3. RPC retorna itens ordenados por `order_index` (com desempate por `created_at`).
4. Reimpressao usa somente snapshot persistido (nao recalcula dados atuais de prescricao).

## Integridade de exclusao e limpeza

- Exclusao de `prescription` remove `prescription_print` por cascade.
- Exclusao de `prescription_print` remove `prescription_print_item` por cascade.
- Conteudo deduplicado e removido apenas quando ficar orfao.
- Limpeza de orfaos ocorre por trigger `AFTER DELETE` e sempre valida por `company_id` (tenant-safe).
- Conteudo ainda referenciado por outro print da mesma empresa nao e removido.

## Imutabilidade (append-only)

- `prescription_print_payload_content` e `prescription_print_item_content` sao append-only para usuarios da aplicacao.
- Permissoes para `authenticated`: apenas `SELECT` e `INSERT`.
- Nao usar `UPDATE`/`DELETE` direto nessas tabelas no fluxo normal.

## O que nunca fazer

- Nao inserir direto em `prescription_print`/`prescription_print_item` pelo frontend.
- Nao atualizar ou deletar manualmente linhas das content tables para “corrigir” snapshot.
- Nao gerar hash no cliente.
- Nao cruzar conteudo entre tenants (`company_id` sempre obrigatorio).

## Consumo esperado no frontend

- Criar impressao: chamar `create_prescription_print_snapshot`.
- Listar historico: chamar `list_prescription_prints`.
- Obter snapshot para reimpressao: chamar `get_prescription_print_snapshot`.
- Nao depender de leitura direta das content tables no frontend.

## Observacoes

- Duplicacao tecnica so seria possivel se as constraints/indexes fossem removidas manualmente.
- No desenho atual, duplicacao funcional de blobs iguais no mesmo tenant foi bloqueada por chave unica + upsert por hash.
