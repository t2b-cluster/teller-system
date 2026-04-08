FROM node:20-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY services/notification-service/package*.json ./services/notification-service/
RUN cd services/notification-service && npm install --legacy-peer-deps
COPY services/notification-service/ ./services/notification-service/
RUN cd services/notification-service && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/notification-service/dist ./dist
COPY --from=builder /app/services/notification-service/node_modules ./node_modules
COPY --from=builder /app/services/notification-service/package.json ./
EXPOSE 3004
CMD ["node", "dist/main"]
