import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Ensure uploads directory exists
  const uploadDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Global Prefix
  app.setGlobalPrefix('api');

  // CORS: explicit allowlist only. An empty CORS_ORIGINS falls back to the
  // local dev frontend so credentials are never reflected to arbitrary origins.
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowedOrigins =
    configuredOrigins.length > 0 ? configuredOrigins : ['http://localhost:3000'];

  logger.log(`🔐 CORS allowed origins: ${allowedOrigins.join(', ')}`);

  // CORS
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`=======================================================`);
  logger.log(`🚀 SIPERU YARSI Backend running on: http://localhost:${port}/api`);
  logger.log(`📦 Database ORM: Prisma Client (PostgreSQL)`);
  logger.log(`🔐 Authentication: Passport-JWT & LDAP YARSI SSO`);
  logger.log(`=======================================================`);
}

bootstrap();
