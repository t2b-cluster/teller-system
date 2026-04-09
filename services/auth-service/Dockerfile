FROM node:20-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY services/auth-service/package*.json ./services/auth-service/
RUN cd services/auth-service && npm install --legacy-peer-deps
COPY services/auth-service/ ./services/auth-service/
RUN cd services/auth-service && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/auth-service/dist ./dist
COPY --from=builder /app/services/auth-service/node_modules ./node_modules
COPY --from=builder /app/services/auth-service/package.json ./
EXPOSE 3005
CMD ["node", "dist/src/main"]
