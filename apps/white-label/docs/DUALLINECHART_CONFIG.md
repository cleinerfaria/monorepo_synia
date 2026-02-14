# DualLineChart - Configurações Independentes

## Problema Resolvido

O componente `DualLineChart` era utilizado em dois contextos diferentes com rótulos e configurações conflitantes:

1. **SalesOverviewPage**: Mostra "Faturamento vs Ano Anterior"
2. **SalesMetaPage**: Mostra "Faturamento vs Meta"

Mudanças feitas em uma página afetavam a outra, pois o componente tinha configurações hard-coded (rótulos da legenda fixos).

## Solução Implementada

Adicionadas novas props ao `DualLineChart` para permitir configurações independentes sem duplicação de código:

### Novas Props

| Prop                     | Tipo      | Padrão               | Descrição                                |
| ------------------------ | --------- | -------------------- | ---------------------------------------- |
| `metaLabel`              | `string`  | `"Ano Anterior"`     | Label para a linha de meta/referência    |
| `faturamentoLabel`       | `string`  | `"Últimos 12 meses"` | Label para a linha de faturamento        |
| `showFaturamentoMarkers` | `boolean` | `true`               | Mostrar círculos na linha de faturamento |
| `showMetaMarkers`        | `boolean` | `false`              | Mostrar círculos na linha de meta        |
| `showFaturamentoArea`    | `boolean` | `true`               | Mostrar área preenchida sob faturamento  |
| `showMetaLine`           | `boolean` | `true`               | Mostrar linha de meta                    |

### Props Existentes (Mantidas)

- `data`: Dados do gráfico
- `height`: Altura em pixels
- `className`: Classes CSS
- `valueFormatter`: Formatador de valores
- `metaColor`: Cor da linha de meta
- `faturamentoColor`: Cor da linha de faturamento
- `isLoading`: Estado de carregamento

## Modos de Uso

### Modo 1: Visão Geral (Padrão)

```tsx
// SalesOverviewPage.tsx
<DualLineChart
  data={revenueByMonth}
  height={340}
  isLoading={isLoadingData}
  metaColor="rgb(156, 163, 175)"
/>
```

**Características:**

- Rótulos: "Ano Anterior" vs "Últimos 12 meses"
- Marcadores visíveis no faturamento
- Meta sem marcadores
- Área preenchida ativa

### Modo 2: Meta (Novo)

```tsx
// SalesMetaPage.tsx
<DualLineChart
  data={chartData}
  height={400}
  isLoading={isLoadingKpis}
  metaLabel="Meta"
  faturamentoLabel="Faturamento"
  showFaturamentoMarkers={true}
  showMetaMarkers={false}
  showFaturamentoArea={true}
  showMetaLine={true}
/>
```

**Características:**

- Rótulos: "Meta" vs "Faturamento"
- Marcadores apenas no faturamento
- Sem marcadores na meta (para evitar poluição visual)
- Área preenchida ativa

## Mudanças Feitas

### 1. DualLineChart.tsx

**Interface atualizada:**

```tsx
interface DualLineChartProps {
  // ... props existentes
  metaLabel?: string;
  faturamentoLabel?: string;
  showFaturamentoMarkers?: boolean;
  showMetaMarkers?: boolean;
  showFaturamentoArea?: boolean;
  showMetaLine?: boolean;
}
```

**Legenda dinâmica:**

```tsx
<div className="absolute right-4 top-2 z-10 flex items-center gap-4 text-xs">
  {showMetaLine && (
    <div className="flex items-center gap-1.5">
      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: finalMetaColor }} />
      <span className="text-gray-600 dark:text-gray-400">{metaLabel}</span>
    </div>
  )}
  {/* ... faturamento label ... */}
</div>
```

**Renderização condicional:**

- Área de faturamento: `{showFaturamentoArea && <path ... />}`
- Linha de meta: `{showMetaLine && <path ... />}`
- Marcadores de faturamento: `{showFaturamentoMarkers && faturamentoPoints.map(...)}`
- Marcadores de meta: `{showMetaMarkers && metaPoints.map(...)}`

### 2. SalesMetaPage.tsx

Atualizado o uso do DualLineChart com configurações específicas da página:

```tsx
<DualLineChart
  data={chartData}
  height={400}
  isLoading={isLoadingKpis}
  metaLabel="Meta"
  faturamentoLabel="Faturamento"
  showFaturamentoMarkers={true}
  showMetaMarkers={false}
  showFaturamentoArea={true}
  showMetaLine={true}
/>
```

## Benefícios

✅ **Sem duplicação**: Um único componente para dois contextos  
✅ **Configurações independentes**: Cada página tem seu estilo específico  
✅ **Fácil manutenção**: Mudanças no componente afetam ambas as páginas igualmente  
✅ **Flexível**: Fácil adicionar novos modos ou configurações  
✅ **Backward compatible**: Valores padrão mantêm o comportamento original da Overview

## Testando as Mudanças

```bash
# Validar lint
npm run lint

# Build
npm run build

# Testar no navegador
npm run dev
```

Ambas as páginas (Overview e Meta) devem renderizar o gráfico com suas configurações específicas sem conflitos.
