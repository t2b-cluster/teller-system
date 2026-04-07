USE teller_db;
GO

-- Ensure account 1234567890 exists
IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_number = '1234567890')
BEGIN
    INSERT INTO accounts (account_number, account_name, balance, currency)
    VALUES ('1234567890', N'บัญชีทดสอบ Load Test', 999999999.00, 'THB');
END
GO

-- Batch insert 2,000,000 transactions using a numbers approach
-- Insert in batches of 50,000 for performance
DECLARE @batch INT = 0;
DECLARE @batchSize INT = 50000;
DECLARE @total INT = 2000000;
DECLARE @inserted INT = 0;

-- Check how many already exist for this account
SELECT @inserted = COUNT(*) FROM transactions WHERE from_account = '1234567890';
PRINT 'Existing transactions: ' + CAST(@inserted AS VARCHAR);

IF @inserted >= @total
BEGIN
    PRINT 'Already have 2M+ transactions. Skipping.';
    RETURN;
END

SET @total = @total - @inserted;
PRINT 'Will insert ' + CAST(@total AS VARCHAR) + ' transactions...';

SET NOCOUNT ON;

WHILE @batch * @batchSize < @total
BEGIN
    DECLARE @rowsThisBatch INT = @batchSize;
    IF (@batch + 1) * @batchSize > @total
        SET @rowsThisBatch = @total - (@batch * @batchSize);

    ;WITH Numbers AS (
        SELECT TOP (@rowsThisBatch)
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) + (@batch * @batchSize) AS n
        FROM sys.all_objects a CROSS JOIN sys.all_objects b
    )
    INSERT INTO transactions (
        id, transaction_ref, from_account, to_account,
        amount, currency, type, status, description, created_at, updated_at
    )
    SELECT
        NEWID(),
        'TXN-LOAD-' + RIGHT('00000000' + CAST(n AS VARCHAR), 8),
        '1234567890',
        '100100000' + CAST((n % 3) + 1 AS VARCHAR),
        CAST(ROUND(RAND(CHECKSUM(NEWID())) * 99999 + 1, 2) AS DECIMAL(18,2)),
        'THB',
        CASE (n % 3) WHEN 0 THEN 'TRANSFER' WHEN 1 THEN 'DEPOSIT' ELSE 'WITHDRAWAL' END,
        CASE (n % 10) WHEN 0 THEN 'FAILED' WHEN 1 THEN 'PENDING' ELSE 'SUCCESS' END,
        N'Load test transaction #' + CAST(n AS VARCHAR),
        DATEADD(SECOND, -(n * 15), GETUTCDATE()),
        DATEADD(SECOND, -(n * 15), GETUTCDATE())
    FROM Numbers;

    SET @batch = @batch + 1;

    IF @batch % 10 = 0
        PRINT 'Inserted ' + CAST(@batch * @batchSize AS VARCHAR) + ' rows...';
END

SET NOCOUNT OFF;

DECLARE @finalCount INT;
SELECT @finalCount = COUNT(*) FROM transactions WHERE from_account = '1234567890';
PRINT 'Done! Total transactions for 1234567890: ' + CAST(@finalCount AS VARCHAR);
GO
