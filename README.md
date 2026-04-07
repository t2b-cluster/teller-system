# Teller System

ระบบ Channel Application สำหรับพนักงานหน้าเคาน์เตอร์ (Teller) เชื่อมต่อกับ Core Banking

## Tech Stack

- **Backend:** NestJS (TypeScript)
- **Frontend:** React 18 + Vite + TypeScript
- **Database:** MS SQL Server 2022
- **Cache / Queue:** Redis 7 + BullMQ
- **API Gateway:** Kong 3.6
- **Containerization:** Docker Compose

## Architecture

```
Frontend (:5173) → Kong Gateway (:8000) → NestJS Services → Redis / SQL Server → Core Banking
```

| Service | Port | หน้าที่ |
|---------|------|---------|
| Frontend (React + Vite) | 5173 | UI สำหรับ Teller |
| Kong API Gateway | 8000 | Routing, Rate Limiting, CORS |
| Auth Service | 3005 | JWT Authentication |
| Transfer Service | 3001 | โอนเงิน + Idempotency + Outbox |
| Transaction Service | 3002 | ประวัติธุรกรรม + ยอดคงเหลือ + เปิดบัญชี |
| Reconciliation Service | 3003 | Outbox Worker + Reconcile |
| Notification Service | 3004 | Queue Consumer แจ้งเตือน |
| Redis | 6379 | BullMQ + Cache + Distributed Lock |
| SQL Server | 1433 | Database หลัก |

## Prerequisites

- Node.js 20+
- Docker Desktop
- npm 10+

## Quick Start

### 1. Start Infrastructure (Docker)

```bash
docker compose up -d redis sqlserver kong-database
```

รอ ~30 วินาทีให้ healthy แล้วต่อ:

```bash
docker compose up -d kong-migration
sleep 15
docker compose up -d kong
docker compose up -d db-init
```

ตรวจสอบ:

```bash
docker compose ps
```

### 2. Install Dependencies

```bash
cd services/auth-service && npm install && cd ../..
cd services/transfer-service && npm install && cd ../..
cd services/transaction-service && npm install && cd ../..
cd services/reconciliation-service && npm install && cd ../..
cd services/notification-service && npm install && cd ../..
cd services/frontend && npm install && cd ../..
```

### 3. Start Backend Services

เปิด 5 terminal แยกกัน:

```bash
# Terminal 1 — Auth Service
cd services/auth-service && npx nest start

# Terminal 2 — Transfer Service
cd services/transfer-service && AUTH_SERVICE_URL=http://localhost:3005 npx nest start

# Terminal 3 — Transaction Service
cd services/transaction-service && AUTH_SERVICE_URL=http://localhost:3005 npx nest start

# Terminal 4 — Reconciliation Service
cd services/reconciliation-service && AUTH_SERVICE_URL=http://localhost:3005 npx nest start

# Terminal 5 — Notification Service
cd services/notification-service && npx nest start
```

### 4. Setup Kong Routes

```bash
bash services/api-gateway/setup-kong.sh
```

### 5. Start Frontend

```bash
cd services/frontend && npx vite
```

### 6. เปิดใช้งาน

เปิด http://localhost:5173

Login:
- Username: `teller01`
- Password: `teller123`

## Test Users

| Username | Password | Role | Branch |
|----------|----------|------|--------|
| teller01 | teller123 | TELLER | BRN001 |
| teller02 | teller123 | TELLER | BRN001 |
| supervisor01 | teller123 | SUPERVISOR | BRN001 |
| admin01 | teller123 | ADMIN | HQ001 |

## Sample Accounts

| เลขบัญชี | ชื่อ | ยอด |
|-----------|------|-----|
| 1001000001 | บัญชีทดสอบ 1 | 1,000,000 |
| 1001000002 | บัญชีทดสอบ 2 | 500,000 |
| 1001000003 | บัญชีทดสอบ 3 | 250,000 |
| 1234567890 | บัญชีทดสอบ Load Test | 999,999,999 |
| 1234567891 | บัญชีทดสอบ 4 | 500,000 |

## Running Tests

### Unit Tests (per service)

```bash
cd services/auth-service && npx jest --coverage
cd services/transfer-service && npx jest --coverage
cd services/transaction-service && npx jest --coverage
cd services/reconciliation-service && npx jest --coverage
cd services/notification-service && npx jest --coverage
```

### E2E Tests

ต้อง start ทุก service ก่อน แล้วรัน:

```bash
bash e2e/run-all.sh
```

## API Endpoints

ทุก API เรียกผ่าน Kong Gateway `http://localhost:8000`

### Public (ไม่ต้อง token)

```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### Protected (ต้องมี Bearer token)

```
POST /api/v1/transfers
GET  /api/v1/transfers/:id/status
GET  /api/v1/transactions?accountId=&limit=50&cursor=
GET  /api/v1/balance/:accountId
POST /api/v1/accounts
GET  /api/v1/accounts
GET  /api/v1/reconciliation/logs
GET  /api/v1/health/live
GET  /api/v1/health/ready
```

### ตัวอย่างการเรียก API

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teller01","password":"teller123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Transfer
curl -X POST http://localhost:8000/api/v1/transfers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: $(uuidgen)" \
  -d '{"fromAccount":"1001000001","toAccount":"1001000002","amount":100,"currency":"THB"}'

# Balance
curl http://localhost:8000/api/v1/balance/1001000001 \
  -H "Authorization: Bearer $TOKEN"

# Transaction History
curl "http://localhost:8000/api/v1/transactions?accountId=1001000001&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Project Structure

```
teller-system/
├── services/
│   ├── api-gateway/          # Kong config + setup script
│   ├── auth-service/         # JWT Authentication (:3005)
│   ├── frontend/             # React + Vite (:5173)
│   ├── transfer-service/     # โอนเงิน (:3001)
│   ├── transaction-service/  # ประวัติ + ยอด + บัญชี (:3002)
│   ├── reconciliation-service/ # Outbox + Reconcile (:3003)
│   └── notification-service/ # Queue Consumer (:3004)
├── shared/                   # Shared DTOs, Guards, Config
├── infrastructure/
│   └── db/init.sql           # SQL Server schema + seed
├── e2e/
│   └── run-all.sh            # E2E test runner
└── docker-compose.yml
```

## Stopping

```bash
# Stop NestJS services — Ctrl+C ในแต่ละ terminal

# Stop Docker infrastructure
docker compose down
```
