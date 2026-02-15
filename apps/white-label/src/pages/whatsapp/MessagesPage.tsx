import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Image, MessageSquare, RefreshCw, Search, Send } from 'lucide-react';
import { Button, Card, EmptyState, Loading, Skeleton, Badge, Select } from '@synia/ui';
import { useAuthStore } from '@/stores/authStore';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import {
  useWhatsappConversations,
  useWhatsappMessages,
  useSyncWhatsappConversations,
  useSyncWhatsappMessages,
  useDownloadWhatsappMedia,
  useSendWhatsappMessage,
  WhatsappConversation,
  WhatsappMessage,
} from '@/hooks/useWhatsappMessages';
import { useWhatsappPermissions } from '@/hooks/useWhatsappPermissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const MESSAGE_PAGE_SIZE = 50;

function resolveConversationTitle(conversation: WhatsappConversation) {
  return (
    conversation.contact?.display_name ||
    conversation.contact?.phone_number ||
    conversation.external_id ||
    'Conversa'
  );
}

function resolveConversationSubtitle(conversation: WhatsappConversation) {
  return conversation.contact?.phone_number || conversation.external_id || 'Sem numero';
}

function resolveMessageMediaUrl(message: WhatsappMessage) {
  if (message.media && message.media.length > 0) {
    return message.media[0]?.url || null;
  }

  const payload = message.raw_payload as Record<string, unknown> | null;
  const fileURL = payload && typeof payload === 'object' ? (payload as any).fileURL : null;
  return typeof fileURL === 'string' ? fileURL : null;
}

function isImageMessage(type?: string | null) {
  return ['image', 'photo', 'sticker'].includes(type || '');
}

function isAudioMessage(type?: string | null) {
  return ['audio', 'ptt', 'voice'].includes(type || '');
}

function isVideoMessage(type?: string | null) {
  return ['video'].includes(type || '');
}

function isDocumentMessage(type?: string | null) {
  return ['document', 'file'].includes(type || '');
}

export default function MessagesPage() {
  const { company } = useAuthStore();
  const { canViewMessages, canManageMessages } = useWhatsappPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [selectedConversation, setSelectedConversation] = useState<WhatsappConversation | null>(
    null
  );
  const [draftMessage, setDraftMessage] = useState('');
  const [messageOffset, setMessageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  const { data: instances = [], isLoading: isLoadingInstances } = useWhatsappInstances(company?.id);
  const { data: conversations = [], isLoading: isLoadingConversations } = useWhatsappConversations(
    company?.id,
    selectedInstanceId || undefined
  );

  const { data: messages = [], isLoading: isLoadingMessages } = useWhatsappMessages(
    selectedConversation?.id
  );

  const syncConversations = useSyncWhatsappConversations();
  const syncMessages = useSyncWhatsappMessages();
  const sendMessage = useSendWhatsappMessage();
  const _downloadMedia = useDownloadWhatsappMedia();

  const selectedInstance = useMemo(() => {
    if (!selectedInstanceId) return null;
    return instances.find((instance) => instance.id === selectedInstanceId) || null;
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    setSelectedConversation(null);
    setMessageOffset(0);
    setHasMoreMessages(false);
  }, [selectedInstanceId]);

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversation]);

  useEffect(() => {
    if (!selectedConversation) return;
    setMessageOffset(0);
    setHasMoreMessages(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);

  // Sincronizar mensagens quando não houver mensagens locais
  // Separado do efeito acima para evitar loops
  useEffect(() => {
    if (!selectedConversation || !selectedInstance || !canManageMessages) return;
    if (messages.length > 0) return;
    if (syncMessages.isPending) return;

    syncMessages
      .mutateAsync({
        instance: selectedInstance,
        conversation: selectedConversation,
        limit: MESSAGE_PAGE_SIZE,
        offset: 0,
      })
      .then((result) => {
        setHasMoreMessages(!!result.hasMore);
        setMessageOffset(result.nextOffset || 0);
      })
      .catch((error: any) => {
        toast.error(error.message || 'Erro ao sincronizar mensagens');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id, selectedInstance?.id, canManageMessages, messages.length]);

  // Sincronizar conversas quando não houver conversas locais
  useEffect(() => {
    if (!canManageMessages || !selectedInstance) return;
    if (conversations.length > 0) return;
    if (syncConversations.isPending) return;

    syncConversations
      .mutateAsync({ instance: selectedInstance, limit: 50, offset: 0 })
      .catch((error: any) => {
        toast.error(error.message || 'Erro ao sincronizar conversas');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageMessages, conversations.length, selectedInstance?.id]);

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const query = searchTerm.toLowerCase();
    return conversations.filter((conversation) => {
      const title = resolveConversationTitle(conversation).toLowerCase();
      const subtitle = resolveConversationSubtitle(conversation).toLowerCase();
      return title.includes(query) || subtitle.includes(query);
    });
  }, [conversations, searchTerm]);

  const handleSyncConversations = async () => {
    if (!selectedInstance) {
      toast.error('Selecione uma instância');
      return;
    }

    try {
      await syncConversations.mutateAsync({ instance: selectedInstance, limit: 50, offset: 0 });
      toast.success('Conversas sincronizadas');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar conversas');
    }
  };

  const handleSyncMessages = async () => {
    if (!selectedInstance || !selectedConversation) return;

    try {
      const result = await syncMessages.mutateAsync({
        instance: selectedInstance,
        conversation: selectedConversation,
        limit: MESSAGE_PAGE_SIZE,
        offset: messageOffset,
      });

      setHasMoreMessages(!!result.hasMore);
      setMessageOffset(result.nextOffset || 0);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar mensagens');
    }
  };

  const handleLoadMore = async () => {
    if (!hasMoreMessages || syncMessages.isPending) return;
    await handleSyncMessages();
  };

  const handleScroll = () => {
    const container = messageListRef.current;
    if (!container || syncMessages.isPending) return;

    if (container.scrollTop <= 0 && hasMoreMessages) {
      handleLoadMore();
    }
  };

  const handleSendMessage = async () => {
    if (!canManageMessages || !selectedInstance || !selectedConversation || !draftMessage.trim())
      return;

    try {
      await sendMessage.mutateAsync({
        instance: selectedInstance,
        conversation: selectedConversation,
        text: draftMessage,
      });
      setDraftMessage('');
      toast.success('Mensagem enviada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar mensagem');
    }
  };

  const renderMessageBubble = (message: WhatsappMessage) => {
    const isFromMe = message.from_me;
    const alignClass = isFromMe ? 'items-end text-right' : 'items-start text-left';
    const bubbleClass = isFromMe
      ? 'bg-primary-600/80 text-white'
      : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-white';

    const mediaUrl = resolveMessageMediaUrl(message);
    const type = message.message_type || 'text';

    return (
      <div key={message.id} className={`flex flex-col gap-2 ${alignClass}`}>
        <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${bubbleClass}`}>
          {mediaUrl && isImageMessage(type) && (
            <img src={mediaUrl} alt="media" className="mb-2 max-h-60 rounded-lg object-contain" />
          )}
          {mediaUrl && isVideoMessage(type) && (
            <video controls className="mb-2 max-h-60 w-full rounded-lg">
              <source src={mediaUrl} />
            </video>
          )}
          {mediaUrl && isAudioMessage(type) && (
            <audio controls className="mb-2 w-full">
              <source src={mediaUrl} />
            </audio>
          )}
          {mediaUrl && isDocumentMessage(type) && (
            <a
              href={mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary-200 mb-2 flex items-center gap-2 text-sm hover:underline"
            >
              <FileText className="h-4 w-4" />
              Baixar documento
            </a>
          )}

          {!mediaUrl && isImageMessage(type) && canManageMessages && (
            <button
              className="text-primary-200 mb-2 flex items-center gap-2 text-xs"
              onClick={() => toast('Funcionalidade em desenvolvimento', { icon: '🚧' })}
            >
              <Image className="h-4 w-4" />
              Baixar midia
            </button>
          )}

          {message.text_content && (
            <p className="whitespace-pre-wrap text-sm">{message.text_content}</p>
          )}
          <div className="mt-2 text-[11px] text-gray-400">
            {message.sent_at ? format(new Date(message.sent_at), 'HH:mm', { locale: ptBR }) : ''}
          </div>
        </div>
      </div>
    );
  };

  if (!canViewMessages) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-12 w-12 text-gray-400" />}
        title="Acesso restrito"
        description="Seu perfil nao possui permissao para visualizar mensagens"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Mensagens
          </h1>
          <p className="text-sm text-gray-500">Acompanhe conversas em tempo real</p>
        </div>
        {canManageMessages && (
          <Button onClick={handleSyncConversations} disabled={!selectedInstance}>
            <RefreshCw className="h-5 w-5" />
            Sync conversas
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-[calc(100vh-14rem)] overflow-hidden">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Search className="h-4 w-4" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversa"
                className="w-full bg-transparent outline-none"
              />
            </div>
            <div className="mt-3">
              <Select
                options={[
                  { value: '', label: 'Todas as instâncias' },
                  ...instances.map((instance) => ({ value: instance.id, label: instance.name })),
                ]}
                value={selectedInstanceId}
                onChange={(value: string) => setSelectedInstanceId(value || '')}
                placeholder="Todas as instâncias"
              />
            </div>
          </div>

          <div className="h-full overflow-y-auto">
            {isLoadingConversations || isLoadingInstances ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-10 w-10 text-gray-400" />}
                title="Sem conversas"
                description="Sincronize as conversas para comecar"
                action={
                  canManageMessages ? (
                    <Button size="sm" onClick={handleSyncConversations}>
                      <RefreshCw className="h-4 w-4" />
                      Sync
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConversations.map((conversation) => {
                  const isActive = selectedConversation?.id === conversation.id;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {resolveConversationTitle(conversation)}
                        </span>
                        {conversation.unread_count > 0 && (
                          <Badge variant="warning">{conversation.unread_count}</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs text-gray-500">
                          {conversation.last_message_preview || 'Sem mensagens'}
                        </span>
                        <span className="ml-2 text-[10px] text-gray-400">
                          {conversation.last_message_at
                            ? format(new Date(conversation.last_message_at), 'HH:mm', {
                                locale: ptBR,
                              })
                            : ''}
                        </span>
                      </div>
                      <span className="truncate text-[11px] text-gray-400">
                        {resolveConversationSubtitle(conversation)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="flex h-[calc(100vh-14rem)] flex-col overflow-hidden">
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={<MessageSquare className="h-12 w-12 text-gray-400" />}
                title="Selecione uma conversa"
                description="Escolha uma conversa para visualizar as mensagens"
              />
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {resolveConversationTitle(selectedConversation)}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {resolveConversationSubtitle(selectedConversation)}
                      {selectedInstance && ` • ${selectedInstance.name}`}
                    </p>
                  </div>
                  {canManageMessages && (
                    <Button variant="secondary" size="sm" onClick={handleSyncMessages}>
                      <RefreshCw className="h-4 w-4" />
                      Sync
                    </Button>
                  )}
                </div>
              </div>

              <div
                ref={messageListRef}
                onScroll={handleScroll}
                className="flex-1 space-y-4 overflow-y-auto bg-gray-50 px-4 py-6 dark:bg-gray-900"
              >
                {isLoadingMessages ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loading size="lg" />
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare className="h-10 w-10 text-gray-400" />}
                    title="Nenhuma mensagem"
                    description="Sincronize para carregar mensagens"
                    action={
                      canManageMessages ? (
                        <Button size="sm" onClick={handleSyncMessages}>
                          <RefreshCw className="h-4 w-4" />
                          Sync
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {hasMoreMessages && (
                      <div className="flex justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleLoadMore}
                          disabled={syncMessages.isPending}
                        >
                          {syncMessages.isPending ? 'Carregando...' : 'Carregar mais'}
                        </Button>
                      </div>
                    )}
                    {messages.map(renderMessageBubble)}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                  <Send className="h-4 w-4 text-gray-400" />
                  <input
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      canManageMessages ? 'Digite uma mensagem...' : 'Sem permissao para enviar'
                    }
                    disabled={!canManageMessages || sendMessage.isPending}
                    className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-gray-200"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!canManageMessages || !draftMessage.trim() || sendMessage.isPending}
                  >
                    {sendMessage.isPending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
