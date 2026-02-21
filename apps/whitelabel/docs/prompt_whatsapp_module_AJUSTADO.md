## Diferença entre o Prompt e as Migrations

O prompt original do módulo WhatsApp previa a utilização de **um único identificador genérico (`external_id`)** para representar o contato do WhatsApp, assumindo que esse campo seria suficiente para correlacionar mensagens, conversas e sessões de atendimento.

Durante a implementação das migrations e a análise do comportamento real da Uazapi, foi identificado que o WhatsApp trabalha com **dois identificadores distintos para um mesmo contato**, que podem aparecer de forma alternada nos payloads da API e nos eventos de webhook.

---

### Identificadores Utilizados na Implementação

- **external_jid**
  - Identificador principal do WhatsApp (`@s.whatsapp.net`)
  - Definido como identificador primário do contato

- **external_lid**
  - Identificador alternativo (`@lid`)
  - Pode aparecer como `remoteJidAlt` em mensagens e eventos

---

## Ajuste Realizado na Modelagem

- O campo único `external_id` solicitado no prompt foi substituído por dois campos distintos:
  - `external_jid`
  - `external_lid`
- Ambos os campos são persistidos na tabela `whatsapp_contact`
- Cada campo possui restrição de unicidade por `company_id`
- Um contato pode existir:
  - Apenas com `external_jid`
  - Com `external_jid` e `external_lid`

---

## Regras de Resolução de Contato

Ao processar mensagens, conversas ou eventos da Uazapi:

1. Localizar o contato pelo `external_jid`
2. Caso não encontrado, tentar localizar pelo `external_lid`
3. Se localizado pelo `external_lid`, associar ao contato existente
4. Nunca criar contatos duplicados por divergência entre JID e LID

---

## Integração com a Uazapi

Mapeamento padrão aplicado nos payloads:

- `remoteJid` → `external_jid`
- `remoteJidAlt` → `external_lid`

Sempre que ambos os identificadores estiverem presentes:

- Persistir os dois campos
- Garantir que mensagens, conversas e sessões apontem para **um único registro de contato**

---

## Impacto no Escopo

- Não houve alteração de escopo funcional
- Telas, fluxos e regras de negócio permanecem conforme o prompt original
- O ajuste é exclusivamente técnico, refletindo a realidade da Uazapi
- O prompt foi atualizado apenas para documentar essa decisão de implementação

---

## Objetivo

Essa abordagem garante:

- Compatibilidade total com a Uazapi
- Eliminação de contatos duplicados
- Consistência entre mensagens, conversas, sessões e avaliações
- Base sólida para evoluções futuras (CRM, IA, histórico unificado)

**XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX**

# PROMPT COM OS AJUSTES CASO PRECISE SER UTILIZADO NOVAMENTE

**XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX**

# Módulo WhatsApp – Prompt de Implementação (Uazapi)

Você é um programador senior trabalhando dentro do meu projeto SaaS (multi-tenant).  
Objetivo: criar um módulo completo de WhatsApp integrado à Uazapi.

---

## IMPORTANTE

- A especificação OpenAPI da Uazapi está neste arquivo: `docs/uazapi-openapi-spec.yaml`
- Use essa spec como **fonte única de verdade** para endpoints, payloads e responses.
- Mantenha **100% de consistência visual** com o UI/UX existente do projeto.
- Reutilize como referência os componentes existentes da página de cadastro de usuário (tabela/listagem, paginação, filtros, modal de criar/editar, botões, toasts, estados vazios, loading skeleton).
- Tudo deve ser **multi-tenant**: sempre filtrar por `company_id`.
- Respeitar perfis e permissões: algumas telas/ações só podem ser acessadas por **superadmin (sistema)**.

---

## ESCOPO FUNCIONAL DO MÓDULO

Criar item no menu lateral chamado **“WhatsApp”** com submenus:

1. Avaliações
2. Aspectos
3. Mensagens
4. Instâncias

---

## DEFINIÇÕES

### Avaliações

Avaliações de períodos de conversa entre operador e cliente, separadas por **cortes de atendimento (sessions)**.  
Esses cortes podem ser criados automaticamente ou manualmente.

### Aspectos

Características/itens avaliados em cada atendimento, cadastrados pelo usuário; são usados como base para a IA (implementação da IA fica para fase futura).

- Relacionamento:
  - Uma Avaliação (definição) possui muitos Aspectos (`evaluation_aspect`) via `evaluation_id`.

### Mensagens

Página estilo **WhatsApp Web** para visualizar conversas e mensagens, com suporte a mídias (imagem, áudio, vídeo, documento) e contatos.

### Instâncias

Gerenciamento das instâncias conectadas (telefones).

Funcionalidades:

- Listar
- Criar
- Conectar via QR Code
- Desconectar
- Excluir
- Configurar auto-connect

---

## IDENTIFICADORES DE CONTATO (IMPORTANTE)

O WhatsApp/Uazapi trabalha com dois tipos de identificadores:

- `external_jid`: identificador principal do WhatsApp  
  Ex: `558432722762@s.whatsapp.net`

- `external_lid`: identificador alternativo  
  Ex: `212141789434039@lid`

Regras:

- Ambos devem ser persistidos quando disponíveis.
- `external_jid` é o identificador primário.
- `external_lid` é opcional.
- A resolução de contato deve considerar:
  1. `external_jid`
  2. fallback para `external_lid`
- Evitar duplicidade de contatos.

---

## REGRAS DE PLANO / LIMITES

- Cada `company` possui um limite de instâncias ativas/conectadas.
- Esse limite é configurável **somente por superadmin (sistema)**.
- Ao criar nova instância:
  - bloquear se exceder o limite.
- Ao conectar:
  - bloquear se exceder o limite.
- Mostrar na tela de Instâncias:
  - **“X de Y usadas”**

---

## PERMISSÕES (RBAC)

- **Superadmin (sistema)**:
  - Configura limite de instâncias por company.
  - Pode visualizar todos os tenants (somente painel do sistema).
- **Admin / Manager (company)**:
  - Gerenciar instâncias da própria company.
  - Visualizar mensagens/conversas da própria company.
- **Viewer / roles restritas**:
  - Apenas visualizar Mensagens (somente leitura).
- Usar a estrutura de permissões já existente no projeto.

---

## IMPLEMENTAÇÃO TÉCNICA (ALTO NÍVEL)

### 1) Rotas e páginas

- `/whatsapp/instances`
- `/whatsapp/messages`
- `/whatsapp/evaluations`
- `/whatsapp/aspects`

### 2) Client Uazapi

- Ler `baseUrl`, token/chave e headers via env vars:
  - `UAZAPI_BASE_URL`
  - `UAZAPI_API_KEY`
- Criar wrapper com tratamento de erro padronizado (toast + log).
- Implementar endpoints **exatamente conforme** `docs/uazapi-openapi-spec.yaml`.

### 3) Persistência

Salvar localmente:

- Instâncias
- Contatos
- Conversas
- Mensagens
- Mídias
- Avaliações e Aspectos

### 4) Sincronização

- Preparar ingestão via webhook (se existir na spec).
- Criar endpoint interno para receber eventos.
- Priorizar webhook; fallback para Sync manual na UI.

---

## REQUISITOS DE UI/UX (OBRIGATÓRIO)

- Seguir o padrão visual do projeto.
- Tabelas:
  - Paginação
  - Busca
  - Filtros
  - Ações por linha (menu kebab/ícone)
- Estados:
  - loading (skeleton)
  - empty state com CTA
  - erro com retry
- Ações destrutivas exigem confirmação.
- Reutilizar padrões da página de cadastro de usuário.

---

## TELAS

### A) INSTÂNCIAS (`/whatsapp/instances`)

- Listar instâncias com:
  - Nome
  - Telefone
  - Status (disconnected, connecting, connected, error)
  - Última atividade
  - Auto-connect
  - Ações: Conectar (QR), Desconectar, Editar, Excluir
- Criar nova instância via modal.
- Validar limite antes de criar ou conectar.
- Exibir QR Code conforme spec.
- Auto-refresh de status enquanto QR estiver aberto.
- Badge: **Instâncias: X / Limite Y**
- Persistir e indexar `uazapi_instance_id`.

---

### B) MENSAGENS (`/whatsapp/messages`)

Layout estilo WhatsApp Web:

**Painel esquerdo**

- Lista de conversas
- Busca por nome/telefone
- Filtro por instância
- Preview da última mensagem
- Badge de não lidas

**Painel direito**

- Header com contato, telefone, instância e status
- Lista de mensagens:
  - alinhamento esquerda/direita (`from_me`)
  - render de mídia
  - timestamp e status
- Botão **Sync**

Regras:

- Carregar sempre do banco local.
- Se faltar dados, sincronizar via API.
- Persistir `raw_payload` de mensagens.

---

### C) AVALIAÇÕES (`/whatsapp/evaluations`)

- Atendimento = session de conversa.
- Criação:
  - Automática (tempo sem interação, troca de operador, status)
  - Manual (seleção de mensagens)
- Lista com:
  - Contato
  - Operador
  - Instância
  - Início / Fim
  - Status
- Detalhe:
  - Visualizar mensagens do corte
  - Ajustar início/fim
  - Criar avaliação (status pending)

---

### D) ASPECTOS (`/whatsapp/aspects`)

- Avaliação = definição (ex: Atendimento Comercial)
- Aspectos pertencem à avaliação

Aspecto:

- name
- instructions
- weight (opcional)
- active
- ordem

Funcionalidades:

- CRUD completo de avaliações e aspectos
- UI baseada na página de cadastro de usuário

---

## ESTRUTURA DE TABELAS (RESUMO)

### whatsapp_contact

- external_jid (text)
- external_lid (text)
- unique(company_id, external_jid)
- unique(company_id, external_lid)

Demais tabelas:

- whatsapp_instance
- whatsapp_conversation
- whatsapp_message
- whatsapp_media
- whatsapp_session
- evaluation
- evaluation_aspect
- whatsapp_session_evaluation
- company_plan_settings

---

## INTEGRAÇÃO COM UAZAPI

Serviços:

- `InstancesService`
- `MessagesService`
- `WebhookService`

Regras:

- Mapear:
  - `remoteJid` → `external_jid`
  - `remoteJidAlt` → `external_lid`
- Sempre persistir `raw_payload`.

---

## PADRÕES DE CÓDIGO

- TypeScript estrito.
- Separação:
  - Pages
  - Components
  - Hooks
  - Services
- Tratamento de erro padronizado.
- Evitar duplicação de componentes.

---

## ENTREGÁVEIS

1. Menu WhatsApp completo.
2. Páginas:
   - Instâncias
   - Mensagens
   - Avaliações
   - Aspectos
3. Migrations completas.
4. Services Uazapi.
5. Persistência local funcionando.
6. Controle de permissões.
7. UI consistente com o projeto.

---

## ORDEM DE EXECUÇÃO

1. Base (tabelas + services)
2. Instâncias
3. Mensagens
4. Aspectos
5. Avaliações
