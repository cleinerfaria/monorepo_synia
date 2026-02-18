import type { ReactNode, SyntheticEvent } from 'react';

export type UniqueIdentifier = string | number;

type AnyEvent = Event | SyntheticEvent | MouseEvent | PointerEvent | KeyboardEvent;

interface DragItem {
  id: UniqueIdentifier;
}

export interface DragStartEvent {
  active: DragItem;
  activatorEvent?: AnyEvent;
}

export interface DragOverEvent {
  active: DragItem;
  over: DragItem | null;
}

export interface DragEndEvent {
  active: DragItem;
  over: DragItem | null;
}

interface DndContextProps {
  children: ReactNode;
  sensors?: unknown[];
  onDragStart?: (event: DragStartEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
}

interface DragOverlayProps {
  children?: ReactNode;
  dropAnimation?: unknown;
}

interface DraggableOptions {
  id: UniqueIdentifier;
  disabled?: boolean;
}

interface DroppableOptions {
  id: UniqueIdentifier;
  disabled?: boolean;
}

interface Translate {
  x: number;
  y: number;
}

const noopRef = () => {};

export function DndContext({ children }: DndContextProps) {
  return <>{children}</>;
}

export function DragOverlay({ children }: DragOverlayProps) {
  return <>{children}</>;
}

export function useSensor<TSensor, TOptions>(sensor: TSensor, options?: TOptions) {
  return { sensor, options };
}

export function useSensors(...sensors: unknown[]) {
  return sensors;
}

export class PointerSensor {}

export function useDraggable(_options: DraggableOptions): {
  attributes: Record<string, never>;
  listeners: Record<string, never>;
  setNodeRef: (element: HTMLElement | null) => void;
  transform: Translate | null;
  isDragging: boolean;
} {
  return {
    attributes: {},
    listeners: {},
    setNodeRef: noopRef,
    transform: null,
    isDragging: false,
  };
}

export function useDroppable(_options: DroppableOptions): {
  setNodeRef: (element: HTMLElement | null) => void;
  isOver: boolean;
} {
  return {
    setNodeRef: noopRef,
    isOver: false,
  };
}
