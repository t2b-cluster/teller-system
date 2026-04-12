-- =============================================================
-- Seed 60,000,000 Transaction Records
-- Target: MS SQL Server (Navicat compatible)
-- =============================================================
USE teller_db;
GO

-- ── สร้าง accounts สำหรับ seed ถ้ายังไม่มี ──
DECLARE @acctIdx INT = 1;
WHILE @acctIdx <= 50
BEGIN
    DECLARE @acctNum VARCHAR(20) = '20010000' + RIGHT('00' + CAST(@acctIdx AS VARCHAR), 2);
    DECLARE @acctName NVARCHAR(200) = N'บัญชี Seed ' + CAST(@acctIdx AS VARCHAR);
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_number = @acctNum)
    BEGIN
        INSERT INTO accounts (account_number, account_name, balance, currency)
        VALUES (@acctNum, @acctName, 999999999.00, 'THB');
    END
    SET @acctIdx = @acctIdx + 1;
END
GO

PRINT '=== Starting 60M transaction seed ===';
PRINT 'Start time: ' + CONVERT(VARCHAR, GETUTCDATE(), 121);
GO

-- ── Main insert loop: 60,000,000 records in batches of 50,000 ──
DECLARE @batch INT = 0;
DECLARE @batchSize INT = 50000;
DECLARE @total INT = 60000000;
DECLARE @inserted INT = 0;

-- นับจำนวนที่มีอยู่แล้ว (เฉพาะ prefix TXN-60M-)
SELECT @inserted = COUNT_BIG(*) FROM transactions WHERE transaction_ref LIKE 'TXN-60M-%';
PRINT 'Existing TXN-60M records: ' + CAST(@inserted AS VARCHAR);

IF @inserted >= @total
BEGIN
    PRINT 'Already have 60M+ transactions. Skipping.';
    RETURN;
END

SET @total = @total - @inserted;
SET @batch = @inserted / @batchSize;
PRINT 'Will insert ' + CAST(@total AS VARCHAR) + ' transactions...';
PRINT 'Starting from batch: ' + CAST(@batch AS VARCHAR);

SET NOCOUNT ON;

DECLARE @startBatch INT = @batch;
DECLARE @totalBatches INT = CEILING(CAST((@inserted + @total) AS FLOAT) / @batchSize);

WHILE @batch < @totalBatches
BEGIN
    DECLARE @rowsThisBatch INT = @batchSize;
    IF @batch = @totalBatches - 1
    BEGIN
        SET @rowsThisBatch = (@inserted + @total) - (@batch * @batchSize);
        IF @rowsThisBatch <= 0 BREAK;
    END

    DECLARE @offset INT = @batch * @batchSize;

    BEGIN TRY
        ;WITH Numbers AS (
            SELECT TOP (@rowsThisBatch)
                ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) + @offset AS n
            FROM sys.all_objects a CROSS JOIN sys.all_objects b
        )
        INSERT INTO transactions (
            id, transaction_ref, from_account, to_account,
            amount, currency, type, status, description,
            created_at, updated_at
        )
        SELECT
            NEWID(),
            -- transaction_ref: unique per row
            'TXN-60M-' + RIGHT('00000000' + CAST(n AS VARCHAR), 8),

            -- from_account: กระจายไป 50 accounts
            '20010000' + RIGHT('00' + CAST((n % 50) + 1 AS VARCHAR), 2),

            -- to_account: กระจายไปอีก 50 accounts (คนละตัวกับ from)
            '20010000' + RIGHT('00' + CAST(((n + 25) % 50) + 1 AS VARCHAR), 2),

            -- amount: สุ่ม 1 - 500,000 บาท
            CAST(
                ROUND(ABS(CHECKSUM(NEWID())) % 50000000 + 100, -2) / 100.0
            AS DECIMAL(18,2)),

            -- currency
            'THB',

            -- type: กระจาย 3 ประเภท
            CASE (n % 5)
                WHEN 0 THEN 'DEPOSIT'
                WHEN 1 THEN 'WITHDRAWAL'
                WHEN 2 THEN 'TRANSFER'
                WHEN 3 THEN 'TRANSFER'
                ELSE 'DEPOSIT'
            END,

            -- status: 80% SUCCESS, 10% PENDING, 10% FAILED
            CASE
                WHEN (n % 10) = 0 THEN 'FAILED'
                WHEN (n % 10) = 1 THEN 'PENDING'
                ELSE 'SUCCESS'
            END,

            -- description
            CASE (n % 5)
                WHEN 0 THEN N'ฝากเงินสด สาขา ' + CAST((n % 20) + 1 AS VARCHAR(5))
                WHEN 1 THEN N'ถอนเงินสด ATM'
                WHEN 2 THEN N'โอนเงินระหว่างบัญชี'
                WHEN 3 THEN N'โอนเงินพร้อมเพย์'
                ELSE N'ฝากเช็ค'
            END,

            -- created_at: กระจายย้อนหลัง 3 ปี (~94.6M วินาที)
            DATEADD(SECOND,
                -(ABS(CHECKSUM(NEWID())) % 94608000),
                GETUTCDATE()
            ),

            -- updated_at = created_at + 0-5 วินาที
            DATEADD(SECOND,
                -(ABS(CHECKSUM(NEWID())) % 94608000) + (n % 5),
                GETUTCDATE()
            )
        FROM Numbers;
    END TRY
    BEGIN CATCH
        PRINT 'Error at batch ' + CAST(@batch AS VARCHAR) + ': ' + ERROR_MESSAGE();
        -- ข้ามไป batch ถัดไป
    END CATCH

    SET @batch = @batch + 1;

    -- แสดง progress ทุก 20 batches (1M records)
    IF @batch % 20 = 0
    BEGIN
        DECLARE @pct VARCHAR(10) = CAST(
            CAST((@batch - @startBatch) * @batchSize AS FLOAT) / @total * 100
        AS DECIMAL(5,1));
        PRINT CONVERT(VARCHAR, GETUTCDATE(), 121)
            + ' | Inserted: '
            + CAST((@batch - @startBatch) * @batchSize AS VARCHAR)
            + ' / ' + CAST(@total AS VARCHAR)
            + ' (' + @pct + '%)';
    END
END

SET NOCOUNT OFF;
GO

-- ── สรุปผล ──
PRINT '=== Seed completed ===';
PRINT 'End time: ' + CONVERT(VARCHAR, GETUTCDATE(), 121);

SELECT
    COUNT_BIG(*) AS total_transactions,
    MIN(created_at) AS earliest,
    MAX(created_at) AS latest,
    COUNT(DISTINCT from_account) AS unique_from_accounts,
    COUNT(DISTINCT to_account) AS unique_to_accounts
FROM transactions
WHERE transaction_ref LIKE 'TXN-60M-%';

SELECT
    type,
    status,
    COUNT(*) AS cnt,
    FORMAT(SUM(amount), 'N2') AS total_amount
FROM transactions
WHERE transaction_ref LIKE 'TXN-60M-%'
GROUP BY type, status
ORDER BY type, status;
GO

PRINT 'Done! 60M transactions seeded successfully.';
GO
