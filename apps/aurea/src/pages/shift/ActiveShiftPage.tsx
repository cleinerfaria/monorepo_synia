import { useMyActiveShift, useShiftCheckOut } from '@/hooks/useMyShifts';
import { Loading } from '@/components/ui';
import { Clock, MapPin, User } from 'lucide-react';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function elapsedSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}min`;
}

export default function ActiveShiftPage() {
  const { data: activeShift, isLoading } = useMyActiveShift();
  const checkOut = useShiftCheckOut();

  const handleCheckOut = () => {
    if (!activeShift) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          checkOut.mutate({
            shiftId: activeShift.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          checkOut.mutate({ shiftId: activeShift.id });
        }
      );
    } else {
      checkOut.mutate({ shiftId: activeShift.id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="md" />
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <Clock className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">Nenhum plantao ativo</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Faca check-in em um plantao na aba &quot;Meus Plantoes&quot;.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Shift Card */}
      <div className="rounded-xl border-2 border-emerald-500 bg-white p-5 dark:border-emerald-600 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Plantao em andamento
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-900 dark:text-white">
              {formatTime(activeShift.start_at)} - {formatTime(activeShift.end_at)}
            </span>
          </div>

          {activeShift.check_in_at && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Check-in: {formatDateTime(activeShift.check_in_at)}
              </span>
            </div>
          )}

          {activeShift.check_in_at && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Tempo em servico: {elapsedSince(activeShift.check_in_at)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5">
          <button
            onClick={handleCheckOut}
            disabled={checkOut.isPending}
            className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {checkOut.isPending ? 'Finalizando...' : 'Fazer Check-out'}
          </button>
        </div>
      </div>
    </div>
  );
}
