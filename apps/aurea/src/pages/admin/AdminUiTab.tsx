import { useMemo, useState } from 'react'
import { Check, FilePlus2, Settings2, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge, ButtonNew, Card, CardContent, Input, SwitchNew } from '@/components/ui'
import type { ButtonNewDropdownItem, ButtonNewProps } from '@/components/ui'

type ButtonVariant = NonNullable<ButtonNewProps['variant']>
type ButtonSize = NonNullable<ButtonNewProps['size']>
type IconOption = 'default' | 'sparkles' | 'file' | 'settings' | 'none'
type WidthMode = 'auto' | 'full'

const variants: ButtonVariant[] = ['solid', 'soft', 'outline']
const sizes: ButtonSize[] = ['sm', 'md', 'lg']

const variantLabels: Record<ButtonVariant, string> = {
  solid: 'Solid',
  soft: 'Soft',
  outline: 'Outline',
  neutral: 'Neutral',
  danger: 'Danger',
}

const sizeLabels: Record<ButtonSize, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
}

const iconLabels: Record<IconOption, string> = {
  default: 'Padrao',
  sparkles: 'Sparkles',
  file: 'File Plus',
  settings: 'Settings',
  none: 'Sem icone',
}

const widthLabels: Record<WidthMode, string> = {
  auto: 'Auto',
  full: 'Largura total',
}

function resolveIcon(iconOption: IconOption) {
  if (iconOption === 'none' || iconOption === 'default') return undefined
  if (iconOption === 'sparkles') return <Sparkles className="h-4 w-4" />
  if (iconOption === 'file') return <FilePlus2 className="h-4 w-4" />
  return <Settings2 className="h-4 w-4" />
}

function UiPreviewPanel({
  title,
  subtitle,
  forceDark = false,
  previewProps,
}: {
  title: string
  subtitle: string
  forceDark?: boolean
  previewProps: ButtonNewProps
}) {
  return (
    <div className={clsx('rounded-2xl border border-border shadow-soft', forceDark && 'dark')}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-content-primary">{title}</h3>
          <Badge variant={forceDark ? 'info' : 'neutral'}>{forceDark ? 'Dark' : 'Light'}</Badge>
        </div>
        <p className="mt-1 text-xs text-content-muted">{subtitle}</p>
      </div>
      <div className="rounded-b-2xl bg-surface-canvas p-5">
        <div className="rounded-xl border border-border bg-surface-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">
                Principal
              </p>
              <ButtonNew {...previewProps} />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">
                Disabled
              </p>
              <ButtonNew {...previewProps} disabled />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SwitchPreviewPanel({
  title,
  subtitle,
  forceDark = false,
  checked,
  label,
  description,
  showStatus,
  disabled,
}: {
  title: string
  subtitle: string
  forceDark?: boolean
  checked: boolean
  label: string
  description?: string
  showStatus: boolean
  disabled: boolean
}) {
  return (
    <div className={clsx('rounded-2xl border border-border shadow-soft', forceDark && 'dark')}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-content-primary">{title}</h3>
          <Badge variant={forceDark ? 'info' : 'neutral'}>{forceDark ? 'Dark' : 'Light'}</Badge>
        </div>
        <p className="mt-1 text-xs text-content-muted">{subtitle}</p>
      </div>
      <div className="rounded-b-2xl bg-surface-canvas p-5">
        <div className="rounded-xl border border-border bg-surface-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">
                Principal
              </p>
              <SwitchNew
                checked={checked}
                label={label}
                description={description}
                showStatus={showStatus}
                disabled={disabled}
                readOnly
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">
                Disabled
              </p>
              <SwitchNew
                checked={checked}
                label={label}
                description={description}
                showStatus={showStatus}
                disabled
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface UiTabProps {
  companyName?: string | null
}

export default function AdminUiTab({ companyName }: UiTabProps) {
  const [label, setLabel] = useState('Novo Registro')
  const [variant, setVariant] = useState<ButtonVariant>('solid')
  const [size, setSize] = useState<ButtonSize>('md')
  const [iconOption, setIconOption] = useState<IconOption>('default')
  const [widthMode, setWidthMode] = useState<WidthMode>('auto')
  const [showIcon, setShowIcon] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [withDropdown, setWithDropdown] = useState(true)
  const [dropdownPortal, setDropdownPortal] = useState(false)
  const [customClassName, setCustomClassName] = useState('')
  const [switchLabel, setSwitchLabel] = useState('Status da Prescricao')
  const [switchDescription, setSwitchDescription] = useState('Controla o status de liberacao')
  const [switchChecked, setSwitchChecked] = useState(true)
  const [switchDisabled, setSwitchDisabled] = useState(false)
  const [switchShowStatus, setSwitchShowStatus] = useState(true)

  const dropdownItems = useMemo<ButtonNewDropdownItem[] | undefined>(() => {
    if (!withDropdown) return undefined

    return [
      { id: 'create', label: 'Criar agora', icon: <Check className="h-4 w-4" /> },
      { id: 'draft', label: 'Salvar como rascunho' },
      { id: 'import', label: 'Importar dados' },
      { id: 'scheduled', label: 'Agendar', disabled: true },
    ]
  }, [withDropdown])

  const playgroundProps: ButtonNewProps = {
    label,
    variant,
    size,
    showIcon,
    icon: resolveIcon(iconOption),
    disabled,
    dropdownItems,
    dropdownPortal,
    className: clsx(widthMode === 'full' && 'w-full', customClassName.trim()),
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-content-primary">UI Lab - ButtonNew</h2>
              <p className="text-sm text-content-muted">
                Vitrine visual com modo light e dark em paralelo.
                {companyName ? ` Tema atual: ${companyName}.` : ''}
              </p>
            </div>
            <Badge variant="info">Design Tokens</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-content-muted">
            Playground
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input
              label="Label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Digite o texto do botao"
            />

            <div>
              <label className="label">Variant</label>
              <select
                value={variant}
                onChange={(event) => setVariant(event.target.value as ButtonVariant)}
                className="input-field"
              >
                {variants.map((item) => (
                  <option key={item} value={item}>
                    {variantLabels[item]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Size</label>
              <select
                value={size}
                onChange={(event) => setSize(event.target.value as ButtonSize)}
                className="input-field"
              >
                {sizes.map((item) => (
                  <option key={item} value={item}>
                    {sizeLabels[item]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Icone</label>
              <select
                value={iconOption}
                onChange={(event) => setIconOption(event.target.value as IconOption)}
                className="input-field"
              >
                {(Object.keys(iconLabels) as IconOption[]).map((item) => (
                  <option key={item} value={item}>
                    {iconLabels[item]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Largura</label>
              <select
                value={widthMode}
                onChange={(event) => setWidthMode(event.target.value as WidthMode)}
                className="input-field"
              >
                {(Object.keys(widthLabels) as WidthMode[]).map((item) => (
                  <option key={item} value={item}>
                    {widthLabels[item]}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="ClassName extra"
              value={customClassName}
              onChange={(event) => setCustomClassName(event.target.value)}
              placeholder="ex: ring-4 ring-primary-500/30"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={showIcon}
                onChange={(event) => setShowIcon(event.target.checked)}
              />
              Exibir icone
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={disabled}
                onChange={(event) => setDisabled(event.target.checked)}
              />
              Desabilitado
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={withDropdown}
                onChange={(event) => setWithDropdown(event.target.checked)}
              />
              Com dropdown
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={dropdownPortal}
                onChange={(event) => setDropdownPortal(event.target.checked)}
              />
              Dropdown via portal
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-content-muted">
            SwitchNew Playground
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Label"
              value={switchLabel}
              onChange={(event) => setSwitchLabel(event.target.value)}
              placeholder="Digite o label do switch"
            />
            <Input
              label="Descricao"
              value={switchDescription}
              onChange={(event) => setSwitchDescription(event.target.value)}
              placeholder="Descricao curta opcional"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={switchChecked}
                onChange={(event) => setSwitchChecked(event.target.checked)}
              />
              Ativo
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={switchDisabled}
                onChange={(event) => setSwitchDisabled(event.target.checked)}
              />
              Desabilitado
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={switchShowStatus}
                onChange={(event) => setSwitchShowStatus(event.target.checked)}
              />
              Exibir status
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <UiPreviewPanel
          title="Preview Light"
          subtitle="Renderizacao no tema claro."
          previewProps={playgroundProps}
        />
        <UiPreviewPanel
          title="Preview Dark"
          subtitle="Mesmo componente renderizado com classe dark forcada."
          forceDark
          previewProps={playgroundProps}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SwitchPreviewPanel
          title="Switch Preview Light"
          subtitle="Renderizacao do SwitchNew no tema claro."
          checked={switchChecked}
          label={switchLabel}
          description={switchDescription || undefined}
          showStatus={switchShowStatus}
          disabled={switchDisabled}
        />
        <SwitchPreviewPanel
          title="Switch Preview Dark"
          subtitle="Mesmo switch com classe dark forcada."
          forceDark
          checked={switchChecked}
          label={switchLabel}
          description={switchDescription || undefined}
          showStatus={switchShowStatus}
          disabled={switchDisabled}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-content-muted">
            Catalogo completo
          </h3>
          <p className="mt-1 text-sm text-content-muted">
            Todas as combinacoes de variant e size para os cenarios base.
          </p>

          <div className="mt-5 space-y-5">
            {variants.map((currentVariant) => (
              <div
                key={currentVariant}
                className="rounded-xl border border-border bg-surface-canvas p-4 shadow-soft"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="neutral">{variantLabels[currentVariant]}</Badge>
                  <span className="text-xs text-content-muted">Com e sem dropdown</span>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {sizes.map((currentSize) => (
                    <div key={`${currentVariant}-${currentSize}`} className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">
                        {sizeLabels[currentSize]}
                      </p>
                      <div className="space-y-3">
                        <ButtonNew
                          label={`${variantLabels[currentVariant]} ${sizeLabels[currentSize]}`}
                          variant={currentVariant}
                          size={currentSize}
                          showIcon
                        />
                        <ButtonNew
                          label="Sem icone"
                          variant={currentVariant}
                          size={currentSize}
                          showIcon={false}
                        />
                        <ButtonNew
                          label="Com dropdown"
                          variant={currentVariant}
                          size={currentSize}
                          dropdownItems={dropdownItems}
                        />
                        <ButtonNew
                          label="Disabled"
                          variant={currentVariant}
                          size={currentSize}
                          disabled
                          dropdownItems={dropdownItems}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-content-muted">
            SwitchNew Catalogo
          </h3>
          <p className="mt-1 text-sm text-content-muted">Estados base do componente.</p>

          <div className="mt-5 rounded-xl border border-border bg-surface-canvas p-4 shadow-soft">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">
                  Interativo
                </p>
                <SwitchNew
                  checked={switchChecked}
                  onChange={(event) => setSwitchChecked(event.target.checked)}
                  label="Com status"
                  description="Controlado no playground"
                  showStatus
                />
                <SwitchNew
                  checked={switchChecked}
                  onChange={(event) => setSwitchChecked(event.target.checked)}
                  label="Sem status"
                  description="Sem texto Ativo/Inativo"
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">
                  Disabled
                </p>
                <SwitchNew
                  checked
                  label="Ativo desabilitado"
                  description="Estado bloqueado para edicao"
                  showStatus
                  disabled
                  readOnly
                />
                <SwitchNew
                  checked={false}
                  label="Inativo desabilitado"
                  description="Estado bloqueado para edicao"
                  showStatus
                  disabled
                  readOnly
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
