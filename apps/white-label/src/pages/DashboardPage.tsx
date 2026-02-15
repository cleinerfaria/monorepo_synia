import { Link } from 'react-router-dom';
import { Building2, Settings, ShieldCheck, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@synia/ui';
import { useAuthStore } from '@/stores/authStore';

const shortcuts = [
  {
    name: 'Configurações',
    description: 'Preferências gerais do sistema',
    href: '/configuracoes',
    icon: Settings,
  },
  {
    name: 'Usuários',
    description: 'Gerencie acessos e permissões',
    href: '/configuracoes/usuarios',
    icon: Users,
  },
  {
    name: 'Perfis de Acesso',
    description: 'Controle papéis e regras',
    href: '/configuracoes/perfis-acesso',
    icon: ShieldCheck,
  },
  {
    name: 'Administração',
    description: 'Empresas e contas administrativas',
    href: '/admin',
    icon: Building2,
  },
];

// Use real data from the system - no hardcoded values

export default function DashboardPage() {
  const { appUser, company } = useAuthStore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white">
          Olá, {appUser?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Bem-vindo ao sistema de gestão da sua empresa. Seu pacote inicial está pronto.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {shortcuts.map((item) => (
          <Link key={item.name} to={item.href}>
            <Card hover className="h-full">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.name}</p>
                    <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                      {item.description}
                    </p>
                  </div>
                  <div className="bg-primary-100 dark:bg-primary-900/20 rounded-xl p-3">
                    <item.icon className="text-primary-600 dark:text-primary-400 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações da empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Empresa
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {company?.trade_name || company?.name || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Usuário atual
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {appUser?.name || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos passos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>Configure temas, cores e preferências gerais em Configurações.</p>
              <p>Crie usuários e defina perfis de acesso antes de liberar o sistema.</p>
              <p>Use Administração para gerenciar empresas e permissões globais.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
