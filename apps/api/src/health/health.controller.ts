import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

type DatabaseStatus = 'ok' | 'unavailable';
type OverallStatus = 'ok' | 'degraded';

interface HealthResponse {
  status: OverallStatus;
  service: string;
  version: string;
  database: DatabaseStatus;
  timestamp: string;
  uptimeSeconds: number;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const dbHealthy = await this.prisma.isHealthy();

    return {
      status: dbHealthy ? 'ok' : 'degraded',
      service: 'eventaat-api',
      version: '0.0.1',
      database: dbHealthy ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
