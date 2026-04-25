import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 4000);

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`eventaat API listening on http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
}

bootstrap();
