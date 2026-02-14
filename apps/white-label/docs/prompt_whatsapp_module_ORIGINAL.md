Você é o Codex no VS Code trabalhando dentro do meu projeto SaaS (multi-tenant).
Objetivo: criar um módulo completo de WhatsApp integrado à Uazapi.

IMPORTANTE

- A especificação OpenAPI da Uazapi está neste arquivo: docs/uazapi-openapi-spec.yaml
- Use essa spec como fonte única de verdade para endpoints, payloads e responses.
- Mantenha 100% de consistência visual com o UI/UX existente do projeto.
- Reutilize como referência os componentes existentes da página de cadastro de usuário (tabela/listagem, paginação, filtros, modal de criar/editar, botões, toasts, estados vazios, loading skeleton).
- Tudo deve ser multi-tenant: sempre filtrar por company_id.
- Respeitar perfis e permissões: algumas telas/ações só podem ser acessadas por superadmin (sistema).

ESCOPO FUNCIONAL DO MÓDULO
Criar item no menu lateral chamado "WhatsApp" com submenus:

1. Avaliações
2. Aspectos
3. Mensagens
4. Instâncias

Definições:

- Avaliações: avaliações de períodos de conversa entre operador e cliente, separadas por “cortes de atendimento” (sessions). Esses cortes podem ser criados automaticamente ou manualmente.
- Aspectos: características/itens avaliados em cada atendimento, cadastrados pelo usuário; são usados como base para a IA (implementação da IA fica para fase futura, mas as telas e tabelas ficam prontas).
  - Relacionamento: uma Avaliação (definição de avaliação) tem muitos Aspectos (evaluation_aspect) via evaluation_id.
- Mensagens: página tipo WhatsApp Web para visualizar conversas e mensagens, com suporte a mídias (imagem, áudio, vídeo, documento) e contatos.
- Instâncias: gerenciamento das instâncias conectadas (telefones). Deve permitir listar, criar, conectar via QR Code, desconectar e excluir. Também configurar quais instâncias devem permanecer conectadas (auto-connect).

REGRAS DE PLANO / LIMITES

- Cada conta do SaaS (company) possui um limite de conexões (número máximo de instâncias ativas/conectadas).
- Esse limite deve ser configurável SOMENTE por perfis de superadmin (sistema).
- Ao criar nova instância: bloquear se exceder o limite.
- Ao conectar: bloquear se exceder o limite (caso conte como “ativa/conectada”).
- Mostrar ao usuário na tela de Instâncias: “X de Y usadas”.

PERMISSÕES (RBAC)

- Superadmin do sistema: consegue configurar o limite de instâncias por company e ver todos os tenants se necessário (apenas no painel de administração do sistema).
- Admin/Manager da company: pode gerenciar instâncias da própria company e ver mensagens/conversas da própria company.
- Viewer/roles restritas: pode apenas visualizar Mensagens (somente leitura), sem criar/excluir instâncias (aplicar conforme padrão do projeto).
- Use a estrutura de permissões do projeto (o que já existe) e siga o mesmo padrão das páginas atuais.

IMPLEMENTAÇÃO TÉCNICA (ALTO NÍVEL)

1. Criar páginas, rotas e menu:
   - /whatsapp/instances
   - /whatsapp/messages
   - /whatsapp/evaluations
   - /whatsapp/aspects

2. Criar client da Uazapi:
   - Ler baseUrl, token/chave e quaisquer headers necessários de env vars (ex: UAZAPI_BASE_URL, UAZAPI_API_KEY).
   - Implementar um wrapper com tratamento de erro padronizado (toasts, logs e retorno consistente).
   - Todos os endpoints devem ser implementados conforme docs/uazapi-openapi-spec.yaml.

3. Criar banco/tabelas para armazenar dados e permitir a UI “WhatsApp Web”:
   - Precisamos salvar: instâncias, contatos, conversas, mensagens e mídias.
   - Também precisamos de tabelas para avaliações e aspectos.

4. Sincronização:
   - Preparar estrutura para ingestão de mensagens via webhook (se existir na spec) ou polling/refresh manual.
   - Se o webhook for necessário e estiver definido na spec, criar endpoint interno no backend para receber eventos e persistir.
   - Se ambos existirem, priorizar webhook; fallback para “Sync” manual na UI.

REQUISITOS DE UI/UX (MUITO IMPORTANTE)

- Layout e componentes devem seguir o padrão do projeto (mesma tipografia, espaçamentos, headers, breadcrumb se existir).
- Tabelas: paginação, busca, filtros e ações por linha (menu kebab/ícone).
- Estados:
  - loading com skeleton
  - empty state com CTA
  - erro com retry
- Ações devem ter confirmação quando destrutivas (excluir instância, desconectar, apagar mensagem etc).
- A lista de instâncias e a página de aspectos devem reaproveitar os padrões/componentes da página de cadastro de usuário.

DETALHAMENTO DAS TELAS

A) INSTÂNCIAS (/whatsapp/instances)
Objetivo: gerenciar instâncias Uazapi.
Funcionalidades:

- Listar instâncias da company com colunas:
  - Nome/Identificador
  - Número/telefone (se aplicável)
  - Status (connected/disconnected/connecting/error)
  - Última atividade / updated_at
  - Auto-connect (boolean)
  - Ações: Conectar (QR), Desconectar, Editar, Excluir
- Botão “Nova instância” (abre modal):
  - campos mínimos exigidos pela spec para criar instância
  - validar limite do plano antes de criar
- Conectar:
  - gerar e exibir QR code (modal) conforme endpoint na spec
  - auto-refresh do status enquanto QR estiver aberto (polling suave ou websocket se existir)
- Desconectar:
  - endpoint na spec + atualizar status local
- Excluir:
  - endpoint na spec + remover localmente (soft delete no banco, se melhor)
- Configurações:
  - auto-connect por instância (toggle) -> persiste em tabela local
- Badge no topo: “Instâncias: X / Limite Y”
- Observação: se a spec exigir “instanceId”, garantir que essa chave esteja salva e indexada.

B) MENSAGENS (/whatsapp/messages)
Objetivo: visualização estilo WhatsApp Web.
Layout:

- Painel esquerdo: lista de conversas (threads)
  - busca por nome/telefone
  - filtro por instância
  - preview da última mensagem e horário
  - badge de não lidas (se houver)
- Painel direito: conversa selecionada
  - header com nome do contato, telefone, instância, status
  - lista de mensagens com scroll (carregar mais ao subir)
  - mensagens alinhadas esquerda/direita (from_me)
  - suportar render de mídia: imagem, áudio, vídeo, documento
  - mostrar timestamp, status (sent/delivered/read se houver)
  - botão “Sync” (atualizar conversa) para buscar novas mensagens via API e persistir
- NÃO precisa implementar envio de mensagens agora, a menos que a spec já preveja e seja simples — mas estruturar a UI para futura caixa de texto.
  Persistência:
- Conversas e mensagens devem ser carregadas do banco local.
- Se faltarem dados, chamar API para sync e salvar.
- Mídias: salvar metadata + url/arquivo conforme política (se a spec retornar url temporária, persistir e atualizar quando expirar se necessário).

C) AVALIAÇÕES (/whatsapp/evaluations)
Objetivo: gerenciar “cortes de atendimento” e o objeto de avaliação (estrutura pronta para IA no futuro).
Interpretar como:

- Atendimento (session) = um período de conversa entre um operador e um cliente.
- Pode ser criado:
  - automaticamente: por regra de tempo sem mensagens (ex: 30 min sem interação) OU troca de operador OU mudança de status
  - manualmente: usuário seleciona mensagens e cria corte
    Funcionalidades mínimas nesta fase:
- Lista de atendimentos (sessions) com:
  - Contato
  - Operador (se existir)
  - Instância
  - Data/hora início e fim
  - Status: pendente de avaliação / avaliado / ignorado
  - Ações: ver detalhes, ajustar corte (manual), marcar para avaliação
- Tela de detalhes do atendimento (pode ser drawer/modal ou rota /whatsapp/evaluations/:id):
  - mostrar trechos da conversa associados ao atendimento (somente leitura)
  - permitir ajustar início/fim (selecionando mensagem inicial/final)
  - botão “Gerar avaliação” (por enquanto apenas cria registro “pending” sem IA)
- Banco deve guardar:
  - sessions com intervalos e relacionamento com conversa e mensagens

D) ASPECTOS (/whatsapp/aspects)
Objetivo: cadastrar aspectos que serão avaliados pela IA em cada atendimento.
Estrutura:

- Tabela “evaluation_definition” (ou “evaluation”) = definição de conjunto de avaliação (ex: “Atendimento Comercial”, “Atendimento Suporte”)
- Tabela “evaluation_aspect” = aspectos pertencentes a uma avaliação (evaluation_id)
  UI:
- Página com lista de Avaliações (definições) e ação “Nova avaliação”
- Ao entrar/selecionar uma Avaliação, exibir lista de Aspectos dela
  Aspecto deve conter:
- name (ex: “Clareza”, “Empatia”, “Tempo de resposta”)
- description/instructions (texto que a IA usará)
- weight (opcional)
- active
- ordem
  Ações:
- CRUD completo de avaliação e aspectos (modais)
- Reaproveitar o padrão visual da página de cadastro de usuário (tabela + modal).

ESTRUTURA DE TABELAS (PROPOSTA)
Crie migrations (ou SQL/DDL no padrão do projeto) para Postgres/Supabase:

1. whatsapp_instance

- id (uuid pk)
- company_id (uuid, index)
- uazapi_instance_id (text, unique por company)
- name (text)
- phone_number (text, nullable)
- status (enum: disconnected, connecting, connected, error)
- auto_connect (boolean default false)
- active (boolean default true)
- last_seen_at (timestamptz)
- created_at, updated_at

2. whatsapp_contact

- id (uuid pk)
- company_id (uuid index)
- external_id (text) (jid/wa_id da uazapi)
- phone_number (text)
- display_name (text)
- profile_pic_url (text)
- created_at, updated_at
- unique(company_id, external_id)

3. whatsapp_conversation

- id (uuid pk)
- company_id (uuid index)
- instance_id (fk whatsapp_instance)
- contact_id (fk whatsapp_contact)
- external_id (text) (thread/chat id se existir)
- last_message_at (timestamptz)
- unread_count (int default 0)
- created_at, updated_at
- unique(company_id, instance_id, contact_id)

4. whatsapp_message

- id (uuid pk)
- company_id (uuid index)
- conversation_id (fk whatsapp_conversation index)
- instance_id (fk whatsapp_instance index)
- contact_id (fk whatsapp_contact index)
- external_id (text) (message id)
- from_me (boolean)
- message_type (text) (ex: text, image, audio, video, document, sticker, etc)
- text_content (text)
- sent_at (timestamptz index)
- status (text) (sent/delivered/read/failed se existir)
- raw_payload (jsonb) (guardar payload original para debug)
- created_at, updated_at
- unique(company_id, external_id)

5. whatsapp_media

- id (uuid pk)
- company_id (uuid index)
- message_id (fk whatsapp_message index)
- media_type (text)
- mime_type (text)
- file_name (text)
- size_bytes (bigint)
- url (text) (se for link)
- storage_path (text) (se salvar em bucket)
- checksum (text)
- created_at, updated_at

6. whatsapp_session (corte de atendimento)

- id (uuid pk)
- company_id (uuid index)
- conversation_id (fk whatsapp_conversation index)
- instance_id (fk whatsapp_instance index)
- operator_user_id (uuid nullable, se houver operador)
- start_message_id (fk whatsapp_message nullable)
- end_message_id (fk whatsapp_message nullable)
- start_at (timestamptz index)
- end_at (timestamptz index)
- status (enum: pending, evaluated, ignored)
- created_by (uuid) (manual/auto)
- created_mode (enum: automatic, manual)
- created_at, updated_at

7. evaluation (definição)

- id (uuid pk)
- company_id (uuid index)
- name (text)
- description (text)
- active (boolean default true)
- created_at, updated_at

8. evaluation_aspect

- id (uuid pk)
- company_id (uuid index)
- evaluation_id (fk evaluation index)
- name (text)
- instructions (text)
- weight (numeric nullable)
- sort_order (int default 0)
- active (boolean default true)
- created_at, updated_at
- unique(company_id, evaluation_id, name)

9. whatsapp_session_evaluation (resultado futuro / placeholder)

- id (uuid pk)
- company_id (uuid index)
- session_id (fk whatsapp_session unique)
- evaluation_id (fk evaluation)
- status (enum: pending, processing, done, error)
- result (jsonb nullable) -- futuro
- created_at, updated_at

10. company_plan_settings (se não existir)

- company_id (uuid pk)
- whatsapp_instance_limit (int default 1)
- created_at, updated_at
  Acesso a essa configuração: apenas superadmin.

Obs:

- Criar índices essenciais para performance (company_id + conversation_id + sent_at).
- Padronizar updated_at com trigger se já existir no projeto.
- Garantir RLS/policies se o projeto usa (company_id always).

INTEGRAÇÃO COM UAZAPI (BASEADA NO OPENAPI)

- Implementar serviços:
  - InstancesService: create/list/status/connect(qr)/disconnect/delete
  - MessagesService: fetch conversations, fetch messages, fetch media (se aplicável)
  - WebhookService: handler para eventos (se tiver)
- Mapear payloads do webhook para persistir em whatsapp_message e whatsapp_media.
- Sempre persistir raw_payload para facilitar debug.

PADRÕES DE CÓDIGO

- Typescript estrito: declarar tipos explicitamente.
- Componentes:
  - Pages
  - Components reutilizáveis (tables, modals, drawers)
  - Hooks (ex: useWhatsappInstances, useWhatsappConversations)
  - Services (api uazapi + api interno)
- Tratamento de erros padronizado (toast + log).
- Evitar duplicação: usar componentes base do projeto.

ENTREGÁVEIS (CHECKLIST)

1. Menu lateral atualizado com WhatsApp e submenus.
2. Rotas e páginas criadas:
   - Instâncias: CRUD + QR + conectar/desconectar + limite
   - Mensagens: UI estilo WhatsApp Web (somente leitura) + sync
   - Avaliações: listar sessions + detalhe + corte manual + marcar pending
   - Aspectos: CRUD de evaluation e evaluation_aspect
3. Migrations/DDL completas das tabelas acima (ou equivalentes) seguindo padrão do projeto.
4. Services Uazapi implementados lendo docs/uazapi-openapi-spec.yaml.
5. Persistência local funcionando:
   - ao abrir Mensagens, carregar do banco
   - botão Sync puxa da API e salva
6. Controle de permissões:
   - limite só superadmin altera
   - ações destrutivas restritas
7. UI consistente com o projeto, reutilizando padrão do cadastro de usuário.

EXECUÇÃO

- Faça alterações incrementalmente e garanta que o projeto compile sem erros.
- Se existir sistema de migrations no repo, adicionar migrations na pasta padrão e atualizar qualquer index/registry necessário.
- Se existirem componentes prontos de tabela/modal na página de usuário, reutilize-os em vez de criar novos.

Comece implementando pela base: tabelas + services + página de Instâncias. Em seguida Mensagens. Depois Aspectos. Por fim Avaliações.
