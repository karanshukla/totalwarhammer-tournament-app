FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM caddy:2-alpine AS final
COPY --from=builder /app/dist /srv
COPY Caddyfile.local /etc/caddy/Caddyfile

EXPOSE 80
