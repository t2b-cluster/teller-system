#!/bin/bash
# Kong Gateway Route Setup Script
# Run after docker-compose up

KONG_ADMIN="http://localhost:8001"

echo "Waiting for Kong to be ready..."
until curl -s "$KONG_ADMIN/status" > /dev/null 2>&1; do
  sleep 2
done
echo "Kong is ready."

# ── Auth Service (PUBLIC — no token required) ──
echo "Setting up Auth Service..."
curl -s -X POST "$KONG_ADMIN/services" \
  -d name=auth-service \
  -d url=http://auth-service:3005 > /dev/null

curl -s -X POST "$KONG_ADMIN/services/auth-service/routes" \
  -d name=auth-routes \
  -d "paths[]=/api/v1/auth" \
  -d strip_path=false > /dev/null

# ── Transfer Service ──
echo "Setting up Transfer Service..."
curl -s -X POST "$KONG_ADMIN/services" \
  -d name=transfer-service \
  -d url=http://transfer-service:3001 > /dev/null

curl -s -X POST "$KONG_ADMIN/services/transfer-service/routes" \
  -d name=transfer-routes \
  -d "paths[]=/api/v1/transfers" \
  -d strip_path=false > /dev/null

# ── Transaction Service ──
echo "Setting up Transaction Service..."
curl -s -X POST "$KONG_ADMIN/services" \
  -d name=transaction-service \
  -d url=http://transaction-service:3002 > /dev/null

curl -s -X POST "$KONG_ADMIN/services/transaction-service/routes" \
  -d name=transaction-routes \
  -d "paths[]=/api/v1/transactions" \
  -d strip_path=false > /dev/null

curl -s -X POST "$KONG_ADMIN/services/transaction-service/routes" \
  -d name=balance-routes \
  -d "paths[]=/api/v1/balance" \
  -d strip_path=false > /dev/null

# ── Reconciliation Service ──
echo "Setting up Reconciliation Service..."
curl -s -X POST "$KONG_ADMIN/services" \
  -d name=reconciliation-service \
  -d url=http://reconciliation-service:3003 > /dev/null

curl -s -X POST "$KONG_ADMIN/services/reconciliation-service/routes" \
  -d name=reconciliation-routes \
  -d "paths[]=/api/v1/reconciliation" \
  -d strip_path=false > /dev/null

# ── Notification Service ──
echo "Setting up Notification Service..."
curl -s -X POST "$KONG_ADMIN/services" \
  -d name=notification-service \
  -d url=http://notification-service:3004 > /dev/null

curl -s -X POST "$KONG_ADMIN/services/notification-service/routes" \
  -d name=notification-routes \
  -d "paths[]=/api/v1/notifications" \
  -d strip_path=false > /dev/null

# ── Global Rate Limiting ──
echo "Setting up Rate Limiting..."
curl -s -X POST "$KONG_ADMIN/plugins" \
  -d name=rate-limiting \
  -d "config.minute=100" \
  -d "config.policy=local" > /dev/null

echo ""
echo "Kong setup complete."
echo "  Gateway:   http://localhost:8000"
echo "  Admin GUI: http://localhost:8002"
echo ""
echo "Auth endpoints (no token required):"
echo "  POST http://localhost:8000/api/v1/auth/login"
echo "  POST http://localhost:8000/api/v1/auth/refresh"
echo "  POST http://localhost:8000/api/v1/auth/logout"
echo ""
echo "Protected endpoints (Bearer token required):"
echo "  POST http://localhost:8000/api/v1/transfers"
echo "  GET  http://localhost:8000/api/v1/transactions"
echo "  GET  http://localhost:8000/api/v1/balance/:accountId"
