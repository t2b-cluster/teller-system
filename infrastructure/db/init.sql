-- Teller System Database Initialization
-- MS SQL Server

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'teller_db')
BEGIN
    CREATE DATABASE teller_db;
END
GO

USE teller_db;
GO

-- ── Accounts Table ──
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'accounts')
BEGIN
    CREATE TABLE accounts (
        id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        account_number  VARCHAR(20)      NOT NULL UNIQUE,
        account_name    NVARCHAR(200)    NOT NULL,
        balance         DECIMAL(18,2)    NOT NULL DEFAULT 0,
        currency        VARCHAR(3)       NOT NULL DEFAULT 'THB',
        status          VARCHAR(20)      NOT NULL DEFAULT 'ACTIVE',
        created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        updated_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        version         INT              NOT NULL DEFAULT 1  -- Optimistic lock
    );

    CREATE INDEX IX_accounts_number ON accounts(account_number);
END
GO

-- ── Transactions Table (Partitioned by month) ──
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'transactions')
BEGIN
    CREATE TABLE transactions (
        id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        transaction_ref     VARCHAR(50)      NOT NULL UNIQUE,
        from_account        VARCHAR(20)      NULL,
        to_account          VARCHAR(20)      NULL,
        amount              DECIMAL(18,2)    NOT NULL,
        currency            VARCHAR(3)       NOT NULL DEFAULT 'THB',
        type                VARCHAR(20)      NOT NULL, -- TRANSFER, DEPOSIT, WITHDRAWAL
        status              VARCHAR(20)      NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED
        description         NVARCHAR(500)    NULL,
        core_banking_ref    VARCHAR(100)     NULL,
        error_message       NVARCHAR(1000)   NULL,
        created_at          DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        updated_at          DATETIME2        NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX IX_transactions_from     ON transactions(from_account, created_at DESC);
    CREATE INDEX IX_transactions_to       ON transactions(to_account, created_at DESC);
    CREATE INDEX IX_transactions_status   ON transactions(status, created_at DESC);
    CREATE INDEX IX_transactions_ref      ON transactions(transaction_ref);
    CREATE INDEX IX_transactions_date     ON transactions(created_at DESC);
END
GO

-- ── Outbox Messages Table ──
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'outbox_messages')
BEGIN
    CREATE TABLE outbox_messages (
        id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        aggregate_type  VARCHAR(50)      NOT NULL,
        aggregate_id    VARCHAR(100)     NOT NULL,
        event_type      VARCHAR(100)     NOT NULL,
        payload         NVARCHAR(MAX)    NOT NULL,
        status          VARCHAR(20)      NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
        retry_count     INT              NOT NULL DEFAULT 0,
        max_retries     INT              NOT NULL DEFAULT 5,
        created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        processed_at    DATETIME2        NULL,
        error_message   NVARCHAR(1000)   NULL
    );

    CREATE INDEX IX_outbox_status ON outbox_messages(status, created_at);
END
GO

-- ── Idempotency Keys Table ──
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'idempotency_keys')
BEGIN
    CREATE TABLE idempotency_keys (
        idempotency_key VARCHAR(100)     PRIMARY KEY,
        response        NVARCHAR(MAX)    NOT NULL,
        status_code     INT              NOT NULL DEFAULT 200,
        created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        expires_at      DATETIME2        NOT NULL
    );

    CREATE INDEX IX_idempotency_expires ON idempotency_keys(expires_at);
END
GO

-- ── Reconciliation Log Table ──
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'reconciliation_logs')
BEGIN
    CREATE TABLE reconciliation_logs (
        id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        transaction_ref     VARCHAR(50)      NOT NULL,
        channel_status      VARCHAR(20)      NOT NULL,
        core_banking_status VARCHAR(20)      NULL,
        match_result        VARCHAR(20)      NOT NULL, -- MATCH, MISMATCH, PENDING
        resolved            BIT              NOT NULL DEFAULT 0,
        resolved_at         DATETIME2        NULL,
        notes               NVARCHAR(1000)   NULL,
        created_at          DATETIME2        NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX IX_reconciliation_result ON reconciliation_logs(match_result, created_at DESC);
END
GO

-- ── Seed sample accounts ──
IF NOT EXISTS (SELECT 1 FROM accounts)
BEGIN
    INSERT INTO accounts (account_number, account_name, balance, currency) VALUES
    ('1001000001', N'บัญชีทดสอบ 1', 1000000.00, 'THB'),
    ('1001000002', N'บัญชีทดสอบ 2', 500000.00, 'THB'),
    ('1001000003', N'บัญชีทดสอบ 3', 250000.00, 'THB');
END
GO

-- ── Users Table (Authentication) ──
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        username        VARCHAR(50)      NOT NULL UNIQUE,
        password_hash   VARCHAR(255)     NOT NULL,
        full_name       NVARCHAR(200)    NOT NULL,
        role            VARCHAR(50)      NOT NULL DEFAULT 'TELLER', -- TELLER, SUPERVISOR, ADMIN
        branch_code     VARCHAR(20)      NOT NULL,
        is_active       BIT              NOT NULL DEFAULT 1,
        last_login      DATETIME2        NULL,
        created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        updated_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX IX_users_username ON users(username);
    CREATE INDEX IX_users_role ON users(role);
END
GO

-- ── Refresh Tokens Table ──
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'refresh_tokens')
BEGIN
    CREATE TABLE refresh_tokens (
        id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id         UNIQUEIDENTIFIER NOT NULL,
        token           VARCHAR(500)     NOT NULL,
        expires_at      DATETIME2        NOT NULL,
        revoked         BIT              NOT NULL DEFAULT 0,
        created_at      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IX_refresh_token ON refresh_tokens(token);
    CREATE INDEX IX_refresh_user ON refresh_tokens(user_id, revoked);
END
GO

-- ── Seed default teller users (password: teller123) ──
-- bcrypt hash of 'teller123' with 10 rounds
IF NOT EXISTS (SELECT 1 FROM users)
BEGIN
    INSERT INTO users (username, password_hash, full_name, role, branch_code) VALUES
    ('teller01', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9.oty0VvJHpFjGAlSHuKnZpTSi', N'พนักงาน ทดสอบ 1', 'TELLER', 'BRN001'),
    ('teller02', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9.oty0VvJHpFjGAlSHuKnZpTSi', N'พนักงาน ทดสอบ 2', 'TELLER', 'BRN001'),
    ('supervisor01', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9.oty0VvJHpFjGAlSHuKnZpTSi', N'หัวหน้า ทดสอบ', 'SUPERVISOR', 'BRN001'),
    ('admin01', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9.oty0VvJHpFjGAlSHuKnZpTSi', N'ผู้ดูแลระบบ', 'ADMIN', 'HQ001');
END
GO

PRINT 'Teller DB initialization completed successfully.';
GO
