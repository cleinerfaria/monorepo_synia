import { ChangeEvent, FocusEvent, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Palette } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalFooter } from './Modal';

type ChangeHandler = (event: { target: { value: string; name?: string }; type?: string }) => void;
type PickerMode = 'hex' | 'rgb' | 'hsl';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
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

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

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

const componentToHex = (value: number): string => clamp(value, 0, 255).toString(16).padStart(2, '0');

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

const rgbToHsl = ({ r, g, b }: RgbColor): HslColor => {
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;

  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    if (max === normalizedR) {
      h = ((normalizedG - normalizedB) / delta) % 6;
    } else if (max === normalizedG) {
      h = (normalizedB - normalizedR) / delta + 2;
    } else {
      h = (normalizedR - normalizedG) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hslToRgb = ({ h, s, l }: HslColor): RgbColor => {
  const normalizedH = ((h % 360) + 360) % 360;
  const normalizedS = clamp(s, 0, 100) / 100;
  const normalizedL = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS;
  const hueSection = normalizedH / 60;
  const x = chroma * (1 - Math.abs((hueSection % 2) - 1));

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

  const matchLightness = normalizedL - chroma / 2;

  return {
    r: Math.round((rPrime + matchLightness) * 255),
    g: Math.round((gPrime + matchLightness) * 255),
    b: Math.round((bPrime + matchLightness) * 255),
  };
};

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
    const [mode, setMode] = useState<PickerMode>('hex');

    const [draftColor, setDraftColor] = useState<string>(normalizedPlaceholder);
    const [hexValue, setHexValue] = useState<string>(normalizedPlaceholder);
    const [rgbValue, setRgbValue] = useState<RgbColor>(() => hexToRgb(normalizedPlaceholder)!);
    const [hslValue, setHslValue] = useState<HslColor>(() => rgbToHsl(hexToRgb(normalizedPlaceholder)!));

    useEffect(() => {
      if (value === undefined) return;
      setSelectedColor(normalizeHexColor(value) ?? '');
    }, [value]);

    const assignRef = (
      targetRef: React.Ref<HTMLInputElement> | undefined,
      node: HTMLInputElement | null
    ) => {
      if (!targetRef) return;
      if (typeof targetRef === 'function') {
        targetRef(node);
        return;
      }
      (targetRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
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
      setRgbValue(nextRgb);
      setHslValue(rgbToHsl(nextRgb));
    };

    const openModal = () => {
      if (disabled) return;
      setMode('hex');
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

    const previewColor = selectedColor || normalizedPlaceholder;
    const previewGradient = useMemo(() => {
      const rgb = hexToRgb(draftColor) ?? hexToRgb(normalizedPlaceholder)!;
      return `linear-gradient(140deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.72))`;
    }, [draftColor, normalizedPlaceholder]);

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
              'input-field flex min-h-11 items-center justify-between gap-3 text-left',
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
              Escolher
            </span>
          </button>

          {clearable && selectedColor && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClear}
                className="text-content-muted hover:text-content-primary text-xs font-medium transition-colors"
              >
                Limpar cor
              </button>
            </div>
          )}
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
          <div className="space-y-5">
            <div className="border-border bg-surface-elevated/60 space-y-3 rounded-2xl border p-4">
              <div
                className="border-border h-24 w-full rounded-xl border shadow-sm"
                style={{ background: previewGradient }}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-content-secondary text-xs uppercase tracking-wide">Cor atual</p>
                <code className="bg-surface-card text-content-primary rounded-md px-2 py-1 text-xs font-semibold">
                  {draftColor}
                </code>
              </div>
            </div>

            <div className="border-border inline-flex rounded-xl border p-1">
              {(['hex', 'rgb', 'hsl'] as PickerMode[]).map((currentMode) => (
                <button
                  key={currentMode}
                  type="button"
                  onClick={() => setMode(currentMode)}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                    mode === currentMode
                      ? 'bg-primary-500/15 text-primary-700 dark:text-primary-300'
                      : 'text-content-muted hover:text-content-primary'
                  )}
                >
                  {currentMode}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="label">Seletor visual</label>
                <input
                  type="color"
                  value={draftColor}
                  onChange={(event) => syncDraftFromHex(event.target.value)}
                  className="input-field h-12 w-full cursor-pointer p-1.5"
                />
              </div>

              {mode === 'hex' && (
                <div className="space-y-2">
                  <label className="label">HEX</label>
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
                </div>
              )}

              {mode === 'rgb' && (
                <div className="grid grid-cols-3 gap-2 sm:col-span-1">
                  {(['r', 'g', 'b'] as Array<keyof RgbColor>).map((channel) => (
                    <div key={channel} className="space-y-2">
                      <label className="label uppercase">{channel}</label>
                      <input
                        type="number"
                        min={0}
                        max={255}
                        value={rgbValue[channel]}
                        onChange={(event) => {
                          const rawValue = Number.parseInt(event.target.value, 10);
                          if (Number.isNaN(rawValue)) return;
                          const nextRgb = {
                            ...rgbValue,
                            [channel]: clamp(rawValue, 0, 255),
                          };
                          const nextHex = rgbToHex(nextRgb);
                          setRgbValue(nextRgb);
                          setHslValue(rgbToHsl(nextRgb));
                          setHexValue(nextHex);
                          setDraftColor(nextHex);
                        }}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>
              )}

              {mode === 'hsl' && (
                <div className="grid grid-cols-3 gap-2 sm:col-span-1">
                  {(
                    [
                      { key: 'h', max: 360 },
                      { key: 's', max: 100 },
                      { key: 'l', max: 100 },
                    ] as Array<{ key: keyof HslColor; max: number }>
                  ).map(({ key, max }) => (
                    <div key={key} className="space-y-2">
                      <label className="label uppercase">{key}</label>
                      <input
                        type="number"
                        min={0}
                        max={max}
                        value={hslValue[key]}
                        onChange={(event) => {
                          const rawValue = Number.parseInt(event.target.value, 10);
                          if (Number.isNaN(rawValue)) return;
                          const nextHsl = {
                            ...hslValue,
                            [key]: clamp(rawValue, 0, max),
                          };
                          const nextRgb = hslToRgb(nextHsl);
                          const nextHex = rgbToHex(nextRgb);
                          setHslValue(nextHsl);
                          setRgbValue(nextRgb);
                          setHexValue(nextHex);
                          setDraftColor(nextHex);
                        }}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>
              )}
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
            <Button type="button" variant="solid" showIcon={false} label="Aplicar cor" onClick={handleApply} />
          </ModalFooter>
        </Modal>
      </div>
    );
  }
);

ColorPicker.displayName = 'ColorPicker';
