export const DEFAULT_ZIP_LOOKUP_TIMEOUT_MS = 30000;

export interface ZipLookupResponse {
  complemento?: string;
  bairro?: string;
  localidade?: string;
  logradouro?: string;
  uf?: string;
  erro?: boolean;
}

export const UF_OPTIONS = [
  { value: '', label: 'Selecione...' },
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

export const formatZipInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const fetchAddressFromZip = async (
  zip: string,
  timeoutMs: number = DEFAULT_ZIP_LOOKUP_TIMEOUT_MS
): Promise<ZipLookupResponse | null> => {
  const digits = zip.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Busca de CEP (base Correios) via ViaCEP.
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as ZipLookupResponse;
    if (data.erro) return null;
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }

    console.error('Erro ao buscar CEP:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
