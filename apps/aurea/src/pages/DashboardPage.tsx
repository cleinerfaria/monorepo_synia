import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { Users, FileText, Archive, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
// Simulated stats for MVP
const stats = [
  {
    name: 'Pacientes Ativos',
    value: '42',
    change: '+12%',
    changeType: 'positive',
    icon: Users,
    href: '/cadastros/pacientes',
  },
  {
    name: 'Prescrições Ativas',
    value: '28',
    change: '+5%',
    changeType: 'positive',
    icon: FileText,
    href: '/prescricoes',
  },
  {
    name: 'Itens em Estoque',
    value: '156',
    change: '-3%',
    changeType: 'negative',
    icon: Archive,
    href: '/estoque/saldos',
  },
  {
    name: 'Alertas de Estoque',
    value: '8',
    change: '+2',
    changeType: 'negative',
    icon: AlertTriangle,
    href: '/estoque/saldos',
  },
]

const recentActivities = [
  {
    id: 1,
    type: 'prescription',
    description: 'Nova prescrição criada para Maria Silva',
    time: 'Há 5 minutos',
  },
  {
    id: 2,
    type: 'stock',
    description: 'Entrada de estoque: 100 unidades de Dipirona',
    time: 'Há 1 hora',
  },
  {
    id: 3,
    type: 'patient',
    description: 'Novo paciente cadastrado: João Santos',
    time: 'Há 2 horas',
  },
  {
    id: 4,
    type: 'nfe',
    description: 'NFe importada com sucesso: 12345',
    time: 'Há 3 horas',
  },
  {
    id: 5,
    type: 'equipment',
    description: 'Equipamento alocado: Concentrador O2 para Ana Lima',
    time: 'Há 5 horas',
  },
]

const lowStockItems = [
  { name: 'Dipirona 500mg', current: 15, minimum: 50, unit: 'UN' },
  { name: 'Seringa 10ml', current: 20, minimum: 100, unit: 'UN' },
  { name: 'Dieta Enteral Padrão', current: 5, minimum: 20, unit: 'L' },
  { name: 'Gaze Estéril', current: 30, minimum: 100, unit: 'PCT' },
]

export default function DashboardPage() {
  const { appUser, company } = useAuthStore()

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white lg:text-3xl">
          Olá, {appUser?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Bem-vindo ao {company?.trade_name || 'Áurea Care'}. Aqui está um resumo do seu dia.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {stats.map((stat) => (
          <Link key={stat.name} to={stat.href}>
            <Card hover className="h-full">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      {stat.changeType === 'positive' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          stat.changeType === 'positive'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-sm text-gray-400">vs mês anterior</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-gold-100 p-3 dark:bg-gold-900/20">
                    <stat.icon className="h-6 w-6 text-gold-600 dark:text-gold-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-gray-700"
                >
                  <div className="mt-2 h-2 w-2 rounded-full bg-primary-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader
            action={
              <Link
                to="/estoque/saldos"
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Ver todos
              </Link>
            }
          >
            <CardTitle>Alertas de Estoque Mínimo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item) => {
                const percentage = (item.current / item.minimum) * 100
                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {item.current} / {item.minimum} {item.unit}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage < 30
                            ? 'bg-red-500'
                            : percentage < 60
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              to="/cadastros/pacientes"
              className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700/50"
            >
              <Users className="h-8 w-8 text-primary-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Novo Paciente
              </span>
            </Link>
            <Link
              to="/prescricoes"
              className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700/50"
            >
              <FileText className="h-8 w-8 text-primary-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nova Prescrição
              </span>
            </Link>
            <Link
              to="/estoque/movimentacoes"
              className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700/50"
            >
              <Archive className="h-8 w-8 text-primary-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Lançar Estoque
              </span>
            </Link>
            <Link
              to="/nfe"
              className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700/50"
            >
              <FileText className="h-8 w-8 text-primary-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Importar NFe
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
