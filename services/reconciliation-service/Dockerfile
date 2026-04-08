FROM node:20-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY services/reconciliation-service/package*.json ./services/reconciliation-service/
RUN cd services/reconciliation-service && npm install --legacy-peer-deps
COPY services/reconciliation-service/ ./services/reconciliation-service/
RUN cd services/reconciliation-service && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/reconciliation-service/dist ./dist
COPY --from=builder /app/services/reconciliation-service/node_modules ./node_modules
COPY --from=builder /app/services/reconciliation-service/package.json ./
EXPOSE 3003
CMD ["node", "dist/main"]
