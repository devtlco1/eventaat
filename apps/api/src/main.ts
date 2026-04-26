import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
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

  const openApi = new DocumentBuilder()
    .setTitle('eventaat API')
    .setDescription(
      'Restaurant discovery, table reservations, and event nights. ' +
        'Prose and inventory: repo docs at docs/api-reference.md and docs/api-inventory.md.',
    )
    .setVersion('0.0.1')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    );
  const openApiConfig = openApi.build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, openApiDocument, {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'eventaat API (Swagger)',
  });

  bootLog(`before app.listen(${port})`);
  await app.listen(port);
  bootLog('after app.listen');

  logger.log(`eventaat API listening on http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
  logger.log(`OpenAPI UI: http://localhost:${port}/docs  JSON: http://localhost:${port}/docs-json`);
}

bootstrap();
