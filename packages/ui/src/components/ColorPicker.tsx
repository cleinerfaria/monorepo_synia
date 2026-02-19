import {
  ChangeEvent,
  FocusEvent,
  MutableRefObject,
  PointerEvent,
  Ref,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
import { Palette } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalFooter } from './Modal';

type ChangeHandler = (event: { target: { value: string; name?: string }; type?: string }) => void;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HsvColor {
  h: number;
  s: number;
  v: number;
}

export interface ColorPickerProps {
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?:
    | ((value: string) => void)
    | ((event: ChangeEvent<HTMLInputElement>) => void)
    | ChangeHandler;
  onBlur?: (() => void) | ((event: FocusEvent<HTMLInputElement>) => void) | ChangeHandler;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  modalTitle?: string;
  clearable?: boolean;
}

const FALLBACK_COLOR = '#1AA2FF';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeHexColor = (value?: string | null): string | null => {
  if (!value) return null;
  const sanitized = value.trim().replace(/^#/, '');

  if (!/^[\da-fA-F]{3}$|^[\da-fA-F]{6}$/.test(sanitized)) return null;

  const expanded =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : sanitized;

  return `#${expanded.toUpperCase()}`;
};

const componentToHex = (value: number): string =>
  clamp(value, 0, 255).toString(16).padStart(2, '0');

const hexToRgb = (hexColor: string): RgbColor | null => {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return null;

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
};

const rgbToHex = ({ r, g, b }: RgbColor): string =>
  `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`.toUpperCase();

const rgbToHsv = ({ r, g, b }: RgbColor): HsvColor => {
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;

  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === normalizedR) {
      h = ((normalizedG - normalizedB) / delta) % 6;
    } else if (max === normalizedG) {
      h = (normalizedB - normalizedR) / delta + 2;
    } else {
      h = (normalizedR - normalizedG) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
};

const hsvToRgb = ({ h, s, v }: HsvColor): RgbColor => {
  const normalizedH = ((h % 360) + 360) % 360;
  const normalizedS = clamp(s, 0, 100) / 100;
  const normalizedV = clamp(v, 0, 100) / 100;

  const chroma = normalizedV * normalizedS;
  const hueSection = normalizedH / 60;
  const x = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const m = normalizedV - chroma;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hueSection >= 0 && hueSection < 1) {
    rPrime = chroma;
    gPrime = x;
  } else if (hueSection >= 1 && hueSection < 2) {
    rPrime = x;
    gPrime = chroma;
  } else if (hueSection >= 2 && hueSection < 3) {
    gPrime = chroma;
    bPrime = x;
  } else if (hueSection >= 3 && hueSection < 4) {
    gPrime = x;
    bPrime = chroma;
  } else if (hueSection >= 4 && hueSection < 5) {
    rPrime = x;
    bPrime = chroma;
  } else {
    rPrime = chroma;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
};

const HUE_BACKGROUND =
  'linear-gradient(90deg, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))';

export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(
  (
    {
      label,
      hint,
      error,
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      required,
      disabled,
      className,
      placeholder = '#1aa2ff',
      modalTitle = 'Selecionar cor',
      clearable = true,
    },
    ref
  ) => {
    const hiddenInputRef = useRef<HTMLInputElement | null>(null);
    const normalizedPlaceholder = normalizeHexColor(placeholder) ?? FALLBACK_COLOR;

    const [selectedColor, setSelectedColor] = useState<string>(
      normalizeHexColor(value ?? defaultValue) ?? ''
    );
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [draftColor, setDraftColor] = useState<string>(normalizedPlaceholder);
    const [hexValue, setHexValue] = useState<string>(normalizedPlaceholder);

    const initialRgb = hexToRgb(normalizedPlaceholder) ?? { r: 26, g: 162, b: 255 };
    const [hsvValue, setHsvValue] = useState<HsvColor>(() => rgbToHsv(initialRgb));

    useEffect(() => {
      if (value === undefined) return;
      setSelectedColor(normalizeHexColor(value) ?? '');
    }, [value]);

    const assignRef = (
      targetRef: Ref<HTMLInputElement> | undefined,
      node: HTMLInputElement | null
    ) => {
      if (!targetRef) return;
      if (typeof targetRef === 'function') {
        targetRef(node);
        return;
      }
      (targetRef as MutableRefObject<HTMLInputElement | null>).current = node;
    };

    const setRefs = (node: HTMLInputElement | null) => {
      hiddenInputRef.current = node;
      assignRef(ref, node);
    };

    const triggerOnBlur = () => {
      if (!onBlur) return;
      const syntheticEvent = {
        target: { value: selectedColor, name: name || '' },
        type: 'blur',
      };
      (onBlur as ChangeHandler)(syntheticEvent);
    };

    const triggerOnChange = (nextColor: string) => {
      setSelectedColor(nextColor);

      if (hiddenInputRef.current && typeof window !== 'undefined') {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeValueSetter?.call(hiddenInputRef.current, nextColor);
        hiddenInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (!onChange) return;
      const syntheticEvent = {
        target: { value: nextColor, name: name || '' },
        currentTarget: { value: nextColor, name: name || '' },
        type: 'change',
      } as ChangeEvent<HTMLInputElement>;
      (onChange as (event: ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
    };

    const syncDraftFromHex = (nextHexColor: string) => {
      const normalized = normalizeHexColor(nextHexColor);
      if (!normalized) return;

      const nextRgb = hexToRgb(normalized);
      if (!nextRgb) return;

      setDraftColor(normalized);
      setHexValue(normalized);
      setHsvValue(rgbToHsv(nextRgb));
    };

    const syncDraftFromHsv = (nextHsv: HsvColor) => {
      const sanitizedHsv = {
        h: ((nextHsv.h % 360) + 360) % 360,
        s: clamp(nextHsv.s, 0, 100),
        v: clamp(nextHsv.v, 0, 100),
      };

      const nextRgb = hsvToRgb(sanitizedHsv);
      const nextHex = rgbToHex(nextRgb);

      setDraftColor(nextHex);
      setHexValue(nextHex);
      setHsvValue(sanitizedHsv);
    };

    const openModal = () => {
      if (disabled) return;
      syncDraftFromHex(selectedColor || normalizedPlaceholder);
      setIsModalOpen(true);
    };

    const handleApply = () => {
      triggerOnChange(draftColor);
      setIsModalOpen(false);
    };

    const handleClear = () => {
      triggerOnChange('');
      triggerOnBlur();
    };

    const handleColorPanelPointer = (event: PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = clamp(event.clientX - rect.left, 0, rect.width);
      const y = clamp(event.clientY - rect.top, 0, rect.height);

      const nextS = Math.round((x / rect.width) * 100);
      const nextV = Math.round(100 - (y / rect.height) * 100);

      syncDraftFromHsv({ ...hsvValue, s: nextS, v: nextV });
    };

    const handleColorPanelPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      handleColorPanelPointer(event);
    };

    const handleColorPanelPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      if (event.buttons === 0 && event.pressure === 0) return;
      handleColorPanelPointer(event);
    };

    const handleColorPanelPointerUp = (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    const previewColor = selectedColor || normalizedPlaceholder;

    return (
      <div className={clsx('w-full', className)}>
        <input type="hidden" ref={setRefs} name={name} value={selectedColor} onChange={() => {}} />

        {label && (
          <label className="label">
            {label}
            {required && <span className="text-feedback-danger-fg ml-1">*</span>}
          </label>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={openModal}
            onBlur={triggerOnBlur}
            disabled={disabled}
            className={clsx(
              'input-field flex items-center justify-between gap-2 text-left',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="border-border block h-6 w-6 rounded-md border"
                style={{ backgroundColor: previewColor }}
                aria-hidden="true"
              />
              <span className="text-content-primary truncate text-sm font-medium">
                {selectedColor || normalizedPlaceholder}
              </span>
            </div>
            <span className="text-content-muted inline-flex items-center gap-1 text-xs font-medium">
              <Palette className="h-4 w-4" />
            </span>
          </button>
        </div>

        {hint && !error && <p className="text-content-muted ml-1 mt-1 text-xs">{hint}</p>}
        {error && <p className="text-feedback-danger-fg mt-1.5 text-sm">{error}</p>}

        <Modal
          nested
          size="md"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalTitle}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div
                role="presentation"
                onPointerDown={handleColorPanelPointerDown}
                onPointerMove={handleColorPanelPointerMove}
                onPointerUp={handleColorPanelPointerUp}
                className="border-border relative h-36 w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl border shadow-sm"
                style={{ backgroundColor: `hsl(${hsvValue.h} 100% 50%)` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <span
                  className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                  style={{ left: `${hsvValue.s}%`, top: `${100 - hsvValue.v}%` }}
                />
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={hsvValue.h}
                  onChange={(event) => {
                    const nextHue = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(nextHue)) return;
                    syncDraftFromHsv({ ...hsvValue, h: clamp(nextHue, 0, 360) });
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full"
                  style={{ background: HUE_BACKGROUND }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={hexValue}
                onChange={(event) => {
                  const nextValue = event.target.value.toUpperCase();
                  setHexValue(nextValue);
                  const normalized = normalizeHexColor(nextValue);
                  if (normalized) syncDraftFromHex(normalized);
                }}
                onBlur={() => {
                  const normalized = normalizeHexColor(hexValue);
                  if (normalized) {
                    syncDraftFromHex(normalized);
                    return;
                  }
                  setHexValue(draftColor);
                }}
                placeholder={normalizedPlaceholder}
                className="input-field font-mono uppercase"
              />
              <div
                className="border-border bg-surface-elevated relative h-[101px] w-full rounded-xl border shadow-sm"
                style={{ backgroundColor: draftColor }}
              ></div>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="neutral"
              showIcon={false}
              label="Cancelar"
              onClick={() => setIsModalOpen(false)}
            />
            <Button
              type="button"
              variant="solid"
              showIcon={false}
              label="Aplicar cor"
              onClick={handleApply}
            />
          </ModalFooter>
        </Modal>
      </div>
    );
  }
);

ColorPicker.displayName = 'ColorPicker';
