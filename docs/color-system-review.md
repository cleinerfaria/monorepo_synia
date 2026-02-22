# Revisao do Sistema de Cores

Data: 2026-02-07

## 1) Diagnostico

### Resumo objetivo

- Foram encontrados `60` usos de `#hex/rgb()/hsl()` em `12` arquivos.
- Existem `337` usos de classes de cor diretas (`red/blue/green/amber/...`) em `47` arquivos.
- Existem `1165` usos de `gray-*` em `68` arquivos.
- Ha mistura de `primary-*`, `gold-*`, cores diretas e estilos inline.

### Problemas criticos

1. Escala `primary` quebrada na pratica

- `src/contexts/ThemeContext.tsx:30` gera a paleta com o mesmo RGB para `50..950`.
- `src/contexts/ThemeContext.tsx:65` injeta essa escala igual nas CSS vars.
- Impacto: `hover/active/soft/muted` nao variam de verdade quando o `primary` muda.

2. Duas fontes de verdade para marca (`primary` x `gold`)

- `tailwind.config.js:8` define `primary` via CSS vars.
- `tailwind.config.js:21` define `gold` hardcoded.
- `src/index.css:120` e `src/index.css:125` ainda usam `gold` em foco/checked.
- Impacto: UI nao segue uma unica cor central.

3. Hardcoded em pontos estruturais

- `src/App.tsx:597` e `src/App.tsx:598` (toast success icon).
- `src/pages/SettingsPage.tsx:398` (presets de cor em hex).
- `src/pages/admin/CompanyModal.tsx:20` e `src/hooks/useCompanies.ts:91` (fallbacks fixos).
- `src/components/auth/PremiumHeroPanel.tsx:223` (gradientes e backgrounds hardcoded).

4. Tokens semanticos inexistentes para base da UI

- Card, Modal, Input, Table e varios controles usam `white/gray/red/...` direto:
- `src/components/ui/Card.tsx:22`
- `src/components/ui/Modal.tsx:57`
- `src/components/ui/Input.tsx:26`
- `src/components/ui/DataTable.tsx:167`
- `src/index.css:300`
- Impacto: manutencao cara, dark mode espalhado por classe e sem camada semantica.

5. Alertas e feedback sem componente padrao

- Padroes de `bg-red-50`, `bg-blue-50`, `text-amber-*` aparecem em varias telas (ex.: `src/pages/nfe/NfeImportDetailPage.tsx`).
- Impacto: inconsistencias visuais e duplicacao.

### Riscos de escalabilidade

- Trocar branding exige editar muitos arquivos.
- Alto risco de regressao visual em dark mode.
- Inconsistencia de contraste e acessibilidade por estado.
- Sem governanca: novas cores entram sem criterio semantico.

## 2) Proposta de Design Tokens (fonte unica)

## Estrutura sugerida

- `src/design-system/tokens/colors.ts`
- `src/design-system/theme/palette.ts`
- `src/design-system/theme/applyThemeTokens.ts`
- `src/design-system/tokens/componentTokens.ts` (opcional para phase 2)

## Modelo de tokens

1. Primitivos (nao usados direto em componente)

- `--color-primary-50..950`
- `--color-neutral-50..950`
- `--color-success-50..950`
- `--color-warning-50..950`
- `--color-danger-50..950`
- `--color-info-50..950`

2. Semanticos globais (usados no app)

- `--bg-canvas`, `--bg-surface`, `--bg-elevated`
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
- `--border-default`, `--border-strong`, `--border-focus`
- `--state-hover`, `--state-active`, `--state-selected`, `--state-disabled`
- `--feedback-success-*`, `--feedback-warning-*`, `--feedback-danger-*`, `--feedback-info-*`

3. Componente (consumo final)

- `--button-primary-bg`, `--button-primary-bg-hover`, `--button-primary-bg-active`
- `--input-bg`, `--input-border`, `--input-ring`, `--input-error-*`
- `--badge-success-*`, etc.

## Regra principal

- `primary` e o eixo de marca (acoes primarias e foco).
- `success/warning/danger/info` sao excecoes semanticas controladas (nao cores livres).
- Nenhuma cor nova sem novo token semantico documentado.

## Tailwind + CSS vars (compativel)

```js
// tailwind.config.js (exemplo)
extend: {
  colors: {
    primary: {
      50: 'rgb(var(--color-primary-50) / <alpha-value>)',
      500: 'rgb(var(--color-primary-500) / <alpha-value>)',
      600: 'rgb(var(--color-primary-600) / <alpha-value>)',
      700: 'rgb(var(--color-primary-700) / <alpha-value>)',
    },
    surface: {
      canvas: 'rgb(var(--bg-canvas) / <alpha-value>)',
      card: 'rgb(var(--bg-surface) / <alpha-value>)',
      elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
    },
    content: {
      primary: 'rgb(var(--text-primary) / <alpha-value>)',
      secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
      muted: 'rgb(var(--text-muted) / <alpha-value>)',
      inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
    },
    border: {
      DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
      strong: 'rgb(var(--border-strong) / <alpha-value>)',
      focus: 'rgb(var(--border-focus) / <alpha-value>)',
    },
  },
}
```

## 3) Documentacao de uso (o que usar x evitar)

| Contexto      | Usar                                  | Evitar                                          |
| ------------- | ------------------------------------- | ----------------------------------------------- | ------ | ---- | --------- | ------------------------------------------------------- |
| Acao primaria | `bg-primary-500 hover:bg-primary-600` | `bg-gold-500`, `bg-blue-600` direto             |
| Texto base    | `text-content-primary`                | `text-gray-900` espalhado                       |
| Superficie    | `bg-surface-card`                     | `bg-white dark:bg-gray-800` repetido            |
| Borda default | `border-border`                       | `border-gray-200 dark:border-gray-700` repetido |
| Erro de input | token semantico `input-error-*`       | `text-red-500` hardcoded                        |
| Badge status  | `variant="success                     | warning                                         | danger | info | neutral"` | variantes livres sem semantica (`purple`, `pink`, etc.) |
| Toast success | token `feedback-success-*`            | `iconTheme.primary = '#1aa2ff'`                 |

### Exemplo pratico

```tsx
// Bom (semantico)
<button className="bg-primary-500 text-content-inverse hover:bg-primary-600 focus:ring-2 focus:ring-border-focus" />

// Evitar
<button className="bg-blue-600 text-white hover:bg-blue-700" />
```

## 4) Guidelines para novas cores

1. Nova cor so entra se houver caso semantico recorrente (>= 3 usos reais).
2. Toda cor nova precisa de:

- nome semantico
- light/dark
- estados hover/active/soft/outline
- validacao minima de contraste (WCAG AA)

3. Proibido usar `#hex`, `rgb()`, `hsl()` em componente/pagina.
4. Proibido usar classe de paleta direta (`red-500`, `blue-600`, etc.) fora da camada de tokens.
5. `primary` controla CTA principal, foco, links e selected default.

## 5) Sugestoes de refatoracao (incremental e segura)

### Fase 0 (rapida, baixo risco)

- Corrigir geracao de escala `primary` em `src/contexts/ThemeContext.tsx:30`.
- Trocar hardcodes de toast (`src/App.tsx:597`) por variaveis semanticas.
- Unificar fallback de `primary_color` em um unico lugar (`ThemeContext` ou constants).
- Remover dependencia de `gold` para foco/checked em `src/index.css:120`.

### Fase 1 (base design system)

- Criar tokens semanticos de `surface/content/border/state`.
- Mapear no Tailwind e migrar componentes base:
- `src/components/ui/Button.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/DataTable.tsx`

### Fase 2 (produto)

- Substituir blocos de alerta ad hoc por componente `Alert`.
- Reduzir variantes visuais de `Badge` para conjunto semantico controlado.
- Migrar telas com maior concentracao de cores diretas:
- `src/pages/nfe/NfeImportDetailPage.tsx`
- `src/pages/cadastros/ProductFormPage.tsx`
- `src/pages/stock/StockPage.tsx`

### Fase 3 (governanca)

- Adicionar lint para bloquear hardcoded de cor.
- Checklist de PR: "token novo?" "tem dark?" "tem estados?".
- Snapshot visual para componentes base (light/dark + estados).

## 6) Mapa de ajustes por escopo solicitado

- Light/Dark: hoje depende de classes `dark:*` espalhadas; migrar para tokens semanticos de superficie/texto/borda.
- Tokens semanticos: criar `primary/secondary/success/warning/danger/info/neutral` com estados completos.
- Estados:
- `hover/active/focus/disabled/selected` devem ser tokens de estado, nao classes arbitrarias por componente.
- Componentes:
- Button: remover `danger` hardcoded (`src/components/ui/Button.tsx:26`) para token semantico.
- Badge: reduzir variantes livres e centralizar mapa semantico (`src/components/ui/Badge.tsx:44`).
- Card/Modal/Input/Table: trocar `white/gray/red` diretos por tokens semanticos.
- Alerts/Toasts: criar `Alert` reutilizavel e tokenizar tema do `Toaster`.
