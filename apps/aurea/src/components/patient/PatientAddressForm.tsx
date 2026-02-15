import { useState } from 'react';
import { ButtonNew, Input, Select, Switch } from '@/components/ui';
import type { PatientAddress, PatientAddressType } from '@/types/database';
import AddressMapModal from './AddressMapModal';
import { Plus, Trash2, Home, MapPin } from 'lucide-react';
interface PatientAddressFormProps {
  addresses: PatientAddress[];
  onChange: (addresses: PatientAddress[]) => void;
  companyId: string;
  patientId?: string;
  onSave?: (addresses: PatientAddress[]) => Promise<void>;
  isSaving?: boolean;
}

const ADDRESS_TYPE_OPTIONS = [
  { value: 'home' as PatientAddressType, label: 'Residencial' },
  { value: 'billing' as PatientAddressType, label: 'Cobrança' },
  { value: 'service' as PatientAddressType, label: 'Atendimento' },
  { value: 'other' as PatientAddressType, label: 'Outro' },
];

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'AC' },
  { value: 'AL', label: 'AL' },
  { value: 'AP', label: 'AP' },
  { value: 'AM', label: 'AM' },
  { value: 'BA', label: 'BA' },
  { value: 'CE', label: 'CE' },
  { value: 'DF', label: 'DF' },
  { value: 'ES', label: 'ES' },
  { value: 'GO', label: 'GO' },
  { value: 'MA', label: 'MA' },
  { value: 'MT', label: 'MT' },
  { value: 'MS', label: 'MS' },
  { value: 'MG', label: 'MG' },
  { value: 'PA', label: 'PA' },
  { value: 'PB', label: 'PB' },
  { value: 'PR', label: 'PR' },
  { value: 'PE', label: 'PE' },
  { value: 'PI', label: 'PI' },
  { value: 'RJ', label: 'RJ' },
  { value: 'RN', label: 'RN' },
  { value: 'RS', label: 'RS' },
  { value: 'RO', label: 'RO' },
  { value: 'RR', label: 'RR' },
  { value: 'SC', label: 'SC' },
  { value: 'SP', label: 'SP' },
  { value: 'SE', label: 'SE' },
  { value: 'TO', label: 'TO' },
];

const formatCEP = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

const fetchCEP = async (cep: string): Promise<ViaCEPResponse | null> => {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.erro) return null;

    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

export default function PatientAddressForm({
  addresses,
  onChange,
  companyId,
  patientId,
  onSave,
  isSaving,
}: PatientAddressFormProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    addresses.length > 0 ? 0 : null
  );
  const [loadingCEP, setLoadingCEP] = useState<number | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapModalAddressIndex, setMapModalAddressIndex] = useState<number | null>(null);
  const [manuallyEditedCoordinates, setManuallyEditedCoordinates] = useState<Set<string>>(
    new Set()
  );

  const handleAddAddress = () => {
    const newAddress: Partial<PatientAddress> = {
      id: `temp-${Date.now()}`,
      company_id: companyId,
      patient_id: patientId || '',
      type: 'home',
      is_primary: addresses.length === 0,
      use_for_service: false,
      active: true,
      country: 'BR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onChange([...addresses, newAddress as PatientAddress]);
    setExpandedIndex(addresses.length);
  };

  const handleRemoveAddress = (index: number) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    onChange(newAddresses);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const handleUpdateAddress = (index: number, field: keyof PatientAddress, value: any) => {
    const newAddresses = [...addresses];

    // Se editando latitude ou longitude manualmente, marcar como editado
    if (field === 'latitude' || field === 'longitude') {
      setManuallyEditedCoordinates((prev) => new Set(prev).add(`${index}`));

      // Arredondar para 6 dígitos decimais se for número
      if (typeof value === 'number') {
        value = Math.round(value * 1000000) / 1000000;
      }
    }

    console.warn('Valores específicos antes da atualização:');
    console.warn('  latitude:', newAddresses[index].latitude);
    console.warn('  longitude:', newAddresses[index].longitude);

    // Se marcando como primário, desmarcar os outros
    if (field === 'is_primary' && value === true) {
      newAddresses.forEach((addr, i) => {
        if (i !== index) {
          addr.is_primary = false;
        }
      });
    }

    newAddresses[index] = {
      ...newAddresses[index],
      [field]: value,
      updated_at: new Date().toISOString(),
    };

    console.warn('Valores específicos depois da atualização:');
    console.warn('  latitude:', newAddresses[index].latitude);
    console.warn('  longitude:', newAddresses[index].longitude);
    console.warn('Campo atualizado:', field, '=', value);

    onChange(newAddresses);
  };

  const handleCEPChange = async (index: number, value: string) => {
    const formatted = formatCEP(value);
    handleUpdateAddress(index, 'zip', formatted);

    // Buscar dados do CEP quando completo
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      // Remover marcação de editado manualmente pois vai buscar novas coordenadas
      setManuallyEditedCoordinates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(`${index}`);
        return newSet;
      });

      setLoadingCEP(index);
      const cepData = await fetchCEP(formatted);

      if (cepData) {
        const newAddresses = [...addresses];
        newAddresses[index] = {
          ...newAddresses[index],
          street: cepData.logradouro || newAddresses[index].street,
          district: cepData.bairro || newAddresses[index].district,
          city: cepData.localidade || newAddresses[index].city,
          state: cepData.uf || newAddresses[index].state,
          complement: cepData.complemento || newAddresses[index].complement,
          zip: formatted,
          updated_at: new Date().toISOString(),
        };
        onChange(newAddresses);
      }

      setLoadingCEP(null);
    }
  };

  const handleOpenMapModal = (index: number) => {
    setMapModalAddressIndex(index);
    setMapModalOpen(true);
  };

  const handleMapConfirm = (latitude: number, longitude: number) => {
    if (mapModalAddressIndex !== null) {
      // Marcar como editado manualmente
      setManuallyEditedCoordinates((prev) => new Set(prev).add(`${mapModalAddressIndex}`));

      // Arredondar coordenadas para 6 dígitos decimais
      const roundedLatitude = Math.round(latitude * 1000000) / 1000000;
      const roundedLongitude = Math.round(longitude * 1000000) / 1000000;

      // Fazer uma única atualização com ambos os valores
      const newAddresses = [...addresses];
      newAddresses[mapModalAddressIndex] = {
        ...newAddresses[mapModalAddressIndex],
        latitude: roundedLatitude,
        longitude: roundedLongitude,
        updated_at: new Date().toISOString(),
      };

      onChange(newAddresses);
    }
    setMapModalOpen(false);
    setMapModalAddressIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Endereços</h3>
        <div className="flex items-center gap-2">
          {patientId && onSave && addresses.length > 0 && (
            <ButtonNew
              type="button"
              variant="solid"
              size="sm"
              onClick={() => onSave(addresses)}
              disabled={Boolean(isSaving)}
              showIcon={false}
              label={isSaving ? 'Salvando...' : 'Salvar Endereços'}
            />
          )}
          <ButtonNew
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAddress}
            icon={<Plus className="h-4 w-4" />}
            showIcon
            label="Adicionar Endereço"
          />
        </div>
      </div>

      {addresses.length === 0 && (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          Nenhum endereço cadastrado
        </div>
      )}

      {addresses.map((address, index) => (
        <div
          key={address.id}
          className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div
            className="dark:hover:bg-gray-750 flex cursor-pointer items-center justify-between bg-gray-50 p-4 hover:bg-gray-100 dark:bg-gray-800"
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex flex-1 items-center gap-3">
              <Home className="h-5 w-5 text-gray-400" />
              <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-4">
                <div className="col-span-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {ADDRESS_TYPE_OPTIONS.find((opt) => opt.value === address.type)?.label ||
                        address.type}
                    </span>
                    {address.is_primary && (
                      <span className="border-primary-500/30 bg-primary-500/10 text-primary-700 dark:bg-primary-400/20 dark:text-primary-300 rounded border px-2 py-0.5 text-xs font-semibold">
                        Principal
                      </span>
                    )}
                  </div>
                  {!address.active && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="col-span-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {address.label || 'Sem rótulo'}
                  </p>
                </div>
                <div className="col-span-10">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {address.street
                      ? `${address.street}${address.number ? `, ${address.number}` : ''}${address.district ? `, ${address.district}` : ''}${address.city ? `, ${address.city}` : ''}${address.state ? `/${address.state}` : ''}`
                      : 'Sem endereço'}
                  </p>
                </div>
                <div className="col-span-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {address.zip || 'Sem CEP'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {address.latitude && address.longitude && (
                <MapPin className="text-primary-600/70 dark:text-primary-400/70 h-5 w-5" />
              )}
              <ButtonNew
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAddress(index);
                }}
                icon={<Trash2 className="h-4 w-4" />}
                label=""
                aria-label="Remover endereço"
                title="Remover endereço"
                className="w-8 justify-center px-2 pr-2"
              />
            </div>
          </div>

          {expandedIndex === index && (
            <div className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-700">
              {/* Linha 1: Tipo (6) + Rótulo (6) + vazio (12) */}
              <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-4">
                <div className="col-span-6">
                  <Select
                    label="Tipo"
                    options={ADDRESS_TYPE_OPTIONS}
                    value={address.type}
                    onChange={(e: any) =>
                      handleUpdateAddress(
                        index,
                        'type',
                        typeof e === 'string' ? e : e.target?.value || e
                      )
                    }
                  />
                </div>
                <div className="col-span-6">
                  <Input
                    label="Rótulo (opcional)"
                    placeholder="Ex: Casa da praia"
                    value={address.label || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(index, 'label', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Linha 2: CEP (4) + Logradouro (18) + Número (2) */}
              <div className="grid grid-cols-12 gap-4">
                <div className="relative col-span-4">
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    value={address.zip || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleCEPChange(index, e.target.value)
                    }
                  />
                  {loadingCEP === index && (
                    <div className="absolute right-3 top-9 flex items-center gap-2">
                      <svg
                        className="text-primary-500 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Buscando...</span>
                    </div>
                  )}
                </div>
                <div className="col-span-6">
                  <Input
                    label="Logradouro"
                    placeholder="Rua, Avenida, etc."
                    value={address.street || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(index, 'street', e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Número"
                    placeholder="123"
                    value={address.number || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(index, 'number', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Linha 3: Complemento (14) + Bairro (4) + Cidade (4) + Estado (2) */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <Input
                    label="Complemento"
                    placeholder="Apto, Bloco, etc."
                    value={address.complement || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(index, 'complement', e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Bairro"
                    placeholder="Nome do bairro"
                    value={address.district || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(index, 'district', e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Cidade"
                    placeholder="Nome da cidade"
                    value={address.city || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(index, 'city', e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Select
                    label="Estado"
                    options={[{ value: '', label: 'Selecione...' }, ...BRAZILIAN_STATES]}
                    value={address.state || ''}
                    onChange={(e: any) =>
                      handleUpdateAddress(
                        index,
                        'state',
                        typeof e === 'string' ? e : e.target?.value || e
                      )
                    }
                  />
                </div>
              </div>

              {/* Linha 4: Referência (12) + Latitude (6) + Longitude (6) */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <Input
                    label="Referência"
                    placeholder="Ponto de referência"
                    value={address.reference || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(index, 'reference', e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Latitude"
                    type="number"
                    inputMode="decimal"
                    placeholder="-23.550520"
                    step="0.000001"
                    value={address.latitude || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(
                        index,
                        'latitude',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Longitude"
                    type="number"
                    inputMode="decimal"
                    placeholder="-46.633308"
                    step="0.000001"
                    value={address.longitude || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateAddress(
                        index,
                        'longitude',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                  />
                </div>
                <div className="col-span-2 flex items-end">
                  <ButtonNew
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenMapModal(index)}
                    className="w-full"
                    icon={<MapPin className="h-4 w-4" />}
                    showIcon
                    label="Mapa"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <Switch
                  label="Endereço Principal"
                  checked={address.is_primary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateAddress(index, 'is_primary', e.target.checked)
                  }
                />
                <Switch
                  label="Usar para Atendimento"
                  checked={address.use_for_service}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateAddress(index, 'use_for_service', e.target.checked)
                  }
                />
                <Switch
                  label="Ativo"
                  checked={address.active}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateAddress(index, 'active', e.target.checked)
                  }
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {mapModalAddressIndex !== null && (
        <AddressMapModal
          isOpen={mapModalOpen}
          onClose={() => {
            setMapModalOpen(false);
            setMapModalAddressIndex(null);
          }}
          latitude={addresses[mapModalAddressIndex]?.latitude || null}
          longitude={addresses[mapModalAddressIndex]?.longitude || null}
          address={`${addresses[mapModalAddressIndex]?.street || ''} ${addresses[mapModalAddressIndex]?.number || ''} ${addresses[mapModalAddressIndex]?.city || ''} ${addresses[mapModalAddressIndex]?.state || ''}`}
          onConfirm={handleMapConfirm}
          isManuallyEdited={manuallyEditedCoordinates.has(`${mapModalAddressIndex}`)}
        />
      )}
    </div>
  );
}
