FROM node:20-alpine AS build
ARG APP_NAME=aurea
WORKDIR /workspace

COPY . .
RUN npm ci

RUN if [ "$APP_NAME" = "aurea" ]; then \
      npm run build -w aurea; \
    elif [ "$APP_NAME" = "white-label" ]; then \
      npm run build -w white_label; \
    else \
      echo "APP_NAME inválido: $APP_NAME (use: aurea ou white-label)" && exit 1; \
    fi

FROM node:20-alpine AS runtime
ARG APP_NAME=aurea
WORKDIR /app

ENV NODE_ENV=production
ENV APP_NAME=$APP_NAME

RUN npm install -g serve

COPY --from=build /workspace/apps/${APP_NAME}/ ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/ || exit 1

CMD ["sh", "-c", "if [ \"$APP_NAME\" = \"white-label\" ]; then node server.cjs; else serve -s dist -l ${PORT:-3000}; fi"]