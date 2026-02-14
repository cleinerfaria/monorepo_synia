# Fluxo de Desenvolvimento, CI/CD e Pull Request

Este documento define o fluxo oficial para criacao, commit, validacao e deploy.

## Objetivo

Garantir qualidade, rastreabilidade e seguranca em todas as mudancas.

## Regras base

- Nao fazer commit direto na `main` para mudancas normais.
- Toda mudanca passa por branch de trabalho + Pull Request.
- Todo merge para `main` deve passar em CI.
- Deploy para `homolog` e `production` ocorre por promocao manual de SHA.

## Estrategia de branches

- `main`: branch estavel e deployavel.
- `feat/<descricao-curta>`: novas funcionalidades.
- `fix/<descricao-curta>`: correcoes de bug.
- `chore/<descricao-curta>`: manutencao tecnica.
- `hotfix/<descricao-curta>`: correcao urgente.

Exemplos:

- `feat/workflow-e2e-remoto`
- `fix/login-timeout`
- `chore/update-ci-timeouts`

## Hooks locais obrigatorios

O repositorio usa `.githooks` configurado automaticamente em `npm install`.

- `pre-commit`:
  - bloqueia commit em `main`/`master` (exceto emergencia)
  - executa:
    - `npm run format:check:staged`
    - `npm run encoding:check:staged`
- `commit-msg`:
  - exige Conventional Commits
  - formato: `<type>(scope opcional): descricao`
  - exemplo: `feat(auth): add session timeout guard`

Bypass de emergencia para commit em branch protegida:

```bash
ALLOW_MAIN_COMMIT=true git commit -m "hotfix: emergency patch"
```

## Fluxo padrao (passo a passo)

1. Atualizar base local:

```bash
git checkout main
git pull origin main
```

2. Criar branch da tarefa:

```bash
git checkout -b feat/nome-da-melhoria
```

3. Implementar e commitar:

```bash
git add .
git commit -m "feat(modulo): descricao objetiva da mudanca"
```

4. Rodar validacao completa local antes do push:

```bash
npm run precommit:check
```

5. Subir branch e abrir PR para `main`:

```bash
git push -u origin feat/nome-da-melhoria
```

6. Preencher template de PR (`.github/pull_request_template.md`) com:

- contexto, problema e solucao
- impactos tecnicos e riscos
- plano de rollback
- evidencias de validacao

7. Fazer merge apenas com CI verde.

## CI/CD oficial

### CI

Workflow: `.github/workflows/ci.yml`

- dispara em `pull_request` para `main` e em `push` para `main`
- executa:
  - `npm ci`
  - `npm run lint`
  - `npm run test:run`
  - `npm run build`

### CD

- `development`:
  - deploy automatico em push para `main`
  - workflow: `.github/workflows/deploy-development.yml`
- `homolog` e `production`:
  - promocao manual por SHA
  - workflow: `.github/workflows/promote.yml`

Variavel obrigatoria por environment:

- `DEPLOY_COMMAND`

Sem essa variavel, o workflow de deploy falha por seguranca.

## Politica de merge

- Preferir `Squash and merge`.
- Nao fazer merge com checks falhando.
- CODEOWNERS deve revisar alteracoes sensiveis.

## Checklist minimo de PR

- [ ] Branch correta (sem commit direto na `main`)
- [ ] Commit messages no padrao convencional
- [ ] Build, lint e testes passando
- [ ] Sem segredo/token exposto
- [ ] Sem quebra de isolamento multi-tenant
- [ ] Documentacao atualizada quando necessario

## Excecao: hotfix critico

Mesmo em hotfix, preferir PR curto e revisao rapida.
Commit direto em `main` deve ser excecao justificada.
