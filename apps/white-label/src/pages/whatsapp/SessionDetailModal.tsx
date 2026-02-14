import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Badge, Loading, Select } from '@/components/ui';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWhatsappMessages, WhatsappMessage } from '@/hooks/useWhatsappMessages';
import {
  WhatsappSession,
  useUpdateWhatsappSession,
  useCreateSessionEvaluation,
  resolveSessionWindow,
} from '@/hooks/useWhatsappSessions';
import { EvaluationDefinition } from '@/hooks/useWhatsappAspects';
import toast from 'react-hot-toast';

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WhatsappSession | null;
  evaluations: EvaluationDefinition[];
  companyId: string;
}

export default function SessionDetailModal({
  isOpen,
  onClose,
  session,
  evaluations,
  companyId,
}: SessionDetailModalProps) {
  const { data: messages = [], isLoading } = useWhatsappMessages(session?.conversation_id);
  const updateSession = useUpdateWhatsappSession();
  const createEvaluation = useCreateSessionEvaluation();

  const [startMessageId, setStartMessageId] = useState<string | null>(null);
  const [endMessageId, setEndMessageId] = useState<string | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('');

  useEffect(() => {
    if (session) {
      setStartMessageId(session.start_message_id);
      setEndMessageId(session.end_message_id);
    }
  }, [session]);

  const handleSave = async () => {
    if (!session) return;

    const startMessage = messages.find((msg) => msg.id === startMessageId);
    const endMessage = messages.find((msg) => msg.id === endMessageId);

    try {
      await updateSession.mutateAsync({
        id: session.id,
        start_message_id: startMessageId,
        end_message_id: endMessageId,
        start_at: startMessage?.sent_at || null,
        end_at: endMessage?.sent_at || null,
      });
      toast.success('Corte atualizado');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar corte');
    }
  };

  const handleCreateEvaluation = async () => {
    if (!session || !selectedEvaluation) return;

    try {
      await createEvaluation.mutateAsync({
        company_id: companyId,
        session_id: session.id,
        evaluation_id: selectedEvaluation,
      });
      toast.success('Avaliacao registrada como pendente');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar avaliacao');
    }
  };

  const messageOptions = useMemo(() => {
    return messages.map((msg) => ({
      id: msg.id,
      label: `${msg.sent_at ? format(new Date(msg.sent_at), 'dd/MM HH:mm', { locale: ptBR }) : ''} ${
        msg.text_content || msg.message_type || 'Midia'
      }`,
    }));
  }, [messages]);

  const visibleMessages: WhatsappMessage[] = useMemo(() => {
    if (!session) return messages;
    return resolveSessionWindow(messages, {
      ...session,
      start_message_id: startMessageId,
      end_message_id: endMessageId,
    });
  }, [endMessageId, messages, session, startMessageId]);

  if (!session) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do atendimento" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <Badge variant={session.status === 'pending' ? 'warning' : 'success'}>
              {session.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500">Modo</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{session.created_mode}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Select
              label="Mensagem inicial"
              options={[
                { value: '', label: 'Nao definido' },
                ...messageOptions.map((option) => ({ value: option.id, label: option.label })),
              ]}
              value={startMessageId || ''}
              onChange={(value: string) => setStartMessageId(value || null)}
            />
          </div>
          <div>
            <Select
              label="Mensagem final"
              options={[
                { value: '', label: 'Nao definido' },
                ...messageOptions.map((option) => ({ value: option.id, label: option.label })),
              ]}
              value={endMessageId || ''}
              onChange={(value: string) => setEndMessageId(value || null)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSave}>
            Salvar corte
          </Button>
          <div className="flex-1">
            <Select
              options={[
                { value: '', label: 'Selecione avaliacao' },
                ...evaluations.map((evaluation) => ({
                  value: evaluation.id,
                  label: evaluation.name,
                })),
              ]}
              value={selectedEvaluation}
              onChange={(value: string) => setSelectedEvaluation(value || '')}
              placeholder="Selecione avaliacao"
            />
          </div>
          <Button onClick={handleCreateEvaluation} disabled={!selectedEvaluation}>
            Gerar avaliacao
          </Button>
        </div>

        <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loading size="lg" />
            </div>
          ) : visibleMessages.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma mensagem encontrada</p>
          ) : (
            visibleMessages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg bg-white p-3 text-sm shadow-sm dark:bg-gray-800"
              >
                <p className="text-xs text-gray-400">
                  {msg.sent_at
                    ? format(new Date(msg.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                    : ''}
                </p>
                <p className="mt-1 text-gray-700 dark:text-gray-200">
                  {msg.text_content || msg.message_type || 'Midia'}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
