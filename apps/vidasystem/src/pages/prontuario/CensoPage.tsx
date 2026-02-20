import { Card, EmptyState } from '@/components/ui';
import { ClipboardList } from 'lucide-react';
export default function CensoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Censo</h1>
      </div>

      <Card padding="none">
        <div className="p-6">
          <EmptyState
            icon={<ClipboardList className="h-12 w-12 text-gray-400" />}
            title="Funcionalidade em desenvolvimento"
            description="Em breve você poderá visualizar o censo dos pacientes aqui."
          />
        </div>
      </Card>
    </div>
  );
}
