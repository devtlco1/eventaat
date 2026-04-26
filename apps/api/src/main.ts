import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const bootLog = (msg: string): void => {
  if (process.env.EVENTAAT_DEBUG_BOOT === '1') {
    // Timestamps help local debugging when the process “hangs” before listen.
    console.log(`[${new Date().toISOString()}] ${msg}`);
  }
};

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  bootLog('before NestFactory.create(AppModule)');

  const app = await NestFactory.create(AppModule);

  bootLog('after NestFactory.create; configuring HTTP');

  app.enableCors({
    origin: ['http://localhost:3000'],
  });

  // Global validation (class-validator + class-transformer). All JSON bodies
  // and DTO-typed query objects are checked before route handlers. Unknown
  // properties in bodies are rejected (400) when a DTO is used.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 4000);

  bootLog(`before app.listen(${port})`);
  await app.listen(port);
  bootLog('after app.listen');

  logger.log(`eventaat API listening on http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
}

bootstrap();
