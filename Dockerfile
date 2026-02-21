FROM node:20-alpine AS build
ARG APP_NAME=vidasystem
WORKDIR /workspace

COPY . .
RUN npm ci

RUN if [ "$APP_NAME" = "vidasystem" ]; then \
      npm run build -w vidasystem; \
    elif [ "$APP_NAME" = "whitelabel" ]; then \
      npm run build -w whitelabel; \
    else \
      echo "APP_NAME inválido: $APP_NAME (use: vidasystem ou whitelabel)" && exit 1; \
    fi

FROM node:20-alpine AS runtime
ARG APP_NAME=vidasystem
WORKDIR /app

ENV NODE_ENV=production
ENV APP_NAME=$APP_NAME

COPY --from=build /workspace/apps/${APP_NAME}/ ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/ || exit 1

CMD ["node", "server.cjs"]
