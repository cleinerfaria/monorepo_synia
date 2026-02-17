import { memo, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { SlotType, ScheduleProfessional } from '@/types/schedule';

interface ScheduleSlotChipProps {
  professional: ScheduleProfessional;
  slot: SlotType;
  date?: string;
  startAt?: string; // ISO 8601 timestamp
  endAt?: string; // ISO 8601 timestamp
  isDraggable?: boolean;
  isDragging?: boolean;
  onRemove?: () => void;
}

/** Gerar iniciais do nome (máx 2 letras) */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Abreviar nome: primeiro nome + inicial do sobrenome */
function getShortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }
  return parts[0];
}

/**
 * Gerar cor HSL determinística para um profissional baseado no ID.
 * Garante que o mesmo profissional sempre tenha a mesma cor.
 */
function generateDeterministicColor(id: string): string {
  // Hash simples do ID string
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Mapear hash para HSL
  const hue = Math.abs(hash % 360);
  const saturation = 70;
  const lightness = 60;

  // Retornar como string HSL (funciona diretamente em CSS)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Gerar cor de background/borda/texto a partir da cor (hex ou HSL).
 */
function buildChipStyles(color: string | null) {
  if (!color) {
    return {
      backgroundColor: 'rgb(var(--color-primary-500) / 0.12)',
      borderColor: 'rgb(var(--color-primary-500) / 0.4)',
      color: 'rgb(var(--color-primary-700))',
    };
  }

  // Se for HSL, usar diretamente com alpha
  if (color.startsWith('hsl')) {
    // hsl(120, 70%, 60%) → hsla(120, 70%, 60%, 0.12)
    const hslValue = color.replace('hsl(', '').replace(')', '');
    return {
      backgroundColor: `hsla(${hslValue}, 0.15)`,
      borderColor: `hsla(${hslValue}, 0.4)`,
      color: `hsl(${hslValue})`,
    };
  }

  // Parse hex
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

  // Darken para texto
  const factor = 0.6;
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.4)`,
    color: `rgb(${dr}, ${dg}, ${db})`,
  };
}

/**
 * Formatar timestamp ISO para HH:MM
 */
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
  slot,
  date,
  startAt,
  endAt,
  isDraggable = false,
  isDragging = false,
  onRemove,
}: ScheduleSlotChipProps) {
  const dragId = date ? `${date}::${slot}` : `chip-${professional.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDragActive,
  } = useDraggable({
    id: dragId,
    disabled: !isDraggable,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 50,
      }
    : undefined;

  // Cores: usar cor do profissional ou gerar uma determinística pelo ID
  const color = professional.color || generateDeterministicColor(professional.id);
  const chipStyles = buildChipStyles(color);
  const shortName = getShortName(professional.name);
  const initials = getInitials(professional.name);
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
      title={`${professional.name}${professional.role ? ` — ${professional.role}` : ''}${professional.is_substitute ? ' (Folguista)' : ''}`}
    >
      {/* Initials avatar */}
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white md:h-5 md:w-5 md:text-[9px]"
        style={{
          backgroundColor: color,
        }}
      >
        {initials}
      </span>

      {/* Nome e horários */}
      <div className="min-w-0 flex-1">
        <span className="block min-w-0 truncate">{shortName}</span>
        {(startTime || endTime) && (
          <span className="block text-[7px] opacity-70 leading-tight">
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

      {/* Botão remover (visível on hover) */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-auto hidden shrink-0 rounded text-[10px] opacity-50 hover:opacity-100 group-hover:inline-flex"
          title="Remover"
        >
          ×
        </button>
      )}
    </div>
  );
}

export const ScheduleSlotChip = memo(ScheduleSlotChipInner);
