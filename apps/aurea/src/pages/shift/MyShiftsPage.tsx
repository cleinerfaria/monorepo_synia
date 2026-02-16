import { useState, useMemo } from 'react';
import { useMyShifts, useShiftCheckIn } from '@/hooks/useMyShifts';
import { Loading } from '@/components/ui';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planejado',
  open: 'Aberto',
  assigned: 'Atribuido',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  missed: 'Faltou',
  canceled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  assigned: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  in_progress: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  finished: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  missed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  canceled: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyShiftsPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { from, to } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + weekOffset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      from: startOfWeek.toISOString(),
      to: endOfWeek.toISOString(),
    };
  }, [weekOffset]);

  const { data: shifts = [], isLoading } = useMyShifts(from, to);
  const checkIn = useShiftCheckIn();

  const handleCheckIn = (shiftId: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          checkIn.mutate({
            shiftId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          checkIn.mutate({ shiftId });
        }
      );
    } else {
      checkIn.mutate({ shiftId });
    }
  };

  const weekLabel = useMemo(() => {
    const startOfWeek = new Date(from);
    const endOfWeek = new Date(to);
    return `${startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }, [from, to]);

  return (
    <div className="space-y-4">
      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((prev) => prev - 1)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Voltar para esta semana
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((prev) => prev + 1)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Shifts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loading size="md" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum plantao neste periodo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(shift.start_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {formatTime(shift.start_at)} - {formatTime(shift.end_at)}
                    </span>
                  </div>
                  {shift.check_in_at && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Check-in: {formatTime(shift.check_in_at)}
                      </span>
                    </div>
                  )}
                  {shift.check_out_at && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Check-out: {formatTime(shift.check_out_at)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={clsx(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      STATUS_COLORS[shift.status] || STATUS_COLORS.planned
                    )}
                  >
                    {STATUS_LABELS[shift.status] || shift.status}
                  </span>
                  {(shift.status === 'open' || shift.status === 'assigned') && (
                    <button
                      onClick={() => handleCheckIn(shift.id)}
                      disabled={checkIn.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {checkIn.isPending ? 'Entrando...' : 'Check-in'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
