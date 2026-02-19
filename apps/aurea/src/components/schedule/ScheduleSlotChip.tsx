import { memo } from 'react';
import { useDraggable } from '@/lib/dnd-kit/core';
import { CSS } from '@/lib/dnd-kit/utilities';
import type { ScheduleProfessional } from '@/types/schedule';
import { useTheme } from '@/contexts/ThemeContext';

interface ScheduleSlotChipProps {
  professional: ScheduleProfessional;
  /** ID unico para drag: "date::index" */
  dragId?: string;
  startAt?: string;
  endAt?: string;
  isDraggable?: boolean;
  isDragging?: boolean;
  onRemove?: () => void;
  onEdit?: () => void;
}

/** Gerar iniciais do nome (max 2 letras) */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getDisplayName(professional: ScheduleProfessional): string {
  const socialName = professional.social_name?.trim();
  return socialName || professional.name;
}

function buildChipStyles(color: string | null, isDarkMode: boolean) {
  if (!color) {
    if (!isDarkMode) {
      return {
        backgroundColor: 'rgb(var(--color-primary-500) / 0.12)',
        borderColor: 'rgb(var(--color-primary-500) / 0.4)',
        color: 'rgb(var(--color-primary-700))',
      };
    }
    return {
      backgroundColor: 'rgb(var(--color-primary-500) / 0.24)',
      borderColor: 'rgb(var(--color-primary-500) / 0.58)',
      color: 'rgb(var(--color-primary-200))',
    };
  }
  if (color.startsWith('hsl')) {
    const hslValue = color.replace('hsl(', '').replace(')', '');
    if (!isDarkMode) {
      return {
        backgroundColor: `hsla(${hslValue}, 0.15)`,
        borderColor: `hsla(${hslValue}, 0.4)`,
        color: `hsl(${hslValue})`,
      };
    }
    const [h, s] = hslValue.split(',').map((part) => part.trim());
    return {
      backgroundColor: `hsla(${hslValue}, 0.24)`,
      borderColor: `hsla(${hslValue}, 0.58)`,
      color: `hsl(${h}, ${s}, 78%)`,
    };
  }
  const hex = color.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const factor = 0.6;
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);

  if (!isDarkMode) {
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.4)`,
      color: `rgb(${dr}, ${dg}, ${db})`,
    };
  }

  const lightFactor = 0.55;
  const lr = Math.round(r + (255 - r) * lightFactor);
  const lg = Math.round(g + (255 - g) * lightFactor);
  const lb = Math.round(b + (255 - b) * lightFactor);

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.24)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.6)`,
    color: `rgb(${lr}, ${lg}, ${lb})`,
  };
}

function formatTime(timestamp: string | undefined): string | null {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return null;
  }
}

function ScheduleSlotChipInner({
  professional,
  dragId,
  startAt,
  endAt,
  isDraggable = false,
  isDragging = false,
  onRemove,
  onEdit,
}: ScheduleSlotChipProps) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDragActive,
  } = useDraggable({
    id: dragId || `chip-${professional.id}`,
    disabled: !isDraggable,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 50,
      }
    : undefined;

  const color = professional.color;
  const chipStyles = buildChipStyles(color, isDarkMode);
  const displayName = getDisplayName(professional);
  const initials = getInitials(displayName);
  const startTime = formatTime(startAt);
  const endTime = formatTime(endAt);

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      style={{
        ...chipStyles,
        ...style,
        opacity: isDragActive || isDragging ? 0.6 : 1,
      }}
      className={`group flex w-full items-center gap-1 rounded border px-1 py-0.5 text-[10px] font-medium leading-tight transition-shadow md:text-[11px] ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'shadow-lg' : 'shadow-sm hover:shadow'}`}
      title={`${displayName}${professional.role ? ` — ${professional.role}` : ''}${professional.is_substitute ? ' (Folguista)' : ''}${startTime && endTime ? ` | ${startTime}–${endTime}` : ''}`}
    >
      {/* Initials avatar */}
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white md:h-5 md:w-5 md:text-[9px]"
        style={{ backgroundColor: color || 'rgb(var(--color-primary-500))' }}
      >
        {initials}
      </span>

      {/* Nome e horarios */}
      <div className="min-w-0 flex-1">
        <span className="block min-w-0 truncate">{displayName}</span>
        {(startTime || endTime) && (
          <span className="block text-[7px] leading-tight opacity-70 dark:opacity-95">
            {startTime && endTime ? `${startTime}–${endTime}` : startTime || endTime}
          </span>
        )}
      </div>

      {/* Badge de folguista */}
      {professional.is_substitute && (
        <span className="shrink-0 text-[8px] opacity-60" title="Folguista">
          ★
        </span>
      )}

      {/* Botao editar (visivel on hover) */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="ml-auto hidden shrink-0 rounded text-[10px] opacity-50 hover:opacity-100 group-hover:inline-flex"
          title="Editar horario"
        >
          ✎
        </button>
      )}

      {/* Botao remover (visivel on hover) */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hidden shrink-0 rounded text-[10px] opacity-50 hover:opacity-100 group-hover:inline-flex"
          title="Remover"
        >
          ×
        </button>
      )}
    </div>
  );
}

export const ScheduleSlotChip = memo(ScheduleSlotChipInner);
