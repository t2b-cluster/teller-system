import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';

@Injectable()
export class RedisLockService implements OnModuleInit {
  private redlock: Redlock;
  private redis: Redis;

  onModuleInit() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || 'tellerpass',
    });

    this.redlock = new Redlock([this.redis], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 200,
    });
  }

  async acquire(resource: string, ttl: number): Promise<Lock> {
    return this.redlock.acquire([resource], ttl);
  }

  async release(lock: Lock): Promise<void> {
    await lock.release();
  }
}
