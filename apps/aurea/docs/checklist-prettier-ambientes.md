# Checklist de divergencia Prettier entre computadores

Este guia ajuda a identificar por que um computador "aplica" mudancas de formatacao e o outro "desfaz".

## 1) Comparar versoes

Rode nos dois ambientes:

```bash
node -v
npm -v
npx prettier -v
npm ls prettier prettier-plugin-tailwindcss --depth=0
```

## 2) Comparar configuracao Git (EOL)

```bash
git config --show-origin core.autocrlf
git config --show-origin core.eol
git config --show-origin core.safecrlf
```

## 3) Verificar estado atual do repositorio

```bash
git status --short
git diff --name-only
```

## 4) Conferir arquivos de configuracao do projeto

```bash
cat .prettierrc
cat .prettierrc.json
cat .gitattributes
```

## 5) Padrao recomendado para estabilizar

```bash
git config core.autocrlf false
git config core.eol lf
git add --renormalize .
```

## 6) Reinstalar dependencias de forma identica

```bash
npm ci
```

## 7) Executar formatacao usando o Prettier local do projeto

```bash
npm run format
```

## Observacoes

- Evite usar Prettier global da maquina.
- Mantenha `package-lock.json` versionado e atualizado.
- Se existir conflito de EOL, normalize uma vez e faça um commit apenas de normalizacao.
