FROM node:20-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY services/transaction-service/package*.json ./services/transaction-service/
RUN cd services/transaction-service && npm install --legacy-peer-deps
COPY services/transaction-service/ ./services/transaction-service/
RUN cd services/transaction-service && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/transaction-service/dist ./dist
COPY --from=builder /app/services/transaction-service/node_modules ./node_modules
COPY --from=builder /app/services/transaction-service/package.json ./
EXPOSE 3002
CMD ["node", "dist/main"]
