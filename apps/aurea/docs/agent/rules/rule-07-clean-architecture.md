# rule-07-clean-architecture.md

Arquitetura Limpa (DRY + Separacao de Camadas)

## Gatilho

Criar novos hooks, adicionar logica em `src/lib/`, implementar logica de negocio complexa (calculo de preco, processamento em lote, transformacoes de dados).

## Regras Criticas

- **Logica pura em `src/lib/`**: Calculos, validacoes e transformacoes sem estado vivem aqui (ex: `billingCalculations.ts`)
- **Logica com estado em `src/hooks/`**: Hooks que usam `useState`, chamadas a APIs, com estado compartilhado
- **Componentes apenas renderizam**: UI components chamam hooks/funcoes de lib, recebem dados e estado, nada de `if (user.plan === 'pro')` embutido
- **DRY (Don't Repeat Yourself)**: Se a mesma logica e necessaria em 2+ lugares, centraliza em hook ou funcao de lib
- **Rotas/Functions validam e delegam**: APIs/Functions apenas validam input -> chamam logica de lib -> retornam resultado
- **Tipos compartilhados**: DTOs e interfaces usadas em multiplos lugares ficam em `src/types/`
- **Padrao para campos de data**: toda entrada de data no frontend deve usar `DatePicker` (`src/components/ui/DatePicker.tsx`). E proibido usar `<input type="date">`, `<Input type="date">` ou `datetime-local`.

## Padroes

ERRADO: Logica dispersa no componente

```typescript
// Componente com logica de billing
function BillingCard({ customer }) {
  const [finalAmount, setFinalAmount] = useState(0)

  useEffect(() => {
    const discount = customer.plan === 'free' ? 0 : customer.plan === 'pro' ? 0.1 : 0.2
    const tokens = Math.round(amount / 0.001)
    setFinalAmount(amount * (1 - discount))
    // ... mais 30 linhas
  }, [customer.plan, amount])

  return <div>{finalAmount}</div>
}
```

CORRETO: Lib + Hook + Componente limpo

```typescript
// src/lib/billingCalculations.ts (logica pura)
const DISCOUNT_MAP = { free: 0, pro: 0.1, enterprise: 0.2 }

export function calculateDiscount(plan: string): number {
  return DISCOUNT_MAP[plan] ?? 0
}

export function calculateFinalAmount(amount: number, plan: string): number {
  const discount = calculateDiscount(plan)
  return amount * (1 - discount)
}

// src/hooks/useBilling.ts (com estado)
import { calculateFinalAmount } from '@/lib/billingCalculations'

export function useBilling(amount: number, plan: string) {
  const finalAmount = calculateFinalAmount(amount, plan)
  const tokensUsed = Math.round(amount / 0.001)
  return { finalAmount, tokensUsed }
}

// src/components/BillingCard.tsx (apenas renderiza)
function BillingCard({ customer, amount }: Props) {
  const { finalAmount, tokensUsed } = useBilling(amount, customer.plan)
  return <div>${finalAmount} ({tokensUsed} tokens)</div>
}
```

## Estrutura de Camadas

| Camada                  | O que faz                                      | Onde vive               |
| ----------------------- | ---------------------------------------------- | ----------------------- |
| **UI (Components)**     | Renderiza props, chama handlers                | `src/components/`       |
| **Hooks**               | Logica com estado, chamadas a APIs, composicao | `src/hooks/use*.ts`     |
| **Lib**                 | Logica pura, calculos, transformacoes          | `src/lib/*.ts`          |
| **Types**               | Interfaces, enums, DTOs                        | `src/types/`            |
| **Backend (Functions)** | Autenticacao, RLS, operacoes privilegiadas     | `supabase/functions/*/` |

## Checklist

- [x] Nenhuma logica de calculo/validacao complexa dentro de componentes
- [x] Duplicacao de codigo evitada (extrair para `src/lib/` ou `src/hooks/`)
- [x] Componentes recebem dados ja processados
- [x] Tipos reutilizaveis em `src/types/`
- [x] Logica pura (sem efeitos colaterais) em `src/lib/`
- [x] Rotas/Functions delegam para funcoes de lib
- [x] Campos de data usam `DatePicker` (sem `input/Input` com `type="date"` ou `datetime-local`)

## Regra Final

> **Componentes exibem. Lib calcula. Hooks reutilizam.**
