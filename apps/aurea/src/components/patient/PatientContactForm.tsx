import { useState } from 'react';
import { Button, Input, Select, Switch, Textarea } from '@/components/ui';
import type { PatientContact, PatientContactType } from '@/types/database';
import { Plus, Trash2, Phone } from 'lucide-react';
interface PatientContactFormProps {
  contacts: PatientContact[];
  onChange: (contacts: PatientContact[]) => void;
  companyId: string;
  patientId?: string;
  onSave?: (contacts: PatientContact[]) => Promise<void>;
  isSaving?: boolean;
}

const CONTACT_TYPE_OPTIONS = [
  { value: 'phone' as PatientContactType, label: 'Telefone' },
  { value: 'whatsapp' as PatientContactType, label: 'WhatsApp' },
  { value: 'email' as PatientContactType, label: 'E-mail' },
  { value: 'other' as PatientContactType, label: 'Outro' },
];

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export default function PatientContactForm({
  contacts,
  onChange,
  companyId,
  patientId,
  onSave,
  isSaving,
}: PatientContactFormProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(contacts.length > 0 ? 0 : null);

  const handleAddContact = () => {
    const newContact: Partial<PatientContact> = {
      id: `temp-${Date.now()}`,
      company_id: companyId,
      patient_id: patientId || '',
      type: 'phone',
      value: '',
      is_primary: contacts.length === 0,
      can_receive_updates: true,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onChange([...contacts, newContact as PatientContact]);
    setExpandedIndex(contacts.length);
  };

  const handleRemoveContact = (index: number) => {
    const newContacts = contacts.filter((_, i) => i !== index);
    onChange(newContacts);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const handleUpdateContact = (index: number, field: keyof PatientContact, value: any) => {
    const newContacts = [...contacts];

    // Se marcando como primário, desmarcar os outros
    if (field === 'is_primary' && value === true) {
      newContacts.forEach((contact, i) => {
        if (i !== index) {
          contact.is_primary = false;
        }
      });
    }

    newContacts[index] = {
      ...newContacts[index],
      [field]: value,
      updated_at: new Date().toISOString(),
    };
    onChange(newContacts);
  };

  const handleValueChange = (index: number, value: string, type: PatientContactType) => {
    let formattedValue = value;

    // Formatar baseado no tipo
    if (type === 'phone' || type === 'whatsapp') {
      formattedValue = formatPhone(value);
    }

    handleUpdateContact(index, 'value', formattedValue);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contatos</h3>
        <div className="flex items-center gap-2">
          {patientId && onSave && contacts.length > 0 && (
            <Button
              type="button"
              variant="solid"
              size="sm"
              onClick={() => onSave(contacts)}
              disabled={Boolean(isSaving)}
              showIcon={false}
              label={isSaving ? 'Salvando...' : 'Salvar Contatos'}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddContact}
            icon={<Plus className="h-4 w-4" />}
            showIcon
            label="Adicionar Contato"
          />
        </div>
      </div>

      {contacts.length === 0 && (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          Nenhum contato cadastrado
        </div>
      )}

      {contacts.map((contact, index) => (
        <div
          key={contact.id}
          className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div
            className="dark:hover:bg-gray-750 flex cursor-pointer items-center justify-between bg-gray-50 p-4 hover:bg-gray-100 dark:bg-gray-800"
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex flex-1 items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div className="grid flex-1 grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {CONTACT_TYPE_OPTIONS.find((opt) => opt.value === contact.type)?.label ||
                        contact.type}
                    </span>
                    {contact.is_primary && (
                      <span className="border-primary-500/30 bg-primary-500/10 text-primary-700 dark:bg-primary-400/20 dark:text-primary-300 rounded border px-2 py-0.5 text-xs font-semibold">
                        Principal
                      </span>
                    )}
                  </div>
                  {!contact.active && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Inativo
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {contact.name
                      ? `${contact.name}${contact.relationship ? ` (${contact.relationship})` : ''}`
                      : 'Sem nome'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {contact.value || 'Sem telefone'}
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveContact(index);
              }}
              icon={<Trash2 className="h-4 w-4" />}
              label=""
              aria-label="Remover contato"
              title="Remover contato"
              className="w-8 justify-center px-2 pr-2"
            />
          </div>

          {expandedIndex === index && (
            <div className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-700">
              <div className="grid grid-cols-4 gap-4">
                <Select
                  label="Tipo"
                  options={CONTACT_TYPE_OPTIONS}
                  value={contact.type}
                  onChange={(e: any) =>
                    handleUpdateContact(
                      index,
                      'type',
                      typeof e === 'string' ? e : e.target?.value || e
                    )
                  }
                />
                <Input
                  label={contact.type === 'email' ? 'E-mail' : 'NÃºmero/Contato'}
                  placeholder={contact.type === 'email' ? 'email@exemplo.com' : '(00) 00000-0000'}
                  type={contact.type === 'email' ? 'email' : 'text'}
                  value={contact.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleValueChange(index, e.target.value, contact.type)
                  }
                  required
                />
                <Input
                  label="Nome do Contato"
                  placeholder="Ex: Maria Silva"
                  value={contact.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateContact(index, 'name', e.target.value)
                  }
                />
                <Input
                  label="Relacionamento"
                  placeholder="Ex: Filha, Cuidador, etc."
                  value={contact.relationship || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateContact(index, 'relationship', e.target.value)
                  }
                />
              </div>

              <Textarea
                label="ObservaçÃµes"
                placeholder="InformaçÃµes adicionais sobre este contato"
                value={contact.notes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleUpdateContact(index, 'notes', e.target.value)
                }
                rows={2}
              />

              <div className="flex gap-4 pt-2">
                <Switch
                  label="Contato Principal"
                  checked={contact.is_primary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateContact(index, 'is_primary', e.target.checked)
                  }
                />
                <Switch
                  label="Pode Receber AtualizaçÃµes"
                  checked={contact.can_receive_updates}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateContact(index, 'can_receive_updates', e.target.checked)
                  }
                />
                <Switch
                  label="Ativo"
                  checked={contact.active}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateContact(index, 'active', e.target.checked)
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
