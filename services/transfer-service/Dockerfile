FROM node:20-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY services/transfer-service/package*.json ./services/transfer-service/
RUN cd services/transfer-service && npm install
COPY services/transfer-service/ ./services/transfer-service/
RUN cd services/transfer-service && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/transfer-service/dist ./dist
COPY --from=builder /app/services/transfer-service/node_modules ./node_modules
COPY --from=builder /app/services/transfer-service/package.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
