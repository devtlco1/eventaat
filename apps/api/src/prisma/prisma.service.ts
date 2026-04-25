import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Injectable wrapper around PrismaClient.
 *
 * Connects on module init, but failures are caught and logged — they MUST NOT
 * crash the API. /health is responsible for surfacing database status to
 * callers via `isHealthy()`.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    if (process.env.EVENTAAT_DEBUG_BOOT === '1') {
      this.logger.log('onModuleInit: $connect() starting');
    }
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Prisma failed to connect on boot — /health will report database as unavailable. (${message})`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Cheap connectivity probe used by the health endpoint.
   * Returns true iff a trivial query succeeds against the database.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
