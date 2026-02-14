import { sum, toBRL, toPercent } from '@/utils/metrics';
import type { RankingItem } from '@/types/sales';

interface TopRankingProps {
  title: string;
  subtitle: string;
  data: RankingItem[];
  isLoading?: boolean;
}

export default function TopRanking({ title, subtitle, data, isLoading }: TopRankingProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-2 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
          </div>
        </div>
      </div>
    );
  }

  // Encontrar o valor máximo para calcular a largura relativa das barras
  const maxValue = Math.max(...data.map((item) => item.value));
  const totalValue = sum(data, 'value');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>

        <div className="space-y-3">
          {data.slice(0, 10).map((item, index) => {
            const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex-1 break-words pr-2 text-sm font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {toBRL(item.value)}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {toPercent(percent, 1)}
                    </span>
                  </div>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
