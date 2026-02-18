import { useState } from 'react';
import { Modal, Input, Button } from '@synia/ui';
import { useCreateCompany } from '@/hooks/useCompanies';
import { useInitSuperadmin } from '@/hooks/useAppUsers';
import { useAuthStore } from '@/stores/authStore';
import { DEFAULT_COMPANY_COLOR, PRESET_COLORS } from '@/lib/themeConstants';
import toast from 'react-hot-toast';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const { session } = useAuthStore();
  const [step, setStep] = useState<'superadmin' | 'company'>('superadmin');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [companyData, setCompanyData] = useState({
    name: '',
    trade_name: '',
    document: '',
    primary_color: DEFAULT_COMPANY_COLOR,
  });

  const [userData, setUserData] = useState({
    name: '',
  });

  const initSuperadminMutation = useInitSuperadmin();
  const createCompanyMutation = useCreateCompany();

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    }
    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const validateCompany = () => {
    const newErrors: Record<string, string> = {};

    if (!companyData.name.trim()) {
      newErrors.name = 'Nome da empresa é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUser = () => {
    const newErrors: Record<string, string> = {};

    if (!userData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 1: Create superadmin in system_user table
  const handleCreateSuperadmin = async () => {
    if (!validateUser()) return;

    try {
      setIsLoading(true);

      await initSuperadminMutation.mutateAsync(userData.name.trim());

      setStep('company');
      setErrors({});
    } catch (error: any) {
      toast.error('Erro ao criar superadministrador');
      setErrors({ submit: error.message || 'Erro ao criar superadministrador' });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Create company only
  const handleCreateCompany = async () => {
    if (!validateCompany()) return;

    try {
      setIsLoading(true);

      // Create company - superadmin can create companies via RLS policy
      await createCompanyMutation.mutateAsync({
        name: companyData.name,
        trade_name: companyData.trade_name || undefined,
        document: companyData.document || undefined,
        primary_color: companyData.primary_color,
      });

      toast.success('Configuração concluída com sucesso!');
      toast.success('Você pode acessar o sistema como superadministrador');
      onComplete();
    } catch (error: any) {
      toast.error('Erro ao criar empresa');
      setErrors({ submit: error.message || 'Erro ao criar empresa' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Não permite fechar
      title="Bem-vindo! Vamos configurar sua conta"
      size="md"
    >
      {step === 'superadmin' ? (
        <form className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Primeiro, informe seu nome. Você será o superadministrador do sistema com acesso total.
          </div>

          {errors.submit && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {errors.submit}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome Completo *
            </label>
            <Input
              type="text"
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              placeholder="Seu nome completo"
              error={errors.name}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <Input
              type="email"
              value={session?.user.email || ''}
              disabled
              className="bg-gray-100 dark:bg-gray-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email da sua conta de autenticação
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button onClick={handleCreateSuperadmin} disabled={isLoading}>
              {isLoading ? 'Configurando...' : 'Próximo'}
            </Button>
          </div>
        </form>
      ) : (
        <form className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Agora crie a primeira empresa. Como superadministrador, você terá acesso completo ao
            sistema.
          </div>

          {errors.submit && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {errors.submit}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome da Empresa *
            </label>
            <Input
              type="text"
              value={companyData.name}
              onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
              placeholder="Ex: Minha Empresa LTDA"
              error={errors.name}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome Fantasia
            </label>
            <Input
              type="text"
              value={companyData.trade_name}
              onChange={(e) => setCompanyData({ ...companyData, trade_name: e.target.value })}
              placeholder="Ex: Minha Empresa"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              CNPJ
            </label>
            <Input
              type="text"
              value={companyData.document}
              onChange={(e) =>
                setCompanyData({ ...companyData, document: formatCnpj(e.target.value) })
              }
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cor Principal
            </label>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setCompanyData({ ...companyData, primary_color: color.value })}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                    companyData.primary_color === color.value
                      ? 'border-gray-400 dark:border-gray-500'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="h-8 w-8 rounded" style={{ backgroundColor: color.value }} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {color.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button
              type="button"
              variant="neutral"
              onClick={() => {
                setStep('superadmin');
                setErrors({});
              }}
              disabled={isLoading}
            >
              Voltar
            </Button>
            <Button onClick={handleCreateCompany} disabled={isLoading}>
              {isLoading ? 'Finalizando...' : 'Finalizar Configuração'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
