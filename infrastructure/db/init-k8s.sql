-- Create database first
IF DB_ID('teller_db') IS NULL
    CREATE DATABASE teller_db;
GO

USE teller_db;
GO

-- Accounts Table
IF OBJECT_ID('accounts', 'U') IS NULL
CREATE TABLE accounts (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    account_number  VARCHAR(20)      NOT NULL UNIQUE,
    account_name    NVARCHAR(200)    NOT NULL,
    balance         DECIMAL(18,2)    NOT NULL DEFAULT 0,
    currency        VARCHAR(3)       NOT NULL DEFAULT 'THB',
    status          VARCHAR(20)      NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    version         INT              NOT NULL DEFAULT 1
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_accounts_number')
    CREATE INDEX IX_accounts_number ON accounts(account_number);
GO

-- Transactions Table
IF OBJECT_ID('transactions', 'U') IS NULL
CREATE TABLE transactions (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    transaction_ref     VARCHAR(50)      NOT NULL UNIQUE,
    from_account        VARCHAR(20)      NULL,
    to_account          VARCHAR(20)      NULL,
    amount              DECIMAL(18,2)    NOT NULL,
    currency            VARCHAR(3)       NOT NULL DEFAULT 'THB',
    type                VARCHAR(20)      NOT NULL,
    status              VARCHAR(20)      NOT NULL DEFAULT 'PENDING',
    description         NVARCHAR(500)    NULL,
    core_banking_ref    VARCHAR(100)     NULL,
    error_message       NVARCHAR(1000)   NULL,
    created_at          DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2        NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Outbox Messages Table
IF OBJECT_ID('outbox_messages', 'U') IS NULL
CREATE TABLE outbox_messages (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    aggregate_type  VARCHAR(50)      NOT NULL,
    aggregate_id    VARCHAR(100)     NOT NULL,
    event_type      VARCHAR(100)     NOT NULL,
    payload         NVARCHAR(MAX)    NOT NULL,
    status          VARCHAR(20)      NOT NULL DEFAULT 'PENDING',
    retry_count     INT              NOT NULL DEFAULT 0,
    max_retries     INT              NOT NULL DEFAULT 5,
    created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    processed_at    DATETIME2        NULL,
    error_message   NVARCHAR(1000)   NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_outbox_status')
    CREATE INDEX IX_outbox_status ON outbox_messages(status, created_at);
GO

-- Idempotency Keys Table
IF OBJECT_ID('idempotency_keys', 'U') IS NULL
CREATE TABLE idempotency_keys (
    idempotency_key VARCHAR(100)     PRIMARY KEY,
    response        NVARCHAR(MAX)    NOT NULL,
    status_code     INT              NOT NULL DEFAULT 200,
    created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    expires_at      DATETIME2        NOT NULL
);
GO

-- Reconciliation Log Table
IF OBJECT_ID('reconciliation_logs', 'U') IS NULL
CREATE TABLE reconciliation_logs (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    transaction_ref     VARCHAR(50)      NOT NULL,
    channel_status      VARCHAR(20)      NOT NULL,
    core_banking_status VARCHAR(20)      NULL,
    match_result        VARCHAR(20)      NOT NULL,
    resolved            BIT              NOT NULL DEFAULT 0,
    resolved_at         DATETIME2        NULL,
    notes               NVARCHAR(1000)   NULL,
    created_at          DATETIME2        NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Users Table
IF OBJECT_ID('users', 'U') IS NULL
CREATE TABLE users (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    username        VARCHAR(50)      NOT NULL UNIQUE,
    password_hash   VARCHAR(255)     NOT NULL,
    full_name       NVARCHAR(200)    NOT NULL,
    role            VARCHAR(50)      NOT NULL DEFAULT 'TELLER',
    branch_code     VARCHAR(20)      NOT NULL,
    is_active       BIT              NOT NULL DEFAULT 1,
    last_login      DATETIME2        NULL,
    created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Refresh Tokens Table
IF OBJECT_ID('refresh_tokens', 'U') IS NULL
CREATE TABLE refresh_tokens (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER NOT NULL,
    token           VARCHAR(500)     NOT NULL,
    expires_at      DATETIME2        NOT NULL,
    revoked         BIT              NOT NULL DEFAULT 0,
    created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

-- Seed accounts
IF NOT EXISTS (SELECT 1 FROM accounts)
INSERT INTO accounts (account_number, account_name, balance, currency) VALUES
('1001000001', N'Test Account 1', 1000000.00, 'THB'),
('1001000002', N'Test Account 2', 500000.00, 'THB'),
('1001000003', N'Test Account 3', 250000.00, 'THB');
GO

-- Seed users (password: teller123)
IF NOT EXISTS (SELECT 1 FROM users)
INSERT INTO users (username, password_hash, full_name, role, branch_code) VALUES
('teller01', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9.oty0VvJHpFjGAlSHuKnZpTSi', N'Teller 01', 'TELLER', 'BRN001'),
('teller02', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9.oty0VvJHpFjGAlSHuKnZpTSi', N'Teller 02', 'TELLER', 'BRN001'),
('supervisor01', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9.oty0VvJHpFjGAlSHuKnZpTSi', N'Supervisor 01', 'SUPERVISOR', 'BRN001'),
('admin01', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9.oty0VvJHpFjGAlSHuKnZpTSi', N'Admin 01', 'ADMIN', 'HQ001');
GO

PRINT 'Teller DB initialization completed successfully.';
GO
