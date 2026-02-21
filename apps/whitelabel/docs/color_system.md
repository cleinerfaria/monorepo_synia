# Sistema de Cores

**Resumo**
Este documento descreve o sistema de cores, fontes de verdade e como aplicar cores corretamente no projeto.

**Fontes de Verdade**

1. `src/lib/themeConstants.ts` define tokens e fallbacks.
2. `src/contexts/ThemeContext.tsx` gera a paleta da empresa e aplica em CSS vars.
3. `src/index.css` define o fallback inicial das CSS vars e estilos globais.
4. `tailwind.config.js` expoe a paleta `primary` via CSS vars.

**Fluxo de Aplicacao**

1. A cor primaria vem de `company.primary_color`.
2. `ThemeContext` cria uma paleta 50-950 a partir dessa cor.
3. As variaveis CSS `--color-primary-*` sao atualizadas no `:root`.
4. O Tailwind usa `primary-*` como ponte para essas variaveis.

**Tokens Disponiveis**

1. `DEFAULT_COMPANY_COLOR`: fallback atual para azul.
2. `CHART_SERIES_COLORS`: paleta fixa para series secundarias em graficos.
3. `NEUTRAL_COLORS`: neutros reutilizaveis para tooltips e fundos.
4. `STATUS_COLORS`: cores de status para sucesso, alerta, erro e info.
5. `PRESET_COLORS`: cores sugeridas no seletor de administracao.

**Como Usar em Componentes**

1. Preferir classes Tailwind com `primary-*` para UI geral.
2. Para SVG e estilos inline, usar `src/lib/themeColors.ts`.
3. Para graficos, usar a primaria na serie principal e `CHART_SERIES_COLORS` nas demais.

**Exemplos**

```tsx
import { getPrimaryColorRgb, toRgba } from '@/lib/themeColors';
import { NEUTRAL_COLORS } from '@/lib/themeConstants';

const stroke = getPrimaryColorRgb('500');
const tooltipBg = toRgba(NEUTRAL_COLORS.gray900, 0.95);
```

```tsx
import { CHART_SERIES_COLORS } from '@/lib/themeConstants';

const colors = [primaryColor, ...CHART_SERIES_COLORS];
```

**Boas Praticas**

1. Nao hardcode cores em componentes. Use tokens e CSS vars.
2. Evite `getComputedStyle` direto. Use helpers de `src/lib/themeColors.ts`.
3. Use `primary-*` no lugar de paletas fixas de marca.
4. Em tooltips e overlays, use `NEUTRAL_COLORS` e `toRgba`.
5. Para status, prefira `STATUS_COLORS` ou `Badge`.

**Como Atualizar a Cor Primaria**

1. Admin > Cores permite selecionar uma cor predefinida.
2. `company.primary_color` e persistida no banco.
3. A aplicacao atualiza automaticamente as CSS vars.

**Checklist de Revisao**

1. Nenhum uso de `#hex` ou `rgb(...)` em componentes fora de tokens.
2. `primary-*` aplicado em botoes, tabs, inputs e estados ativos.
3. Graficos seguem o padrao primaria + paleta fixa.
