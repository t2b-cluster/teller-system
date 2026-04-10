import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, route } = req;
    const path = route?.path || req.url;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const status = res.statusCode?.toString() || '200';
          const duration = (Date.now() - start) / 1000;
          const svc = process.env.SERVICE_NAME || 'unknown';

          this.metricsService.httpRequestsTotal.inc({ method, path, status, service: svc });
          this.metricsService.httpRequestDuration.observe({ method, path, status, service: svc }, duration);
        },
        error: (err: any) => {
          const status = err.status?.toString() || '500';
          const duration = (Date.now() - start) / 1000;
          const svc = process.env.SERVICE_NAME || 'unknown';

          this.metricsService.httpRequestsTotal.inc({ method, path, status, service: svc });
          this.metricsService.httpRequestDuration.observe({ method, path, status, service: svc }, duration);
        },
      }),
    );
  }
}
