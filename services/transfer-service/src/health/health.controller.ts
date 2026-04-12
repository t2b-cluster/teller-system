import { Controller, Get } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { DataSource } from 'typeorm';

const Public = () => SetMetadata('isPublic', true);

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('live')
  @Public()
  live() {
    return { status: 'ok', service: 'transfer-service' };
  }

  @Get('ready')
  @Public()
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');

      // Check Always On AG replica status if available
      let agStatus: any = null;
      try {
        const agResult = await this.dataSource.query(`
          SELECT
            ag.name AS ag_name,
            ars.role_desc AS role,
            ars.connected_state_desc AS connected_state,
            ars.synchronization_health_desc AS sync_health
          FROM sys.dm_hadr_availability_replica_states ars
          JOIN sys.availability_groups ag ON ars.group_id = ag.group_id
          WHERE ars.is_local = 1
        `);
        if (agResult?.length > 0) {
          agStatus = agResult[0];
        }
      } catch {
        // AG not configured — that's fine for dev/standalone
      }

      return {
        status: 'ok',
        db: 'connected',
        ...(agStatus && { alwaysOn: agStatus }),
      };
    } catch {
      return { status: 'error', db: 'disconnected' };
    }
  }
}
