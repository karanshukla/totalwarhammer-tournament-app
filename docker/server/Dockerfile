FROM node:24-alpine AS deps
WORKDIR /app
COPY server-app/package.json ./
RUN npm install --omit=dev

FROM node:24-alpine AS final
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY server-app/ .

EXPOSE 3000

CMD ["node", "app.js"]
