# rule-05-encoding-e-integridade-textual.md

Integridade de Encoding e Texto

GATILHO: Criação ou alteração de textos com acentuação/símbolos, labels de UI, SQL seeds, CSVs/importadores e documentação.

## REGRAS CRÍTICAS

- **UTF-8 obrigatório**: Arquivos de código, SQL, JSON, Markdown e seeds devem estar em UTF-8.
- **Sem mojibake**: É proibido introduzir sequências corrompidas (ex.: acentos/símbolos exibidos como lixo visual).
- **Não mascarar erro visual**: Não substituir acentos/símbolos por texto simplificado para “contornar” encoding.
- **Importação com normalização**: Dados externos (CSV/XLSX/XML/API) devem ser normalizados para UTF-8 antes de persistir.
- **Preservar semântica clínica/operacional**: Unidade, dosagem, instrução e termos médicos devem manter acentuação correta.

## PADRÕES

❌ ERRADO: Texto corrompido na UI ou seed

```ts
label: 'Prescri<texto-corrompido>';
instruction: '<simbolo-corrompido> Diluir em 10 mL';
```

✅ CORRETO: Texto íntegro em UTF-8

```ts
label: 'Prescrição';
instruction: '• Diluir em 10 mL';
```

❌ ERRADO: Persistir dado com encoding duvidoso

```ts
await supabase.from('prescription_item').insert({ instructions: rawText });
```

✅ CORRETO: Normalizar antes de persistir

```ts
const normalizedText = normalizeToUtf8(rawText);
await supabase.from('prescription_item').insert({ instructions: normalizedText });
```

## CHECKLIST

- ✓ Nenhuma sequência mojibake nos arquivos alterados
- ✓ Labels, mensagens e textos clínicos com acentuação correta
- ✓ Seeds/importadores preservam símbolos (`•`, `—`, `°`, `µ`, etc.) corretamente
- ✓ `npm run encoding:check:staged` sem falhas

## REGRA FINAL

Texto corrompido em contexto clínico não é detalhe visual.
É risco de interpretação operacional e deve ser bloqueado no commit.
