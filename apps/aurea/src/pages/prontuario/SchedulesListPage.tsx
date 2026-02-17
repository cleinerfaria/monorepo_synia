import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientDemands } from '@/hooks/usePatientDemands';
import { Card, Button, Input, EmptyState, Loading } from '@/components/ui';
import { Breadcrumbs } from '@/components/ui';
import type { DemandWithPatient } from '@/hooks/usePatientDemands';

export default function SchedulesListPage() {
  const navigate = useNavigate();
  const { data: demands = [], isLoading } = usePatientDemands();
  const [search, setSearch] = useState('');

  // Filtrar demandas ativas e únicas por paciente
  const activeDemands = useMemo(() => {
    return demands
      .filter((d: DemandWithPatient) => d.is_active)
      .filter((d: DemandWithPatient) =>
        d.patient.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [demands, search]);

  // Agrupar primeira demanda por paciente (ou mostrar todas se quiser)
  const uniquePatients = useMemo(() => {
    const map = new Map<string, DemandWithPatient>();
    for (const demand of activeDemands) {
      if (!map.has(demand.patient_id)) {
        map.set(demand.patient_id, demand);
      }
    }
    return Array.from(map.values());
  }, [activeDemands]);

  const handleNavigateToSchedule = useCallback(
    (patientId: string) => {
      navigate(`/prontuario/escala/${patientId}`);
    },
    [navigate]
  );

  const breadcrumbs = [
    { label: 'Prontuário' },
    { label: 'Escalas' },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Breadcrumbs items={breadcrumbs} className="mb-3" />

      <div>
        <h1 className="text-2xl font-bold text-content-primary">Escalas Mensais</h1>
        <p className="text-sm text-content-secondary">
          Gerencie as escalas de atendimento dos pacientes
        </p>
      </div>

      {/* Busca */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
          />
        </div>
      </div>

      {/* Lista de pacientes com escalas ativas */}
      {uniquePatients.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {uniquePatients.map((demand) => {
            const startDate = new Date(demand.start_date);
            const endDate = demand.end_date ? new Date(demand.end_date) : null;
            const monthLabel = `${startDate.toLocaleString('pt-BR', { month: 'long' })} ${startDate.getFullYear()}`;

            return (
              <Card key={demand.id} className="flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-content-primary">
                    {demand.patient.name}
                  </h3>
                  <p className="text-xs text-content-muted">
                    Desde {startDate.toLocaleDateString('pt-BR')}
                    {endDate && ` até ${endDate.toLocaleDateString('pt-BR')}`}
                  </p>
                </div>

                <div className="flex gap-1 text-xs">
                  <span className="rounded-full bg-feedback-accent-bg px-2 py-0.5 text-feedback-accent-fg">
                    {demand.hours_per_day}h/dia
                  </span>
                  {demand.is_split && (
                    <span className="rounded-full bg-feedback-info-bg px-2 py-0.5 text-feedback-info-fg">
                      Dividido
                    </span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleNavigateToSchedule(demand.patient_id)}
                  className="w-full justify-center"
                >
                  Abrir Escala
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={search ? 'Nenhum paciente encontrado' : 'Sem escalas ativas'}
          description={
            search
              ? 'Tente ajustar os critérios de busca'
              : 'Crie uma escala (PAD) para começar a gerenciar plantões'
          }
          action={
            !search ? (
              <Button
                variant="primary"
                onClick={() => navigate('/prontuario/pad')}
              >
                Ir para PAD
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
