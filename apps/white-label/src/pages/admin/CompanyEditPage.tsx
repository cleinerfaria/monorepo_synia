import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Settings,
  Database,
  ArrowLeft,
  Save,
  Trash2,
  AlertTriangle,
  Plus,
  Edit,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Layout,
} from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

import {
  Card,
  CardContent,
  Button,
  Input,
  Loading,
  EmptyState,
  Badge,
  Modal,
  Select,
} from '@/components/ui';
import { CompanyLogos } from '@/components/CompanyLogos';
import { useCompany, useUpdateCompany, useDeleteCompany } from '@/hooks/useCompanies';
import { DEFAULT_COMPANY_COLOR, PRESET_COLORS } from '@/lib/themeConstants';
import {
  useCompanyPlanSettings,
  useUpsertCompanyPlanSettings,
} from '@/hooks/useCompanyPlanSettings';
import {
  useCompanyDatabases,
  useCreateCompanyDatabase,
  useUpdateCompanyDatabase,
  useDeleteCompanyDatabase,
  useTestDatabaseConnection,
} from '@/hooks/useCompanyDatabases';
import type { CompanyDatabase, DbType, SslMode } from '@/types/companyDatabase';
import usePages from '@/hooks/usePages';
import usePageFilters from '@/hooks/usePageFilters';
import { usePageCharts } from '@/hooks/usePageCharts';
import PageModal from '@/components/PageModal';
import PageFilterModal from '@/components/PageFilterModal';
import PageChartModal from '@/components/PageChartModal';
import { BarChart3 } from 'lucide-react';

// Labels para tipos de banco
const dbTypeLabels: Record<DbType, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  oracle: 'Oracle',
  sqlite: 'SQLite',
  other: 'Outro',
};

// Labels para modos SSL
const sslModeLabels: Record<SslMode, string> = {
  disable: 'Desabilitado',
  allow: 'Permitir',
  prefer: 'Preferir',
  require: 'Obrigatório',
  'verify-ca': 'Verificar CA',
  'verify-full': 'Verificação Completa',
};

type TabType = 'dados' | 'logos' | 'limites' | 'bancos' | 'pages';

interface TabItem {
  id: TabType;
  label: string;
  icon: typeof Building2;
}

const tabs: TabItem[] = [
  { id: 'dados', label: 'Dados da Empresa', icon: Building2 },
  { id: 'logos', label: 'Logomarcas', icon: Layout },
  { id: 'limites', label: 'Limites e Plano', icon: Settings },
  { id: 'bancos', label: 'Bancos Externos', icon: Database },
  { id: 'pages', label: 'Páginas e Filtros', icon: Layout },
];

export default function CompanyEditPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dados');

  // Dados da empresa
  const { data: company, isLoading: isLoadingCompany } = useCompany(companyId);
  const { data: planSettings, isLoading: isLoadingPlan } = useCompanyPlanSettings(companyId);
  const { data: databases = [], isLoading: isLoadingDatabases } = useCompanyDatabases(companyId);

  const isLoading = isLoadingCompany || isLoadingPlan;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Building2 className="h-16 w-16" />}
          title="Empresa não encontrada"
          description="A empresa solicitada não existe ou você não tem permissão para acessá-la."
          action={
            <Button onClick={() => navigate('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {company.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {company.trade_name || 'Editar empresa'}
                </p>
              </div>
            </div>
            <div
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: company.primary_color || DEFAULT_COMPANY_COLOR }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'dados' && <CompanyDataTab company={company} />}
        {activeTab === 'logos' && <CompanyLogosTab companyId={company.id} />}
        {activeTab === 'limites' && (
          <CompanyLimitsTab companyId={company.id} planSettings={planSettings} />
        )}
        {activeTab === 'bancos' && (
          <CompanyDatabasesTab
            companyId={company.id}
            databases={databases}
            isLoading={isLoadingDatabases}
          />
        )}
        {activeTab === 'pages' && <CompanyPagesTab companyId={company.id} />}
      </div>
    </div>
  );
}

// ============================================
// Tab: Dados da Empresa
// ============================================

interface CompanyDataTabProps {
  company: NonNullable<ReturnType<typeof useCompany>['data']>;
}

function CompanyDataTab({ company }: CompanyDataTabProps) {
  const navigate = useNavigate();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();

  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    document: '',
    primary_color: DEFAULT_COMPANY_COLOR,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isLoading = updateMutation.isPending || deleteMutation.isPending;

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

  useEffect(() => {
    setFormData({
      name: company.name,
      trade_name: company.trade_name || '',
      document: formatCnpj(company.document || ''),
      primary_color: company.primary_color || DEFAULT_COMPANY_COLOR,
    });
  }, [company]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await updateMutation.mutateAsync({
        id: company.id,
        name: formData.name,
        trade_name: formData.trade_name || undefined,
        document: formData.document || undefined,
        primary_color: formData.primary_color,
      });
      toast.success('Empresa atualizada com sucesso');
      // Redirecionar para página de administração após 500ms
      setTimeout(() => {
        navigate('/admin');
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar empresa');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(company.id);
      toast.success('Empresa excluída com sucesso');
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir empresa');
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {errors.submit}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Razão Social *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da empresa"
                error={errors.name}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome Fantasia
              </label>
              <Input
                type="text"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                placeholder="Nome fantasia"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                CNPJ
              </label>
              <Input
                type="text"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: formatCnpj(e.target.value) })}
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
                    onClick={() => setFormData({ ...formData, primary_color: color.value })}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                      formData.primary_color === color.value
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
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Confirmar exclusão
                  </h4>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    Esta ação irá excluir a empresa e TODOS os dados relacionados (usuários,
                    conexões de banco e registros associados). Esta ação não pode ser desfeita.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isLoading}
                    >
                      Sim, excluir
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
            <div>
              {!showDeleteConfirm && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Empresa
                </Button>
              )}
            </div>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================
// Tab: Limites e Plano
// ============================================

interface CompanyLimitsTabProps {
  companyId: string;
  planSettings: ReturnType<typeof useCompanyPlanSettings>['data'];
}

function CompanyLimitsTab({ companyId, planSettings }: CompanyLimitsTabProps) {
  const upsertPlanSettings = useUpsertCompanyPlanSettings();

  const [formData, setFormData] = useState({
    whatsapp_instance_limit: 1,
  });

  const isLoading = upsertPlanSettings.isPending;

  useEffect(() => {
    if (planSettings) {
      setFormData({
        whatsapp_instance_limit: planSettings.whatsapp_instance_limit,
      });
    }
  }, [planSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await upsertPlanSettings.mutateAsync({
        company_id: companyId,
        whatsapp_instance_limit: formData.whatsapp_instance_limit,
      });
      toast.success('Limites atualizados com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar limites');
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Limites do Plano</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configure os limites de recursos para esta empresa.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Limite de Instâncias WhatsApp
              </label>
              <Input
                type="number"
                min={1}
                value={formData.whatsapp_instance_limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    whatsapp_instance_limit: Number(e.target.value || 1),
                  })
                }
                placeholder="1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Número máximo de instâncias WhatsApp que a empresa pode criar.
              </p>
            </div>

            {/* Placeholder para futuros limites */}
            <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mais limites serão adicionados em breve...
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Salvando...' : 'Salvar Limites'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================
// Tab: Bancos Externos
// ============================================

interface CompanyDatabasesTabProps {
  companyId: string;
  databases: CompanyDatabase[];
  isLoading: boolean;
}

function CompanyDatabasesTab({ companyId, databases, isLoading }: CompanyDatabasesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<CompanyDatabase | null>(null);

  const testConnection = useTestDatabaseConnection();
  const deleteDatabase = useDeleteCompanyDatabase();

  const handleEdit = (db: CompanyDatabase) => {
    setSelectedDatabase(db);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedDatabase(null);
    setIsModalOpen(true);
  };

  const handleTest = async (db: CompanyDatabase) => {
    try {
      const result = await testConnection.mutateAsync(db.id);
      if (result.status === 'success') {
        toast.success('Conexão testada com sucesso!');
      } else {
        toast.error(`Falha na conexão: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao testar conexão');
    }
  };

  const handleDelete = async (db: CompanyDatabase) => {
    if (!confirm(`Deseja realmente excluir a conexão "${db.name}"?`)) return;

    try {
      await deleteDatabase.mutateAsync(db.id);
      toast.success('Conexão excluída com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir conexão');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loading size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Conexões de Banco de Dados
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Configure conexões com bancos de dados externos para dashboards personalizados.
              </p>
            </div>
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conexão
            </Button>
          </div>

          {databases.length === 0 ? (
            <EmptyState
              icon={<Database className="h-16 w-16" />}
              title="Nenhuma conexão configurada"
              description="Adicione conexões de banco de dados para criar dashboards personalizados."
              action={
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Conexão
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {databases.map((db) => (
                <div
                  key={db.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={clsx(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        db.is_active
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gray-100 dark:bg-gray-800'
                      )}
                    >
                      <Database
                        className={clsx(
                          'h-5 w-5',
                          db.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{db.name}</h4>
                        {db.is_default && (
                          <Badge variant="primary" className="text-xs">
                            Padrão
                          </Badge>
                        )}
                        <Badge variant={db.is_active ? 'success' : 'neutral'} className="text-xs">
                          {db.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {dbTypeLabels[db.db_type]} • {db.db_host}:{db.db_port}/{db.db_name}
                      </p>
                      {db.last_connection_test && (
                        <div className="mt-1 flex items-center gap-1 text-xs">
                          {db.last_connection_status === 'success' ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-green-600 dark:text-green-400">
                                Último teste: sucesso
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-red-500" />
                              <span className="text-red-600 dark:text-red-400">
                                Último teste: falha
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest(db)}
                      disabled={testConnection.isPending}
                      title="Testar conexão"
                    >
                      {testConnection.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(db)} title="Editar">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(db)}
                      disabled={deleteDatabase.isPending}
                      title="Excluir"
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DatabaseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDatabase(null);
        }}
        companyId={companyId}
        database={selectedDatabase}
      />
    </>
  );
}

// ============================================
// Modal: Criar/Editar Conexão de Banco
// ============================================

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  database: CompanyDatabase | null;
}

function DatabaseModal({ isOpen, onClose, companyId, database }: DatabaseModalProps) {
  const isEditing = !!database;

  const createMutation = useCreateCompanyDatabase();
  const updateMutation = useUpdateCompanyDatabase();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    db_type: 'postgres' as DbType,
    db_host: '',
    db_port: 5432,
    db_name: '',
    db_user: '',
    db_password: '',
    db_ssl_mode: 'require' as SslMode,
    is_active: true,
    is_default: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (database) {
      setFormData({
        name: database.name,
        description: database.description || '',
        db_type: database.db_type,
        db_host: database.db_host,
        db_port: database.db_port,
        db_name: database.db_name,
        db_user: database.db_user,
        db_password: '', // Nunca retornamos a senha
        db_ssl_mode: database.db_ssl_mode,
        is_active: database.is_active,
        is_default: database.is_default,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        db_type: 'postgres',
        db_host: '',
        db_port: 5432,
        db_name: '',
        db_user: '',
        db_password: '',
        db_ssl_mode: 'require',
        is_active: true,
        is_default: false,
      });
    }
    setErrors({});
    setShowPassword(false);
  }, [database, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.db_host.trim()) newErrors.db_host = 'Host é obrigatório';
    if (!formData.db_port) newErrors.db_port = 'Porta é obrigatória';
    if (!formData.db_name.trim()) newErrors.db_name = 'Nome do banco é obrigatório';
    if (!formData.db_user.trim()) newErrors.db_user = 'Usuário é obrigatório';
    if (!isEditing && !formData.db_password) newErrors.db_password = 'Senha é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEditing) {
        const updateData: any = {
          name: formData.name,
          description: formData.description || undefined,
          db_type: formData.db_type,
          db_host: formData.db_host,
          db_port: formData.db_port,
          db_name: formData.db_name,
          db_user: formData.db_user,
          db_ssl_mode: formData.db_ssl_mode,
          is_active: formData.is_active,
          is_default: formData.is_default,
        };
        // Só envia senha se foi preenchida
        if (formData.db_password) {
          updateData.db_password = formData.db_password;
        }

        await updateMutation.mutateAsync({
          databaseId: database.id,
          connection: updateData,
        });
        toast.success('Conexão atualizada com sucesso');
      } else {
        await createMutation.mutateAsync({
          company_id: companyId,
          name: formData.name,
          description: formData.description || undefined,
          db_type: formData.db_type,
          db_host: formData.db_host,
          db_port: formData.db_port,
          db_name: formData.db_name,
          db_user: formData.db_user,
          db_password: formData.db_password,
          db_ssl_mode: formData.db_ssl_mode,
          is_active: formData.is_active,
          is_default: formData.is_default,
        });
        toast.success('Conexão criada com sucesso');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar conexão');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Conexão' : 'Nova Conexão de Banco'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {errors.submit}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome da Conexão *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Banco Principal"
              error={errors.name}
            />
          </div>

          <div>
            <Select
              label="Tipo de Banco *"
              options={Object.entries(dbTypeLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              value={formData.db_type}
              onChange={(value: string) =>
                setFormData({ ...formData, db_type: (value as DbType) || 'postgres' })
              }
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição
          </label>
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição opcional"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Host *
            </label>
            <Input
              type="text"
              value={formData.db_host}
              onChange={(e) => setFormData({ ...formData, db_host: e.target.value })}
              placeholder="localhost ou IP"
              error={errors.db_host}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Porta *
            </label>
            <Input
              type="number"
              value={formData.db_port}
              onChange={(e) => setFormData({ ...formData, db_port: Number(e.target.value) })}
              placeholder="5432"
              error={errors.db_port}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome do Banco *
          </label>
          <Input
            type="text"
            value={formData.db_name}
            onChange={(e) => setFormData({ ...formData, db_name: e.target.value })}
            placeholder="nome_do_banco"
            error={errors.db_name}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Usuário *
            </label>
            <Input
              type="text"
              value={formData.db_user}
              onChange={(e) => setFormData({ ...formData, db_user: e.target.value })}
              placeholder="postgres"
              error={errors.db_user}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Senha {!isEditing && '*'}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.db_password}
                onChange={(e) => setFormData({ ...formData, db_password: e.target.value })}
                placeholder={isEditing ? '(deixe em branco para manter)' : 'Senha do banco'}
                error={errors.db_password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <div>
          <Select
            label="Modo SSL"
            options={Object.entries(sslModeLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            value={formData.db_ssl_mode}
            onChange={(value: string) =>
              setFormData({ ...formData, db_ssl_mode: (value as SslMode) || 'require' })
            }
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Ativo</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Conexão Padrão</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Conexão'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================
// COMPANY PAGES TAB
// ============================================

interface CompanyPagesTabProps {
  companyId: string;
}

function CompanyPagesTab({ companyId }: CompanyPagesTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isPageFilterModalOpen, setIsPageFilterModalOpen] = useState(false);
  const [isPageChartModalOpen, setIsPageChartModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [selectedPageFilter, setSelectedPageFilter] = useState<any>(null);
  const [selectedPageChart, setSelectedPageChart] = useState<any>(null);

  return (
    <div className="space-y-6">
      <PagesSection
        companyId={companyId}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onEditPage={setSelectedPage}
        onOpenPageModal={() => setIsPageModalOpen(true)}
      />

      {selectedPageId && (
        <>
          <PageFiltersSection
            pageId={selectedPageId}
            companyId={companyId}
            onEditFilter={setSelectedPageFilter}
            onOpenFilterModal={() => setIsPageFilterModalOpen(true)}
          />

          <PageChartsSection
            pageId={selectedPageId}
            companyId={companyId}
            onEditChart={setSelectedPageChart}
            onOpenChartModal={() => setIsPageChartModalOpen(true)}
          />
        </>
      )}

      {/* Page Modal */}
      <PageModal
        isOpen={isPageModalOpen}
        onClose={() => {
          setIsPageModalOpen(false);
          setSelectedPage(null);
        }}
        companyId={companyId}
        page={selectedPage}
      />

      {/* Page Filter Modal */}
      <PageFilterModal
        isOpen={isPageFilterModalOpen}
        onClose={() => {
          setIsPageFilterModalOpen(false);
          setSelectedPageFilter(null);
        }}
        companyId={companyId}
        pageId={selectedPageId}
        pageFilter={selectedPageFilter}
      />

      {/* Page Chart Modal */}
      <PageChartModal
        isOpen={isPageChartModalOpen}
        onClose={() => {
          setIsPageChartModalOpen(false);
          setSelectedPageChart(null);
        }}
        companyId={companyId}
        pageId={selectedPageId}
        pageChart={selectedPageChart}
      />
    </div>
  );
}

// ============================================
// PAGES SECTION
// ============================================

interface PagesSectionProps {
  companyId: string;
  selectedPageId: string | null;
  onSelectPage: (pageId: string | null) => void;
  onEditPage: (page: any) => void;
  onOpenPageModal: () => void;
}

function PagesSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  companyId,
  selectedPageId,
  onSelectPage,
  onEditPage,
  onOpenPageModal,
}: PagesSectionProps) {
  const { pages, isLoading, deletePage, isDeleting } = usePages();

  const handleDeletePage = async (id: string) => {
    if (
      window.confirm(
        'Tem certeza que deseja excluir esta página? Todos os filtros associados também serão excluídos.'
      )
    ) {
      try {
        await deletePage(id);
        if (selectedPageId === id) {
          onSelectPage(null);
        }
        toast.success('Página excluída com sucesso!');
      } catch (error: any) {
        toast.error(error.message || 'Erro ao excluir página');
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Páginas do Sistema
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure as páginas e seus filtros dinâmicos
            </p>
          </div>
          <Button onClick={onOpenPageModal}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Página
          </Button>
        </div>

        {pages.length === 0 ? (
          <EmptyState
            icon={<Layout className="h-16 w-16" />}
            title="Nenhuma página cadastrada"
            description="Crie sua primeira página para começar a configurar filtros dinâmicos"
            action={<Button onClick={onOpenPageModal}>Criar Página</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <div
                key={page.id}
                className={clsx(
                  'cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md',
                  selectedPageId === page.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                )}
                onClick={() => onSelectPage(page.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-medium text-gray-900 dark:text-white">
                      {page.name}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Criada em {new Date(page.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPage(page);
                        onOpenPageModal();
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(page.id);
                      }}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// PAGE FILTERS SECTION
// ============================================

interface PageFiltersSectionProps {
  pageId: string;
  companyId: string;
  onEditFilter: (filter: any) => void;
  onOpenFilterModal: () => void;
}

function PageFiltersSection({
  pageId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  companyId,
  onEditFilter,
  onOpenFilterModal,
}: PageFiltersSectionProps) {
  const { pageFilters, isLoading, deletePageFilter, isDeleting } = usePageFilters(pageId);

  const handleDeleteFilter = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este filtro?')) {
      try {
        await deletePageFilter(id);
        toast.success('Filtro excluído com sucesso!');
      } catch (error: any) {
        toast.error(error.message || 'Erro ao excluir filtro');
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filtros da Página
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure os filtros dinâmicos para esta página
            </p>
          </div>
          <Button onClick={onOpenFilterModal}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Filtro
          </Button>
        </div>

        {pageFilters.length === 0 ? (
          <EmptyState
            icon={<Settings className="h-16 w-16" />}
            title="Nenhum filtro cadastrado"
            description="Crie filtros dinâmicos para esta página"
            action={<Button onClick={onOpenFilterModal}>Criar Filtro</Button>}
          />
        ) : (
          <div className="space-y-4">
            {pageFilters
              .sort((a, b) => a.order_index - b.order_index)
              .map((filter) => (
                <div
                  key={filter.id}
                  className={clsx(
                    'rounded-lg border p-4',
                    filter.active
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-gray-100 bg-gray-50 opacity-75 dark:border-gray-800 dark:bg-gray-800/50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {filter.label || filter.name}
                        </h4>
                        {filter.label && (
                          <span className="text-xs text-gray-500">({filter.name})</span>
                        )}
                        <Badge variant="neutral">{filter.type}</Badge>
                        {filter.subtype && <Badge variant="info">{filter.subtype}</Badge>}
                        {!filter.active && <Badge variant="warning">Inativo</Badge>}
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">
                          #{filter.order_index}
                        </span>
                      </div>
                      {filter.placeholder && (
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          Placeholder: {filter.placeholder}
                        </p>
                      )}
                      {filter.options_view && (
                        <div className="mt-2 rounded bg-gray-50 p-2 dark:bg-gray-800">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            View: <code>{filter.options_view}</code>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          onEditFilter(filter);
                          onOpenFilterModal();
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFilter(filter.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// PAGE CHARTS SECTION
// ============================================

interface PageChartsSectionProps {
  pageId: string;
  companyId: string;
  onEditChart: (chart: any) => void;
  onOpenChartModal: () => void;
}

function PageChartsSection({
  pageId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  companyId,
  onEditChart,
  onOpenChartModal,
}: PageChartsSectionProps) {
  const { pageCharts, isLoading, deletePageChart, isDeleting } = usePageCharts(pageId);

  const handleDeleteChart = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este gráfico?')) {
      try {
        await deletePageChart(id);
        toast.success('Gráfico excluído com sucesso!');
      } catch (error: any) {
        toast.error(error.message || 'Erro ao excluir gráfico');
      }
    }
  };

  const getChartTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      area: 'Área',
      line: 'Linha',
      bar: 'Barra',
      column: 'Coluna',
      pie: 'Pizza',
      donut: 'Rosquinha',
      stacked_bar: 'Barra Empilhada',
      stacked_area: 'Área Empilhada',
      scatter: 'Dispersão',
      radar: 'Radar',
      treemap: 'Treemap',
      heatmap: 'Mapa de Calor',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Gráficos da Página
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure os gráficos dinâmicos para esta página
            </p>
          </div>
          <Button onClick={onOpenChartModal}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Gráfico
          </Button>
        </div>

        {pageCharts.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-16 w-16" />}
            title="Nenhum gráfico cadastrado"
            description="Crie gráficos dinâmicos para esta página"
            action={<Button onClick={onOpenChartModal}>Criar Gráfico</Button>}
          />
        ) : (
          <div className="space-y-4">
            {pageCharts
              .sort((a, b) => a.order_index - b.order_index)
              .map((chart) => (
                <div
                  key={chart.id}
                  className={clsx(
                    'rounded-lg border p-4',
                    chart.active
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-gray-100 bg-gray-50 opacity-75 dark:border-gray-800 dark:bg-gray-800/50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <BarChart3 className="text-primary-500 h-5 w-5" />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {chart.title || chart.name}
                        </h4>
                        {chart.title && (
                          <span className="text-xs text-gray-500">({chart.name})</span>
                        )}
                        <Badge variant="info">{getChartTypeLabel(chart.type)}</Badge>
                        {!chart.active && <Badge variant="warning">Inativo</Badge>}
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">
                          #{chart.order_index}
                        </span>
                      </div>
                      {chart.description && (
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          {chart.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-4 rounded bg-gray-50 p-2 dark:bg-gray-800">
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          View: <code>{chart.options_view}</code>
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          Eixo X: <code>{chart.x_axis}</code>
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          Eixo Y: {chart.y_axis.map((y: any) => y.label || y.field).join(', ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          onEditChart(chart);
                          onOpenChartModal();
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteChart(chart.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Tab: Logos da Empresa
// ============================================

interface CompanyLogosTabProps {
  companyId: string;
}

function CompanyLogosTab({ companyId }: CompanyLogosTabProps) {
  const { data: company } = useCompany(companyId);
  const updateMutation = useUpdateCompany();
  const [logos, setLogos] = useState({
    square_dark: '',
    square_light: '',
    rectangular_dark: '',
    rectangular_light: '',
  });

  useEffect(() => {
    if (company) {
      setLogos({
        square_dark: company.logo_url_collapsed_dark || '',
        square_light: company.logo_url_collapsed_light || '',
        rectangular_dark: company.logo_url_expanded_dark || '',
        rectangular_light: company.logo_url_expanded_light || '',
      });
    }
  }, [company]);

  const handleLogoChange = (type: keyof typeof logos, value: string) => {
    setLogos((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const handleSaveLogos = async () => {
    try {
      await updateMutation.mutateAsync({
        id: companyId,
        logo_url_collapsed_dark: logos.square_dark || null,
        logo_url_collapsed_light: logos.square_light || null,
        logo_url_expanded_dark: logos.rectangular_dark || null,
        logo_url_expanded_light: logos.rectangular_light || null,
      });
      toast.success('Logos atualizadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar logos');
      console.error(error);
    }
  };

  return (
    <CompanyLogos
      logos={logos}
      onLogosChange={handleLogoChange}
      onSave={handleSaveLogos}
      isLoading={updateMutation.isPending}
    />
  );
}
