import { useState } from 'react';
import { ButtonNew, Input, Switch, Textarea, DatePicker, SearchableSelect } from '@/components/ui';
import type { PatientPayer, Client } from '@/types/database';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { formatDateOnly } from '@/lib/dateOnly';
interface PatientPayerFormProps {
  payers: PatientPayer[];
  onChange: (payers: PatientPayer[]) => void;
  companyId: string;
  patientId?: string;
  clients: Client[];
  onSave?: (payers: PatientPayer[]) => Promise<void>;
  isSaving?: boolean;
}

export default function PatientPayerForm({
  payers,
  onChange,
  companyId,
  patientId,
  clients,
  onSave,
  isSaving,
}: PatientPayerFormProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(payers.length > 0 ? 0 : null);

  const handleAddPayer = () => {
    const newPayer: Partial<PatientPayer> = {
      id: `temp-${Date.now()}`,
      company_id: companyId,
      patient_id: patientId || '',
      client_id: '',
      is_primary: payers.length === 0,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onChange([...payers, newPayer as PatientPayer]);
    setExpandedIndex(payers.length);
  };

  const handleRemovePayer = (index: number) => {
    const newPayers = payers.filter((_, i) => i !== index);
    onChange(newPayers);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const handleUpdatePayer = (index: number, field: keyof PatientPayer, value: any) => {
    const newPayers = [...payers];

    // Se marcando como primário, desmarcar os outros
    if (field === 'is_primary' && value === true) {
      newPayers.forEach((payer, i) => {
        if (i !== index) {
          payer.is_primary = false;
        }
      });
    }

    newPayers[index] = {
      ...newPayers[index],
      [field]: value,
      updated_at: new Date().toISOString(),
    };
    onChange(newPayers);
  };

  const handleCoverageChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      handleUpdatePayer(index, 'coverage_percent', numValue);
    } else if (value === '' || value === null) {
      handleUpdatePayer(index, 'coverage_percent', null);
    }
  };

  const getClientName = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Cliente não encontrado';
  };

  const getClientType = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    if (!client?.type) return 'Não definido';

    const typeLabels: Record<string, string> = {
      pessoa_fisica: 'Pessoa Física',
      pessoa_juridica: 'Pessoa Jurídica',
      empresa: 'Empresa',
      operadora: 'Operadora',
      plano_saude: 'Plano de Saúde',
      seguradora: 'Seguradora',
      insurer: 'Operadora',
      pf: 'Pessoa Física',
      pj: 'Pessoa Jurídica',
      individual: 'Pessoa Física',
      corporate: 'Empresa',
      insurance: 'Operadora',
      health_plan: 'Plano de Saúde',
      government: 'Órgão Público',
    };

    return typeLabels[client.type.toLowerCase()] || client.type;
  };

  const clientOptions = [
    { value: '', label: 'Selecione um cliente...' },
    ...clients.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Fontes Pagadoras</h3>
        <div className="flex items-center gap-2">
          {patientId && onSave && payers.length > 0 && (
            <ButtonNew
              type="button"
              variant="solid"
              size="sm"
              onClick={() => onSave(payers)}
              disabled={Boolean(isSaving)}
              showIcon={false}
              label={isSaving ? 'Salvando...' : 'Salvar Fontes Pagadoras'}
            />
          )}
          <ButtonNew
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddPayer}
            icon={<Plus className="h-4 w-4" />}
            showIcon
            label="Adicionar Fonte Pagadora"
          />
        </div>
      </div>

      {payers.length === 0 && (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          Nenhuma fonte pagadora cadastrada
        </div>
      )}

      {payers.map((payer, index) => (
        <div
          key={payer.id}
          className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div
            className="dark:hover:bg-gray-750 flex cursor-pointer items-center justify-between bg-gray-50 p-4 hover:bg-gray-100 dark:bg-gray-800"
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex flex-1 items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div className="grid flex-1 grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {payer.client_id ? getClientName(payer.client_id) : 'Cliente não selecionado'}
                    </span>
                    {payer.is_primary && (
                      <span className="border-primary-500/30 bg-primary-500/10 text-primary-700 dark:bg-primary-400/20 dark:text-primary-300 rounded border px-2 py-0.5 text-xs font-semibold">
                        Principal
                      </span>
                    )}
                  </div>
                  {!payer.active && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Inativo
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {payer.client_id ? getClientType(payer.client_id) : 'Tipo não definido'}
                  </p>
                </div>
                <div>
                  <div className="flex gap-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Cobertura:</span>
                    <span className="w-10 text-right text-sm text-gray-600 dark:text-gray-300">
                      {payer.coverage_percent !== null ? `${payer.coverage_percent}%` : '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {payer.start_date
                      ? `Início: ${formatDateOnly(payer.start_date)}`
                      : 'Sem data de início'}
                  </p>
                </div>
              </div>
            </div>
            <ButtonNew
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePayer(index);
              }}
              icon={<Trash2 className="h-4 w-4" />}
              label=""
              aria-label="Remover fonte pagadora"
              title="Remover fonte pagadora"
              className="w-8 justify-center px-2 pr-2"
            />
          </div>

          {expandedIndex === index && (
            <div className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-700">
              <div className="grid grid-cols-4 gap-4">
                <SearchableSelect
                  label="Cliente Pagador"
                  options={clientOptions}
                  placeholder="Selecione um cliente..."
                  searchPlaceholder="Buscar cliente..."
                  value={payer.client_id}
                  onChange={(e: any) =>
                    handleUpdatePayer(
                      index,
                      'client_id',
                      typeof e === 'string' ? e : e.target?.value || e
                    )
                  }
                  required
                />
                <Input
                  label="Cobertura (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  value={payer.coverage_percent?.toString() || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleCoverageChange(index, e.target.value)
                  }
                />
                <DatePicker
                  label="Data de Início"
                  value={payer.start_date || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdatePayer(index, 'start_date', e.target.value)
                  }
                />
                <DatePicker
                  label="Data de Fim"
                  value={payer.end_date || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdatePayer(index, 'end_date', e.target.value)
                  }
                />
              </div>

              <Textarea
                label="Observações"
                placeholder="Informações adicionais sobre esta fonte pagadora"
                value={payer.notes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleUpdatePayer(index, 'notes', e.target.value)
                }
                rows={2}
              />

              <div className="flex gap-4 pt-2">
                <Switch
                  label="Fonte Principal"
                  checked={payer.is_primary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdatePayer(index, 'is_primary', e.target.checked)
                  }
                />
                <Switch
                  label="Ativo"
                  checked={payer.active}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdatePayer(index, 'active', e.target.checked)
                  }
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
