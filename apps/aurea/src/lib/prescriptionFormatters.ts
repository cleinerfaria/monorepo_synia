/**
 * Utilitários para formatação de horários e orientações de administração
 */

/**
 * Formata horários de administração de forma compacta
 * Converte de ["08:00:00", "12:00:00", "17:15:00"] para "8, 12, 17:15"
 */
export function formatCompactTimeChecks(timeChecks: string[] | string | null): string {
  if (!timeChecks) return '-';

  try {
    let times: string[] = [];

    if (typeof timeChecks === 'string') {
      times = timeChecks.split(',').map((time) => time.trim());
    } else {
      times = timeChecks;
    }

    return times
      .map((time) => {
        // Remove segundos se forem :00
        if (time.endsWith(':00')) {
          const withoutSeconds = time.slice(0, -3);
          // Remove zero à esquerda da hora se for menor que 10
          return withoutSeconds.startsWith('0') ? withoutSeconds.slice(1) : withoutSeconds;
        }
        return time.startsWith('0') ? time.slice(1) : time;
      })
      .join(', ');
  } catch {
    return String(timeChecks);
  }
}

/**
 * Formata instruções de uso de forma compacta para lista
 */
export function formatCompactInstructions(instructions: string | null): string {
  if (!instructions) return '-';

  // Limita a 50 caracteres e adiciona ... se necessário
  const maxLength = 50;
  if (instructions.length <= maxLength) return instructions;

  return instructions.substring(0, maxLength).trim() + '...';
}

/**
 * Formata orientações de administração combinando route e instructions
 */
export function formatAdministrationGuidance(
  route?: { name: string } | null,
  instructions?: string | null
): string {
  const parts: string[] = [];

  if (route?.name) {
    parts.push(route.name);
  }

  if (instructions) {
    const compactInstructions = formatCompactInstructions(instructions);
    if (compactInstructions !== '-') {
      parts.push(compactInstructions);
    }
  }

  return parts.length > 0 ? parts.join(' • ') : '-';
}

/**
 * Combina horários e orientações em uma única string para economizar espaço
 */
export function formatTimeAndGuidance(
  timeChecks: string[] | string | null,
  route?: { name: string } | null,
  instructions?: string | null
): string {
  const times = formatCompactTimeChecks(timeChecks);
  const guidance = formatAdministrationGuidance(route, instructions);

  if (times === '-' && guidance === '-') return '-';
  if (times === '-') return guidance;
  if (guidance === '-') return times;

  return `${times} • ${guidance}`;
}
