/**
 * Shared TypeORM Database Configuration with SQL Server Always On Failover Support
 *
 * Environment Variables:
 *   DB_HOST              - AG Listener หรือ Primary host (required)
 *   DB_PORT              - Port (default: 1433)
 *   DB_USERNAME          - SQL login
 *   DB_PASSWORD          - SQL password
 *   DB_DATABASE          - Database name
 *   DB_FAILOVER_PARTNER  - Failover partner host (secondary replica)
 *   DB_MULTI_SUBNET_FAILOVER - "true" เปิด MultiSubnetFailover (default: false)
 *   DB_APP_INTENT        - "ReadOnly" สำหรับ read replica routing (default: ReadWrite)
 *   DB_ENCRYPT           - "true" เปิด encryption (default: false)
 *   DB_TRUST_CERT        - "true" trust server certificate (default: true)
 *   DB_CONNECT_TIMEOUT   - Connection timeout ms (default: 30000)
 *   DB_REQUEST_TIMEOUT   - Request timeout ms (default: 30000)
 *   DB_POOL_MAX          - Max pool size (default: 20)
 *   DB_POOL_MIN          - Min pool size (default: 5)
 *   DB_POOL_IDLE_TIMEOUT - Pool idle timeout ms (default: 10000)
 *   DB_RETRY_COUNT       - Connection retry count (default: 3)
 *   DB_RETRY_INTERVAL    - Connection retry interval ms (default: 1000)
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface DatabaseConfigOptions {
  entities: Function[];
  /** Override pool size for lighter services */
  poolMax?: number;
  poolMin?: number;
  /** Force ReadOnly intent (for read-replica routing) */
  readOnly?: boolean;
}

export function createDatabaseConfig(options: DatabaseConfigOptions): TypeOrmModuleOptions {
  const {
    entities,
    poolMax = parseInt(process.env.DB_POOL_MAX || '20', 10),
    poolMin = parseInt(process.env.DB_POOL_MIN || '5', 10),
    readOnly = false,
  } = options;

  const encrypt = process.env.DB_ENCRYPT === 'true';
  const trustCert = process.env.DB_TRUST_CERT !== 'false'; // default true
  const multiSubnetFailover = process.env.DB_MULTI_SUBNET_FAILOVER === 'true';
  const failoverPartner = process.env.DB_FAILOVER_PARTNER || '';
  const connectTimeout = parseInt(process.env.DB_CONNECT_TIMEOUT || '30000', 10);
  const requestTimeout = parseInt(process.env.DB_REQUEST_TIMEOUT || '30000', 10);
  const retryCount = parseInt(process.env.DB_RETRY_COUNT || '3', 10);
  const retryInterval = parseInt(process.env.DB_RETRY_INTERVAL || '1000', 10);

  // ApplicationIntent: ReadOnly routes to secondary replicas in AG
  const appIntent = readOnly
    ? 'ReadOnly'
    : (process.env.DB_APP_INTENT || 'ReadWrite');

  return {
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'TellerPass@123',
    database: process.env.DB_DATABASE || 'teller_db',
    entities,
    synchronize: false,
    extra: {
      trustServerCertificate: trustCert,
      pool: {
        max: poolMax,
        min: poolMin,
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '10000', 10),
        // Validate connections before use (detect broken connections after failover)
        acquireTimeoutMillis: connectTimeout,
      },
      options: {
        encrypt,
        // ── Always On Availability Group settings ──
        // MultiSubnetFailover: ลด failover time จาก ~21s เหลือ ~1-2s
        // ทำงานโดย connect ไปทุก IP ของ AG Listener พร้อมกัน
        multiSubnetFailover,
        // Failover Partner: secondary replica สำหรับ database mirroring / AG
        ...(failoverPartner && { failoverPartner }),
        // ApplicationIntent: ReadOnly จะ route ไป secondary readable replica
        applicationIntent: appIntent,
        // Connection resilience
        connectRetryCount: retryCount,
        connectRetryInterval: retryInterval,
        connectTimeout,
        requestTimeout,
        // Cancel request on timeout (ป้องกัน orphaned queries หลัง failover)
        cancelTimeout: 5000,
      },
    },
  };
}
