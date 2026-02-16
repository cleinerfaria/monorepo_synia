import { Card, EmptyState } from '@/components/ui';
import { BarChart3 } from 'lucide-react';
export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          Relatórios
        </h1>
      </div>

      <Card padding="none">
        <div className="p-6">
          <EmptyState
            icon={<BarChart3 className="h-12 w-12 text-gray-400" />}
            title="Funcionalidade em desenvolvimento"
            description="Em breve você poderá acessar os relatórios do prontuário aqui."
          />
        </div>
      </Card>
    </div>
  );
}
