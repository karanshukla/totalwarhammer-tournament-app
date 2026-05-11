FROM node:22-alpine AS builder
WORKDIR /app

COPY client-app/package.json ./
RUN npm install

COPY client-app/ .

ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM caddy:2-alpine AS final
COPY --from=builder /app/dist /srv
RUN printf ':80 {\n    root * /srv\n    try_files {path} /index.html\n    file_server\n}' > /etc/caddy/Caddyfile

EXPOSE 80
