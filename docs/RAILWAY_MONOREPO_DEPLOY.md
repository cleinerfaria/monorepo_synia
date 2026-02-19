# Deploy Railway em Monorepo

## Problema comum

Erro no deploy:

```json
{
  "message": "Dockerfile `Dockerfile` does not exist"
}
```

Isso acontece quando o serviço do Railway builda a partir da raiz do repositório, mas não encontra um `Dockerfile` compatível com monorepo.

## Solução adotada neste repositório

- Foi adicionado um `Dockerfile` na raiz do monorepo.
- Os `Dockerfile` de cada app foram mantidos em `apps/aurea/` e `apps/white-label/`.
- O `Dockerfile` de raiz escolhe qual app buildar via build arg `APP_NAME`.

Valores suportados:

- `aurea`
- `white-label`

## Configuração no Railway (por serviço)

Para cada serviço conectado a este repositório:

1. **Builder**: `Dockerfile`
2. **Dockerfile Path**: `Dockerfile`
3. **Root Directory**: `.`
4. **Build Arg**:
   - Serviço Aurea: `APP_NAME=aurea`
   - Serviço White Label: `APP_NAME=white-label`

## Start command

- Para `aurea`: o container serve `dist` na porta `$PORT`.
- Para `white-label`: o container executa `node server.cjs`.

## Observações

- Se o seu projeto no Railway tiver apenas um serviço (ex.: apenas Aurea), configure apenas o build arg correspondente.
- Se preferir, também é válido configurar cada serviço com `Root Directory` apontando para o app e usar o `Dockerfile` local de cada pasta.