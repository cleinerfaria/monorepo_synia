# rule-07-clean-architecture.md

Arquitetura Limpa (DRY + Separação de Camadas)

## Gatilho

Criar novos hooks, adicionar lógica em `src/lib/`, implementar lógica de negócio complexa (cálculo de preço, processamento em lote, transformações de dados).

## Regras Críticas

- **Lógica pura em `src/lib/`**: Cálculos, validações, transformações sem estado vivem aqui (ex: `billingCalculations.ts`)
- **Lógica com estado em `src/hooks/`**: Hooks que usam `useState`, chamadas a APIs, com estado compartilhado
- **Componentes apenas renderizam**: UI components chamam hooks/funções de lib, recebem dados e estado, nada de `if (user.plan === 'pro')` embutido
- **DRY (Don't Repeat Yourself)**: Se a mesma lógica é necessária em 2+ lugares, centraliza em hook ou função de lib
- **Rotas/Functions validam e delegam**: APIs/Functions apenas validam input → chamam lógica de lib → retornam resultado
- **Tipos compartilhados**: DTOs, interfaces usadas em múltiplos lugares ficam em `src/types/`

## Padrões

❌ **ERRADO: Lógica dispersa no componente**

```typescript
// ❌ Componente com lógica de billing
function BillingCard({ customer }) {
  const [finalAmount, setFinalAmount] = useState(0)

  useEffect(() => {
    const discount = customer.plan === 'free' ? 0 : customer.plan === 'pro' ? 0.1 : 0.2
    const tokens = Math.round(amount / 0.001)
    setFinalAmount(amount * (1 - discount))
    // … mais 30 linhas
  }, [customer.plan, amount])

  return <div>{finalAmount}</div>
}
```

✅ **CORRETO: Lib + Hook + Componente limpo**

```typescript
// src/lib/billingCalculations.ts (lógica pura)
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
| **Hooks**               | Lógica com estado, chamadas a APIs, composição | `src/hooks/use*.ts`     |
| **Lib**                 | Lógica pura, cálculos, transformações          | `src/lib/*.ts`          |
| **Types**               | Interfaces, enums, DTOs                        | `src/types/`            |
| **Backend (Functions)** | Autenticação, RLS, operações privilegiadas     | `supabase/functions/*/` |

## Checklist

- ✓ Nenhuma lógica de cálculo/validação complexa dentro de componentes
- ✓ Duplicação de código evitada (extrair para `src/lib/` ou `src/hooks/`)
- ✓ Componentes recebem dados já processados
- ✓ Tipos reutilizáveis em `src/types/`
- ✓ Lógica pura (sem efeitos colaterais) em `src/lib/`
- ✓ Rotas/Functions delegam para funções de lib

## Regra Final

> **Componentes exibem. Lib calcula. Hooks reutilizam.**
