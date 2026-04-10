import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: client.Registry;
  readonly httpRequestsTotal: client.Counter<string>;
  readonly httpRequestDuration: client.Histogram<string>;
  readonly transferTotal: client.Counter<string>;
  readonly transferAmountTotal: client.Counter<string>;
  readonly accountCreatedTotal: client.Counter<string>;
  readonly transactionsTotal: client.Counter<string>;
  readonly authLoginTotal: client.Counter<string>;
  readonly reconciliationTotal: client.Counter<string>;
  readonly queueDepth: client.Gauge<string>;
  readonly dbPoolActive: client.Gauge<string>;

  constructor() {
    this.register = new client.Registry();
    const serviceName = process.env.SERVICE_NAME || 'unknown';
    this.register.setDefaultLabels({ service: serviceName });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status', 'service'],
      registers: [this.register],
    });
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status', 'service'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });
    this.transferTotal = new client.Counter({
      name: 'teller_transfer_total', help: 'Total transfers',
      labelNames: ['status'], registers: [this.register],
    });
    this.transferAmountTotal = new client.Counter({
      name: 'teller_transfer_amount_total', help: 'Total transfer amount',
      labelNames: ['currency'], registers: [this.register],
    });
    this.accountCreatedTotal = new client.Counter({
      name: 'teller_account_created_total', help: 'Total accounts created',
      registers: [this.register],
    });
    this.transactionsTotal = new client.Counter({
      name: 'teller_transactions_total', help: 'Total transactions',
      labelNames: ['status', 'type'], registers: [this.register],
    });
    this.authLoginTotal = new client.Counter({
      name: 'teller_auth_login_total', help: 'Total login attempts',
      labelNames: ['status'], registers: [this.register],
    });
    this.reconciliationTotal = new client.Counter({
      name: 'teller_reconciliation_total', help: 'Total reconciliation runs',
      labelNames: ['result'], registers: [this.register],
    });
    this.queueDepth = new client.Gauge({
      name: 'teller_queue_depth', help: 'Queue depth',
      labelNames: ['queue'], registers: [this.register],
    });
    this.dbPoolActive = new client.Gauge({
      name: 'teller_db_pool_active', help: 'Active DB connections',
      labelNames: ['service'], registers: [this.register],
    });
  }

  initDefaultMetrics() {
    client.collectDefaultMetrics({ register: this.register });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
